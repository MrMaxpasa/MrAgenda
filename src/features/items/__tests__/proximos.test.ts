// «Próximos 7 días»: puntuales + series NO diarias, cada una en su día.
// El criterio es la frecuencia: una diaria saldría los 7 días (ruido) y vive
// solo en Rutinas; una semanal sale 1-2 veces y es la semana real del usuario.

import { crearBDenMemoria, type ConexionDePrueba } from '@/db/__tests__/adaptador-test';
import { migrarBaseDeDatos } from '@/db/database';
import { crearExcepcion } from '@/db/repositorios/excepciones';
import * as items from '@/db/repositorios/items';

import { listarPendientesDeVentana } from '../consultas';

// ventana de prueba: lunes 13/7/2026 → domingo 19/7/2026
const DESDE = '2026-07-13';
const HASTA = '2026-07-19';

let db: ConexionDePrueba;

beforeEach(async () => {
  db = crearBDenMemoria();
  await migrarBaseDeDatos(db);
});

afterEach(() => {
  db.cerrar();
});

const titulos = async () =>
  (await listarPendientesDeVentana(db, DESDE, HASTA)).map((i) => `${i.fecha} ${i.item.titulo}`);

describe('criterio de frecuencia', () => {
  it('una serie diaria NO aparece: vive solo en Rutinas', async () => {
    await items.crear(db, {
      tipo: 'entreno',
      titulo: 'Gym',
      fecha_inicio: '2026-07-01T19:00',
      rrule: 'FREQ=DAILY',
    });
    expect(await titulos()).toEqual([]);
  });

  it('una serie semanal SÍ aparece, en su día', async () => {
    await items.crear(db, {
      tipo: 'evento',
      titulo: 'Pádel',
      fecha_inicio: '2026-07-02T12:00',
      rrule: 'FREQ=WEEKLY;BYDAY=TH',
    });
    expect(await titulos()).toEqual(['2026-07-16 Pádel']); // jueves, una sola vez
  });

  it('una semanal de dos días sale en sus dos días', async () => {
    await items.crear(db, {
      tipo: 'tarea',
      titulo: 'Clase',
      fecha_inicio: '2026-07-06T18:00',
      rrule: 'FREQ=WEEKLY;BYDAY=MO,TH',
    });
    expect(await titulos()).toEqual(['2026-07-13 Clase', '2026-07-16 Clase']);
  });

  it('una serie con fin trae su progreso «2 de 3»', async () => {
    await items.crear(db, {
      tipo: 'evento',
      titulo: 'Pádel',
      fecha_inicio: '2026-07-09T12:00',
      rrule: 'FREQ=WEEKLY;COUNT=3;BYDAY=TH',
      rrule_fin: JSON.stringify({ tipo: 'count', n: 3 }),
    });
    const [instancia] = await listarPendientesDeVentana(db, DESDE, HASTA);
    expect(instancia?.fecha).toBe('2026-07-16');
    expect(instancia?.progreso).toEqual({ n: 2, total: 3 });
  });

  it('una serie cada 2 semanas aparece solo la semana que le toca', async () => {
    await items.crear(db, {
      tipo: 'tarea',
      titulo: 'Colada',
      fecha_inicio: '2026-07-07',
      todo_el_dia: true,
      rrule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=TU',
    });
    expect(await titulos()).toEqual([]); // la siguiente cae el 21, fuera de la ventana
    expect(
      (await listarPendientesDeVentana(db, '2026-07-20', '2026-07-26')).map((i) => i.fecha),
    ).toEqual(['2026-07-21']);
  });
});

describe('mezcla con los ítems puntuales', () => {
  it('ordena por día y, dentro del día, con hora antes que sin hora', async () => {
    await items.crear(db, {
      tipo: 'evento',
      titulo: 'Pádel',
      fecha_inicio: '2026-07-02T12:00',
      rrule: 'FREQ=WEEKLY;BYDAY=TH',
    });
    await items.crear(db, {
      tipo: 'tarea',
      titulo: 'Recoger paquete',
      fecha_inicio: '2026-07-16',
      todo_el_dia: true,
    });
    await items.crear(db, { tipo: 'evento', titulo: 'Dentista', fecha_inicio: '2026-07-16T09:30' });
    await items.crear(db, { tipo: 'tarea', titulo: 'Llamar', fecha_inicio: '2026-07-14T10:00' });

    expect(await titulos()).toEqual([
      '2026-07-14 Llamar',
      '2026-07-16 Dentista',
      '2026-07-16 Pádel',
      '2026-07-16 Recoger paquete',
    ]);
  });

  it('deja fuera lo ya completado, lo archivado y lo de fuera de la ventana', async () => {
    const serie = await items.crear(db, {
      tipo: 'evento',
      titulo: 'Pádel',
      fecha_inicio: '2026-07-02T12:00',
      rrule: 'FREQ=WEEKLY;BYDAY=TH',
    });
    await items.completar(db, serie.id, '2026-07-16');
    const hecha = await items.crear(db, {
      tipo: 'tarea',
      titulo: 'Ya hecha',
      fecha_inicio: '2026-07-15',
    });
    await items.completar(db, hecha.id, '2026-07-15');
    await items.crear(db, { tipo: 'tarea', titulo: 'La semana que viene', fecha_inicio: '2026-07-27' });

    expect(await titulos()).toEqual([]);
  });

  it('respeta las excepciones de la serie: saltar la quita, mover la recoloca', async () => {
    const serie = await items.crear(db, {
      tipo: 'evento',
      titulo: 'Pádel',
      fecha_inicio: '2026-07-02T12:00',
      rrule: 'FREQ=WEEKLY;BYDAY=TH',
    });
    await crearExcepcion(db, serie.id, '2026-07-16', 'mover', '2026-07-17');
    expect(await titulos()).toEqual(['2026-07-17 Pádel']);

    await crearExcepcion(db, serie.id, '2026-07-16', 'saltar');
    expect(await titulos()).toEqual([]);
  });
});
