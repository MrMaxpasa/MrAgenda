// Análisis del día para el briefing (docs/02 §7, paso 1). Funciones puras:
// reciben las instancias del día, los hábitos con racha y el «ahora».

import type { HabitoDelDia } from '@/features/habitos/use-habitos';
import type { Instancia } from '@/features/items/instancias';

export type Densidad = 'vacio' | 'tranquilo' | 'normal' | 'cargado';

export interface AnalisisDia {
  densidad: Densidad;
  conHora: number;
  primeraCita: { titulo: string; hora: string } | null;
  huecoLibre: { desde: string; hasta: string } | null;
  rachaEnRiesgo: { titulo: string; icono: string; racha: number } | null;
  pendientesArrastrados: number;
  cumpleanos: string | null;
}

const INICIO_JORNADA = 9 * 60;
const FIN_JORNADA = 21 * 60;
const DURACION_CITA = 60; // sin duración explícita, una cita bloquea 1 h
const HUECO_MINIMO = 120;

function aMinutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function aHHMM(minutos: number): string {
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
}

function horaDe(instancia: Instancia): string | null {
  const { item } = instancia;
  if (item.todo_el_dia || !item.fecha_inicio || item.fecha_inicio.length <= 10) return null;
  return item.fecha_inicio.slice(11, 16);
}

/** Mayor franja libre ≥2 h entre las citas del día, dentro de la jornada. */
export function mayorHueco(
  horasOcupadas: string[],
  ahoraMinutos: number,
): { desde: string; hasta: string } | null {
  const inicio = Math.max(INICIO_JORNADA, ahoraMinutos);
  if (inicio >= FIN_JORNADA) return null;

  const bloques = horasOcupadas
    .map(aMinutos)
    .sort((a, b) => a - b)
    .map((t) => [t, t + DURACION_CITA] as const);

  let mejor: { desde: number; hasta: number } | null = null;
  let cursor = inicio;
  for (const [desde, hasta] of bloques) {
    if (desde > cursor) {
      const libre = Math.min(desde, FIN_JORNADA) - cursor;
      if (libre >= HUECO_MINIMO && (!mejor || libre > mejor.hasta - mejor.desde)) {
        mejor = { desde: cursor, hasta: Math.min(desde, FIN_JORNADA) };
      }
    }
    cursor = Math.max(cursor, hasta);
  }
  if (FIN_JORNADA - cursor >= HUECO_MINIMO) {
    const libre = FIN_JORNADA - cursor;
    if (!mejor || libre > mejor.hasta - mejor.desde) {
      mejor = { desde: cursor, hasta: FIN_JORNADA };
    }
  }

  return mejor ? { desde: aHHMM(mejor.desde), hasta: aHHMM(mejor.hasta) } : null;
}

const RE_CUMPLE = /cumple(?:años)?\s*(?:de\s+)?(.+)/i;

export function analizarDia(
  instancias: Instancia[],
  habitos: HabitoDelDia[],
  pendientesArrastrados: number,
  ahora: Date,
): AnalisisDia {
  const conHora = instancias
    .map((instancia) => ({ instancia, hora: horaDe(instancia) }))
    .filter((x): x is { instancia: Instancia; hora: string } => x.hora !== null);

  const n = conHora.length;
  const densidad: Densidad = n === 0 ? 'vacio' : n <= 2 ? 'tranquilo' : n <= 4 ? 'normal' : 'cargado';

  const ahoraMinutos = ahora.getHours() * 60 + ahora.getMinutes();
  const horaActual = aHHMM(ahoraMinutos);

  const proxima = conHora.find((x) => x.hora > horaActual && !x.instancia.hecha);
  const primeraCita = proxima
    ? { titulo: proxima.instancia.item.titulo, hora: proxima.hora }
    : null;

  const huecoLibre = mayorHueco(
    conHora.map((x) => x.hora),
    ahoraMinutos,
  );

  const enRiesgo = habitos
    .filter((h) => !h.hechaHoy && h.racha.actual >= 3)
    .sort((a, b) => b.racha.actual - a.racha.actual)[0];
  const rachaEnRiesgo = enRiesgo
    ? {
        titulo: enRiesgo.habito.item.titulo,
        icono: enRiesgo.habito.icono,
        racha: enRiesgo.racha.actual,
      }
    : null;

  let cumpleanos: string | null = null;
  for (const instancia of instancias) {
    if (instancia.item.tipo !== 'evento') continue;
    const m = RE_CUMPLE.exec(instancia.item.titulo);
    if (m) {
      const nombre = m[1]!.trim();
      cumpleanos = nombre.charAt(0).toUpperCase() + nombre.slice(1);
      break;
    }
  }

  return {
    densidad,
    conHora: n,
    primeraCita,
    huecoLibre,
    rachaEnRiesgo,
    pendientesArrastrados,
    cumpleanos,
  };
}
