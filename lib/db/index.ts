import "server-only";

/**
 * Minimal table-oriented data layer.
 *
 * Two backends share the same interface:
 *  - InsForge (Postgres) when NEXT_PUBLIC_INSFORGE_URL + INSFORGE_API_KEY are set
 *  - a local JSON file (.data/db.json) otherwise, so the app runs end-to-end
 *    on a laptop before any backend project exists.
 */

export type Row = { id: string };

export type Filter = Record<string, string | number | boolean | null | string[]>;

export interface ListOptions {
  orderBy?: string;
  ascending?: boolean;
  limit?: number;
}

export interface Db {
  insert<T extends Row>(table: string, row: Omit<T, "id"> & { id?: string }): Promise<T>;
  /** Insert that fails softly on a unique conflict; returns null when it already exists. */
  insertUnique<T extends Row>(table: string, row: Omit<T, "id"> & { id?: string }, uniqueKeys: string[]): Promise<T | null>;
  get<T extends Row>(table: string, id: string): Promise<T | null>;
  find<T extends Row>(table: string, filter: Filter): Promise<T | null>;
  list<T extends Row>(table: string, filter: Filter, opts?: ListOptions): Promise<T[]>;
  update<T extends Row>(table: string, id: string, patch: Partial<T>): Promise<T | null>;
  remove(table: string, id: string): Promise<void>;
}

export function isInsForgeConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_INSFORGE_URL && process.env.INSFORGE_API_KEY);
}

let _db: Db | null = null;

export async function getDb(): Promise<Db> {
  if (_db) return _db;
  if (isInsForgeConfigured()) {
    const { createInsForgeDb } = await import("./insforge");
    _db = createInsForgeDb();
  } else {
    const { createLocalDb } = await import("./local");
    _db = createLocalDb();
  }
  return _db;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}
