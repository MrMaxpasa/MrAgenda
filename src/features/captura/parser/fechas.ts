// Extracción de fechas en español. Funciones puras: el «ahora» se inyecta.
// Trabaja sobre el texto en minúsculas; los índices coinciden con el original.

import { aFechaISO, sumarDias } from '@/lib/fechas';

import type { Fragmento } from './tipos';

export interface FechaDetectada {
  fecha: string; // YYYY-MM-DD
  fragmento: Fragmento;
}

const MESES: Record<string, number> = {
  enero: 0,
  febrero: 1,
  marzo: 2,
  abril: 3,
  mayo: 4,
  junio: 5,
  julio: 6,
  agosto: 7,
  septiembre: 8,
  setiembre: 8,
  octubre: 9,
  noviembre: 10,
  diciembre: 11,
};

const DIAS_SEMANA: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
};

const RE_PASADO_MANANA = /\bpasado\s+ma[nñ]ana\b/;
const RE_HOY = /\bhoy\b/;
// «mañana» es fecha salvo cuando es franja del día («de la mañana», «esta mañana»)
const RE_MANANA = /(\b(?:de|por)\s+la\s+|\besta\s+)?\bma[nñ]ana\b/g;
const RE_DIA_DE_MES =
  /(?:\bel\s+)?\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+(?:de|del)\s+(\d{4}))?\b/;
const RE_DD_MM = /(?:\bel\s+)?\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/;
const RE_DIA_SEMANA =
  /(?:\b(?:cada|este|del|el\s+pr[oó]ximo|pr[oó]ximo|el)\s+)?\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b/;
const RE_EL_N = /\bel\s+(\d{1,2})\b(?!\s*(?:de\b|del\b)|\s*[:/])/;

function sinAcentos(palabra: string): string {
  return palabra.replace(/é/g, 'e').replace(/á/g, 'a');
}

function fragmento(texto: string, indice: number): Fragmento {
  return { campo: 'fecha', texto, indice };
}

function resultado(fecha: Date, textoFragmento: string, indice: number): FechaDetectada {
  return { fecha: aFechaISO(fecha), fragmento: fragmento(textoFragmento, indice) };
}

export function extraerFecha(texto: string, ahora: Date): FechaDetectada | null {
  const hoyISO = aFechaISO(ahora);

  let m = RE_PASADO_MANANA.exec(texto);
  if (m) return resultado(sumarDias(ahora, 2), m[0], m.index);

  m = RE_HOY.exec(texto);
  if (m) return resultado(ahora, m[0], m.index);

  // «mañana» como fecha, saltando las franjas horarias («de la mañana»)
  RE_MANANA.lastIndex = 0;
  let mm: RegExpExecArray | null;
  while ((mm = RE_MANANA.exec(texto)) !== null) {
    if (!mm[1]) {
      return resultado(sumarDias(ahora, 1), mm[0], mm.index);
    }
  }

  m = RE_DIA_DE_MES.exec(texto);
  if (m) {
    const dia = Number(m[1]);
    const mes = MESES[m[2]!];
    if (dia >= 1 && dia <= 31 && mes !== undefined) {
      const anio = m[3] ? Number(m[3]) : ahora.getFullYear();
      let candidata = new Date(anio, mes, dia);
      if (!m[3] && aFechaISO(candidata) < hoyISO) {
        candidata = new Date(anio + 1, mes, dia); // ya pasó este año
      }
      return resultado(candidata, m[0], m.index);
    }
  }

  m = RE_DD_MM.exec(texto);
  if (m) {
    const dia = Number(m[1]);
    const mes = Number(m[2]) - 1;
    if (dia >= 1 && dia <= 31 && mes >= 0 && mes <= 11) {
      const anio = m[3]
        ? Number(m[3]) < 100
          ? 2000 + Number(m[3])
          : Number(m[3])
        : ahora.getFullYear();
      let candidata = new Date(anio, mes, dia);
      if (!m[3] && aFechaISO(candidata) < hoyISO) {
        candidata = new Date(anio + 1, mes, dia);
      }
      return resultado(candidata, m[0], m.index);
    }
  }

  m = RE_DIA_SEMANA.exec(texto);
  if (m) {
    const dia = DIAS_SEMANA[sinAcentos(m[1]!)];
    if (dia !== undefined) {
      const diferencia = (dia - ahora.getDay() + 7) % 7; // 0 = hoy cuenta
      return resultado(sumarDias(ahora, diferencia), m[0], m.index);
    }
  }

  m = RE_EL_N.exec(texto);
  if (m) {
    const dia = Number(m[1]);
    if (dia >= 1 && dia <= 31) {
      let candidata = new Date(ahora.getFullYear(), ahora.getMonth(), dia);
      if (dia < ahora.getDate()) {
        candidata = new Date(ahora.getFullYear(), ahora.getMonth() + 1, dia);
      }
      return resultado(candidata, m[0], m.index);
    }
  }

  return null;
}
