# WOR-59: Admin Template CRUD Backend

Added admin-gated Convex mutations and queries for managing AI coaching
prompt templates (`convex/templates.ts`). Admins can now create templates
per conflict category, publish immutable new versions with monotonically
increasing version numbers, and archive templates without affecting cases
already pinned to them. All write operations are recorded in the audit log.
