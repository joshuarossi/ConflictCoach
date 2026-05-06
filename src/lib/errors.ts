import { ConvexError } from "convex/values";

export interface ParsedError {
  code: string;
  message: string;
}

export function parseConvexError(error: unknown): ParsedError {
  if (error instanceof ConvexError) {
    const data = error.data as Record<string, unknown>;
    return {
      code: typeof data.code === "string" ? data.code : "INTERNAL",
      message:
        typeof data.message === "string"
          ? data.message
          : "An unexpected error occurred",
    };
  }

  if (error instanceof Error) {
    return { code: "INTERNAL", message: error.message };
  }

  return { code: "INTERNAL", message: "An unexpected error occurred" };
}
