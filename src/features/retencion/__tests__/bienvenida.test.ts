import { decidirBienvenida } from '../bienvenida';

describe('decidirBienvenida (vuelta sin culpa)', () => {
  const HOY = '2026-07-05';

  it('con 7 o más días fuera y vencidos, da la bienvenida', () => {
    expect(decidirBienvenida('2026-06-28', 3, HOY)).toBe(true);
    expect(decidirBienvenida('2026-06-01', 1, HOY)).toBe(true);
  });

  it('con menos de 7 días fuera, no', () => {
    expect(decidirBienvenida('2026-06-29', 3, HOY)).toBe(false);
    expect(decidirBienvenida('2026-07-04', 3, HOY)).toBe(false);
  });

  it('sin vencidos no hay nada que archivar: no molesta', () => {
    expect(decidirBienvenida('2026-06-01', 0, HOY)).toBe(false);
  });

  it('primera apertura de la app: sin registro previo, no', () => {
    expect(decidirBienvenida(null, 5, HOY)).toBe(false);
  });
});
