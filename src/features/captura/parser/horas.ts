// Extracción de horas en español. Regla v1 documentada en tests:
// una hora suelta de 1 a 6 sin marcador («a las 5») se asume de la tarde;
// la notación «Nh» se toma literal (formato 24 h).

import type { Fragmento, HoraDetectada } from './tipos';

export interface HoraExtraida {
  hora: HoraDetectada;
  fragmento: Fragmento;
}

const RE_HH_MM = /(?:\ba\s+las?\s+)?\b(\d{1,2}):(\d{2})\b/;
const RE_N_H = /(?:\ba\s+las?\s+)?\b(\d{1,2})\s*h\b/;
const RE_A_LAS =
  /\ba\s+las?\s+(una|\d{1,2})(\s+y\s+media|\s+y\s+cuarto|\s+menos\s+cuarto)?(\s+de\s+la\s+(ma[nñ]ana|tarde|noche|madrugada))?/;
const RE_MEDIODIA = /\b(?:al\s+)?mediod[ií]a\b/;
const RE_MEDIANOCHE = /\b(?:a\s+)?medianoche\b/;

function resultado(hora: number, minuto: number, texto: string, indice: number): HoraExtraida {
  return { hora: { hora, minuto }, fragmento: { campo: 'hora', texto, indice } };
}

export function extraerHora(texto: string): HoraExtraida | null {
  let m = RE_HH_MM.exec(texto);
  if (m) {
    const hora = Number(m[1]);
    const minuto = Number(m[2]);
    if (hora <= 23 && minuto <= 59) return resultado(hora, minuto, m[0], m.index);
  }

  m = RE_N_H.exec(texto);
  if (m) {
    const hora = Number(m[1]);
    if (hora <= 23) return resultado(hora, 0, m[0], m.index);
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
      const marcador = m[4];
      if ((marcador === 'tarde' || marcador === 'noche') && hora < 12) {
        hora += 12;
      } else if (!marcador && hora >= 1 && hora <= 6) {
        hora += 12; // «a las 5» sin más contexto → 17:00
      }
      return resultado(hora, minuto, m[0], m.index);
    }
  }

  m = RE_MEDIODIA.exec(texto);
  if (m) return resultado(12, 0, m[0], m.index);

  m = RE_MEDIANOCHE.exec(texto);
  if (m) return resultado(0, 0, m[0], m.index);

  return null;
}
