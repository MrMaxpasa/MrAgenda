import { crearBDenMemoria, type ConexionDePrueba } from '@/db/__tests__/adaptador-test';
import { migrarBaseDeDatos } from '@/db/database';
import * as items from '@/db/repositorios/items';

import type { AnalisisDia } from '../analisis';
import { ejecutarSugerencia, elegirSugerencia } from '../sugerencias';

const base: AnalisisDia = {
  densidad: 'tranquilo',
  conHora: 1,
  primeraCita: null,
  huecoLibre: null,
  rachaEnRiesgo: null,
  pendientesArrastrados: 0,
  cumpleanos: null,
};

describe('elegirSugerencia (prioridad de docs/02 §7)', () => {
  it('racha en riesgo + hueco gana a todo', () => {
    const s = elegirSugerencia({
      ...base,
      rachaEnRiesgo: { titulo: 'Gym', icono: '🏃', racha: 6 },
      huecoLibre: { desde: '17:00', hasta: '19:00' },
      pendientesArrastrados: 4,
      primeraCita: { titulo: 'Reunión', hora: '10:00' },
    });
    expect(s).toEqual({
      tipo: 'reservar',
      etiqueta: '↺ Reservar 17:00 para Gym',
      habito: 'Gym',
      hora: '17:00',
    });
  });

  it('racha sin hueco no propone reservar: caen los arrastrados', () => {
    const s = elegirSugerencia({
      ...base,
      rachaEnRiesgo: { titulo: 'Gym', icono: '🏃', racha: 6 },
      pendientesArrastrados: 2,
    });
    expect(s?.tipo).toBe('arrastrados');
    expect(s?.etiqueta).toBe('✓ Traer 2 pendientes a hoy');
  });

  it('sin nada mejor, preparar la primera cita', () => {
    const s = elegirSugerencia({ ...base, primeraCita: { titulo: 'Entrevista', hora: '12:00' } });
    expect(s).toMatchObject({ tipo: 'preparar', etiqueta: '☕ Preparar «Entrevista»' });
  });

  it('sin situaciones no hay sugerencia', () => {
    expect(elegirSugerencia(base)).toBeNull();
  });
});

describe('ejecutarSugerencia (BD real)', () => {
  let db: ConexionDePrueba;

  beforeEach(async () => {
    db = crearBDenMemoria();
    await migrarBaseDeDatos(db);
  });

  afterEach(() => db.cerrar());

  it('reservar crea el bloque a la hora del hueco (entreno si es deportivo)', async () => {
    const mensaje = await ejecutarSugerencia(
      db,
      { tipo: 'reservar', etiqueta: '', habito: 'Gym', hora: '17:00' },
      '2026-07-05',
    );
    expect(mensaje).toBe('Reservado a las 17:00 ✓');
    const dia = await items.listarPorFecha(db, '2026-07-05');
    expect(dia[0]).toMatchObject({ tipo: 'entreno', titulo: 'Gym', fecha_inicio: '2026-07-05T17:00' });
  });

  it('traer arrastrados los mueve a hoy sin hora («Cuando puedas»)', async () => {
    await items.crear(db, { tipo: 'tarea', titulo: 'Vieja 1', fecha_inicio: '2026-07-01T10:00' });
    await items.crear(db, { tipo: 'tarea', titulo: 'Vieja 2', fecha_inicio: '2026-07-03' , todo_el_dia: true });

    const mensaje = await ejecutarSugerencia(
      db,
      { tipo: 'arrastrados', etiqueta: '', n: 2 },
      '2026-07-05',
    );
    expect(mensaje).toBe('2 pendientes traídos a hoy ✓');
    expect(await items.listarPendientesAnteriores(db, '2026-07-05')).toEqual([]);
    const hoy = await items.listarPorFecha(db, '2026-07-05');
    expect(hoy.map((i) => i.titulo).sort()).toEqual(['Vieja 1', 'Vieja 2']);
    expect(hoy.every((i) => i.todo_el_dia)).toBe(true);
  });

  it('preparar crea la tarea del día sin hora', async () => {
    await ejecutarSugerencia(
      db,
      { tipo: 'preparar', etiqueta: '', titulo: 'Entrevista' },
      '2026-07-05',
    );
    const hoy = await items.listarPorFecha(db, '2026-07-05');
    expect(hoy[0]).toMatchObject({ tipo: 'tarea', titulo: 'Preparar Entrevista', todo_el_dia: true });
  });
});
