/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_audit from "../admin/audit.js";
import type * as admin_templates from "../admin/templates.js";
import type * as auth from "../auth.js";
import type * as caseClosure from "../caseClosure.js";
import type * as cases from "../cases.js";
import type * as cases_create from "../cases/create.js";
import type * as crons from "../crons.js";
import type * as crons_cleanup from "../crons/cleanup.js";
import type * as draftCoach from "../draftCoach.js";
import type * as http from "../http.js";
import type * as invites_redeem from "../invites/redeem.js";
import type * as jointChat from "../jointChat.js";
import type * as lib_audit from "../lib/audit.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_claudeMock from "../lib/claudeMock.js";
import type * as lib_compression from "../lib/compression.js";
import type * as lib_draftCoachReadiness from "../lib/draftCoachReadiness.js";
import type * as lib_errors from "../lib/errors.js";
import type * as lib_privacyFilter from "../lib/privacyFilter.js";
import type * as lib_prompts from "../lib/prompts.js";
import type * as lib_stateMachine from "../lib/stateMachine.js";
import type * as lib_streaming from "../lib/streaming.js";
import type * as privateCoaching from "../privateCoaching.js";
import type * as seed from "../seed.js";
import type * as synthesis_generate from "../synthesis/generate.js";
import type * as templates from "../templates.js";
import type * as testSupport from "../testSupport.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "admin/audit": typeof admin_audit;
  "admin/templates": typeof admin_templates;
  auth: typeof auth;
  caseClosure: typeof caseClosure;
  cases: typeof cases;
  "cases/create": typeof cases_create;
  crons: typeof crons;
  "crons/cleanup": typeof crons_cleanup;
  draftCoach: typeof draftCoach;
  http: typeof http;
  "invites/redeem": typeof invites_redeem;
  jointChat: typeof jointChat;
  "lib/audit": typeof lib_audit;
  "lib/auth": typeof lib_auth;
  "lib/claudeMock": typeof lib_claudeMock;
  "lib/compression": typeof lib_compression;
  "lib/draftCoachReadiness": typeof lib_draftCoachReadiness;
  "lib/errors": typeof lib_errors;
  "lib/privacyFilter": typeof lib_privacyFilter;
  "lib/prompts": typeof lib_prompts;
  "lib/stateMachine": typeof lib_stateMachine;
  "lib/streaming": typeof lib_streaming;
  privateCoaching: typeof privateCoaching;
  seed: typeof seed;
  "synthesis/generate": typeof synthesis_generate;
  templates: typeof templates;
  testSupport: typeof testSupport;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
