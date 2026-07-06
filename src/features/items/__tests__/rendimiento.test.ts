// Rendimiento de la vista Hoy: la consulta que alimenta el día debe abrir
// muy por debajo del presupuesto de 1 s (docs/04), incluso con un histórico
// grande. Mide listarInstanciasPorFecha sobre un dataset realista.

import { crearBDenMemoria, type ConexionDePrueba } from '@/db/__tests__/adaptador-test';
import { migrarBaseDeDatos } from '@/db/database';
import * as items from '@/db/repositorios/items';
import { aFechaISO } from '@/lib/fechas';

import { listarInstanciasPorFecha } from '../consultas';

let db: ConexionDePrueba;

beforeEach(async () => {
  db = crearBDenMemoria();
  await migrarBaseDeDatos(db);
});

afterEach(() => db.cerrar());

describe('rendimiento de la consulta de Hoy', () => {
  it('resuelve el día muy por debajo de 1 s con histórico grande', async () => {
    // 300 ítems puntuales repartidos en 100 días + 20 series recurrentes vivas
    for (let d = 0; d < 100; d++) {
      const fecha = `2026-${String(1 + (d % 12)).padStart(2, '0')}-${String(1 + (d % 28)).padStart(2, '0')}`;
      for (let n = 0; n < 3; n++) {
        await items.crear(db, {
          tipo: n === 0 ? 'evento' : 'tarea',
          titulo: `Item ${d}-${n}`,
          fecha_inicio: `${fecha}T${String(8 + n * 3).padStart(2, '0')}:00`,
        });
      }
    }
    const series: string[] = [];
    for (let s = 0; s < 20; s++) {
      const serie = await items.crear(db, {
        tipo: 'entreno',
        titulo: `Serie ${s}`,
        fecha_inicio: '2026-01-01T18:00',
        rrule: 'FREQ=DAILY',
      });
      series.push(serie.id);
    }

    // un AÑO de completados (5 series × 365 días ≈ 1.800 filas): antes del
    // acotado se cargaban enteras en cada render; ahora la consulta va dirigida
    for (let d = 0; d < 365; d++) {
      const fecha = aFechaISO(new Date(2026, 0, 1 + d));
      for (let s = 0; s < 5; s++) {
        await items.completar(db, series[s]!, fecha);
      }
    }

    const inicio = performance.now();
    const dia = await listarInstanciasPorFecha(db, '2026-07-06');
    const ms = performance.now() - inicio;

    // node:sqlite en memoria es más lento que expo-sqlite nativo; con margen.
    // La clave: NO escala con el tamaño de `completados` (la consulta se acota).
    expect(ms).toBeLessThan(300);
    // las 20 series diarias caen todos los días
    expect(dia.filter((i) => i.item.rrule !== null)).toHaveLength(20);
    // las 5 con completados de ese día se ven hechas; las otras 15, no
    expect(dia.filter((i) => i.item.rrule !== null && i.hecha)).toHaveLength(5);
  });
});
