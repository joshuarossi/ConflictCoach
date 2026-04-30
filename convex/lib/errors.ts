import { ConvexError } from "convex/values";

// Error code constants (TechSpec §7.4)
export const UNAUTHENTICATED = "UNAUTHENTICATED" as const;
export const FORBIDDEN = "FORBIDDEN" as const;
export const NOT_FOUND = "NOT_FOUND" as const;
export const CONFLICT = "CONFLICT" as const;
export const INVALID_INPUT = "INVALID_INPUT" as const;
export const TOKEN_INVALID = "TOKEN_INVALID" as const;
export const RATE_LIMITED = "RATE_LIMITED" as const;
export const AI_ERROR = "AI_ERROR" as const;
export const INTERNAL = "INTERNAL" as const;

const HTTP_STATUS: Record<string, number> = {
  [UNAUTHENTICATED]: 401,
  [FORBIDDEN]: 403,
  [NOT_FOUND]: 404,
  [CONFLICT]: 409,
  [INVALID_INPUT]: 400,
  [TOKEN_INVALID]: 400,
  [RATE_LIMITED]: 429,
  [AI_ERROR]: 502,
  [INTERNAL]: 500,
};

export type AppErrorCode =
  | typeof UNAUTHENTICATED
  | typeof FORBIDDEN
  | typeof NOT_FOUND
  | typeof CONFLICT
  | typeof INVALID_INPUT
  | typeof TOKEN_INVALID
  | typeof RATE_LIMITED
  | typeof AI_ERROR
  | typeof INTERNAL;

export interface AppErrorData {
  code: string;
  message: string;
  httpStatus: number;
}

export function throwAppError(code: string, message: string): never {
  const httpStatus = HTTP_STATUS[code];
  if (httpStatus === undefined) {
    throw new ConvexError({
      code: INTERNAL,
      message,
      httpStatus: 500,
    } satisfies AppErrorData);
  }
  throw new ConvexError({ code, message, httpStatus } satisfies AppErrorData);
}
