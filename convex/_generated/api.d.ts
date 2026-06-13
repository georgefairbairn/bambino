/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as categories from "../categories.js";
import type * as errors from "../errors.js";
import type * as feedback from "../feedback.js";
import type * as matches from "../matches.js";
import type * as names from "../names.js";
import type * as notifications from "../notifications.js";
import type * as partners from "../partners.js";
import type * as popularity from "../popularity.js";
import type * as premium from "../premium.js";
import type * as selections from "../selections.js";
import type * as users from "../users.js";
import type * as validation from "../validation.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  categories: typeof categories;
  errors: typeof errors;
  feedback: typeof feedback;
  matches: typeof matches;
  names: typeof names;
  notifications: typeof notifications;
  partners: typeof partners;
  popularity: typeof popularity;
  premium: typeof premium;
  selections: typeof selections;
  users: typeof users;
  validation: typeof validation;
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
