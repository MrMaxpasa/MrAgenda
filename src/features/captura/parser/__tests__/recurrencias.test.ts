import { descripcionRecurrencia, expandirEntre } from '@/lib/recurrencia';

import { interpretar } from '../index';

// Jueves 2 de julio de 2026, 9:41.
const AHORA = new Date(2026, 6, 2, 9, 41);
const i = (frase: string) => interpretar(frase, AHORA);

describe('recurrencias en la captura', () => {
  it('«pádel cada jueves 19h con Marc» — el ejemplo canónico de los docs', () => {
    const r = i('pádel cada jueves 19h con Marc');
    expect(r.tipo).toBe('entreno');
    expect(r.fecha).toBe('2026-07-02'); // hoy es jueves y las 19h no han pasado
    expect(r.hora).toEqual({ hora: 19, minuto: 0 });
    expect(r.titulo).toBe('Pádel con Marc');
    expect(r.recurrencia?.rrule).toContain('FREQ=WEEKLY');
    expect(r.recurrencia?.rrule).toContain('BYDAY=TH');
    expect(r.recurrencia?.fin).toBeNull();
    expect(r.recurrencia?.descripcion).toBe('cada jueves');
  });

  it('«cada noche» es diaria y conserva la hora', () => {
    const r = i('tomar medicación cada noche a las 21:30');
    expect(r.tipo).toBe('tarea');
    expect(r.recurrencia?.rrule).toContain('FREQ=DAILY');
    expect(r.recurrencia?.descripcion).toBe('cada día');
    expect(r.fecha).toBe('2026-07-02');
    expect(r.hora).toEqual({ hora: 21, minuto: 30 });
    expect(r.titulo).toBe('Tomar medicación');
  });

  it('«cada día» sin hora empieza hoy', () => {
    const r = i('beber agua cada día');
    expect(r.recurrencia?.rrule).toContain('FREQ=DAILY');
    expect(r.fecha).toBe('2026-07-02');
    expect(r.titulo).toBe('Beber agua');
  });

  it('«los lunes y jueves» — varios días', () => {
    const r = i('yoga los lunes y jueves');
    expect(r.tipo).toBe('entreno');
    expect(r.recurrencia?.rrule).toContain('BYDAY=MO,TH');
    expect(r.recurrencia?.descripcion).toBe('los lunes y jueves');
    expect(r.fecha).toBe('2026-07-02'); // el jueves (hoy) es el más cercano
    expect(r.titulo).toBe('Yoga');
  });

  it('«cada domingo durante 2 meses» se normaliza a COUNT con fin until', () => {
    const r = i('correr cada domingo durante 2 meses');
    expect(r.tipo).toBe('entreno');
    expect(r.fecha).toBe('2026-07-05'); // próximo domingo
    expect(r.recurrencia?.rrule).toContain('BYDAY=SU');
    expect(r.recurrencia?.rrule).toContain('COUNT=9'); // domingos del 5-jul al 5-sep
    expect(JSON.parse(r.recurrencia!.fin!)).toEqual({
      tipo: 'until',
      fecha: '2026-09-05',
      texto: 'durante 2 meses',
    });
    expect(r.titulo).toBe('Correr');
  });

  it('«durante 8 veces» es COUNT directo', () => {
    const r = i('clase de inglés cada martes durante 8 veces');
    expect(r.tipo).toBe('evento');
    expect(r.fecha).toBe('2026-07-07');
    expect(r.recurrencia?.rrule).toContain('COUNT=8');
    expect(JSON.parse(r.recurrencia!.fin!)).toEqual({ tipo: 'count', n: 8 });
    expect(r.titulo).toBe('Clase de inglés');
  });

  it('la fecha explícita manda como primera instancia', () => {
    const r = i('pagar alquiler cada mes el 1');
    expect(r.tipo).toBe('tarea');
    expect(r.recurrencia?.rrule).toContain('FREQ=MONTHLY');
    expect(r.fecha).toBe('2026-08-01'); // el 1 de julio ya pasó
    expect(r.titulo).toBe('Pagar alquiler');
  });

  it('«cada 2 semanas» lleva INTERVAL', () => {
    const r = i('revisión cada 2 semanas');
    expect(r.recurrencia?.rrule).toContain('FREQ=WEEKLY');
    expect(r.recurrencia?.rrule).toContain('INTERVAL=2');
    expect(r.fecha).toBe('2026-07-02');
  });

  it('«todos los días» también es diaria', () => {
    const r = i('estirar todos los días');
    expect(r.recurrencia?.rrule).toContain('FREQ=DAILY');
    expect(r.titulo).toBe('Estirar');
  });

  it('lista de tres días con horas', () => {
    const r = i('gym los lunes, miércoles y viernes a las 7:30');
    expect(r.tipo).toBe('entreno');
    expect(r.recurrencia?.rrule).toContain('BYDAY=MO,WE,FR');
    expect(r.recurrencia?.descripcion).toBe('los lunes, miércoles y viernes');
    expect(r.fecha).toBe('2026-07-03'); // el viernes es el más cercano
    expect(r.hora).toEqual({ hora: 7, minuto: 30 });
    expect(r.titulo).toBe('Gym');
  });

  it('sin patrón de recurrencia no hay recurrencia', () => {
    expect(i('comprar pan').recurrencia).toBeNull();
  });

  it('un fin suelto («8 veces») sin frecuencia no es recurrencia', () => {
    const r = i('leer 8 veces');
    expect(r.recurrencia).toBeNull();
    expect(r.titulo).toBe('Leer 8 veces');
  });

  it('solo la recurrencia usa el texto original como título', () => {
    const r = i('cada jueves');
    expect(r.fecha).toBe('2026-07-02');
    expect(r.recurrencia).not.toBeNull();
    expect(r.titulo).toBe('Cada jueves');
  });
});

describe('descripcionRecurrencia', () => {
  test.each<[string, string | null, string]>([
    ['FREQ=DAILY', null, 'cada día'],
    ['FREQ=DAILY;INTERVAL=2', null, 'cada 2 días'],
    ['FREQ=WEEKLY', null, 'cada semana'],
    ['FREQ=MONTHLY', null, 'cada mes'],
    ['FREQ=WEEKLY;BYDAY=MO,TH', null, 'los lunes y jueves'],
    ['FREQ=WEEKLY;BYDAY=TU;COUNT=8', '{"tipo":"count","n":8}', 'cada martes durante 8 veces'],
    [
      'FREQ=WEEKLY;BYDAY=SU;COUNT=9',
      '{"tipo":"until","fecha":"2026-09-05","texto":"durante 2 meses"}',
      'cada domingo durante 2 meses',
    ],
    ['FREQ=WEEKLY;BYDAY=SU;COUNT=9', '{"tipo":"until","fecha":"2026-09-05"}', 'cada domingo hasta el 5 de septiembre'],
  ])('%s → %s', (rrule, fin, esperado) => {
    expect(descripcionRecurrencia(rrule, fin)).toBe(esperado);
  });

  it('con conFin:false omite el «durante N veces» (lo cubre el progreso)', () => {
    expect(
      descripcionRecurrencia('FREQ=WEEKLY;BYDAY=TU;COUNT=8', '{"tipo":"count","n":8}', {
        conFin: false,
      }),
    ).toBe('cada martes');
  });
});

describe('expandirEntre (hora flotante)', () => {
  it('expande una semanal dentro de la ventana, extremos incluidos', () => {
    expect(expandirEntre('FREQ=WEEKLY;BYDAY=TH', '2026-07-02T19:00', '2026-07-01', '2026-07-31')).toEqual([
      '2026-07-02',
      '2026-07-09',
      '2026-07-16',
      '2026-07-23',
      '2026-07-30',
    ]);
  });

  it('respeta COUNT aunque la ventana sea mayor', () => {
    expect(expandirEntre('FREQ=DAILY;COUNT=3', '2026-07-02', '2026-07-01', '2026-07-31')).toEqual([
      '2026-07-02',
      '2026-07-03',
      '2026-07-04',
    ]);
  });

  it('una diaria con hora no se desplaza de día', () => {
    expect(expandirEntre('FREQ=DAILY', '2026-07-02T23:30', '2026-07-02', '2026-07-04')).toEqual([
      '2026-07-02',
      '2026-07-03',
      '2026-07-04',
    ]);
  });
});
