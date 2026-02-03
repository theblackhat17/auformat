import { Pool, QueryResult, QueryResultRow } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

/**
 * Convert snake_case keys to camelCase
 */
export function toCamelCase<T>(row: QueryResultRow): T {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    result[camelKey] = value;
  }
  return result as T;
}

/**
 * Convert camelCase keys to snake_case
 */
export function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

/**
 * Execute a query and return camelCase rows
 */
export async function query<T>(text: string, params?: unknown[]): Promise<T[]> {
  const result: QueryResult = await pool.query(text, params);
  return result.rows.map((row) => toCamelCase<T>(row));
}

/**
 * Execute a query and return a single camelCase row (or null)
 */
export async function queryOne<T>(text: string, params?: unknown[]): Promise<T | null> {
  const result: QueryResult = await pool.query(text, params);
  if (result.rows.length === 0) return null;
  return toCamelCase<T>(result.rows[0]);
}

/**
 * Execute a raw query (no camelCase conversion)
 */
export async function rawQuery(text: string, params?: unknown[]): Promise<QueryResult> {
  return pool.query(text, params);
}

/**
 * Insert a record (accepts camelCase, converts to snake_case)
 * Returns the inserted row in camelCase
 */
export async function insert<T>(table: string, data: Record<string, unknown>): Promise<T> {
  const snakeData = toSnakeCase(data);
  const keys = Object.keys(snakeData);
  const values = Object.values(snakeData);
  const placeholders = keys.map((_, i) => `$${i + 1}`);

  const text = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
  const result: QueryResult = await pool.query(text, values);
  return toCamelCase<T>(result.rows[0]);
}

/**
 * Update a record by id (accepts camelCase, converts to snake_case)
 * Automatically sets updated_at to NOW()
 */
export async function update<T>(table: string, id: string, data: Record<string, unknown>): Promise<T | null> {
  const snakeData = toSnakeCase(data);
  const keys = Object.keys(snakeData);
  const values = Object.values(snakeData);
  const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');

  const text = `UPDATE ${table} SET ${setClause}, updated_at = NOW() WHERE id = $${keys.length + 1} RETURNING *`;
  const result: QueryResult = await pool.query(text, [...values, id]);
  if (result.rows.length === 0) return null;
  return toCamelCase<T>(result.rows[0]);
}

/**
 * Delete a record by id
 */
export async function deleteById(table: string, id: string): Promise<boolean> {
  const result = await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

/**
 * Count records with optional WHERE clause
 */
export async function count(table: string, where?: string, params?: unknown[]): Promise<number> {
  const text = where
    ? `SELECT COUNT(*)::int as count FROM ${table} WHERE ${where}`
    : `SELECT COUNT(*)::int as count FROM ${table}`;
  const result = await pool.query(text, params);
  return result.rows[0].count;
}

export { pool };
