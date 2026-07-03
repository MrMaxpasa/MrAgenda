import { formatearFechaLarga, saludoSegunHora } from '../fechas';

describe('formatearFechaLarga', () => {
  it('formatea como en el mockup: «jueves · 2 de julio»', () => {
    expect(formatearFechaLarga(new Date(2026, 6, 2))).toBe('jueves · 2 de julio');
  });

  it('usa los nombres en español con tildes', () => {
    expect(formatearFechaLarga(new Date(2026, 7, 15))).toBe('sábado · 15 de agosto');
    expect(formatearFechaLarga(new Date(2026, 8, 30))).toBe('miércoles · 30 de septiembre');
  });
});

describe('saludoSegunHora', () => {
  const conHora = (hora: number) => new Date(2026, 6, 2, hora, 0);

  it('madrugada y noche → buenas noches', () => {
    expect(saludoSegunHora(conHora(3))).toBe('Buenas noches');
    expect(saludoSegunHora(conHora(22))).toBe('Buenas noches');
  });

  it('mañana → buenos días', () => {
    expect(saludoSegunHora(conHora(9))).toBe('Buenos días');
  });

  it('tarde → buenas tardes', () => {
    expect(saludoSegunHora(conHora(17))).toBe('Buenas tardes');
  });
});
