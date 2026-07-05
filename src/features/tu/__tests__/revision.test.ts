import { crearBDenMemoria, type ConexionDePrueba } from '@/db/__tests__/adaptador-test';
import { migrarBaseDeDatos } from '@/db/database';
import { crearHabito, listarHabitos } from '@/db/repositorios/habitos';
import * as items from '@/db/repositorios/items';

import { calcularConsistencia, resumenSemanal, textoDelta } from '../revision';

// sábado 4/7/2026; su semana: 29/6–5/7; la anterior: 22/6–28/6
const AHORA = new Date(2026, 6, 4, 12, 0);

let db: ConexionDePrueba;

beforeEach(async () => {
  db = crearBDenMemoria();
  await migrarBaseDeDatos(db);
});

afterEach(() => db.cerrar());

describe('calcularConsistencia', () => {
  it('hechas / previstas, contando items y hábitos, solo días transcurridos', async () => {
    // viernes 3: una tarea hecha y otra sin hacer
    const hecha = await items.crear(db, { tipo: 'tarea', titulo: 'A', fecha_inicio: '2026-07-03T10:00' });
    await items.crear(db, { tipo: 'tarea', titulo: 'B', fecha_inicio: '2026-07-03T12:00' });
    await items.completar(db, hecha.id, '2026-07-03');
    // hábito diario hecho el viernes (y activo también el sábado, sin hacer)
    await crearHabito(db, { titulo: 'Agua', icono: '💧', dias: 'diario' });
    const [agua] = await listarHabitos(db);
    await items.completar(db, agua!.item.id, '2026-07-03');

    const indice = await calcularConsistencia(
      db,
      { desde: '2026-07-03', hasta: '2026-07-05' },
      '2026-07-04',
    );
    // viernes: 2 items (1 hecha) + hábito hecho · sábado: hábito sin hacer
    // = 2 hechas de 4 previstas; el domingo 5 no cuenta (futuro)
    expect(indice).toBe(50);
  });

  it('sin nada previsto no hay índice', async () => {
    expect(
      await calcularConsistencia(db, { desde: '2026-07-01', hasta: '2026-07-04' }, '2026-07-04'),
    ).toBeNull();
  });
});

describe('resumenSemanal', () => {
  it('compara con la semana anterior', async () => {
    const a = await items.crear(db, { tipo: 'tarea', titulo: 'A', fecha_inicio: '2026-07-01' });
    const b = await items.crear(db, { tipo: 'entreno', titulo: 'Gym', fecha_inicio: '2026-07-02T17:00' });
    const vieja = await items.crear(db, { tipo: 'tarea', titulo: 'V', fecha_inicio: '2026-06-24' });
    await items.completar(db, a.id, '2026-07-01');
    await items.completar(db, b.id, '2026-07-02');
    await items.completar(db, vieja.id, '2026-06-24');

    const resumen = await resumenSemanal(db, AHORA);
    expect(resumen.completadas).toBe(2);
    expect(resumen.entrenos).toBe(1);
    expect(resumen.deltaCompletadas).toBe(1); // 2 vs 1
    expect(resumen.deltaEntrenos).toBe(1); // 1 vs 0
  });

  it('incluye la mejor racha activa', async () => {
    await crearHabito(db, { titulo: 'Leer', icono: '📖', dias: 'diario' });
    const [leer] = await listarHabitos(db);
    for (const fecha of ['2026-07-02', '2026-07-03', '2026-07-04']) {
      await items.completar(db, leer!.item.id, fecha);
    }
    const resumen = await resumenSemanal(db, AHORA);
    expect(resumen.mejorRacha).toEqual({ titulo: 'Leer', icono: '📖', dias: 3 });
  });
});

describe('textoDelta', () => {
  it.each([
    [3, '', '↑ +3 vs semana pasada'],
    [-2, '', '↓ −2 vs semana pasada'],
    [0, '', '= como la semana pasada'],
    [null, '', '= como la semana pasada'],
    [5, ' pt', '↑ +5 pt vs semana pasada'],
  ])('%s%s → %s', (delta, unidad, esperado) => {
    expect(textoDelta(delta as number | null, unidad as string)).toBe(esperado);
  });
});
