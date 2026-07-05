// Fase 4: personas («con Marc»), cantidades («12€») y listas
// («añade pan a la compra»). 50 frases nuevas.

import { interpretar } from '../index';
import type { InterpretacionCaptura } from '../tipos';

// Jueves 2 de julio de 2026, 9:41.
const AHORA = new Date(2026, 6, 2, 9, 41);
const i = (frase: string): InterpretacionCaptura => interpretar(frase, AHORA);

type Esperado = Partial<
  Pick<InterpretacionCaptura, 'tipo' | 'titulo' | 'fecha' | 'personas' | 'cantidad' | 'lista'>
>;

function comprobar(frase: string, esperado: Esperado) {
  const r = i(frase);
  if (esperado.tipo !== undefined) expect(r.tipo).toBe(esperado.tipo);
  if (esperado.titulo !== undefined) expect(r.titulo).toBe(esperado.titulo);
  if (esperado.fecha !== undefined) expect(r.fecha).toBe(esperado.fecha);
  if (esperado.personas !== undefined) expect(r.personas).toEqual(esperado.personas);
  if (esperado.cantidad !== undefined) expect(r.cantidad).toBe(esperado.cantidad);
  if (esperado.lista !== undefined) expect(r.lista).toEqual(esperado.lista);
}

describe('personas («con Marc»)', () => {
  test.each<[string, Esperado]>([
    ['pádel cada jueves 19h con Marc', { personas: ['Marc'], titulo: 'Pádel con Marc' }],
    ['cena con Marta y Ana el viernes', { personas: ['Marta', 'Ana'], fecha: '2026-07-03' }],
    ['reunión con Carlos, Laura y Pedro mañana', { personas: ['Carlos', 'Laura', 'Pedro'], fecha: '2026-07-03' }],
    ['café con Álvaro a las 4', { personas: ['Álvaro'], titulo: 'Café con Álvaro' }],
    ['cita con María el lunes', { personas: ['María'], fecha: '2026-07-06' }],
    ['comida con Irene e Inés', { personas: ['Irene', 'Inés'] }],
    ['viaje con Juan el 15 de agosto', { personas: ['Juan'], fecha: '2026-08-15' }],
    ['entrenar con Pablo los lunes y jueves', { personas: ['Pablo'], tipo: 'entreno' }],
    // heurística documentada: sin mayúscula no es persona
    ['paseo con el equipo', { personas: [] }],
    ['cena con marc', { personas: [] }],
    ['cita con el dentista mañana', { personas: [], fecha: '2026-07-03' }],
    ['llamar a mamá', { personas: [] }],
    ['convento a las 5', { personas: [] }], // «con» dentro de palabra no cuenta
    ['quedada con Marta, ana y Luis', { personas: ['Marta', 'Luis'] }], // ana en minúscula se salta
    ['tomar algo con Nacho hoy', { personas: ['Nacho'], fecha: '2026-07-02' }],
  ])('%s', (frase, esperado) => comprobar(frase, esperado));

  it('el título conserva el «con Marc» (como el mockup)', () => {
    expect(i('pádel el viernes con Marc').titulo).toBe('Pádel con Marc');
  });
});

describe('cantidades («12€»)', () => {
  test.each<[string, Esperado]>([
    ['he gastado 12€ en comida', { cantidad: 12, tipo: 'nota' }],
    ['cena 30€ con Marta', { cantidad: 30, personas: ['Marta'] }],
    ['12,50 euros de taxi', { cantidad: 12.5 }],
    ['pagar 50€ del gimnasio', { cantidad: 50, tipo: 'tarea' }], // el verbo sigue mandando
    ['100 € de luz', { cantidad: 100 }],
    ['3 euros el café', { cantidad: 3 }],
    ['gasté 9.99€ en la app', { cantidad: 9.99 }],
    ['presupuesto 1200€ para la reforma', { cantidad: 1200 }],
    ['1 euro de propina', { cantidad: 1 }],
    ['comprar pan', { cantidad: null }],
  ])('%s', (frase, esperado) => comprobar(frase, esperado));
});

describe('listas («añade pan a la compra»)', () => {
  test.each<[string, Esperado]>([
    ['añade pan a la compra', { lista: { elemento: 'pan', lista: 'compra' } }],
    ['anade pan a la compra', { lista: { elemento: 'pan', lista: 'compra' } }], // sin ñ
    ['apunta leche en la lista de la compra', { lista: { elemento: 'leche', lista: 'compra' } }],
    ['pon pilas en la lista de regalos', { lista: { elemento: 'pilas', lista: 'regalos' } }],
    ['mete cerveza en la compra', { lista: { elemento: 'cerveza', lista: 'compra' } }],
    ['añade el señor de los anillos a películas', { lista: { elemento: 'el señor de los anillos', lista: 'películas' } }],
    ['añade libro de cocina a regalos', { lista: { elemento: 'libro de cocina', lista: 'regalos' } }],
    ['pon el pijama en la maleta', { lista: { elemento: 'el pijama', lista: 'maleta' } }],
    ['apunta dune en la lista de libros', { lista: { elemento: 'dune', lista: 'libros' } }],
    ['añade queso y membrillo a la compra', { lista: { elemento: 'queso y membrillo', lista: 'compra' } }],
    // sin patrón completo no hay lista
    ['apunta wifi R2D2', { lista: null }],
    ['añade a la compra', { lista: null }],
  ])('%s', (frase, esperado) => comprobar(frase, esperado));

  it('la lista aporta fragmento para el chip', () => {
    const r = i('añade pan a la compra');
    expect(r.fragmentos.some((f) => f.campo === 'lista')).toBe(true);
  });
});

describe('combinadas y regresión', () => {
  test.each<[string, Esperado]>([
    [
      'cena 30€ con Marta el viernes a las 21h',
      { cantidad: 30, personas: ['Marta'], fecha: '2026-07-03', titulo: 'Cena 30€ con Marta' },
    ],
    ['gym con Pablo mañana a las 7', { personas: ['Pablo'], tipo: 'entreno', fecha: '2026-07-03' }],
    ['añade pan a la compra para mañana', { lista: { elemento: 'pan', lista: 'compra' }, fecha: '2026-07-03' }],
    ['reunión con el equipo mañana 10:00', { personas: [], titulo: 'Reunión con el equipo' }],
    ['idea: regalo para Marta un libro de cocina', { personas: [], tipo: 'nota' }],
    ['médico el jueves', { personas: [], cantidad: null, lista: null }],
    ['comprar pan', { personas: [], cantidad: null, lista: null, tipo: 'tarea' }],
    ['pádel cada jueves 19h con Marc', { tipo: 'entreno', fecha: '2026-07-02' }],
    ['dentista mañana a las 9', { titulo: 'Dentista', fecha: '2026-07-03' }],
    ['asdfghjkl', { tipo: 'nota', titulo: 'Asdfghjkl', personas: [], cantidad: null, lista: null }],
    ['cumpleaños de Marta el 4', { tipo: 'evento', fecha: '2026-07-04', personas: [] }],
    ['tomar medicación a las 22:15', { tipo: 'tarea', titulo: 'Tomar medicación' }],
  ])('%s', (frase, esperado) => comprobar(frase, esperado));

  it('nunca lanza con entradas raras nuevas', () => {
    for (const frase of ['con', 'añade', '€', 'con €', 'añade € a la con']) {
      expect(() => i(frase)).not.toThrow();
    }
  });
});
