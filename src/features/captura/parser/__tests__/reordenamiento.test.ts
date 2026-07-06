// Frente A: el parser no debe depender del orden de las palabras. Por cada
// frase canónica se prueban varias permutaciones y se exige el MISMO
// resultado (fecha, hora, recurrencia, tipo, personas), y el título donde
// es estable. Los extractores escanean todo el texto, así que esto fija esa
// garantía y detecta cualquier regresión futura hacia dependencia de orden.

import { interpretar } from '../index';
import type { InterpretacionCaptura } from '../tipos';

// Jueves 2 de julio de 2026, 9:41.
const AHORA = new Date(2026, 6, 2, 9, 41);
const i = (frase: string) => interpretar(frase, AHORA);

type Esperado = Partial<
  Pick<InterpretacionCaptura, 'tipo' | 'fecha' | 'personas' | 'titulo'>
> & { hora?: { hora: number; minuto: number } | null };

function comprobar(r: InterpretacionCaptura, e: Esperado) {
  if (e.tipo !== undefined) expect(r.tipo).toBe(e.tipo);
  if (e.fecha !== undefined) expect(r.fecha).toBe(e.fecha);
  if (e.hora !== undefined) expect(r.hora).toEqual(e.hora);
  if (e.personas !== undefined) expect(r.personas).toEqual(e.personas);
  if (e.titulo !== undefined) expect(r.titulo).toBe(e.titulo);
}

describe('mismas entidades sin importar el orden', () => {
  describe.each<[string, string[], Esperado]>([
    [
      'gym + martes + 19h', // hoy es jueves 2/7 → el próximo martes es el 7
      ['martes gym 19h', 'gym el martes a las 19', 'a las 19 el martes, gym', 'gym 19h martes'],
      { tipo: 'entreno', fecha: '2026-07-07', hora: { hora: 19, minuto: 0 }, titulo: 'Gym' },
    ],
    [
      'reunión + mañana + 10:00',
      ['reunión mañana 10:00', 'mañana reunión a las 10', 'a las 10 reunión mañana'],
      { tipo: 'evento', fecha: '2026-07-03', hora: { hora: 10, minuto: 0 }, titulo: 'Reunión' },
    ],
    [
      'pádel + cada jueves + 19h (recurrencia invariable)',
      ['pádel cada jueves 19h', 'cada jueves pádel a las 19', '19h cada jueves pádel'],
      { tipo: 'entreno', fecha: '2026-07-02', hora: { hora: 19, minuto: 0 } },
    ],
    [
      'llamar a mamá + el lunes',
      ['llamar a mamá el lunes', 'el lunes llamar a mamá'],
      { tipo: 'tarea', fecha: '2026-07-06', titulo: 'Llamar a mamá' },
    ],
  ])('%s', (_nombre, frases, esperado) => {
    test.each(frases)('«%s»', (frase) => comprobar(i(frase), esperado));

    it('la recurrencia (si la hay) es idéntica en todas', () => {
      const rrules = frases.map((f) => i(f).recurrencia?.rrule ?? null);
      expect(new Set(rrules).size).toBe(1);
    });
  });
});

describe('reordenar la persona: entidades iguales, título coherente', () => {
  it('«con Marta» detecta la persona vaya donde vaya', () => {
    for (const frase of [
      'cena con Marta el viernes',
      'con Marta cena el viernes',
      'el viernes cena con Marta',
    ]) {
      const r = i(frase);
      expect(r.personas).toEqual(['Marta']);
      expect(r.fecha).toBe('2026-07-03');
      expect(r.tipo).toBe('evento');
    }
  });

  it('el título suelta la persona de arranque y la conserva tras el núcleo', () => {
    expect(i('cena con Marta el viernes').titulo).toBe('Cena con Marta');
    expect(i('con Marta cena el viernes').titulo).toBe('Cena');
  });
});

describe('frases sin entidades no se alteran por el orden', () => {
  it('mismo texto → mismo título, sin fecha/hora', () => {
    const r = i('comprar pan');
    expect(r).toMatchObject({ titulo: 'Comprar pan', fecha: null, hora: null, tipo: 'tarea' });
  });
});
