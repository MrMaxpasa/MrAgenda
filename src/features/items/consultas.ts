// Consulta compuesta del día: items simples desde SQL + series recurrentes
// expandidas por ventana, con excepciones aplicadas y estado por instancia.

import { excepcionesDeFecha } from '@/db/repositorios/excepciones';
import { completadosDe, listarPorFecha, listarRecurrentes } from '@/db/repositorios/items';
import { ultimasSesionesDe } from '@/db/repositorios/sesiones';
import type { ConexionDB } from '@/db/tipos';
import { resumenUltimaMarca } from '@/features/deporte/marca';

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
  // recurrentes está acotado por nº de series (pequeño); excepciones, al día
  const [simples, recurrentes, excepciones] = await Promise.all([
    listarPorFecha(db, fecha),
    listarRecurrentes(db),
    excepcionesDeFecha(db, fecha),
  ]);

  // los ítems simples llevan su estado; las instancias recurrentes se resuelven
  // primero para saber qué (serie, fechaOriginal) consultar en `completados`
  const instancias: Instancia[] = simples.map((item) => ({
    item,
    fecha,
    fechaOriginal: item.fecha_inicio!.slice(0, 10),
    hecha: item.estado === 'hecho',
    progreso: null,
  }));

  const recurrentesDelDia: Instancia[] = [];
  for (const serie of recurrentes) {
    recurrentesDelDia.push(...instanciasEnDia(serie, excepciones, fecha));
  }

  // consulta dirigida de completados: solo los pares que vamos a mirar
  const idsRecurrentes = [...new Set(recurrentesDelDia.map((i) => i.item.id))];
  const fechasOriginales = [...new Set(recurrentesDelDia.map((i) => i.fechaOriginal))];
  const completados = await completadosDe(db, idsRecurrentes, fechasOriginales);
  const hechas = new Set(completados.map((c) => `${c.item_id}|${c.fecha}`));

  for (const instancia of recurrentesDelDia) {
    instancia.hecha = hechas.has(`${instancia.item.id}|${instancia.fechaOriginal}`);
    instancias.push(instancia);
  }

  // última marca: solo las sesiones de los entrenos presentes ese día
  const idsEntrenos = [
    ...new Set(instancias.filter((i) => i.item.tipo === 'entreno').map((i) => i.item.id)),
  ];
  const sesiones = await ultimasSesionesDe(db, idsEntrenos);
  for (const instancia of instancias) {
    if (instancia.item.tipo !== 'entreno') continue;
    const sesion = sesiones.get(instancia.item.id);
    if (sesion) {
      const resumen = resumenUltimaMarca(sesion);
      if (resumen) instancia.ultimaMarca = resumen;
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
