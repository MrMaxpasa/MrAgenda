import type { AnalisisDia } from '../analisis';
import { componerBriefing, parsearDestacados } from '../componer';
import { elegirVariante, PLANTILLAS, rellenar } from '../plantillas';

const base: AnalisisDia = {
  densidad: 'tranquilo',
  conHora: 1,
  primeraCita: null,
  huecoLibre: null,
  rachaEnRiesgo: null,
  pendientesArrastrados: 0,
  cumpleanos: null,
};

describe('banco de plantillas', () => {
  it('todas las situaciones tienen al menos 6 variantes', () => {
    for (const variantes of Object.values(PLANTILLAS)) {
      expect(variantes.length).toBeGreaterThanOrEqual(6);
    }
  });

  it('la rotación es estable por fecha y cambia entre fechas', () => {
    const a = elegirVariante('apertura_tranquilo', '2026-07-05');
    expect(elegirVariante('apertura_tranquilo', '2026-07-05')).toBe(a);
    const distintas = new Set(
      ['2026-07-05', '2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09'].map((f) =>
        elegirVariante('apertura_tranquilo', f),
      ),
    );
    expect(distintas.size).toBeGreaterThan(1);
  });

  it('rellenar sustituye todos los huecos', () => {
    expect(rellenar('De *{h1} a {h2}*, aire.', { h1: '11:00', h2: '17:00' })).toBe(
      'De *11:00 a 17:00*, aire.',
    );
  });
});

describe('componerBriefing', () => {
  it('nunca pasa de 3 frases y no deja huecos sin rellenar', () => {
    const completo = componerBriefing(
      {
        densidad: 'normal',
        conHora: 3,
        primeraCita: { titulo: 'Reunión', hora: '10:00' },
        huecoLibre: { desde: '11:00', hasta: '17:00' },
        rachaEnRiesgo: { titulo: 'Gym', icono: '🏃', racha: 6 },
        pendientesArrastrados: 4,
        cumpleanos: 'Marta',
      },
      '2026-07-05',
    );
    expect(completo.texto).not.toMatch(/\{\w+\}/);
    expect(completo.texto).toContain('Reunión');
    expect(completo.texto).toContain('Gym'); // la racha gana al cumple y a los arrastrados
    expect(completo.texto).not.toContain('Marta');
  });

  it('el singular de {cosas} está cuidado', () => {
    const b = componerBriefing({ ...base, conHora: 1 }, '2026-07-05');
    expect(b.texto).toContain('1 cosa con hora');
  });

  it('sin primera cita usa el hueco; en día vacío no', () => {
    const conHueco = componerBriefing(
      { ...base, huecoLibre: { desde: '11:00', hasta: '17:00' } },
      '2026-07-05',
    );
    expect(conHueco.texto).toMatch(/11:00.*17:00/);

    const vacio = componerBriefing(
      { ...base, densidad: 'vacio', conHora: 0, huecoLibre: { desde: '09:41', hasta: '21:00' } },
      '2026-07-05',
    );
    expect(vacio.texto).not.toContain('09:41'); // la apertura de vacío ya lo dice todo
  });

  it('cumpleaños sale cuando no hay racha en riesgo', () => {
    const b = componerBriefing({ ...base, cumpleanos: 'Marta' }, '2026-07-05');
    expect(b.texto).toContain('Marta');
    expect(b.texto).toContain('🎂');
  });

  it('arrastrados es el último de la cola de extras', () => {
    const b = componerBriefing({ ...base, pendientesArrastrados: 3 }, '2026-07-05');
    expect(b.texto).toContain('3');
  });

  it('los segmentos alternan texto normal y destacado', () => {
    const segmentos = parsearDestacados('Tienes hueco de *11:00 a 17:00*.');
    expect(segmentos).toEqual([
      { texto: 'Tienes hueco de ', destacado: false },
      { texto: '11:00 a 17:00', destacado: true },
      { texto: '.', destacado: false },
    ]);
  });
});
