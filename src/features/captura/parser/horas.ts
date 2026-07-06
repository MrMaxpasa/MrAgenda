// Extracción de horas en español. Regla AM/PM unificada (docs/02 §1):
// una hora de 1 a 6 SIN marcador se entiende de la tarde, se escriba como
// se escriba («5», «5h», «a las 5», «5:30» → 17:00/17:30); para la
// madrugada se fuerza con «de la mañana». Las 7-23 y 0 van literales.

import type { Fragmento, HoraDetectada } from './tipos';

export interface HoraExtraida {
  hora: HoraDetectada;
  fragmento: Fragmento;
}

type Marcador = 'mañana' | 'tarde' | 'noche' | 'madrugada' | undefined;

// franja opcional «de la mañana/tarde/noche/madrugada» reutilizable
const FRANJA = '(?:\\s+de\\s+la\\s+(ma[nñ]ana|tarde|noche|madrugada))?';

const RE_HH_MM = new RegExp(`(?:\\ba\\s+las?\\s+)?\\b(\\d{1,2}):(\\d{2})\\b${FRANJA}`);
const RE_N_H = new RegExp(`(?:\\ba\\s+las?\\s+)?\\b(\\d{1,2})\\s*h\\b${FRANJA}`);
const RE_A_LAS = new RegExp(
  `\\ba\\s+las?\\s+(una|\\d{1,2})(\\s+y\\s+media|\\s+y\\s+cuarto|\\s+menos\\s+cuarto)?${FRANJA}`,
);
const RE_MEDIODIA = /\b(?:al\s+)?mediod[ií]a\b/;
const RE_MEDIANOCHE = /\b(?:a\s+)?medianoche\b/;

function normalizarMarcador(crudo: string | undefined): Marcador {
  if (!crudo) return undefined;
  return crudo.replace(/ñ/g, 'n') === 'manana' ? 'mañana' : (crudo as Marcador);
}

/**
 * Aplica la regla AM/PM unificada a una hora ya extraída.
 * marcador tarde/noche → PM; mañana/madrugada → AM (fuerza); sin marcador
 * y 1-6 → PM (heurística de tarde); resto literal.
 */
export function ajustarMeridiano(hora: number, marcador: Marcador): number {
  if ((marcador === 'tarde' || marcador === 'noche') && hora < 12) return hora + 12;
  if (marcador === 'mañana' || marcador === 'madrugada') return hora; // se respeta AM
  if (!marcador && hora >= 1 && hora <= 6) return hora + 12;
  return hora;
}

function resultado(hora: number, minuto: number, texto: string, indice: number): HoraExtraida {
  return { hora: { hora, minuto }, fragmento: { campo: 'hora', texto, indice } };
}

export function extraerHora(texto: string): HoraExtraida | null {
  let m = RE_HH_MM.exec(texto);
  if (m) {
    const hora = Number(m[1]);
    const minuto = Number(m[2]);
    if (hora <= 23 && minuto <= 59) {
      return resultado(ajustarMeridiano(hora, normalizarMarcador(m[3])), minuto, m[0], m.index);
    }
  }

  m = RE_N_H.exec(texto);
  if (m) {
    const hora = Number(m[1]);
    if (hora <= 23) {
      return resultado(ajustarMeridiano(hora, normalizarMarcador(m[2])), 0, m[0], m.index);
    }
  }

  m = RE_A_LAS.exec(texto);
  if (m) {
    let hora = m[1] === 'una' ? 1 : Number(m[1]);
    let minuto = 0;
    if (hora <= 23) {
      const fraccion = m[2]?.trim().replace(/\s+/g, ' ');
      if (fraccion === 'y media') minuto = 30;
      else if (fraccion === 'y cuarto') minuto = 15;
      else if (fraccion === 'menos cuarto') {
        hora = hora === 0 ? 23 : hora - 1;
        minuto = 45;
      }
      return resultado(ajustarMeridiano(hora, normalizarMarcador(m[3])), minuto, m[0], m.index);
    }
  }

  m = RE_MEDIODIA.exec(texto);
  if (m) return resultado(12, 0, m[0], m.index);

  m = RE_MEDIANOCHE.exec(texto);
  if (m) return resultado(0, 0, m[0], m.index);

  return null;
}
