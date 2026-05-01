// Placeholder for Convex generated API types.
// This file will be replaced when `npx convex dev` runs.

/* eslint-disable @typescript-eslint/no-explicit-any */

function createFunctionReferenceStub(): any {
  return new Proxy(() => undefined, {
    get: (_target, property) => {
      if (typeof property === "symbol") {
        return undefined;
      }

      return createFunctionReferenceStub();
    },
  });
}

export const api: any = createFunctionReferenceStub();
export const internal: any = createFunctionReferenceStub();
