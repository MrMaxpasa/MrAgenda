import { migrarBaseDeDatos } from '../database';
import * as items from '../repositorios/items';
import { MIGRACIONES } from '../schema';

import { crearBDenMemoria, type ConexionDePrueba } from './adaptador-test';

let db: ConexionDePrueba;

beforeEach(async () => {
  db = crearBDenMemoria();
  await migrarBaseDeDatos(db);
});

afterEach(() => {
  db.cerrar();
});

describe('migraciones sobre SQLite real', () => {
  it('dejan user_version en la última versión', async () => {
    const fila = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;', []);
    expect(fila?.user_version).toBe(MIGRACIONES[MIGRACIONES.length - 1]!.version);
  });

  it('son idempotentes: migrar dos veces no falla ni repite', async () => {
    await expect(migrarBaseDeDatos(db)).resolves.toBeUndefined();
  });
});

describe('crear y leer', () => {
  it('crea un ítem con valores por defecto y lo recupera', async () => {
    const creado = await items.crear(db, { tipo: 'tarea', titulo: 'Comprar pan' });
    expect(creado.id).toMatch(/^[0-9a-f]{32}$/);
    expect(creado.estado).toBe('pendiente');
    expect(creado.nivel_aviso).toBe(1);
    expect(creado.todo_el_dia).toBe(false);
    expect(creado.fecha_inicio).toBeNull();

    const leido = await items.obtenerPorId(db, creado.id);
    expect(leido).toEqual(creado);
  });

  it('obtenerPorId devuelve null si no existe', async () => {
    expect(await items.obtenerPorId(db, 'no-existe')).toBeNull();
  });
});

describe('listarPorFecha', () => {
  it('devuelve solo el día pedido, con hora ordenada y día completo al final', async () => {
    await items.crear(db, { tipo: 'evento', titulo: 'Reunión', fecha_inicio: '2026-07-02T10:00' });
    await items.crear(db, { tipo: 'evento', titulo: 'Desayuno', fecha_inicio: '2026-07-02T08:00' });
    await items.crear(db, {
      tipo: 'tarea',
      titulo: 'Colada',
      fecha_inicio: '2026-07-02',
      todo_el_dia: true,
    });
    await items.crear(db, { tipo: 'evento', titulo: 'Otro día', fecha_inicio: '2026-07-03T09:00' });
    await items.crear(db, { tipo: 'nota', titulo: 'Sin fecha' });

    const delDia = await items.listarPorFecha(db, '2026-07-02');
    expect(delDia.map((i) => i.titulo)).toEqual(['Desayuno', 'Reunión', 'Colada']);
  });

  it('excluye los archivados', async () => {
    const item = await items.crear(db, {
      tipo: 'tarea',
      titulo: 'Vieja',
      fecha_inicio: '2026-07-02T09:00',
    });
    await items.archivar(db, item.id);
    expect(await items.listarPorFecha(db, '2026-07-02')).toEqual([]);
  });

  it('incluye los hechos (se muestran tachados en Hoy)', async () => {
    const item = await items.crear(db, {
      tipo: 'tarea',
      titulo: 'Hecha',
      fecha_inicio: '2026-07-02T09:00',
    });
    await items.completar(db, item.id, '2026-07-02');
    const delDia = await items.listarPorFecha(db, '2026-07-02');
    expect(delDia).toHaveLength(1);
    expect(delDia[0]!.estado).toBe('hecho');
  });
});

describe('actualizar y archivar', () => {
  it('actualiza campos sueltos sin tocar el resto', async () => {
    const item = await items.crear(db, { tipo: 'nota', titulo: 'Borrador', cuerpo: 'texto' });
    const actualizado = await items.actualizar(db, item.id, { titulo: 'Definitivo' });
    expect(actualizado?.titulo).toBe('Definitivo');
    expect(actualizado?.cuerpo).toBe('texto');
  });

  it('archivar cambia el estado', async () => {
    const item = await items.crear(db, { tipo: 'nota', titulo: 'Vieja' });
    await items.archivar(db, item.id);
    expect((await items.obtenerPorId(db, item.id))?.estado).toBe('archivado');
  });
});

describe('completar y reabrir', () => {
  it('completar marca hecho y registra en completados', async () => {
    const item = await items.crear(db, {
      tipo: 'tarea',
      titulo: 'Regar',
      fecha_inicio: '2026-07-02',
      todo_el_dia: true,
    });
    await items.completar(db, item.id, '2026-07-02');

    expect((await items.obtenerPorId(db, item.id))?.estado).toBe('hecho');
    const log = await db.getAllAsync<{ item_id: string; fecha: string }>(
      'SELECT item_id, fecha FROM completados;',
      [],
    );
    expect(log).toEqual([{ item_id: item.id, fecha: '2026-07-02' }]);
  });

  it('reabrir vuelve a pendiente y limpia el log de esa instancia', async () => {
    const item = await items.crear(db, {
      tipo: 'tarea',
      titulo: 'Regar',
      fecha_inicio: '2026-07-02',
      todo_el_dia: true,
    });
    await items.completar(db, item.id, '2026-07-02');
    await items.reabrir(db, item.id, '2026-07-02');

    expect((await items.obtenerPorId(db, item.id))?.estado).toBe('pendiente');
    expect(await db.getAllAsync('SELECT * FROM completados;', [])).toEqual([]);
  });
});

describe('posponer', () => {
  it('mueve la fecha conservando la hora', async () => {
    const item = await items.crear(db, {
      tipo: 'evento',
      titulo: 'Gym',
      fecha_inicio: '2026-07-02T17:00',
    });
    await items.posponer(db, item.id, '2026-07-03');
    expect((await items.obtenerPorId(db, item.id))?.fecha_inicio).toBe('2026-07-03T17:00');
  });

  it('mueve un ítem de día completo sin inventarle hora', async () => {
    const item = await items.crear(db, {
      tipo: 'tarea',
      titulo: 'Colada',
      fecha_inicio: '2026-07-02',
      todo_el_dia: true,
    });
    await items.posponer(db, item.id, '2026-07-05');
    const movido = await items.obtenerPorId(db, item.id);
    expect(movido?.fecha_inicio).toBe('2026-07-05');
    expect(movido?.todo_el_dia).toBe(true);
  });

  it('a un ítem sin fecha le asigna la nueva como día completo', async () => {
    const item = await items.crear(db, { tipo: 'nota', titulo: 'Leer artículo' });
    await items.posponer(db, item.id, '2026-07-04');
    const movido = await items.obtenerPorId(db, item.id);
    expect(movido?.fecha_inicio).toBe('2026-07-04');
    expect(movido?.todo_el_dia).toBe(true);
  });
});
