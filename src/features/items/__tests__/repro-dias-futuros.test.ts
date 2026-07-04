// Repro del bug: instancias recurrentes no aparecen en los días futuros
// del pager. Reproduce el flujo REAL de captura: interpretar() → crear()
// con los mismos campos que guarda la hoja → listarInstanciasPorFecha de
// mañana y pasado mañana.

import { crearBDenMemoria, type ConexionDePrueba } from '@/db/__tests__/adaptador-test';
import { migrarBaseDeDatos } from '@/db/database';
import * as items from '@/db/repositorios/items';
import { interpretar } from '@/features/captura/parser';

import { listarInstanciasPorFecha } from '../consultas';

// Sábado 4 de julio de 2026, 10:00 (el día real de la prueba del usuario).
const AHORA = new Date(2026, 6, 4, 10, 0);

let db: ConexionDePrueba;

beforeEach(async () => {
  db = crearBDenMemoria();
  await migrarBaseDeDatos(db);
});

afterEach(() => db.cerrar());

/** Replica exactamente lo que guarda hoja-captura.tsx. */
async function capturar(frase: string) {
  const r = interpretar(frase, AHORA);
  let fecha_inicio: string | null = null;
  let todo_el_dia = false;
  if (r.fecha && r.hora) {
    fecha_inicio = `${r.fecha}T${String(r.hora.hora).padStart(2, '0')}:${String(
      r.hora.minuto,
    ).padStart(2, '0')}`;
  } else if (r.fecha) {
    fecha_inicio = r.fecha;
    todo_el_dia = true;
  }
  return items.crear(db, {
    tipo: r.tipo,
    titulo: r.titulo,
    fecha_inicio,
    todo_el_dia,
    rrule: r.recurrencia?.rrule ?? null,
    rrule_fin: r.recurrencia?.fin ?? null,
  });
}

describe('repro: instancias recurrentes en los días del swipe', () => {
  it('«cada día» (sin hora) aparece hoy, mañana y pasado', async () => {
    await capturar('sacar la basura cada día');
    expect(await listarInstanciasPorFecha(db, '2026-07-04')).toHaveLength(1);
    expect(await listarInstanciasPorFecha(db, '2026-07-05')).toHaveLength(1);
    expect(await listarInstanciasPorFecha(db, '2026-07-06')).toHaveLength(1);
  });

  it('«cada día» con hora aparece los días siguientes', async () => {
    await capturar('pastilla cada día a las 21:35');
    expect(await listarInstanciasPorFecha(db, '2026-07-05')).toHaveLength(1);
    expect(await listarInstanciasPorFecha(db, '2026-07-11')).toHaveLength(1);
  });

  it('«cada jueves» aparece los jueves del rango del swipe', async () => {
    await capturar('pádel cada jueves 19h');
    // hoy es sábado 4: el jueves próximo es el 9
    expect(await listarInstanciasPorFecha(db, '2026-07-05')).toHaveLength(0);
    expect(await listarInstanciasPorFecha(db, '2026-07-09')).toHaveLength(1);
    expect(await listarInstanciasPorFecha(db, '2026-07-16')).toHaveLength(1);
  });

  it('«cada jueves durante 8 veces» avanza el contador por día', async () => {
    await capturar('inglés cada jueves durante 8 veces');
    const j1 = await listarInstanciasPorFecha(db, '2026-07-09');
    const j2 = await listarInstanciasPorFecha(db, '2026-07-16');
    const j3 = await listarInstanciasPorFecha(db, '2026-07-23');
    expect(j1[0]?.progreso).toEqual({ n: 1, total: 8 });
    expect(j2[0]?.progreso).toEqual({ n: 2, total: 8 });
    expect(j3[0]?.progreso).toEqual({ n: 3, total: 8 });
  });
});
