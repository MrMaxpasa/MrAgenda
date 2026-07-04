import { crearBDenMemoria, type ConexionDePrueba } from '@/db/__tests__/adaptador-test';
import { migrarBaseDeDatos } from '@/db/database';
import { crearHabito, listarHabitos } from '@/db/repositorios/habitos';
import * as items from '@/db/repositorios/items';

import { estadisticasDePeriodo } from '../estadisticas';
import { rangoDePeriodo } from '../periodos';

describe('rangoDePeriodo (natural: semana desde lunes, mes de calendario)', () => {
  const SABADO = new Date(2026, 6, 4); // sábado 4/7/2026

  it('hoy es un solo día', () => {
    expect(rangoDePeriodo('hoy', SABADO)).toEqual({ desde: '2026-07-04', hasta: '2026-07-04' });
  });

  it('semana natural de lunes a domingo', () => {
    expect(rangoDePeriodo('semana', SABADO)).toEqual({
      desde: '2026-06-29',
      hasta: '2026-07-05',
    });
    // el lunes ya pertenece a su propia semana
    expect(rangoDePeriodo('semana', new Date(2026, 6, 6))).toEqual({
      desde: '2026-07-06',
      hasta: '2026-07-12',
    });
  });

  it('mes de calendario, incluido febrero', () => {
    expect(rangoDePeriodo('mes', SABADO)).toEqual({ desde: '2026-07-01', hasta: '2026-07-31' });
    expect(rangoDePeriodo('mes', new Date(2026, 1, 10))).toEqual({
      desde: '2026-02-01',
      hasta: '2026-02-28',
    });
  });
});

describe('estadisticasDePeriodo', () => {
  let db: ConexionDePrueba;

  beforeEach(async () => {
    db = crearBDenMemoria();
    await migrarBaseDeDatos(db);
  });

  afterEach(() => db.cerrar());

  it('cuenta completadas y entrenos solo dentro del rango', async () => {
    const tarea = await items.crear(db, { tipo: 'tarea', titulo: 'Pan', fecha_inicio: '2026-07-03' });
    const gym = await items.crear(db, {
      tipo: 'entreno',
      titulo: 'Gym',
      fecha_inicio: '2026-07-02T17:00',
      rrule: 'FREQ=DAILY',
    });
    await items.completar(db, tarea.id, '2026-07-03');
    await items.completar(db, gym.id, '2026-07-02');
    await items.completar(db, gym.id, '2026-06-20'); // fuera de la semana

    const semana = await estadisticasDePeriodo(
      db,
      { desde: '2026-06-29', hasta: '2026-07-05' },
      '2026-07-04',
    );
    expect(semana.completadas).toBe(2);
    expect(semana.entrenos).toBe(1);

    const mes = await estadisticasDePeriodo(
      db,
      { desde: '2026-06-01', hasta: '2026-06-30' },
      '2026-07-04',
    );
    expect(mes.completadas).toBe(1); // solo la del 20 de junio
    expect(mes.entrenos).toBe(1);
  });

  it('rachas activas ordenadas y mejor récord', async () => {
    await crearHabito(db, { titulo: 'Agua', icono: '💧', dias: 'diario' });
    await crearHabito(db, { titulo: 'Leer', icono: '📖', dias: 'diario' });
    const [agua, leer] = await listarHabitos(db);

    for (const fecha of ['2026-07-01', '2026-07-02', '2026-07-03']) {
      await items.completar(db, agua!.item.id, fecha);
    }
    await items.completar(db, leer!.item.id, '2026-07-03');

    const e = await estadisticasDePeriodo(
      db,
      { desde: '2026-07-04', hasta: '2026-07-04' },
      '2026-07-04',
    );
    expect(e.rachas.map((r) => r.habito.item.titulo)).toEqual(['Agua', 'Leer']);
    expect(e.rachas[0]!.racha.actual).toBe(3);
    expect(e.mejorRecord?.habito.item.titulo).toBe('Agua');
    expect(e.mejorRecord?.racha.record).toBe(3);
  });

  it('sin datos devuelve ceros y sin récord', async () => {
    const e = await estadisticasDePeriodo(
      db,
      { desde: '2026-07-01', hasta: '2026-07-31' },
      '2026-07-04',
    );
    expect(e).toEqual({ completadas: 0, entrenos: 0, rachas: [], mejorRecord: null });
  });
});
