import { diasDeCuadriculaMes, diasDeSemana } from '../dias-calendario';

describe('diasDeSemana', () => {
  it('devuelve 7 días de lunes a domingo desde cualquier día de la semana', () => {
    // jueves 2/7/2026 → semana 29/6 (lunes) … 5/7 (domingo)
    expect(diasDeSemana(new Date(2026, 6, 2))).toEqual([
      '2026-06-29',
      '2026-06-30',
      '2026-07-01',
      '2026-07-02',
      '2026-07-03',
      '2026-07-04',
      '2026-07-05',
    ]);
  });

  it('el propio lunes abre su semana', () => {
    expect(diasDeSemana(new Date(2026, 6, 6))[0]).toBe('2026-07-06');
  });
});

describe('diasDeCuadriculaMes', () => {
  it('42 celdas empezando en lunes', () => {
    const grid = diasDeCuadriculaMes(new Date(2026, 6, 15)); // julio 2026
    expect(grid).toHaveLength(42);
    // 1/7/2026 es miércoles → la rejilla arranca el lunes 29/6
    expect(grid[0]).toEqual({ fecha: '2026-06-29', delMes: false });
    expect(grid[2]).toEqual({ fecha: '2026-07-01', delMes: true });
    expect(grid[32]).toEqual({ fecha: '2026-07-31', delMes: true });
    // relleno del mes siguiente al final
    expect(grid[33]).toEqual({ fecha: '2026-08-01', delMes: false });
  });

  it('delMes marca solo los días del mes visible', () => {
    const grid = diasDeCuadriculaMes(new Date(2026, 6, 15));
    const delMes = grid.filter((c) => c.delMes).map((c) => c.fecha);
    expect(delMes[0]).toBe('2026-07-01');
    expect(delMes[delMes.length - 1]).toBe('2026-07-31');
    expect(delMes).toHaveLength(31); // julio tiene 31 días
  });

  it('cruza el fin de año correctamente', () => {
    const grid = diasDeCuadriculaMes(new Date(2026, 11, 10)); // diciembre 2026
    expect(grid.some((c) => c.fecha === '2026-12-31' && c.delMes)).toBe(true);
    expect(grid.some((c) => c.fecha === '2027-01-01' && !c.delMes)).toBe(true);
  });

  it('febrero (mes corto) también rellena 42 celdas', () => {
    const grid = diasDeCuadriculaMes(new Date(2026, 1, 10)); // febrero 2026 (28 días)
    expect(grid).toHaveLength(42);
    expect(grid.filter((c) => c.delMes)).toHaveLength(28);
  });
});
