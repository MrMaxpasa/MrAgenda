import { crearBDenMemoria, type ConexionDePrueba } from '@/db/__tests__/adaptador-test';
import { migrarBaseDeDatos } from '@/db/database';
import * as items from '@/db/repositorios/items';
import { guardarSesion, sesionesDeItem, ultimasSesiones, type Sesion } from '@/db/repositorios/sesiones';
import { listarInstanciasPorFecha } from '@/features/items/consultas';

import { resumenUltimaMarca } from '../marca';

describe('resumenUltimaMarca (pura)', () => {
  const sesion = (ejercicios: Sesion['ejercicios']): Sesion => ({
    id: 's',
    item_id: 'x',
    fecha: '2026-07-03',
    ejercicios,
  });

  it('elige el ejercicio con la serie de mayor peso, con coma decimal', () => {
    const r = resumenUltimaMarca(
      sesion([
        { nombre: 'press banca', series: [{ reps: 8, peso: 60 }, { reps: 6, peso: 62.5 }] },
        { nombre: 'remo', series: [{ reps: 10, peso: 50 }] },
      ]),
    );
    expect(r).toBe('press banca 62,5 kg');
  });

  it('sin pesos usa el primer ejercicio y sus series', () => {
    expect(
      resumenUltimaMarca(
        sesion([{ nombre: 'dominadas', series: [{ reps: 10, peso: null }, { reps: 8, peso: null }] }]),
      ),
    ).toBe('dominadas ×2');
  });

  it('sesión vacía no produce marca', () => {
    expect(resumenUltimaMarca(sesion([]))).toBeNull();
  });
});

describe('repositorio de sesiones + última marca en la vista', () => {
  let db: ConexionDePrueba;

  beforeEach(async () => {
    db = crearBDenMemoria();
    await migrarBaseDeDatos(db);
  });

  afterEach(() => db.cerrar());

  it('guarda y recupera el historial de un entreno en orden', async () => {
    const entreno = await items.crear(db, {
      tipo: 'entreno',
      titulo: 'Torso',
      fecha_inicio: '2026-07-02T17:00',
      rrule: 'FREQ=WEEKLY;BYDAY=TH',
    });
    await guardarSesion(db, entreno.id, '2026-07-02', [
      { nombre: 'press banca', series: [{ reps: 8, peso: 60 }] },
    ]);
    await guardarSesion(db, entreno.id, '2026-07-09', [
      { nombre: 'press banca', series: [{ reps: 8, peso: 62.5 }] },
    ]);

    const historial = await sesionesDeItem(db, entreno.id);
    expect(historial).toHaveLength(2);
    expect(historial[1]!.ejercicios[0]!.series[0]!.peso).toBe(62.5);

    const ultimas = await ultimasSesiones(db);
    expect(ultimas.get(entreno.id)?.fecha).toBe('2026-07-09');
  });

  it('la instancia del entreno en Hoy lleva la última marca', async () => {
    const entreno = await items.crear(db, {
      tipo: 'entreno',
      titulo: 'Torso',
      fecha_inicio: '2026-07-02T17:00',
      rrule: 'FREQ=WEEKLY;BYDAY=TH',
    });
    await guardarSesion(db, entreno.id, '2026-07-02', [
      { nombre: 'press banca', series: [{ reps: 6, peso: 62.5 }] },
    ]);

    const siguienteJueves = await listarInstanciasPorFecha(db, '2026-07-09');
    expect(siguienteJueves[0]?.ultimaMarca).toBe('press banca 62,5 kg');

    // los que no son entrenos no llevan marca
    await items.crear(db, { tipo: 'evento', titulo: 'Reunión', fecha_inicio: '2026-07-09T10:00' });
    const dia = await listarInstanciasPorFecha(db, '2026-07-09');
    expect(dia.find((i) => i.item.tipo === 'evento')?.ultimaMarca).toBeUndefined();
  });
});
