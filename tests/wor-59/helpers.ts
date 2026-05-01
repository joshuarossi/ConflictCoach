/**
 * Shared test helpers for WOR-59: Admin template CRUD backend.
 *
 * Provides an in-memory mock of the Convex context with support for
 * users, templates, templateVersions, and auditLog tables.
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

export interface MockAuditLogEntry {
  [key: string]: unknown;
  _id: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: unknown;
  createdAt: number;
}

type TableName =
  | "users"
  | "templates"
  | "templateVersions"
  | "auditLog";

type AnyRow = Record<string, unknown> & { _id: string };

/**
 * Creates a mock Convex context with in-memory tables that supports
 * get, query (with index), insert, and patch operations.
 */
export function createMockContext(options: {
  identity: { email: string; subject?: string } | null;
  users?: MockUser[];
}) {
  const tables: Record<TableName, AnyRow[]> = {
    users: [...(options.users ?? [])],
    templates: [],
    templateVersions: [],
    auditLog: [],
  };

  let idCounter = 0;
  const nextId = (table: string) => `${table}_${++idCounter}`;

  // Index definitions for each table
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
          const matcher =
            indexLookups[table]?.[indexName];

          const matched = matcher
            ? tableRows.filter((row) => matcher(row, filterValue))
            : tableRows;

          return {
            first: async () => (matched.length > 0 ? { ...matched[0] } : null),
            collect: async () => matched.map((r) => ({ ...r })),
            order: (dir: "asc" | "desc") => ({
              collect: async () => {
                const sorted = [...matched];
                // For templateVersions, sort by version
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        order: (_dir: "asc" | "desc") => ({
          collect: async () => {
            const sorted = [...tableRows];
            return sorted.map((r) => ({ ...r }));
          },
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
    auth: {
      getUserIdentity: async () =>
        options.identity
          ? {
              email: options.identity.email,
              subject:
                options.identity.subject ??
                `subject_${options.identity.email}`,
              tokenIdentifier: `token_${options.identity.email}`,
            }
          : null,
    },
    db,
  };

  return {
    ctx,
    tables,
    /** Convenience: get all rows from a table */
    getTable: <T extends AnyRow>(name: TableName) =>
      tables[name] as unknown as T[],
  };
}

/**
 * Extracts the callable handler from a Convex mutation/query object.
 * Convex wrappers export objects with a `.handler` property rather than
 * plain functions. This utility normalises both shapes so tests work
 * regardless of how the export is structured.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function callHandler(fn: any, ctx: any, args: any): Promise<any> {
  const h = typeof fn === "function" ? fn : fn.handler;
  return h(ctx, args);
}

/** Pre-built admin user fixture */
export const ADMIN_USER: MockUser = {
  _id: "users_admin_1",
  email: "admin@example.com",
  displayName: "Admin Riley",
  role: "ADMIN",
  createdAt: 1700000000000,
};

/** Pre-built non-admin user fixture */
export const REGULAR_USER: MockUser = {
  _id: "users_regular_1",
  email: "user@example.com",
  displayName: "Regular Alex",
  role: "USER",
  createdAt: 1700000000000,
};
