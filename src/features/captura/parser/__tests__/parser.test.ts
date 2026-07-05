import { interpretar } from '../index';
import type { InterpretacionCaptura } from '../tipos';

// Jueves 2 de julio de 2026, 9:41 (el día del mockup).
const AHORA = new Date(2026, 6, 2, 9, 41);

const i = (frase: string): InterpretacionCaptura => interpretar(frase, AHORA);

type Esperado = Partial<Pick<InterpretacionCaptura, 'tipo' | 'titulo' | 'fecha'>> & {
  hora?: { hora: number; minuto: number } | null;
};

function comprobar(frase: string, esperado: Esperado) {
  const r = i(frase);
  if (esperado.tipo !== undefined) expect(r.tipo).toBe(esperado.tipo);
  if (esperado.titulo !== undefined) expect(r.titulo).toBe(esperado.titulo);
  if (esperado.fecha !== undefined) expect(r.fecha).toBe(esperado.fecha);
  if (esperado.hora !== undefined) expect(r.hora).toEqual(esperado.hora);
}

describe('fechas relativas y absolutas', () => {
  test.each<[string, Esperado]>([
    ['dentista hoy', { fecha: '2026-07-02', tipo: 'evento', titulo: 'Dentista' }],
    ['dentista mañana', { fecha: '2026-07-03', titulo: 'Dentista' }],
    ['manana dentista', { fecha: '2026-07-03', titulo: 'Dentista' }], // sin tilde
    ['recoger paquete pasado mañana', { fecha: '2026-07-04', tipo: 'tarea', titulo: 'Recoger paquete' }],
    ['reunión el lunes', { fecha: '2026-07-06', tipo: 'evento', titulo: 'Reunión' }],
    ['pádel el viernes', { fecha: '2026-07-03', tipo: 'entreno', titulo: 'Pádel' }],
    ['cena este sábado', { fecha: '2026-07-04', tipo: 'evento', titulo: 'Cena' }],
    ['llamar a mamá el próximo martes', { fecha: '2026-07-07', tipo: 'tarea', titulo: 'Llamar a mamá' }],
    ['jueves gym', { fecha: '2026-07-02', tipo: 'entreno', titulo: 'Gym' }], // hoy es jueves
    ['revisar informe el miercoles', { fecha: '2026-07-08', tipo: 'tarea', titulo: 'Revisar informe' }],
    ['concierto el 15 de agosto', { fecha: '2026-08-15', tipo: 'evento', titulo: 'Concierto' }],
    ['boda el 3 de enero', { fecha: '2027-01-03', titulo: 'Boda' }], // ya pasó este año → siguiente
    ['cita el 15', { fecha: '2026-07-15', tipo: 'evento', titulo: 'Cita' }],
    ['pagar alquiler el 1', { fecha: '2026-08-01', tipo: 'tarea', titulo: 'Pagar alquiler' }], // el 1 pasó → mes siguiente
    ['cumpleaños de Marta el 4', { fecha: '2026-07-04', tipo: 'evento', titulo: 'Cumpleaños de Marta' }],
    ['cita médica el 30', { fecha: '2026-07-30', tipo: 'evento', titulo: 'Cita médica' }],
    ['viaje el 15/08', { fecha: '2026-08-15', tipo: 'evento', titulo: 'Viaje' }],
    ['pagar el seguro el 10/07', { fecha: '2026-07-10', tipo: 'tarea', titulo: 'Pagar el seguro' }],
    ['enviar informe antes del viernes', { fecha: '2026-07-03', tipo: 'tarea', titulo: 'Enviar informe' }],
    ['clase de inglés cada martes', { fecha: '2026-07-07', tipo: 'evento', titulo: 'Clase de inglés' }], // «cada» → recurrencia en Fase 2
    ['visita al museo el domingo', { fecha: '2026-07-05', tipo: 'evento', titulo: 'Visita al museo' }],
    ['reservar mesa para el sábado', { fecha: '2026-07-04', tipo: 'tarea', titulo: 'Reservar mesa' }],
  ])('%s', (frase, esperado) => comprobar(frase, esperado));
});

describe('horas', () => {
  test.each<[string, Esperado]>([
    ['gym 19h', { hora: { hora: 19, minuto: 0 }, fecha: '2026-07-02', tipo: 'entreno' }],
    ['fiesta el sábado a las 23h', { hora: { hora: 23, minuto: 0 }, fecha: '2026-07-04', titulo: 'Fiesta' }],
    ['cita a las 7 y media de la tarde', { hora: { hora: 19, minuto: 30 }, fecha: '2026-07-02', titulo: 'Cita' }],
    ['tren a las 8 menos cuarto', { hora: { hora: 7, minuto: 45 }, fecha: '2026-07-03', titulo: 'Tren' }], // las 7:45 ya pasaron → mañana
    ['yoga a las 5', { hora: { hora: 17, minuto: 0 }, fecha: '2026-07-02', tipo: 'entreno' }], // 1–6 sin marcador → tarde
    ['gym mañana a las 7', { hora: { hora: 7, minuto: 0 }, fecha: '2026-07-03', titulo: 'Gym' }], // 7 se respeta como 7:00
    ['llamada 10:30', { hora: { hora: 10, minuto: 30 }, fecha: '2026-07-02', tipo: 'evento' }],
    ['tomar medicación a las 22:15', { hora: { hora: 22, minuto: 15 }, fecha: '2026-07-02', tipo: 'tarea', titulo: 'Tomar medicación' }],
    ['comida al mediodía', { hora: { hora: 12, minuto: 0 }, fecha: '2026-07-02', tipo: 'evento', titulo: 'Comida' }],
    ['a la una y cuarto comida con Marc', { hora: { hora: 13, minuto: 15 }, fecha: '2026-07-02', titulo: 'Comida con Marc' }],
    ['reunión a las 9 de la mañana', { hora: { hora: 9, minuto: 0 }, fecha: '2026-07-03', titulo: 'Reunión' }], // las 9:00 ya pasaron → mañana; «de la mañana» no es fecha
    ['café con Laura hoy a las 4', { hora: { hora: 16, minuto: 0 }, fecha: '2026-07-02', titulo: 'Café con Laura' }],
    ['cine con Ana el viernes a las 20h', { hora: { hora: 20, minuto: 0 }, fecha: '2026-07-03', titulo: 'Cine con Ana' }],
    ['vuelo 15/08 a las 6', { hora: { hora: 18, minuto: 0 }, fecha: '2026-08-15', tipo: 'evento', titulo: 'Vuelo' }],
    ['reunión con el equipo mañana 10:00', { hora: { hora: 10, minuto: 0 }, fecha: '2026-07-03', titulo: 'Reunión con el equipo' }],
    ['desayuno con Laura mañana a las 8 y media', { hora: { hora: 8, minuto: 30 }, fecha: '2026-07-03', titulo: 'Desayuno con Laura' }],
  ])('%s', (frase, esperado) => comprobar(frase, esperado));
});

describe('clasificación de tipo', () => {
  test.each<[string, Esperado]>([
    ['pádel cada jueves 19h con Marc', { tipo: 'entreno', fecha: '2026-07-02', hora: { hora: 19, minuto: 0 }, titulo: 'Pádel con Marc' }],
    ['comprar pan', { tipo: 'tarea', fecha: null, titulo: 'Comprar pan' }],
    ['hacer la colada', { tipo: 'tarea', titulo: 'Hacer la colada' }],
    ['hacer yoga mañana', { tipo: 'entreno', fecha: '2026-07-03', titulo: 'Hacer yoga' }],
    ['llamar al médico', { tipo: 'tarea', fecha: null, titulo: 'Llamar al médico' }], // el verbo manda sobre «médico»
    ['médico el jueves', { tipo: 'evento', fecha: '2026-07-02', titulo: 'Médico' }],
    ['entrenar torso el viernes', { tipo: 'entreno', fecha: '2026-07-03', titulo: 'Entrenar torso' }],
    ['correr 5km', { tipo: 'entreno', fecha: null, hora: null, titulo: 'Correr 5km' }],
    ['pagar 50€ del gimnasio', { tipo: 'tarea', titulo: 'Pagar 50€ del gimnasio' }], // el verbo manda sobre el €
    ['he gastado 12€ en comida', { tipo: 'nota', fecha: null, titulo: 'He gastado 12€ en comida' }], // gasto → nota hasta Fase 4
    ['apuntar gasolina 40€', { tipo: 'nota', titulo: 'Apuntar gasolina 40€' }],
    ['dormir más', { tipo: 'nota', titulo: 'Dormir más' }],
  ])('%s', (frase, esperado) => comprobar(frase, esperado));
});

describe('títulos y prefijos', () => {
  test.each<[string, Esperado]>([
    ['idea: regalo para Marta un libro de cocina', { tipo: 'nota', titulo: 'Regalo para Marta un libro de cocina', fecha: null }],
    ['nota: contraseña del wifi R2D2', { tipo: 'nota', titulo: 'Contraseña del wifi R2D2' }],
    ['dentista mañana a las 9', { titulo: 'Dentista', fecha: '2026-07-03', hora: { hora: 9, minuto: 0 } }],
    ['comprar regalo para marta el viernes', { titulo: 'Comprar regalo para marta', fecha: '2026-07-03' }],
  ])('%s', (frase, esperado) => comprobar(frase, esperado));
});

describe('nunca se pierde una captura', () => {
  it('lo que no entiende se guarda como nota con el texto entero', () => {
    comprobar('asdfghjkl', { tipo: 'nota', titulo: 'Asdfghjkl', fecha: null, hora: null });
  });

  it('texto vacío no rompe', () => {
    const r = i('   ');
    expect(r.tipo).toBe('nota');
    expect(r.titulo).toBe('');
    expect(r.fecha).toBeNull();
  });

  it('solo una fecha usa el texto original como título', () => {
    comprobar('el lunes', { fecha: '2026-07-06', titulo: 'El lunes' });
  });

  it('nunca lanza con entradas raras', () => {
    for (const frase of ['€€€', '::::', '31/02', 'a las 99', 'el 45', '((()))', '😀🎉']) {
      expect(() => i(frase)).not.toThrow();
      expect(i(frase).tipo).toBe('nota');
    }
  });
});

describe('fragmentos para chips editables', () => {
  it('devuelve los trozos de texto que produjeron fecha y hora', () => {
    const r = i('cena con Ana el viernes a las 21:30');
    expect(r.fragmentos).toEqual([
      { campo: 'fecha', texto: 'el viernes', indice: expect.any(Number) },
      { campo: 'hora', texto: 'a las 21:30', indice: expect.any(Number) },
      { campo: 'personas', texto: 'con ana', indice: expect.any(Number) },
    ]);
  });
});
