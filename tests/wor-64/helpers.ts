/**
 * Shared test helpers for WOR-64: Seed data script.
 *
 * Provides an in-memory mock of the Convex database context for testing the
 * seed logic. These tests exercise the seed handler's internal logic using
 * ctx.db (the mutation/query API). The Convex export type (action vs
 * internalMutation) is verified separately in seed-export.test.ts.
 */

export interface MockUser {
  [key: string]: unknown;
  _id: string;
  email: string;
  displayName?: string;
  role: "USER" | "ADMIN";
  createdAt: number;
}

export interface MockTemplate {
  [key: string]: unknown;
  _id: string;
  category: string;
  name: string;
  currentVersionId?: string;
  archivedAt?: number;
  createdAt: number;
  createdByUserId: string;
}

export interface MockTemplateVersion {
  [key: string]: unknown;
  _id: string;
  templateId: string;
  version: number;
  globalGuidance: string;
  coachInstructions?: string;
  draftCoachInstructions?: string;
  publishedAt: number;
  publishedByUserId: string;
  notes?: string;
}

type TableName = "users" | "templates" | "templateVersions" | "auditLog";

type AnyRow = Record<string, unknown> & { _id: string };

/**
 * Creates a mock Convex database context with in-memory tables.
 * Provides ctx.db for testing the seed handler's logic directly.
 * The export shape (action vs internalMutation) is validated in
 * seed-export.test.ts, not here.
 */
export function createMockActionContext(options?: {
  users?: MockUser[];
  templates?: MockTemplate[];
  templateVersions?: MockTemplateVersion[];
}) {
  const tables: Record<TableName, AnyRow[]> = {
    users: [...(options?.users ?? [])],
    templates: [...(options?.templates ?? [])],
    templateVersions: [...(options?.templateVersions ?? [])],
    auditLog: [],
  };

  let idCounter = 100;
  const nextId = (table: string) => `${table}_${++idCounter}`;

  const indexLookups: Record<
    string,
    Record<string, (row: AnyRow, value: string) => boolean>
  > = {
    users: {
      by_email: (row, value) => row.email === value,
    },
    templates: {
      by_category: (row, value) => row.category === value,
    },
    templateVersions: {
      by_template: (row, value) => row.templateId === value,
    },
    auditLog: {
      by_actor: (row, value) => row.actorUserId === value,
    },
  };

  const db = {
    get: async (id: string): Promise<AnyRow | null> => {
      for (const rows of Object.values(tables)) {
        const found = rows.find((r) => r._id === id);
        if (found) return { ...found };
      }
      return null;
    },

    query: (table: string) => {
      const tableRows = tables[table as TableName] ?? [];
      return {
        withIndex: (
          indexName: string,
          predicate: (q: {
            eq: (field: string, value: string) => unknown;
          }) => unknown,
        ) => {
          const q = { eq: (_field: string, value: string) => value };
          const filterValue = predicate(q) as string;
          const matcher = indexLookups[table]?.[indexName];

          const matched = matcher
            ? tableRows.filter((row) => matcher(row, filterValue))
            : tableRows;

          return {
            first: async () =>
              matched.length > 0 ? { ...matched[0] } : null,
            collect: async () => matched.map((r) => ({ ...r })),
            order: (dir: "asc" | "desc") => ({
              collect: async () => {
                const sorted = [...matched];
                if (table === "templateVersions") {
                  sorted.sort((a, b) =>
                    dir === "desc"
                      ? (b.version as number) - (a.version as number)
                      : (a.version as number) - (b.version as number),
                  );
                }
                return sorted.map((r) => ({ ...r }));
              },
            }),
          };
        },
        collect: async () => tableRows.map((r) => ({ ...r })),
        filter: () => ({
          collect: async () => tableRows.map((r) => ({ ...r })),
        }),
      };
    },

    insert: async (
      table: string,
      doc: Record<string, unknown>,
    ): Promise<string> => {
      const id = nextId(table);
      const row = { _id: id, ...doc } as AnyRow;
      if (!tables[table as TableName]) {
        tables[table as TableName] = [];
      }
      tables[table as TableName].push(row);
      return id;
    },

    patch: async (
      id: string,
      fields: Record<string, unknown>,
    ): Promise<void> => {
      for (const rows of Object.values(tables)) {
        const row = rows.find((r) => r._id === id);
        if (row) {
          Object.assign(row, fields);
          return;
        }
      }
    },
  };

  const ctx = {
    db,
  };

  return {
    ctx,
    tables,
    getTable: <T extends AnyRow>(name: TableName) =>
      tables[name] as unknown as T[],
  };
}

/**
 * Extracts the callable handler from a Convex action/mutation/query object.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function callHandler(fn: any, ctx: any, args?: any): Promise<any> {
  const h = typeof fn === "function" ? fn : fn.handler;
  return h(ctx, args ?? {});
}

/**
 * Dynamically imports convex/seed and returns the seed handler.
 * If the module doesn't exist yet (pre-implementation), throws a
 * descriptive error that clearly indicates missing implementation.
 *
 * Uses runtime path construction to prevent Vite's static import
 * analysis from failing at build time for a module that doesn't exist yet.
 */
export async function importSeedModule(): Promise<Record<string, unknown>> {
  const modulePath = ["../../convex", "seed"].join("/");
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (import(/* @vite-ignore */ modulePath) as Promise<any>);
  } catch {
    throw new Error(
      "WOR-64: convex/seed.ts does not exist yet — implementation required",
    );
  }
}

/**
 * Resolves the seed handler function from the seed module exports.
 */
export function getSeedHandler(seedModule: Record<string, unknown>): unknown {
  const seedFn =
    seedModule.seed ?? seedModule.default ?? Object.values(seedModule)[0];
  if (!seedFn) {
    throw new Error(
      "WOR-64: convex/seed.ts has no recognizable seed export",
    );
  }
  return seedFn;
}
