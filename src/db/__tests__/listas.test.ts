import { crearBDenMemoria, type ConexionDePrueba } from './adaptador-test';
import { migrarBaseDeDatos } from '../database';
import { enlacesDe } from '../repositorios/enlaces';
import * as items from '../repositorios/items';
import {
  anadirElemento,
  asegurarLista,
  elementosDeLista,
  listarListas,
} from '../repositorios/listas';
import { MIGRACIONES } from '../schema';

let db: ConexionDePrueba;

afterEach(() => db.cerrar());

describe('migración v2: listas legado (cuerpo «Lista: X»)', () => {
  it('crea contenedoras, enlaza los elementos y limpia el cuerpo', async () => {
    db = crearBDenMemoria();
    // solo v1, como estaba una BD de Fase 4
    await db.execAsync(MIGRACIONES[0]!.sql);
    await db.execAsync('PRAGMA user_version = 1;');
    await db.runAsync(
      `INSERT INTO items (id, tipo, titulo, cuerpo, todo_el_dia, nivel_aviso, estado, creado_en, actualizado_en)
       VALUES ('e1', 'lista', 'Pan', 'Lista: compra', 1, 1, 'pendiente', '', ''),
              ('e2', 'lista', 'Leche', 'Lista: compra', 1, 1, 'pendiente', '', ''),
              ('e3', 'lista', 'Dune', 'Lista: libros', 1, 1, 'pendiente', '', '');`,
      [],
    );

    await migrarBaseDeDatos(db); // aplica v2

    const listas = await listarListas(db);
    expect(listas.map((l) => `${l.item.titulo} ${l.pendientes}/${l.total}`)).toEqual([
      'Compra 2/2',
      'Libros 1/1',
    ]);

    const compra = listas[0]!;
    const elementos = await elementosDeLista(db, compra.item.id);
    expect(elementos.map((e) => e.titulo).sort()).toEqual(['Leche', 'Pan']);
    expect(elementos.every((e) => e.cuerpo === null)).toBe(true);
  });
});

describe('repositorio de listas', () => {
  beforeEach(async () => {
    db = crearBDenMemoria();
    await migrarBaseDeDatos(db);
  });

  it('asegurarLista no duplica (sin distinguir mayúsculas)', async () => {
    const a = await asegurarLista(db, 'compra');
    const b = await asegurarLista(db, 'Compra');
    expect(b.id).toBe(a.id);
    expect(a.titulo).toBe('Compra');
  });

  it('añadir, contar y marcar elementos', async () => {
    const lista = await asegurarLista(db, 'compra');
    const pan = await anadirElemento(db, lista.id, 'pan');
    await anadirElemento(db, lista.id, 'leche');

    let [resumen] = await listarListas(db);
    expect(resumen).toMatchObject({ total: 2, pendientes: 2 });

    await items.actualizar(db, pan.id, { estado: 'hecho' });
    [resumen] = await listarListas(db);
    expect(resumen).toMatchObject({ total: 2, pendientes: 1 });

    // los hechos van al final
    const elementos = await elementosDeLista(db, lista.id);
    expect(elementos.map((e) => e.titulo)).toEqual(['Leche', 'Pan']);
  });

  it('los elementos de lista no aparecen en Hoy ni como contenedoras', async () => {
    const lista = await asegurarLista(db, 'compra');
    await anadirElemento(db, lista.id, 'pan');
    expect(await items.listarPorFecha(db, '2026-07-05')).toEqual([]);
    expect((await listarListas(db)).map((l) => l.item.titulo)).toEqual(['Compra']);
  });

  it('enlacesDe funciona en ambas direcciones (base del mapa mental)', async () => {
    const lista = await asegurarLista(db, 'compra');
    const pan = await anadirElemento(db, lista.id, 'pan');

    const desdeElemento = await enlacesDe(db, pan.id);
    expect(desdeElemento[0]?.item.id).toBe(lista.id);
    expect(desdeElemento[0]?.tipo).toBe('en-lista');

    const desdeLista = await enlacesDe(db, lista.id);
    expect(desdeLista[0]?.item.id).toBe(pan.id);
  });
});
