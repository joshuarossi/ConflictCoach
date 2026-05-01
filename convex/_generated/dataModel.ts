// Placeholder for Convex generated data model types.
// This file will be replaced when `npx convex dev` runs.

export type Id<TableName extends string> = string & { __tableName: TableName };
export type Doc<TableName extends string> = Record<string, unknown> & {
  _id: Id<TableName>;
  _creationTime: number;
};
