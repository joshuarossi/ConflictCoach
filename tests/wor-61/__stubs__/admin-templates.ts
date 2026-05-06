/**
 * Test shim for convex/admin/templates — re-exports the real handlers
 * under the names the tests originally expected.
 */
import {
  createTemplateHandler,
  publishVersionHandler,
  archiveTemplateHandler,
} from "../../../convex/admin/templates";

type Handler = (
  ctx: unknown,
  args: Record<string, unknown>,
) => Promise<unknown>;

export const createTemplate = createTemplateHandler as Handler;
export const publishVersion = publishVersionHandler as Handler;
export const archiveTemplate = archiveTemplateHandler as Handler;
