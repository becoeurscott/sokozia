import "server-only";
import type { Db, Filter, ListOptions, Row } from "./index";
import { newId } from "./index";
import { getAdminClient } from "../insforge/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyQuery = any;

function applyFilter(q: AnyQuery, filter: Filter): AnyQuery {
  for (const [k, v] of Object.entries(filter)) {
    if (Array.isArray(v)) q = q.in(k, v);
    else if (v === null) q = q.is(k, null);
    else q = q.eq(k, v);
  }
  return q;
}

function fail(table: string, op: string, error: { message?: string } | null): never {
  throw new Error(`[db:${table}] ${op} failed: ${error?.message ?? "unknown error"}`);
}

export function createInsForgeDb(): Db {
  const admin = getAdminClient();
  const from = (table: string) => admin.database.from(table);

  return {
    async insert(table, row) {
      const full = { ...row, id: row.id ?? newId() };
      const { data, error } = await from(table).insert(full).select().single();
      if (error) fail(table, "insert", error);
      return data as never;
    },
    async insertUnique(table, row) {
      const full = { ...row, id: row.id ?? newId() };
      const { data, error } = await from(table).insert(full).select().single();
      if (error) {
        // 23505 = unique_violation
        if (String((error as { code?: string }).code) === "23505" || /duplicate|unique/i.test(error.message ?? "")) return null;
        fail(table, "insertUnique", error);
      }
      return data as never;
    },
    async get(table, id) {
      const { data, error } = await from(table).select().eq("id", id).maybeSingle();
      if (error) fail(table, "get", error);
      return (data as never) ?? null;
    },
    async find(table, filter) {
      const { data, error } = (await applyFilter(from(table).select(), filter).limit(1)) as { data: unknown; error: { message?: string } | null };
      if (error) fail(table, "find", error);
      return ((data as Row[] | null)?.[0] as never) ?? null;
    },
    async list(table, filter, opts: ListOptions = {}) {
      let q: AnyQuery = applyFilter(from(table).select(), filter);
      if (opts.orderBy) q = q.order(opts.orderBy, { ascending: opts.ascending !== false });
      if (opts.limit) q = q.limit(opts.limit);
      const { data, error } = (await q) as { data: unknown; error: { message?: string } | null };
      if (error) fail(table, "list", error);
      return (data as never) ?? [];
    },
    async update(table, id, patch) {
      const { data, error } = await from(table).update(patch).eq("id", id).select().maybeSingle();
      if (error) fail(table, "update", error);
      return (data as never) ?? null;
    },
    async remove(table, id) {
      const { error } = await from(table).delete().eq("id", id);
      if (error) fail(table, "remove", error);
    },
  };
}
