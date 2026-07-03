// Extracción de recurrencias en español y construcción de la RRULE.
// «cada martes», «cada día», «los lunes y jueves», «cada 2 semanas»,
// con fin «durante 2 meses» (se normaliza a COUNT) o «durante 8 veces».

import { aFechaISO, sumarDias } from '@/lib/fechas';
import { contarInstanciasHasta, opcionesARrule, RRule } from '@/lib/recurrencia';

import type { Fragmento, HoraDetectada, RecurrenciaInterpretada } from './tipos';

type Frecuencia = 'DAILY' | 'WEEKLY' | 'MONTHLY';

interface FinDetectado {
  tipo: 'count' | 'duracion';
  n: number;
  unidad?: 'dias' | 'semanas' | 'meses';
  texto: string;
}

export interface DeteccionRecurrencia {
  frecuencia: Frecuencia;
  intervalo: number;
  diasSemana: number[]; // días JS (0=domingo … 6=sábado)
  fin: FinDetectado | null;
  fragmentos: Fragmento[];
  base: string; // «cada martes», «los lunes y jueves»…
}

const DIA_JS: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
};

const NOMBRE_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

// días JS (0=domingo) → constantes rrule (0=lunes)
const DIA_RRULE = [RRule.SU, RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA];

const DIA_PAT = '(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bados?|domingos?)';
const RE_DIAS = new RegExp(
  `\\b(?:cada|todos\\s+los|los)\\s+(${DIA_PAT}(?:\\s*(?:,|y)\\s*${DIA_PAT})*)\\b`,
);
const RE_CADA_DIA =
  /\b(?:cada\s+(?:d[ií]a|noche|ma[nñ]ana|tarde)|todos\s+los\s+d[ií]as|todas\s+las\s+(?:noches|ma[nñ]anas|tardes)|a\s+diario)\b/;
const RE_CADA_N = /\bcada\s+(\d{1,2})\s+(d[ií]as|semanas|meses)\b/;
const RE_CADA_SEMANA = /\bcada\s+semana\b/;
const RE_CADA_MES = /\bcada\s+mes\b/;
const RE_FIN_VECES = /\b(?:durante\s+)?(\d{1,3})\s+veces\b/;
const RE_FIN_DURACION = /\bdurante\s+(\d{1,2})\s+(d[ií]as?|semanas?|mes(?:es)?)\b/;

function normalizarDia(palabra: string): number {
  const base = palabra.replace(/é/g, 'e').replace(/á/g, 'a');
  // solo sábados/domingos tienen plural distinto; lunes…viernes son invariables
  const singular = base === 'sabados' ? 'sabado' : base === 'domingos' ? 'domingo' : base;
  return DIA_JS[singular] ?? -1;
}

function fragmento(texto: string, indice: number): Fragmento {
  return { campo: 'recurrencia', texto, indice };
}

export function extraerRecurrencia(texto: string): DeteccionRecurrencia | null {
  let frecuencia: Frecuencia | null = null;
  let intervalo = 1;
  let diasSemana: number[] = [];
  let base = '';
  const fragmentos: Fragmento[] = [];

  let m = RE_DIAS.exec(texto);
  if (m) {
    const palabras = m[1]!.split(/\s*(?:,|y)\s*/).filter(Boolean);
    diasSemana = [...new Set(palabras.map(normalizarDia).filter((d) => d >= 0))];
    if (diasSemana.length > 0) {
      frecuencia = 'WEEKLY';
      const nombres = [...diasSemana]
        .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)) // lunes primero
        .map((d) => NOMBRE_DIA[d]!);
      base =
        nombres.length === 1
          ? `cada ${nombres[0]}`
          : `los ${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
      fragmentos.push(fragmento(m[0], m.index));
    }
  }

  if (!frecuencia) {
    m = RE_CADA_DIA.exec(texto);
    if (m) {
      frecuencia = 'DAILY';
      base = 'cada día';
      fragmentos.push(fragmento(m[0], m.index));
    }
  }

  if (!frecuencia) {
    m = RE_CADA_N.exec(texto);
    if (m) {
      intervalo = Number(m[1]);
      const unidad = m[2]!;
      frecuencia = unidad.startsWith('d') ? 'DAILY' : unidad.startsWith('s') ? 'WEEKLY' : 'MONTHLY';
      base = `cada ${intervalo} ${unidad}`;
      fragmentos.push(fragmento(m[0], m.index));
    }
  }

  if (!frecuencia) {
    m = RE_CADA_SEMANA.exec(texto);
    if (m) {
      frecuencia = 'WEEKLY';
      base = 'cada semana';
      fragmentos.push(fragmento(m[0], m.index));
    }
  }

  if (!frecuencia) {
    m = RE_CADA_MES.exec(texto);
    if (m) {
      frecuencia = 'MONTHLY';
      base = 'cada mes';
      fragmentos.push(fragmento(m[0], m.index));
    }
  }

  if (!frecuencia) return null; // un fin suelto («8 veces») sin patrón no es recurrencia

  let fin: FinDetectado | null = null;
  const mDuracion = RE_FIN_DURACION.exec(texto);
  if (mDuracion) {
    const unidadCruda = mDuracion[2]!.replace(/í/g, 'i');
    const unidad: FinDetectado['unidad'] = unidadCruda.startsWith('d')
      ? 'dias'
      : unidadCruda.startsWith('s')
        ? 'semanas'
        : 'meses';
    fin = { tipo: 'duracion', n: Number(mDuracion[1]), unidad, texto: mDuracion[0] };
    fragmentos.push(fragmento(mDuracion[0], mDuracion.index));
  } else {
    const mVeces = RE_FIN_VECES.exec(texto);
    if (mVeces) {
      fin = { tipo: 'count', n: Number(mVeces[1]), texto: mVeces[0] };
      fragmentos.push(fragmento(mVeces[0], mVeces.index));
    }
  }

  return { frecuencia, intervalo, diasSemana, fin, fragmentos, base };
}

function horaYaPasada(hora: HoraDetectada, ahora: Date): boolean {
  return hora.hora < ahora.getHours() || (hora.hora === ahora.getHours() && hora.minuto <= ahora.getMinutes());
}

/** Primera instancia de la serie (YYYY-MM-DD) desde «ahora». */
export function primeraInstancia(
  deteccion: DeteccionRecurrencia,
  ahora: Date,
  hora: HoraDetectada | null,
): string {
  if (deteccion.diasSemana.length > 0) {
    const difs = deteccion.diasSemana.map((d) => (d - ahora.getDay() + 7) % 7);
    let dif = Math.min(...difs);
    if (dif === 0 && hora && horaYaPasada(hora, ahora)) {
      dif = Math.min(...difs.map((x) => (x === 0 ? 7 : x)));
    }
    return aFechaISO(sumarDias(ahora, dif));
  }
  if (hora && horaYaPasada(hora, ahora)) return aFechaISO(sumarDias(ahora, 1));
  return aFechaISO(ahora);
}

/** Construye la RRULE canónica (fines normalizados a COUNT) y su fin serializado. */
export function construirRecurrencia(
  deteccion: DeteccionRecurrencia,
  primeraISO: string,
): RecurrenciaInterpretada {
  const opciones: Parameters<typeof opcionesARrule>[0] = {
    freq: RRule[deteccion.frecuencia],
  };
  if (deteccion.intervalo > 1) opciones.interval = deteccion.intervalo;
  if (deteccion.frecuencia === 'WEEKLY' && deteccion.diasSemana.length > 0) {
    opciones.byweekday = deteccion.diasSemana.map((d) => DIA_RRULE[d]!);
  }

  let fin: string | null = null;
  if (deteccion.fin?.tipo === 'count') {
    opciones.count = deteccion.fin.n;
    fin = JSON.stringify({ tipo: 'count', n: deteccion.fin.n });
  } else if (deteccion.fin?.tipo === 'duracion') {
    const inicio = new Date(`${primeraISO}T00:00`);
    const limite = new Date(inicio);
    if (deteccion.fin.unidad === 'dias') limite.setDate(limite.getDate() + deteccion.fin.n);
    else if (deteccion.fin.unidad === 'semanas') limite.setDate(limite.getDate() + deteccion.fin.n * 7);
    else limite.setMonth(limite.getMonth() + deteccion.fin.n);
    const hastaISO = aFechaISO(limite);
    const sinFin = opcionesARrule(opciones);
    opciones.count = contarInstanciasHasta(sinFin, primeraISO, hastaISO);
    fin = JSON.stringify({ tipo: 'until', fecha: hastaISO, texto: deteccion.fin.texto });
  }

  return {
    rrule: opcionesARrule(opciones),
    fin,
    descripcion: deteccion.base,
  };
}
