// La regla «una nota no lleva hora» en el guardado: misma función pura para la
// hoja de captura y el editor universal.

import { admiteHora, camposDeFecha } from '../campos-fecha';

describe('camposDeFecha', () => {
  it('una nota con día se guarda como día completo, aunque llegue una hora', () => {
    expect(camposDeFecha('nota', '2026-07-13', '19:30')).toEqual({
      fecha_inicio: '2026-07-13',
      todo_el_dia: true,
    });
  });

  it('una referencia tampoco lleva hora', () => {
    expect(camposDeFecha('referencia', '2026-07-13', '09:00')).toEqual({
      fecha_inicio: '2026-07-13',
      todo_el_dia: true,
    });
  });

  it('convertir la nota en evento (o tarea) sí admite la hora', () => {
    expect(camposDeFecha('evento', '2026-07-13', '19:30')).toEqual({
      fecha_inicio: '2026-07-13T19:30',
      todo_el_dia: false,
    });
    expect(camposDeFecha('tarea', '2026-07-13', '08:00')).toEqual({
      fecha_inicio: '2026-07-13T08:00',
      todo_el_dia: false,
    });
  });

  it('sin fecha no hay hora que valga', () => {
    expect(camposDeFecha('tarea', null, '19:30')).toEqual({
      fecha_inicio: null,
      todo_el_dia: false,
    });
  });

  it('con fecha y sin hora: día completo', () => {
    expect(camposDeFecha('evento', '2026-07-13', null)).toEqual({
      fecha_inicio: '2026-07-13',
      todo_el_dia: true,
    });
  });

  it('admiteHora distingue los tipos con momento de los atemporales', () => {
    expect(admiteHora('evento')).toBe(true);
    expect(admiteHora('tarea')).toBe(true);
    expect(admiteHora('entreno')).toBe(true);
    expect(admiteHora('nota')).toBe(false);
    expect(admiteHora('referencia')).toBe(false);
    expect(admiteHora('lista')).toBe(false);
  });
});
