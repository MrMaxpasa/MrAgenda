import { calcularRacha, lunesDeSemana } from '../rachas';

// hoy = sábado 4 de julio de 2026; su semana natural: lunes 29/6 – domingo 5/7
const HOY = '2026-07-04';
const set = (...fechas: string[]) => new Set(fechas);

describe('lunesDeSemana', () => {
  it('devuelve el lunes de la semana natural', () => {
    expect(lunesDeSemana(new Date('2026-07-04T00:00'))).toBe('2026-06-29'); // sábado
    expect(lunesDeSemana(new Date('2026-06-29T00:00'))).toBe('2026-06-29'); // el propio lunes
    expect(lunesDeSemana(new Date('2026-07-05T00:00'))).toBe('2026-06-29'); // domingo
  });
});

describe('calcularRacha — hábito diario', () => {
  it('racha perfecta', () => {
    const r = calcularRacha(
      set('2026-06-30', '2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04'),
      'diario',
      HOY,
    );
    expect(r).toEqual({ actual: 5, record: 5, comodinUsadoEstaSemana: false });
  });

  it('hoy pendiente no rompe ni suma', () => {
    const r = calcularRacha(set('2026-07-02', '2026-07-03'), 'diario', HOY);
    expect(r.actual).toBe(2);
  });

  it('hoy hecho sí cuenta', () => {
    const r = calcularRacha(set('2026-07-02', '2026-07-03', '2026-07-04'), 'diario', HOY);
    expect(r.actual).toBe(3);
  });

  it('una falta a la semana la cubre el comodín', () => {
    // falta el miércoles 1/7; el resto hecho
    const r = calcularRacha(
      set('2026-06-29', '2026-06-30', '2026-07-02', '2026-07-03'),
      'diario',
      HOY,
    );
    expect(r.actual).toBe(4);
    expect(r.comodinUsadoEstaSemana).toBe(true);
  });

  it('la segunda falta de la misma semana rompe la racha', () => {
    // faltan martes 30 y miércoles 1: el comodín solo cubre una
    const r = calcularRacha(set('2026-06-29', '2026-07-02', '2026-07-03'), 'diario', HOY);
    expect(r.actual).toBe(2); // jueves y viernes
    expect(r.record).toBe(2);
  });

  it('faltas en semanas distintas: cada semana tiene su comodín', () => {
    const hechas = set(
      '2026-06-22',
      '2026-06-23',
      // falta el 24 (semana anterior, cubierta)
      '2026-06-25',
      '2026-06-26',
      '2026-06-27',
      '2026-06-28',
      '2026-06-29',
      '2026-06-30',
      // falta el 1/7 (semana actual, cubierta)
      '2026-07-02',
      '2026-07-03',
    );
    expect(calcularRacha(hechas, 'diario', HOY).actual).toBe(10);
  });

  it('récord histórico mayor que la racha actual', () => {
    const junio = Array.from({ length: 10 }, (_, i) => `2026-06-${String(i + 1).padStart(2, '0')}`);
    const r = calcularRacha(set(...junio, '2026-07-03', '2026-07-04'), 'diario', HOY);
    expect(r.actual).toBe(2);
    expect(r.record).toBe(10);
  });

  it('sin historial no hay racha', () => {
    expect(calcularRacha(set(), 'diario', HOY)).toEqual({
      actual: 0,
      record: 0,
      comodinUsadoEstaSemana: false,
    });
  });
});

describe('calcularRacha — días concretos', () => {
  const LUNES_Y_JUEVES = [1, 4];

  it('solo cuentan los días activos', () => {
    // lunes 29 y jueves 2 hechos; el resto de días no son del hábito
    const r = calcularRacha(set('2026-06-29', '2026-07-02'), LUNES_Y_JUEVES, HOY);
    expect(r.actual).toBe(2);
  });

  it('una falta en día activo la cubre el comodín', () => {
    // jueves 25 y lunes 29 hechos; falta el jueves 2 (semana actual)
    const r = calcularRacha(set('2026-06-25', '2026-06-29'), LUNES_Y_JUEVES, HOY);
    expect(r.actual).toBe(2);
    expect(r.comodinUsadoEstaSemana).toBe(true);
  });

  it('hacerlo en un día no activo no altera la racha', () => {
    const r = calcularRacha(set('2026-06-29', '2026-06-30', '2026-07-02'), LUNES_Y_JUEVES, HOY);
    expect(r.actual).toBe(2); // el martes 30 no es día del hábito
  });
});
