import { migrarBaseDeDatos } from '../database';
import * as items from '../repositorios/items';
import { anadirElemento, asegurarLista } from '../repositorios/listas';
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

describe('migración v3: una nota nunca lleva hora', () => {
  // la migración corre en beforeEach, así que se siembra el legado a mano y se
  // aplica el SQL de la v3 tal cual: es lo que verá la base del móvil al abrir
  const aplicarV3 = async () => {
    await db.execAsync(MIGRACIONES.find((m) => m.version === 3)!.sql);
  };

  it('convierte las notas con hora en tareas, conservando día, hora y aviso', async () => {
    const peli = await items.crear(db, {
      tipo: 'nota',
      titulo: 'Peli',
      fecha_inicio: '2026-07-02T21:00',
      nivel_aviso: 2,
    });
    await aplicarV3();

    const migrada = await items.obtenerPorId(db, peli.id);
    expect(migrada?.tipo).toBe('tarea');
    expect(migrada?.fecha_inicio).toBe('2026-07-02T21:00');
    expect(migrada?.nivel_aviso).toBe(2);
  });

  it('no toca las notas de día completo, las notas sin fecha ni otros tipos', async () => {
    const delDia = await items.crear(db, {
      tipo: 'nota',
      titulo: 'Nota del lunes',
      fecha_inicio: '2026-07-06',
      todo_el_dia: true,
    });
    const suelta = await items.crear(db, { tipo: 'nota', titulo: 'Idea suelta' });
    const evento = await items.crear(db, {
      tipo: 'evento',
      titulo: 'Cena',
      fecha_inicio: '2026-07-02T21:00',
    });
    await aplicarV3();

    expect((await items.obtenerPorId(db, delDia.id))?.tipo).toBe('nota');
    expect((await items.obtenerPorId(db, suelta.id))?.tipo).toBe('nota');
    expect((await items.obtenerPorId(db, evento.id))?.tipo).toBe('evento');
  });

  it('es idempotente: aplicarla dos veces no cambia nada más', async () => {
    await items.crear(db, { tipo: 'nota', titulo: 'Peli', fecha_inicio: '2026-07-02T21:00' });
    await aplicarV3();
    await aplicarV3();

    const notas = await items.listarPorTipo(db, 'nota');
    expect(notas).toEqual([]);
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

describe('listarTareasSueltas (apartado Tareas de Todo)', () => {
  it('devuelve pendientes sin fecha y vencidas; nunca notas ni series', async () => {
    await items.crear(db, { tipo: 'tarea', titulo: 'Sin fecha' });
    await items.crear(db, { tipo: 'tarea', titulo: 'Vencida', fecha_inicio: '2026-07-01' });
    await items.crear(db, { tipo: 'tarea', titulo: 'Futura', fecha_inicio: '2026-07-09' });
    await items.crear(db, { tipo: 'nota', titulo: 'Nota suelta' });
    await items.crear(db, {
      tipo: 'entreno',
      titulo: 'Serie',
      fecha_inicio: '2026-06-01T08:00',
      rrule: 'FREQ=DAILY',
    });
    const hecha = await items.crear(db, { tipo: 'tarea', titulo: 'Hecha sin fecha' });
    await items.completar(db, hecha.id, '2026-07-04');

    const sueltas = await items.listarTareasSueltas(db, '2026-07-05');
    expect(sueltas.map((i) => i.titulo)).toEqual(['Vencida', 'Sin fecha']);
  });

  it('pone las vencidas arriba, la más antigua primero', async () => {
    await items.crear(db, { tipo: 'tarea', titulo: 'Sin fecha' });
    await items.crear(db, { tipo: 'tarea', titulo: 'Ayer', fecha_inicio: '2026-07-04' });
    await items.crear(db, { tipo: 'tarea', titulo: 'Hace una semana', fecha_inicio: '2026-06-28' });

    const sueltas = await items.listarTareasSueltas(db, '2026-07-05');
    expect(sueltas.map((i) => i.titulo)).toEqual(['Hace una semana', 'Ayer', 'Sin fecha']);
  });
});

describe('listarPendientesEntre (Próximos 7 días)', () => {
  it('devuelve los pendientes puntuales de la ventana, por día y hora', async () => {
    await items.crear(db, { tipo: 'evento', titulo: 'Dentista', fecha_inicio: '2026-07-08T10:30' });
    await items.crear(db, {
      tipo: 'tarea',
      titulo: 'Recoger paquete',
      fecha_inicio: '2026-07-06',
      todo_el_dia: true,
    });
    await items.crear(db, { tipo: 'tarea', titulo: 'Llamar', fecha_inicio: '2026-07-06T09:00' });

    const ventana = await items.listarPendientesEntre(db, '2026-07-05', '2026-07-11');
    expect(ventana.map((i) => i.titulo)).toEqual(['Llamar', 'Recoger paquete', 'Dentista']);
  });

  it('deja fuera series, hechas, archivadas y lo que cae fuera de la ventana', async () => {
    await items.crear(db, {
      tipo: 'entreno',
      titulo: 'Gym',
      fecha_inicio: '2026-07-01T08:00',
      rrule: 'FREQ=DAILY',
    });
    await items.crear(db, { tipo: 'tarea', titulo: 'Ayer', fecha_inicio: '2026-07-04' });
    await items.crear(db, { tipo: 'tarea', titulo: 'En un mes', fecha_inicio: '2026-08-05' });
    const hecha = await items.crear(db, {
      tipo: 'tarea',
      titulo: 'Ya hecha',
      fecha_inicio: '2026-07-06',
    });
    await items.completar(db, hecha.id, '2026-07-06');
    const archivada = await items.crear(db, {
      tipo: 'tarea',
      titulo: 'Archivada',
      fecha_inicio: '2026-07-07',
    });
    await items.archivar(db, archivada.id);

    const ventana = await items.listarPendientesEntre(db, '2026-07-05', '2026-07-11');
    expect(ventana).toEqual([]);
  });
});

describe('contarPorCategoria (chips de Todo)', () => {
  it('cuenta cada categoría por separado', async () => {
    await items.crear(db, {
      tipo: 'entreno',
      titulo: 'Gym',
      fecha_inicio: '2026-07-01T08:00',
      rrule: 'FREQ=DAILY',
    });
    await items.crear(db, { tipo: 'tarea', titulo: 'Sin fecha' });
    await items.crear(db, { tipo: 'tarea', titulo: 'Vencida', fecha_inicio: '2026-07-01' });
    await items.crear(db, { tipo: 'tarea', titulo: 'Futura', fecha_inicio: '2026-07-09' });
    await items.crear(db, { tipo: 'nota', titulo: 'Una nota' });
    await items.crear(db, { tipo: 'referencia', titulo: 'Wifi' });

    const conteo = await items.contarPorCategoria(db, '2026-07-05');
    expect(conteo).toEqual({ rutinas: 1, tareas: 2, listas: 0, notas: 1, referencia: 1 });
  });

  it('cuenta las listas contenedoras, no sus elementos', async () => {
    const compra = await asegurarLista(db, 'compra');
    await anadirElemento(db, compra.id, 'pan');
    await anadirElemento(db, compra.id, 'leche');

    const conteo = await items.contarPorCategoria(db, '2026-07-05');
    expect(conteo.listas).toBe(1);
  });
});

describe('editar un ítem (Fase 6)', () => {
  it('editar el título de una serie no toca su rrule ni rrule_fin', async () => {
    const serie = await items.crear(db, {
      tipo: 'entreno',
      titulo: 'Gym',
      fecha_inicio: '2026-07-02T17:00',
      rrule: 'FREQ=WEEKLY;BYDAY=TH;COUNT=8',
      rrule_fin: '{"tipo":"count","n":8}',
    });
    const editado = await items.actualizar(db, serie.id, { titulo: 'Gym torso' });
    expect(editado?.titulo).toBe('Gym torso');
    expect(editado?.rrule).toBe('FREQ=WEEKLY;BYDAY=TH;COUNT=8');
    expect(editado?.rrule_fin).toBe('{"tipo":"count","n":8}');
    expect(editado?.fecha_inicio).toBe('2026-07-02T17:00');
  });

  it('editar fecha/hora de un ítem puntual las cambia', async () => {
    const item = await items.crear(db, {
      tipo: 'tarea',
      titulo: 'Colada',
      fecha_inicio: '2026-07-02',
      todo_el_dia: true,
    });
    const editado = await items.actualizar(db, item.id, {
      fecha_inicio: '2026-07-05T19:30',
      todo_el_dia: false,
    });
    expect(editado?.fecha_inicio).toBe('2026-07-05T19:30');
    expect(editado?.todo_el_dia).toBe(false);
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
