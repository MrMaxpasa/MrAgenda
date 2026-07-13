// REGLA DE PRODUCTO: una nota nunca lleva hora. Si algo ocurre a una hora, es
// un evento. Con prefijo explícito («nota:», «idea:», «ref:») manda el usuario:
// sigue siendo nota y es la hora la que se descarta, quedándose en el título.

import { interpretar } from '../index';
import type { InterpretacionCaptura } from '../tipos';

// Jueves 2 de julio de 2026, 9:41 (el mismo «ahora» que el resto de suites).
const AHORA = new Date(2026, 6, 2, 9, 41);
const i = (frase: string): InterpretacionCaptura => interpretar(frase, AHORA);

describe('una nota con hora se convierte en evento', () => {
  it('con día explícito', () => {
    const r = i('peli el sábado a las 21');
    expect(r.tipo).toBe('evento');
    expect(r.titulo).toBe('Peli');
    expect(r.fecha).toBe('2026-07-04');
    expect(r.hora).toEqual({ hora: 21, minuto: 0 });
  });

  it('solo con hora: el día lo deriva la app (hoy o mañana)', () => {
    const r = i('pastilla a las 8');
    expect(r.tipo).toBe('evento');
    expect(r.titulo).toBe('Pastilla');
    expect(r.fecha).toBe('2026-07-03'); // las 8 ya pasaron → mañana
    expect(r.hora).toEqual({ hora: 8, minuto: 0 });
  });

  it('con recurrencia → evento recurrente', () => {
    const r = i('ensayo cada martes a las 19');
    expect(r.tipo).toBe('evento');
    expect(r.titulo).toBe('Ensayo');
    expect(r.recurrencia?.descripcion).toBe('cada martes');
    expect(r.hora).toEqual({ hora: 19, minuto: 0 });
  });

  it('la hora de la tarde sigue su regla al convertir («a las 5» → 17:00)', () => {
    const r = i('peluquería a las 5');
    expect(r.tipo).toBe('evento');
    expect(r.hora).toEqual({ hora: 17, minuto: 0 });
  });
});

describe('el prefijo manda: la nota se queda, la hora se va al título', () => {
  it('«idea: …» conserva el tipo nota y no extrae hora', () => {
    const r = i('idea: llamar a Marta a las 5');
    expect(r.tipo).toBe('nota');
    expect(r.hora).toBeNull();
    expect(r.fecha).toBeNull(); // sin hora no se deriva hoy/mañana
    expect(r.titulo).toBe('Llamar a Marta a las 5'); // la hora no se pierde
  });

  it('«nota: …» tampoco', () => {
    const r = i('nota: el tren sale a las 19:30');
    expect(r.tipo).toBe('nota');
    expect(r.hora).toBeNull();
    expect(r.titulo).toContain('19:30');
  });

  it('«ref: …» sigue siendo referencia y sin hora', () => {
    const r = i('ref: la farmacia abre a las 9');
    expect(r.tipo).toBe('referencia');
    expect(r.hora).toBeNull();
  });
});

describe('lo que ya funcionaba no cambia', () => {
  it('una nota sin hora sigue siendo nota', () => {
    const r = i('regalo para Marta un libro de cocina');
    expect(r.tipo).toBe('nota');
    expect(r.hora).toBeNull();
  });

  it('una nota con día pero sin hora conserva su día (nota de un día)', () => {
    const r = i('idea: repasar el presupuesto el lunes');
    expect(r.tipo).toBe('nota');
    expect(r.fecha).toBe('2026-07-06');
    expect(r.hora).toBeNull();
  });
});

describe('invariante: ninguna interpretación devuelve nota (ni referencia) con hora', () => {
  const CORPUS = [
    'pádel cada jueves 19h con Marc',
    'gym mañana a las 7',
    'cena con Marta el sábado a las 21:30',
    'peli a las 22',
    'dentista el 15 a las 10:15',
    'comprar pan',
    'he gastado 12€ en comida',
    'idea: regalo para Marta un libro de cocina',
    'nota: el wifi es 12345678',
    'ref: talla de zapatos 43',
    'reunión el lunes a las 9 y media',
    'colada cada martes',
    'medicación cada día a las 8',
    'llamar al taller a las 5',
    'presentación el jueves a las 10',
    'concierto el 15 de agosto a las 22',
    'yoga los lunes y jueves a las 18',
    'sacar la basura',
    'cumpleaños de Marta el 4',
    'añade pan a la compra',
    'esto no lo entiende nadie',
    'boda el 3 de enero a las 12',
  ];

  test.each(CORPUS)('«%s»', (frase) => {
    const r = i(frase);
    if (r.tipo === 'nota' || r.tipo === 'referencia') expect(r.hora).toBeNull();
  });
});
