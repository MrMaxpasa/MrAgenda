import type { HabitoDelDia } from '@/features/habitos/use-habitos';
import type { Instancia } from '@/features/items/instancias';

import { analizarDia, mayorHueco } from '../analisis';

// Jueves 2 de julio de 2026, 9:41.
const AHORA = new Date(2026, 6, 2, 9, 41);

let contador = 0;
function instancia(titulo: string, hora: string | null, extras: Partial<Instancia['item']> = {}, hecha = false): Instancia {
  contador++;
  return {
    item: {
      id: `i${contador}`,
      tipo: 'evento',
      titulo,
      cuerpo: null,
      fecha_inicio: hora ? `2026-07-02T${hora}` : '2026-07-02',
      fecha_fin: null,
      todo_el_dia: hora === null,
      rrule: null,
      rrule_fin: null,
      nivel_aviso: 1,
      aviso_offset_min: null,
      estado: 'pendiente',
      creado_en: '',
      actualizado_en: '',
      ...extras,
    },
    fecha: '2026-07-02',
    fechaOriginal: '2026-07-02',
    hecha,
    progreso: null,
  };
}

function habito(titulo: string, racha: number, hechaHoy: boolean): HabitoDelDia {
  contador++;
  return {
    habito: {
      item: instancia(titulo, null).item,
      icono: '💧',
      dias: 'diario',
    },
    hechaHoy,
    racha: { actual: racha, record: racha, comodinUsadoEstaSemana: false },
  };
}

describe('analizarDia', () => {
  it('día vacío', () => {
    const a = analizarDia([], [], 0, AHORA);
    expect(a.densidad).toBe('vacio');
    expect(a.primeraCita).toBeNull();
    expect(a.huecoLibre).toEqual({ desde: '09:41', hasta: '21:00' });
  });

  it('densidades: tranquilo, normal y cargado', () => {
    const citas = (n: number) =>
      Array.from({ length: n }, (_, i) => instancia(`C${i}`, `${String(10 + i).padStart(2, '0')}:00`));
    expect(analizarDia(citas(2), [], 0, AHORA).densidad).toBe('tranquilo');
    expect(analizarDia(citas(4), [], 0, AHORA).densidad).toBe('normal');
    expect(analizarDia(citas(5), [], 0, AHORA).densidad).toBe('cargado');
  });

  it('la primera cita es la próxima futura sin hacer', () => {
    const a = analizarDia(
      [
        instancia('Desayuno', '08:00', {}, true), // pasada y hecha
        instancia('Reunión', '10:00'),
        instancia('Gym', '17:00'),
      ],
      [],
      0,
      AHORA,
    );
    expect(a.primeraCita).toEqual({ titulo: 'Reunión', hora: '10:00' });
  });

  it('el mayor hueco esquiva las citas (1 h de bloque por cita)', () => {
    const a = analizarDia([instancia('Reunión', '10:00'), instancia('Gym', '17:00')], [], 0, AHORA);
    expect(a.huecoLibre).toEqual({ desde: '11:00', hasta: '17:00' });
  });

  it('sin hueco de 2 h no hay hueco', () => {
    const citas = ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00'].map((h) =>
      instancia(`C${h}`, h),
    );
    expect(analizarDia(citas, [], 0, AHORA).huecoLibre).toBeNull();
  });

  it('racha en riesgo: la mayor ≥3 no hecha hoy', () => {
    const a = analizarDia(
      [],
      [habito('Agua', 12, false), habito('Leer', 4, false), habito('Estirar', 9, true)],
      0,
      AHORA,
    );
    expect(a.rachaEnRiesgo).toMatchObject({ titulo: 'Agua', racha: 12 });
  });

  it('racha corta o ya hecha no está en riesgo', () => {
    const a = analizarDia([], [habito('Agua', 2, false), habito('Leer', 8, true)], 0, AHORA);
    expect(a.rachaEnRiesgo).toBeNull();
  });

  it('detecta el cumpleaños por el título del evento', () => {
    expect(analizarDia([instancia('Cumpleaños de Marta', null)], [], 0, AHORA).cumpleanos).toBe('Marta');
    expect(analizarDia([instancia('cumple de luis', '18:00')], [], 0, AHORA).cumpleanos).toBe('Luis');
    expect(analizarDia([instancia('Reunión', '10:00')], [], 0, AHORA).cumpleanos).toBeNull();
  });

  it('propaga los pendientes arrastrados', () => {
    expect(analizarDia([], [], 3, AHORA).pendientesArrastrados).toBe(3);
  });
});

describe('mayorHueco', () => {
  it('por la tarde solo queda lo que queda', () => {
    expect(mayorHueco(['19:00'], 18 * 60)).toBeNull(); // 18→19 (1h) y 20→21 (1h)
    expect(mayorHueco([], 18 * 60)).toEqual({ desde: '18:00', hasta: '21:00' });
  });

  it('fuera de jornada no hay hueco', () => {
    expect(mayorHueco([], 22 * 60)).toBeNull();
  });
});
