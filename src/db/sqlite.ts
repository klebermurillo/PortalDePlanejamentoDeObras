import path from "node:path";
import fs from "node:fs/promises";
import sqlite3 from "sqlite3";
import { open, type Database } from "sqlite";

let dbPromise: Promise<Database> | null = null;

async function ensureDataDir(): Promise<string> {
  const dataDir = path.resolve("data");
  await fs.mkdir(dataDir, { recursive: true });
  return dataDir;
}

export async function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const dataDir = await ensureDataDir();
      const dbPath = path.join(dataDir, "portal.db");

      const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
      });

      await db.exec(`
        CREATE TABLE IF NOT EXISTS simulador_registros (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          id_projeto TEXT NOT NULL,
          usuario TEXT NOT NULL,
          data_simulacao TEXT,
          entregavel TEXT,
          capex_estimado_atual REAL,
          capex_estimado_sim REAL,
          ano_contratual_sim TEXT,
          ano_real_sim TEXT,
          ponto_atencao TEXT,
          contexto TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);

      await db.exec("CREATE INDEX IF NOT EXISTS idx_simulador_id_projeto ON simulador_registros(id_projeto);");

      return db;
    })();
  }

  return dbPromise;
}
