import type { Item } from '@/db/tipos';

import { avisosParaInstancia } from '../notificaciones';

const AHORA = new Date(2026, 6, 2, 9, 41); // jueves 2/7/2026, 9:41

const base: Item = {
  id: 'x',
  tipo: 'evento',
  titulo: 'Reunión',
  cuerpo: null,
  fecha_inicio: '2026-07-02T17:00',
  fecha_fin: null,
  todo_el_dia: false,
  rrule: null,
  rrule_fin: null,
  nivel_aviso: 1,
  aviso_offset_min: null,
  estado: 'pendiente',
  creado_en: '',
  actualizado_en: '',
};

const instancia = (cambios: Partial<Item>, hecha = false) => ({
  item: { ...base, ...cambios },
  fecha: (cambios.fecha_inicio ?? base.fecha_inicio)!.slice(0, 10),
  hecha,
});

describe('avisosParaInstancia', () => {
  it('nivel 1 programa un único aviso a la hora', () => {
    const avisos = avisosParaInstancia(instancia({}), AHORA);
    expect(avisos).toHaveLength(1);
    expect(avisos[0]!.momento).toEqual(new Date(2026, 6, 2, 17, 0));
    expect(avisos[0]!.alarma).toBe(false);
    expect(avisos[0]!.cuerpo).toBe('Es la hora · 17:00');
  });

  it('el aviso previo se resta del momento', () => {
    const avisos = avisosParaInstancia(instancia({ aviso_offset_min: 30 }), AHORA);
    expect(avisos[0]!.momento).toEqual(new Date(2026, 6, 2, 16, 30));
    expect(avisos[0]!.cuerpo).toBe('En 30 min · a las 17:00');
  });

  it('nivel 2 añade la ráfaga de +2 y +5 minutos', () => {
    const avisos = avisosParaInstancia(instancia({ nivel_aviso: 2 }), AHORA);
    expect(avisos).toHaveLength(3);
    expect(avisos.every((a) => a.alarma)).toBe(true);
    expect(avisos.map((a) => a.momento)).toEqual([
      new Date(2026, 6, 2, 17, 0),
      new Date(2026, 6, 2, 17, 2),
      new Date(2026, 6, 2, 17, 5),
    ]);
  });

  it('no avisa: hechas, silenciosas, sin hora o ya pasadas', () => {
    expect(avisosParaInstancia(instancia({}), new Date(2026, 6, 2, 18, 0))).toEqual([]);
    expect(avisosParaInstancia(instancia({ nivel_aviso: 0 }), AHORA)).toEqual([]);
    expect(
      avisosParaInstancia(instancia({ fecha_inicio: '2026-07-02', todo_el_dia: true }), AHORA),
    ).toEqual([]);
    expect(avisosParaInstancia(instancia({}, true), AHORA)).toEqual([]);
  });

  it('en una instancia recurrente el momento sale de la fecha de la instancia', () => {
    const avisos = avisosParaInstancia(
      {
        item: { ...base, rrule: 'FREQ=DAILY', fecha_inicio: '2026-07-01T08:00' },
        fecha: '2026-07-03',
        hecha: false,
      },
      AHORA,
    );
    expect(avisos[0]!.momento).toEqual(new Date(2026, 6, 3, 8, 0));
  });
});
