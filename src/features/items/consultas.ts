// Consulta compuesta del día: items simples desde SQL + series recurrentes
// expandidas por ventana, con excepciones aplicadas y estado por instancia.

import { listarExcepciones } from '@/db/repositorios/excepciones';
import { listarCompletados, listarPorFecha, listarRecurrentes } from '@/db/repositorios/items';
import type { ConexionDB } from '@/db/tipos';

import { instanciasEnDia, type Instancia } from './instancias';

function horaDe(instancia: Instancia): string | null {
  const { item } = instancia;
  if (item.todo_el_dia || !item.fecha_inicio || item.fecha_inicio.length <= 10) return null;
  return item.fecha_inicio.slice(11, 16);
}

/** Todo lo que se ve en un día: con hora ordenado, día completo al final. */
export async function listarInstanciasPorFecha(
  db: ConexionDB,
  fecha: string,
): Promise<Instancia[]> {
  const [simples, recurrentes, excepciones, completados] = await Promise.all([
    listarPorFecha(db, fecha),
    listarRecurrentes(db),
    listarExcepciones(db),
    listarCompletados(db),
  ]);

  const hechas = new Set(completados.map((c) => `${c.item_id}|${c.fecha}`));

  const instancias: Instancia[] = simples.map((item) => ({
    item,
    fecha,
    fechaOriginal: item.fecha_inicio!.slice(0, 10),
    hecha: item.estado === 'hecho',
    progreso: null,
  }));

  for (const serie of recurrentes) {
    for (const instancia of instanciasEnDia(serie, excepciones, fecha)) {
      instancia.hecha = hechas.has(`${serie.id}|${instancia.fechaOriginal}`);
      instancias.push(instancia);
    }
  }

  instancias.sort((a, b) => {
    const ha = horaDe(a);
    const hb = horaDe(b);
    if (ha !== null && hb !== null) return ha < hb ? -1 : ha > hb ? 1 : 0;
    if (ha !== null) return -1;
    if (hb !== null) return 1;
    return a.item.creado_en < b.item.creado_en ? -1 : 1;
  });

  return instancias;
}
