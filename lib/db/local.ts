import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Db, Filter, ListOptions, Row } from "./index";
import { newId } from "./index";

const FILE = path.join(process.cwd(), ".data", "db.json");

type Store = Record<string, Row[]>;

let cache: Store | null = null;
let chain: Promise<void> = Promise.resolve();

async function load(): Promise<Store> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await fs.readFile(FILE, "utf8")) as Store;
  } catch {
    cache = {};
  }
  return cache;
}

async function persist(store: Store) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const tmp = FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(store, null, 2));
  await fs.rename(tmp, FILE);
}

/** Serialises writes so concurrent API calls don't clobber the file. */
function locked<T>(fn: (store: Store) => Promise<T> | T): Promise<T> {
  const run = chain.then(async () => fn(await load()));
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function matches(row: Row, filter: Filter): boolean {
  for (const [k, v] of Object.entries(filter)) {
    const cell = (row as Record<string, unknown>)[k];
    if (Array.isArray(v)) {
      if (!v.includes(cell as string)) return false;
    } else if (cell !== v) {
      return false;
    }
  }
  return true;
}

export function createLocalDb(): Db {
  return {
    async insert(table, row) {
      return locked(async (store) => {
        const full = { ...row, id: row.id ?? newId() } as Row;
        (store[table] ??= []).push(full);
        await persist(store);
        return full as never;
      });
    },
    async insertUnique(table, row, uniqueKeys) {
      return locked(async (store) => {
        const rows = (store[table] ??= []);
        const filter: Filter = {};
        for (const k of uniqueKeys) filter[k] = (row as Record<string, never>)[k];
        if (rows.some((r) => matches(r, filter))) return null;
        const full = { ...row, id: row.id ?? newId() } as Row;
        rows.push(full);
        await persist(store);
        return full as never;
      });
    },
    async get(table, id) {
      const store = await load();
      return ((store[table] ?? []).find((r) => r.id === id) as never) ?? null;
    },
    async find(table, filter) {
      const store = await load();
      return ((store[table] ?? []).find((r) => matches(r, filter)) as never) ?? null;
    },
    async list(table, filter, opts: ListOptions = {}) {
      const store = await load();
      let rows = (store[table] ?? []).filter((r) => matches(r, filter));
      if (opts.orderBy) {
        const k = opts.orderBy;
        const dir = opts.ascending === false ? -1 : 1;
        rows = [...rows].sort((a, b) => { const av = (a as Record<string, unknown>)[k] as string; const bv = (b as Record<string, unknown>)[k] as string; return av > bv ? dir : av < bv ? -dir : 0; });
      }
      if (opts.limit) rows = rows.slice(0, opts.limit);
      return rows as never;
    },
    async update(table, id, patch) {
      return locked(async (store) => {
        const rows = store[table] ?? [];
        const i = rows.findIndex((r) => r.id === id);
        if (i < 0) return null;
        rows[i] = { ...rows[i], ...patch };
        await persist(store);
        return rows[i] as never;
      });
    },
    async remove(table, id) {
      await locked(async (store) => {
        store[table] = (store[table] ?? []).filter((r) => r.id !== id);
        await persist(store);
      });
    },
  };
}
