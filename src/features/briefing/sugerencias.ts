// UNA sugerencia accionable (docs/02 §7, paso 3), por prioridad:
// racha en riesgo + hueco libre > pendientes arrastrados > primera cita.

import { crear, listarPendientesAnteriores, actualizar } from '@/db/repositorios/items';
import type { ConexionDB } from '@/db/tipos';
import { clasificarTipo } from '@/features/captura/parser/tipo';

import type { AnalisisDia } from './analisis';

export type Sugerencia =
  | { tipo: 'reservar'; etiqueta: string; habito: string; hora: string }
  | { tipo: 'arrastrados'; etiqueta: string; n: number }
  | { tipo: 'preparar'; etiqueta: string; titulo: string };

export function elegirSugerencia(analisis: AnalisisDia): Sugerencia | null {
  if (analisis.rachaEnRiesgo && analisis.huecoLibre) {
    const { titulo } = analisis.rachaEnRiesgo;
    const hora = analisis.huecoLibre.desde;
    return { tipo: 'reservar', etiqueta: `↺ Reservar ${hora} para ${titulo}`, habito: titulo, hora };
  }
  if (analisis.pendientesArrastrados > 0) {
    const n = analisis.pendientesArrastrados;
    return {
      tipo: 'arrastrados',
      etiqueta: `✓ Traer ${n} ${n === 1 ? 'pendiente' : 'pendientes'} a hoy`,
      n,
    };
  }
  if (analisis.primeraCita) {
    return {
      tipo: 'preparar',
      etiqueta: `☕ Preparar «${analisis.primeraCita.titulo}»`,
      titulo: analisis.primeraCita.titulo,
    };
  }
  return null;
}

/** Ejecuta la sugerencia y devuelve el mensaje del toast. */
export async function ejecutarSugerencia(
  db: ConexionDB,
  sugerencia: Sugerencia,
  hoyISO: string,
): Promise<string> {
  if (sugerencia.tipo === 'reservar') {
    const deportivo = clasificarTipo(sugerencia.habito.toLowerCase()) === 'entreno';
    await crear(db, {
      tipo: deportivo ? 'entreno' : 'tarea',
      titulo: sugerencia.habito,
      fecha_inicio: `${hoyISO}T${sugerencia.hora}`,
      todo_el_dia: false,
    });
    return `Reservado a las ${sugerencia.hora} ✓`;
  }

  if (sugerencia.tipo === 'arrastrados') {
    const pendientes = await listarPendientesAnteriores(db, hoyISO);
    for (const item of pendientes) {
      // a hoy, sin hora: caen en «Cuando puedas»
      await actualizar(db, item.id, { fecha_inicio: hoyISO, todo_el_dia: true });
    }
    return `${pendientes.length} ${pendientes.length === 1 ? 'pendiente traído' : 'pendientes traídos'} a hoy ✓`;
  }

  await crear(db, {
    tipo: 'tarea',
    titulo: `Preparar ${sugerencia.titulo}`,
    fecha_inicio: hoyISO,
    todo_el_dia: true,
  });
  return 'Añadido a tu día ✓';
}
