### WOR-27: User upsert on login and role management helpers

Added automatic user provisioning on first login — a `users` row is created with the authenticated email and a default `USER` role. Subsequent logins return the existing record without duplication. New reusable auth helpers (`requireAuth`, `getUserByEmail`, `isAdmin`) are now available for all Convex functions to enforce authentication and role-based access.
