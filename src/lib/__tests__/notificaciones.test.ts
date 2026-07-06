import type { Item } from '@/db/tipos';

import { avisosParaInstancia, priorizarAvisos, type Aviso } from '../notificaciones';

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

describe('priorizarAvisos', () => {
  const aviso = (titulo: string, momento: Date, alarma: boolean): Aviso => ({
    titulo,
    cuerpo: '',
    momento,
    alarma,
  });

  it('una alarma lejana va antes que avisos triviales próximos', () => {
    const normalHoy = aviso('normal', new Date(2026, 6, 2, 10, 0), false);
    const alarmaDia3 = aviso('despertador', new Date(2026, 6, 5, 8, 0), true);
    const ordenado = priorizarAvisos([normalHoy, alarmaDia3], 10);
    expect(ordenado.map((a) => a.titulo)).toEqual(['despertador', 'normal']);
  });

  it('dentro de cada grupo, los más próximos primero', () => {
    const a1 = aviso('a1', new Date(2026, 6, 4, 9, 0), true);
    const a2 = aviso('a2', new Date(2026, 6, 2, 9, 0), true);
    const n1 = aviso('n1', new Date(2026, 6, 3, 9, 0), false);
    const n2 = aviso('n2', new Date(2026, 6, 2, 9, 0), false);
    expect(priorizarAvisos([a1, n1, a2, n2], 10).map((a) => a.titulo)).toEqual([
      'a2',
      'a1',
      'n2',
      'n1',
    ]);
  });

  it('respeta el presupuesto y nunca sacrifica una alarma por un aviso', () => {
    const normales = Array.from({ length: 5 }, (_, i) =>
      aviso(`n${i}`, new Date(2026, 6, 2, 9, i), false),
    );
    const alarma = aviso('alarma', new Date(2026, 6, 6, 9, 0), true);
    const resultado = priorizarAvisos([...normales, alarma], 3);
    expect(resultado).toHaveLength(3);
    expect(resultado[0]!.titulo).toBe('alarma'); // la alarma entra sí o sí
  });

  it('no muta el array de entrada', () => {
    const entrada = [aviso('a', new Date(2026, 6, 2, 9, 0), false)];
    priorizarAvisos(entrada, 10);
    expect(entrada).toHaveLength(1);
  });
});
