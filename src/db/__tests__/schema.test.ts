import { MIGRACIONES } from '../schema';

describe('migraciones del esquema', () => {
  it('empiezan en 1 y avanzan de una en una, sin huecos', () => {
    const versiones = MIGRACIONES.map((m) => m.version);
    expect(versiones[0]).toBe(1);
    versiones.forEach((version, i) => {
      expect(version).toBe(i + 1);
    });
  });

  it('todas tienen SQL y descripción', () => {
    for (const migracion of MIGRACIONES) {
      expect(migracion.sql.trim().length).toBeGreaterThan(0);
      expect(migracion.descripcion.trim().length).toBeGreaterThan(0);
    }
  });

  it('la v1 crea las 7 tablas del modelo de datos', () => {
    const sql = MIGRACIONES[0]!.sql;
    const tablas = [
      'items',
      'item_excepciones',
      'completados',
      'enlaces',
      'habitos_config',
      'sesiones_deporte',
      'ajustes',
    ];
    for (const tabla of tablas) {
      expect(sql).toMatch(new RegExp(`CREATE TABLE ${tabla}\\s*\\(`));
    }
  });

  it('la v1 indexa items por fecha y estado (vista Hoy <1 s)', () => {
    const sql = MIGRACIONES[0]!.sql;
    expect(sql).toContain('idx_items_fecha_inicio');
    expect(sql).toContain('idx_items_estado_fecha');
  });
});
