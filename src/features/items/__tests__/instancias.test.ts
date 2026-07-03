import { crearBDenMemoria, type ConexionDePrueba } from '@/db/__tests__/adaptador-test';
import { migrarBaseDeDatos } from '@/db/database';
import { crearExcepcion, type Excepcion } from '@/db/repositorios/excepciones';
import * as items from '@/db/repositorios/items';
import type { Item } from '@/db/tipos';

import { listarInstanciasPorFecha } from '../consultas';
import { instanciasEnDia, progresoDe } from '../instancias';

const serieBase: Item = {
  id: 'serie-1',
  tipo: 'entreno',
  titulo: 'Gym',
  cuerpo: null,
  fecha_inicio: '2026-07-02T08:00',
  fecha_fin: null,
  todo_el_dia: false,
  rrule: 'FREQ=DAILY',
  rrule_fin: null,
  nivel_aviso: 1,
  aviso_offset_min: null,
  estado: 'pendiente',
  creado_en: '2026-07-01T00:00:00Z',
  actualizado_en: '2026-07-01T00:00:00Z',
};

describe('instanciasEnDia (pura)', () => {
  it('una diaria aparece cada día desde su inicio', () => {
    expect(instanciasEnDia(serieBase, [], '2026-07-01')).toHaveLength(0);
    expect(instanciasEnDia(serieBase, [], '2026-07-02')).toHaveLength(1);
    const [inst] = instanciasEnDia(serieBase, [], '2026-07-05');
    expect(inst?.fechaOriginal).toBe('2026-07-05');
  });

  it('una excepción «saltar» quita esa instancia sin tocar el resto', () => {
    const exc: Excepcion[] = [
      { item_id: 'serie-1', fecha_original: '2026-07-03', accion: 'saltar', nueva_fecha: null },
    ];
    expect(instanciasEnDia(serieBase, exc, '2026-07-03')).toHaveLength(0);
    expect(instanciasEnDia(serieBase, exc, '2026-07-04')).toHaveLength(1);
  });

  it('una excepción «mover» la muestra en el destino con su fecha original', () => {
    const exc: Excepcion[] = [
      { item_id: 'serie-1', fecha_original: '2026-07-03', accion: 'mover', nueva_fecha: '2026-07-05' },
    ];
    expect(instanciasEnDia(serieBase, exc, '2026-07-03')).toHaveLength(0);
    const del5 = instanciasEnDia(serieBase, exc, '2026-07-05');
    expect(del5).toHaveLength(2); // la natural del 5 + la movida del 3
    expect(del5.map((i) => i.fechaOriginal).sort()).toEqual(['2026-07-03', '2026-07-05']);
  });

  it('progresoDe calcula «n de total» en series con COUNT', () => {
    const conFin: Item = {
      ...serieBase,
      rrule: 'FREQ=WEEKLY;BYDAY=TH;COUNT=8',
      rrule_fin: '{"tipo":"count","n":8}',
    };
    expect(progresoDe(conFin, '2026-07-02')).toEqual({ n: 1, total: 8 });
    expect(progresoDe(conFin, '2026-07-30')).toEqual({ n: 5, total: 8 });
    expect(progresoDe(serieBase, '2026-07-30')).toBeNull(); // infinita
  });
});

describe('listarInstanciasPorFecha y ciclo de vida (BD real)', () => {
  let db: ConexionDePrueba;

  beforeEach(async () => {
    db = crearBDenMemoria();
    await migrarBaseDeDatos(db);
  });

  afterEach(() => db.cerrar());

  it('mezcla simples y recurrentes ordenando por hora', async () => {
    await items.crear(db, {
      tipo: 'entreno',
      titulo: 'Gym',
      fecha_inicio: '2026-07-02T08:00',
      rrule: 'FREQ=DAILY',
    });
    await items.crear(db, { tipo: 'evento', titulo: 'Reunión', fecha_inicio: '2026-07-02T10:00' });
    await items.crear(db, {
      tipo: 'tarea',
      titulo: 'Colada',
      fecha_inicio: '2026-07-02',
      todo_el_dia: true,
    });

    const dia = await listarInstanciasPorFecha(db, '2026-07-02');
    expect(dia.map((i) => i.item.titulo)).toEqual(['Gym', 'Reunión', 'Colada']);

    const siguiente = await listarInstanciasPorFecha(db, '2026-07-03');
    expect(siguiente.map((i) => i.item.titulo)).toEqual(['Gym']); // solo la serie sigue
  });

  it('completar una instancia no marca la serie: solo ese día queda hecho', async () => {
    const serie = await items.crear(db, {
      tipo: 'entreno',
      titulo: 'Gym',
      fecha_inicio: '2026-07-02T08:00',
      rrule: 'FREQ=DAILY',
    });
    await items.completar(db, serie.id, '2026-07-02');

    expect((await items.obtenerPorId(db, serie.id))?.estado).toBe('pendiente');
    const dia2 = await listarInstanciasPorFecha(db, '2026-07-02');
    const dia3 = await listarInstanciasPorFecha(db, '2026-07-03');
    expect(dia2[0]?.hecha).toBe(true);
    expect(dia3[0]?.hecha).toBe(false);
  });

  it('la excepción «mover» reubica la instancia en la consulta del día', async () => {
    const serie = await items.crear(db, {
      tipo: 'entreno',
      titulo: 'Gym',
      fecha_inicio: '2026-07-02T08:00',
      rrule: 'FREQ=DAILY',
    });
    await crearExcepcion(db, serie.id, '2026-07-03', 'mover', '2026-07-04');

    expect(await listarInstanciasPorFecha(db, '2026-07-03')).toHaveLength(0);
    const dia4 = await listarInstanciasPorFecha(db, '2026-07-04');
    expect(dia4).toHaveLength(2);
    expect(dia4.map((i) => i.fechaOriginal).sort()).toEqual(['2026-07-03', '2026-07-04']);
  });

  it('el progreso «n de total» llega hasta la vista', async () => {
    await items.crear(db, {
      tipo: 'evento',
      titulo: 'Inglés',
      fecha_inicio: '2026-07-07T18:00',
      rrule: 'FREQ=WEEKLY;BYDAY=TU;COUNT=8',
      rrule_fin: '{"tipo":"count","n":8}',
    });
    const dia = await listarInstanciasPorFecha(db, '2026-07-14');
    expect(dia[0]?.progreso).toEqual({ n: 2, total: 8 });
  });

  describe('dividirSerie («todas las futuras»)', () => {
    it('trunca la vieja y crea la nueva con el COUNT restante', async () => {
      const serie = await items.crear(db, {
        tipo: 'entreno',
        titulo: 'Gym',
        fecha_inicio: '2026-07-02T08:00',
        rrule: 'FREQ=DAILY;COUNT=8',
        rrule_fin: '{"tipo":"count","n":8}',
      });
      const nueva = await items.dividirSerie(db, serie.id, '2026-07-05', {
        fecha_inicio: '2026-07-05T09:00',
      });

      const vieja = await items.obtenerPorId(db, serie.id);
      expect(vieja?.rrule).toContain('COUNT=3'); // 2, 3 y 4 de julio
      expect(nueva?.fecha_inicio).toBe('2026-07-05T09:00');
      expect(nueva?.rrule).toContain('COUNT=5');
      expect(JSON.parse(nueva!.rrule_fin!)).toEqual({ tipo: 'count', n: 5 });

      // el 4 sigue siendo de la vieja a las 8; el 5 ya es de la nueva a las 9
      const dia4 = await listarInstanciasPorFecha(db, '2026-07-04');
      const dia5 = await listarInstanciasPorFecha(db, '2026-07-05');
      expect(dia4).toHaveLength(1);
      expect(dia4[0]?.item.id).toBe(serie.id);
      expect(dia5).toHaveLength(1);
      expect(dia5[0]?.item.id).toBe(nueva!.id);
      expect(dia5[0]?.item.fecha_inicio).toBe('2026-07-05T09:00');
    });

    it('si se divide en la primera instancia, edita la serie en el sitio', async () => {
      const serie = await items.crear(db, {
        tipo: 'entreno',
        titulo: 'Gym',
        fecha_inicio: '2026-07-02T08:00',
        rrule: 'FREQ=DAILY',
      });
      const resultado = await items.dividirSerie(db, serie.id, '2026-07-02', {
        fecha_inicio: '2026-07-02T09:30',
      });
      expect(resultado?.id).toBe(serie.id);
      expect(resultado?.fecha_inicio).toBe('2026-07-02T09:30');
    });
  });
});
