import type { Excepcion } from '@/db/repositorios/excepciones';
import type { Item } from '@/db/tipos';

import { resumirRutinas } from '../rutinas';

// 2026-07-13 es lunes
const HOY = '2026-07-13';

function serie(parcial: Partial<Item> & { id: string; rrule: string }): Item {
  return {
    tipo: 'tarea',
    titulo: 'Serie',
    cuerpo: null,
    fecha_inicio: '2026-07-07T19:00',
    fecha_fin: null,
    todo_el_dia: false,
    rrule_fin: null,
    nivel_aviso: 1,
    aviso_offset_min: null,
    estado: 'pendiente',
    creado_en: '2026-07-01T00:00:00Z',
    actualizado_en: '2026-07-01T00:00:00Z',
    ...parcial,
  } as Item;
}

describe('resumirRutinas', () => {
  it('una serie infinita aparece una vez, con patrón y próxima ocurrencia', () => {
    const colada = serie({
      id: 'colada',
      titulo: 'Colada',
      rrule: 'FREQ=WEEKLY;BYDAY=TU',
      fecha_inicio: '2026-07-07',
      todo_el_dia: true,
    });

    const [rutina] = resumirRutinas([colada], [], HOY);
    expect(rutina?.patron).toBe('cada martes');
    expect(rutina?.proxima).toBe('2026-07-14');
    expect(rutina?.hora).toBeNull();
    expect(rutina?.progreso).toBeNull();
    expect(rutina?.terminada).toBe(false);
  });

  it('una diaria propone hoy mismo como próxima', () => {
    const gym = serie({ id: 'gym', titulo: 'Gym', tipo: 'entreno', rrule: 'FREQ=DAILY' });
    const [rutina] = resumirRutinas([gym], [], HOY);
    expect(rutina?.patron).toBe('cada día');
    expect(rutina?.proxima).toBe(HOY);
    expect(rutina?.hora).toBe('19:00');
  });

  it('una serie con fin trae su progreso «n de total»', () => {
    const padel = serie({
      id: 'padel',
      titulo: 'Pádel',
      rrule: 'FREQ=WEEKLY;COUNT=8;BYDAY=TH',
      rrule_fin: JSON.stringify({ tipo: 'count', n: 8 }),
      fecha_inicio: '2026-06-18T19:00',
    });

    const [rutina] = resumirRutinas([padel], [], HOY);
    // jueves 18/6 es la 1ª; la del 16/7 es la 5ª
    expect(rutina?.patron).toBe('cada jueves');
    expect(rutina?.proxima).toBe('2026-07-16');
    expect(rutina?.progreso).toEqual({ n: 5, total: 8 });
    expect(rutina?.terminada).toBe(false);
  });

  it('una serie con fin agotada se marca como terminada, sin próxima', () => {
    const padel = serie({
      id: 'padel',
      titulo: 'Pádel',
      rrule: 'FREQ=WEEKLY;COUNT=4;BYDAY=TH',
      rrule_fin: JSON.stringify({ tipo: 'count', n: 4 }),
      fecha_inicio: '2026-06-04T19:00',
    });

    const [rutina] = resumirRutinas([padel], [], HOY);
    expect(rutina?.proxima).toBeNull();
    expect(rutina?.terminada).toBe(true);
    expect(rutina?.progreso).toEqual({ n: 4, total: 4 });
  });

  it('una instancia saltada no cuenta como próxima: propone la siguiente', () => {
    const colada = serie({
      id: 'colada',
      rrule: 'FREQ=WEEKLY;BYDAY=TU',
      fecha_inicio: '2026-07-07',
      todo_el_dia: true,
    });
    const excepciones: Excepcion[] = [
      { item_id: 'colada', fecha_original: '2026-07-14', accion: 'saltar', nueva_fecha: null },
    ];

    const [rutina] = resumirRutinas([colada], excepciones, HOY);
    expect(rutina?.proxima).toBe('2026-07-21');
  });

  it('una instancia movida se anuncia en su nueva fecha', () => {
    const colada = serie({
      id: 'colada',
      rrule: 'FREQ=WEEKLY;BYDAY=TU',
      fecha_inicio: '2026-07-07',
      todo_el_dia: true,
    });
    const excepciones: Excepcion[] = [
      { item_id: 'colada', fecha_original: '2026-07-14', accion: 'mover', nueva_fecha: '2026-07-13' },
    ];

    const [rutina] = resumirRutinas([colada], excepciones, HOY);
    expect(rutina?.proxima).toBe('2026-07-13');
  });

  it('encuentra la próxima de una mensual lejana (ventana ampliada)', () => {
    const revision = serie({
      id: 'itv',
      titulo: 'ITV',
      rrule: 'FREQ=MONTHLY;INTERVAL=6',
      fecha_inicio: '2026-05-10',
      todo_el_dia: true,
    });

    const [rutina] = resumirRutinas([revision], [], HOY);
    expect(rutina?.patron).toBe('cada 6 meses');
    expect(rutina?.proxima).toBe('2026-11-10');
  });

  it('ordena por próxima ocurrencia y deja las terminadas al final', () => {
    const gym = serie({ id: 'gym', titulo: 'Gym', rrule: 'FREQ=DAILY' });
    const colada = serie({
      id: 'colada',
      titulo: 'Colada',
      rrule: 'FREQ=WEEKLY;BYDAY=TU',
      fecha_inicio: '2026-07-07',
      todo_el_dia: true,
    });
    const terminada = serie({
      id: 'padel',
      titulo: 'Pádel',
      rrule: 'FREQ=WEEKLY;COUNT=2;BYDAY=TH',
      rrule_fin: JSON.stringify({ tipo: 'count', n: 2 }),
      fecha_inicio: '2026-06-04T19:00',
    });

    const orden = resumirRutinas([terminada, colada, gym], [], HOY).map((r) => r.item.titulo);
    expect(orden).toEqual(['Gym', 'Colada', 'Pádel']);
  });

  it('ignora lo que no es una serie válida', () => {
    const sinFecha = serie({ id: 'x', rrule: 'FREQ=DAILY', fecha_inicio: null });
    expect(resumirRutinas([sinFecha], [], HOY)).toEqual([]);
  });
});
