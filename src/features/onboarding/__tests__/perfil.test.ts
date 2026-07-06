import { saludoSegunHora } from '@/lib/fechas';

import { debeMostrarOnboarding } from '../tienda-perfil';

describe('debeMostrarOnboarding', () => {
  it('se muestra hasta que el ajuste vale «1»', () => {
    expect(debeMostrarOnboarding(null)).toBe(true);
    expect(debeMostrarOnboarding('')).toBe(true);
    expect(debeMostrarOnboarding('0')).toBe(true);
    expect(debeMostrarOnboarding('1')).toBe(false);
  });
});

describe('saludoSegunHora con nombre', () => {
  const manana = new Date(2026, 6, 6, 9, 0);
  const tarde = new Date(2026, 6, 6, 17, 0);

  it('añade el nombre cuando lo hay', () => {
    expect(saludoSegunHora(manana, 'Max')).toBe('Buenos días, Max');
    expect(saludoSegunHora(tarde, 'Max')).toBe('Buenas tardes, Max');
  });

  it('sin nombre se queda como antes', () => {
    expect(saludoSegunHora(manana)).toBe('Buenos días');
    expect(saludoSegunHora(manana, null)).toBe('Buenos días');
    expect(saludoSegunHora(manana, '  ')).toBe('Buenos días');
  });

  it('recorta espacios del nombre', () => {
    expect(saludoSegunHora(manana, '  Max  ')).toBe('Buenos días, Max');
  });
});
