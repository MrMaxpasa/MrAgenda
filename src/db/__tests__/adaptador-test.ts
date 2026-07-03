// Adaptador de tests: implementa ConexionDB sobre el SQLite integrado de
// Node (node:sqlite) — base real en memoria, sin dependencias nativas.
// Solo se usa en Jest; en la app la conexión es expo-sqlite.

import { DatabaseSync } from 'node:sqlite';

import type { ConexionDB, ValorSQL } from '../tipos';

export interface ConexionDePrueba extends ConexionDB {
  cerrar(): void;
}

export function crearBDenMemoria(): ConexionDePrueba {
  const db = new DatabaseSync(':memory:');

  const conexion: ConexionDePrueba = {
    async execAsync(sql: string) {
      db.exec(sql);
    },
    async runAsync(sql: string, params: ValorSQL[]) {
      return db.prepare(sql).run(...params);
    },
    async getFirstAsync<T>(sql: string, params: ValorSQL[]) {
      const fila = db.prepare(sql).get(...params);
      return (fila ?? null) as T | null;
    },
    async getAllAsync<T>(sql: string, params: ValorSQL[]) {
      return db.prepare(sql).all(...params) as T[];
    },
    async withExclusiveTransactionAsync(tarea: (tx: ConexionDB) => Promise<void>) {
      // Suficiente para tests: mismas sentencias, sin aislamiento real.
      await tarea(conexion);
    },
    cerrar() {
      db.close();
    },
  };

  return conexion;
}
