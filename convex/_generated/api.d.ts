/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as adminIpManagement from "../adminIpManagement.js";
import type * as allowList from "../allowList.js";
import type * as auth from "../auth.js";
import type * as clerk from "../clerk.js";
import type * as clients from "../clients.js";
import type * as dealerships from "../dealerships.js";
import type * as deals from "../deals.js";
import type * as debug from "../debug.js";
import type * as deeplink from "../deeplink.js";
import type * as desktopAuth from "../desktopAuth.js";
import type * as developer from "../developer.js";
import type * as documentPacks from "../documentPacks.js";
import type * as documents from "../documents.js";
import type * as emailAuth from "../emailAuth.js";
import type * as employees from "../employees.js";
import type * as external_api from "../external_api.js";
import type * as http from "../http.js";
import type * as index from "../index.js";
import type * as inventory from "../inventory.js";
import type * as pdfFieldInspector from "../pdfFieldInspector.js";
import type * as pdfFieldMapper from "../pdfFieldMapper.js";
import type * as pdfProcessor from "../pdfProcessor.js";
import type * as pdfTemplates from "../pdfTemplates.js";
import type * as public_api from "../public_api.js";
import type * as queries_templates from "../queries/templates.js";
import type * as secure_s3 from "../secure_s3.js";
import type * as security from "../security.js";
import type * as settings from "../settings.js";
import type * as stripe_webhook from "../stripe_webhook.js";
import type * as subscriptions from "../subscriptions.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  adminIpManagement: typeof adminIpManagement;
  allowList: typeof allowList;
  auth: typeof auth;
  clerk: typeof clerk;
  clients: typeof clients;
  dealerships: typeof dealerships;
  deals: typeof deals;
  debug: typeof debug;
  deeplink: typeof deeplink;
  desktopAuth: typeof desktopAuth;
  developer: typeof developer;
  documentPacks: typeof documentPacks;
  documents: typeof documents;
  emailAuth: typeof emailAuth;
  employees: typeof employees;
  external_api: typeof external_api;
  http: typeof http;
  index: typeof index;
  inventory: typeof inventory;
  pdfFieldInspector: typeof pdfFieldInspector;
  pdfFieldMapper: typeof pdfFieldMapper;
  pdfProcessor: typeof pdfProcessor;
  pdfTemplates: typeof pdfTemplates;
  public_api: typeof public_api;
  "queries/templates": typeof queries_templates;
  secure_s3: typeof secure_s3;
  security: typeof security;
  settings: typeof settings;
  stripe_webhook: typeof stripe_webhook;
  subscriptions: typeof subscriptions;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
