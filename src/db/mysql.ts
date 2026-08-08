import mysql from "mysql2/promise";
import { config } from "../config";

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      database: config.db.name,
      user: config.db.user,
      password: config.db.password,
      waitForConnections: true,
      connectionLimit: 10,
      timezone: "+00:00"
    });
  }

  return pool;
}

export async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rows] = await getPool().execute(sql, params as any);
  return rows as T[];
}

export async function queryOne<T>(sql: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return (rows[0] as T) ?? null;
}

export async function execute(sql: string, params?: unknown[]): Promise<{ insertId: number; affectedRows: number }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result] = await getPool().execute(sql, params as any);
  const r = result as mysql.ResultSetHeader;
  return { insertId: r.insertId, affectedRows: r.affectedRows };
}
