// Composición del briefing (docs/02 §7): apertura por densidad + detalle
// (primera cita o hueco) + un extra como máximo, por prioridad
// racha > cumpleaños > arrastrados. Máximo 3 frases: calma, no dashboard.

import type { AnalisisDia } from './analisis';
import { elegirVariante, rellenar } from './plantillas';

export interface Segmento {
  texto: string;
  destacado: boolean;
}

/** Divide un texto con *destacados* en segmentos para pintarlos en ámbar. */
export function parsearDestacados(texto: string): Segmento[] {
  const segmentos: Segmento[] = [];
  const partes = texto.split('*');
  partes.forEach((parte, i) => {
    if (parte.length === 0) return;
    segmentos.push({ texto: parte, destacado: i % 2 === 1 });
  });
  return segmentos;
}

export interface BriefingCompuesto {
  texto: string; // con *asteriscos* (se guarda así en la caché)
  segmentos: Segmento[];
}

export function componerBriefing(analisis: AnalisisDia, fechaISO: string): BriefingCompuesto {
  const frases: string[] = [];

  const cosas =
    analisis.conHora === 1 ? '1 cosa con hora' : `${analisis.conHora} cosas con hora`;
  frases.push(rellenar(elegirVariante(`apertura_${analisis.densidad}`, fechaISO), { cosas }));

  if (analisis.primeraCita) {
    frases.push(
      rellenar(elegirVariante('primera_cita', fechaISO), {
        titulo: analisis.primeraCita.titulo,
        hora: analisis.primeraCita.hora,
      }),
    );
  } else if (analisis.huecoLibre && analisis.densidad !== 'vacio') {
    frases.push(
      rellenar(elegirVariante('hueco', fechaISO), {
        h1: analisis.huecoLibre.desde,
        h2: analisis.huecoLibre.hasta,
      }),
    );
  }

  if (analisis.rachaEnRiesgo) {
    frases.push(
      rellenar(elegirVariante('racha', fechaISO), {
        habito: analisis.rachaEnRiesgo.titulo,
        racha: analisis.rachaEnRiesgo.racha,
      }),
    );
  } else if (analisis.cumpleanos) {
    frases.push(rellenar(elegirVariante('cumple', fechaISO), { nombre: analisis.cumpleanos }));
  } else if (analisis.pendientesArrastrados > 0) {
    frases.push(
      rellenar(elegirVariante('arrastrados', fechaISO), { n: analisis.pendientesArrastrados }),
    );
  }

  const texto = frases.join(' ');
  return { texto, segmentos: parsearDestacados(texto) };
}
