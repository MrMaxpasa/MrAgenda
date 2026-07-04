import { crearBDenMemoria, type ConexionDePrueba } from '@/db/__tests__/adaptador-test';
import { migrarBaseDeDatos } from '@/db/database';
import { crearHabito, listarHabitos } from '@/db/repositorios/habitos';
import * as items from '@/db/repositorios/items';

let db: ConexionDePrueba;

beforeEach(async () => {
  db = crearBDenMemoria();
  await migrarBaseDeDatos(db);
});

afterEach(() => db.cerrar());

describe('repositorio de hábitos', () => {
  it('crea y lista con su configuración (diario y días concretos)', async () => {
    await crearHabito(db, { titulo: 'Agua', icono: '💧', dias: 'diario' });
    await crearHabito(db, { titulo: 'Leer', icono: '📖', dias: [1, 3, 5] });

    const habitos = await listarHabitos(db);
    expect(habitos).toHaveLength(2);
    expect(habitos[0]).toMatchObject({ icono: '💧', dias: 'diario' });
    expect(habitos[0]!.item.tipo).toBe('habito');
    expect(habitos[0]!.item.titulo).toBe('Agua');
    expect(habitos[1]).toMatchObject({ icono: '📖', dias: [1, 3, 5] });
  });

  it('los hábitos no aparecen en la cronología del día', async () => {
    await crearHabito(db, { titulo: 'Agua', icono: '💧', dias: 'diario' });
    expect(await items.listarPorFecha(db, '2026-07-04')).toEqual([]);
    expect(await items.listarRecurrentes(db)).toEqual([]);
  });

  it('archivar un hábito lo saca de la lista', async () => {
    await crearHabito(db, { titulo: 'Agua', icono: '💧', dias: 'diario' });
    const [habito] = await listarHabitos(db);
    await items.archivar(db, habito!.item.id);
    expect(await listarHabitos(db)).toEqual([]);
  });

  it('completar y reabrir un día del hábito usa el log de completados', async () => {
    await crearHabito(db, { titulo: 'Agua', icono: '💧', dias: 'diario' });
    const [habito] = await listarHabitos(db);
    await items.completar(db, habito!.item.id, '2026-07-04');

    const log = await items.listarCompletados(db);
    expect(log).toEqual([{ item_id: habito!.item.id, fecha: '2026-07-04' }]);
    // el estado del item no cambia: en hábitos el hecho vive por día
    expect((await items.obtenerPorId(db, habito!.item.id))?.estado).toBe('pendiente');

    await items.reabrir(db, habito!.item.id, '2026-07-04');
    expect(await items.listarCompletados(db)).toEqual([]);
  });
});
