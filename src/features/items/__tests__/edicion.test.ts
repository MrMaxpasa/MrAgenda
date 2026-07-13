// Edición universal: comprueba las secuencias de repositorio que compone el
// modal (HojaEditar) para series con historial, y el constructor de RRULE
// desde los chips del editor.

import { crearBDenMemoria, type ConexionDePrueba } from '@/db/__tests__/adaptador-test';
import { migrarBaseDeDatos } from '@/db/database';
import { crearExcepcion } from '@/db/repositorios/excepciones';
import * as items from '@/db/repositorios/items';
import { rruleDesdeSeleccion, seleccionDeRrule } from '@/lib/recurrencia';

import { listarInstanciasPorFecha } from '../consultas';

const sel = (extra: Partial<import('@/lib/recurrencia').SeleccionRecurrencia>) => ({
  frecuencia: 'ninguna' as const,
  dias: [],
  intervalo: 1,
  cuenta: null,
  ...extra,
});

describe('rruleDesdeSeleccion / seleccionDeRrule (puras)', () => {
  it('construye semanal con días concretos (JS: 2=martes, 4=jueves)', () => {
    const { rrule } = rruleDesdeSeleccion(sel({ frecuencia: 'semanal', dias: [2, 4] }), '2026-07-07');
    expect(rrule).toContain('FREQ=WEEKLY');
    expect(rrule).toContain('BYDAY=TU,TH');
  });

  it('semanal sin días usa el día de la semana de la fecha base', () => {
    // 2026-07-07 es martes → BYDAY=TU
    const { rrule } = rruleDesdeSeleccion(sel({ frecuencia: 'semanal', dias: [] }), '2026-07-07');
    expect(rrule).toContain('BYDAY=TU');
  });

  it('cada día y cada mes', () => {
    expect(rruleDesdeSeleccion(sel({ frecuencia: 'diaria' }), '2026-07-07').rrule).toContain(
      'FREQ=DAILY',
    );
    expect(rruleDesdeSeleccion(sel({ frecuencia: 'mensual' }), '2026-07-07').rrule).toContain(
      'FREQ=MONTHLY',
    );
  });

  it('intervalo y fin: «cada 2 semanas los lunes, durante 8 veces»', () => {
    const { rrule, fin } = rruleDesdeSeleccion(
      sel({ frecuencia: 'semanal', dias: [1], intervalo: 2, cuenta: 8 }),
      '2026-07-07',
    );
    expect(rrule).toContain('INTERVAL=2');
    expect(rrule).toContain('BYDAY=MO');
    expect(rrule).toContain('COUNT=8');
    expect(JSON.parse(fin!)).toEqual({ tipo: 'count', n: 8 });
  });

  it('«no se repite» devuelve rrule null', () => {
    expect(rruleDesdeSeleccion(sel({ frecuencia: 'ninguna' }), '2026-07-07')).toEqual({
      rrule: null,
      fin: null,
    });
  });

  it('seleccionDeRrule es la inversa para precargar el editor', () => {
    expect(seleccionDeRrule(null)).toEqual(sel({}));
    expect(seleccionDeRrule('FREQ=DAILY')).toEqual(sel({ frecuencia: 'diaria' }));
    expect(seleccionDeRrule('FREQ=MONTHLY')).toEqual(sel({ frecuencia: 'mensual' }));
    const s = seleccionDeRrule('FREQ=WEEKLY;INTERVAL=2;BYDAY=TU,TH;COUNT=8');
    expect(s.frecuencia).toBe('semanal');
    expect([...s.dias].sort((a, b) => a - b)).toEqual([2, 4]);
    expect(s.intervalo).toBe(2);
    expect(s.cuenta).toBe(8);
  });
});

describe('edición de series con historial (BD real)', () => {
  let db: ConexionDePrueba;

  beforeEach(async () => {
    db = crearBDenMemoria();
    await migrarBaseDeDatos(db);
  });

  afterEach(() => db.cerrar());

  it('editar solo el título no divide la serie y conserva los completados', async () => {
    const serie = await items.crear(db, {
      tipo: 'entreno',
      titulo: 'Gym',
      fecha_inicio: '2026-07-07T18:00',
      rrule: 'FREQ=WEEKLY;BYDAY=TU',
    });
    await items.completar(db, serie.id, '2026-07-07');

    await items.actualizar(db, serie.id, { titulo: 'Gimnasio' });

    const actualizada = await items.obtenerPorId(db, serie.id);
    expect(actualizada?.titulo).toBe('Gimnasio');
    expect(actualizada?.rrule).toBe('FREQ=WEEKLY;BYDAY=TU'); // intacta
    expect(await items.listarCompletados(db)).toEqual([{ item_id: serie.id, fecha: '2026-07-07' }]);
  });

  it('«solo esta vez» mueve una instancia sin tocar la serie (crea excepción)', async () => {
    const serie = await items.crear(db, {
      tipo: 'evento',
      titulo: 'Inglés',
      fecha_inicio: '2026-07-07T18:00',
      rrule: 'FREQ=WEEKLY;BYDAY=TU',
    });
    await crearExcepcion(db, serie.id, '2026-07-14', 'mover', '2026-07-15');

    expect(await listarInstanciasPorFecha(db, '2026-07-14')).toHaveLength(0);
    const dia15 = await listarInstanciasPorFecha(db, '2026-07-15');
    expect(dia15.map((i) => i.fechaOriginal)).toEqual(['2026-07-14']);
    // la serie sigue intacta (misma rrule)
    expect((await items.obtenerPorId(db, serie.id))?.rrule).toBe('FREQ=WEEKLY;BYDAY=TU');
  });

  it('cambiar la regla entera divide desde hoy y conserva el historial anterior', async () => {
    const serie = await items.crear(db, {
      tipo: 'evento',
      titulo: 'Inglés',
      fecha_inicio: '2026-07-07T18:00', // martes
      rrule: 'FREQ=WEEKLY;BYDAY=TU',
    });
    await items.completar(db, serie.id, '2026-07-07');

    // «cada martes» → «cada jueves», partiendo desde 2026-07-16 (jueves)
    const nueva = await items.dividirSerie(db, serie.id, '2026-07-16', {
      rrule: 'FREQ=WEEKLY;BYDAY=TH',
      rrule_fin: null,
    });

    // la vieja se trunca a los 2 martes previos (07-07 y 07-14)
    const vieja = await items.obtenerPorId(db, serie.id);
    expect(vieja?.rrule).toContain('COUNT=2');
    // el completado previo sigue ahí
    expect(await items.listarCompletados(db)).toEqual([{ item_id: serie.id, fecha: '2026-07-07' }]);

    // ya no hay martes futuros de la vieja; los jueves los rige la nueva
    expect(await listarInstanciasPorFecha(db, '2026-07-21')).toHaveLength(0); // martes
    const jueves = await listarInstanciasPorFecha(db, '2026-07-23');
    expect(jueves).toHaveLength(1);
    expect(jueves[0]?.item.id).toBe(nueva!.id);
    expect(nueva?.rrule).toContain('BYDAY=TH');
  });

  it('quitar la recurrencia deja un ítem suelto desde hoy y conserva lo anterior', async () => {
    const serie = await items.crear(db, {
      tipo: 'tarea',
      titulo: 'Regar',
      fecha_inicio: '2026-07-07T09:00',
      rrule: 'FREQ=DAILY',
    });
    await items.completar(db, serie.id, '2026-07-07');

    // quitar: dividir desde hoy y anular la rrule de la parte nueva
    const nueva = await items.dividirSerie(db, serie.id, '2026-07-16', {});
    await items.actualizar(db, nueva!.id, { rrule: null, rrule_fin: null });

    const suelto = await items.obtenerPorId(db, nueva!.id);
    expect(suelto?.rrule).toBeNull();
    expect(suelto?.fecha_inicio).toBe('2026-07-16T09:00');
    // ya no se repite: el 17 no aparece nada de la parte nueva
    const dia17 = await listarInstanciasPorFecha(db, '2026-07-17');
    expect(dia17.some((i) => i.item.id === nueva!.id)).toBe(false);
    // el historial anterior se mantiene
    expect(await items.listarCompletados(db)).toEqual([{ item_id: serie.id, fecha: '2026-07-07' }]);
  });

  it('añadir recurrencia a un ítem suelto lo hace expandirse', async () => {
    const suelto = await items.crear(db, {
      tipo: 'tarea',
      titulo: 'Estirar',
      fecha_inicio: '2026-07-07T09:00',
    });
    await items.actualizar(db, suelto.id, {
      rrule: rruleDesdeSeleccion(sel({ frecuencia: 'diaria' }), '2026-07-07').rrule,
      rrule_fin: null,
    });

    expect(await listarInstanciasPorFecha(db, '2026-07-07')).toHaveLength(1);
    const dia9 = await listarInstanciasPorFecha(db, '2026-07-09');
    expect(dia9.map((i) => i.item.id)).toEqual([suelto.id]);
  });
});
