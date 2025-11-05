/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminIpManagement from "../adminIpManagement.js";
import type * as allowList from "../allowList.js";
import type * as api_keys from "../api_keys.js";
import type * as auth from "../auth.js";
import type * as clerk from "../clerk.js";
import type * as clients from "../clients.js";
import type * as crons from "../crons.js";
import type * as dealerships from "../dealerships.js";
import type * as deals from "../deals.js";
import type * as deeplink from "../deeplink.js";
import type * as desktopAuth from "../desktopAuth.js";
import type * as desktop_subscriptions from "../desktop_subscriptions.js";
import type * as developer from "../developer.js";
import type * as documentPacks from "../documentPacks.js";
import type * as documents_deal_generator from "../documents/deal_generator.js";
import type * as documents_fields from "../documents/fields.js";
import type * as documents_generator from "../documents/generator.js";
import type * as documents_templates from "../documents/templates.js";
import type * as documents from "../documents.js";
import type * as domain_verification from "../domain_verification.js";
import type * as employees from "../employees.js";
import type * as external_api from "../external_api.js";
import type * as guards from "../guards.js";
import type * as http from "../http.js";
import type * as index from "../index.js";
import type * as internal_ from "../internal.js";
import type * as inventory from "../inventory.js";
import type * as lib_data_transformer from "../lib/data_transformer.js";
import type * as lib_expression_evaluator from "../lib/expression_evaluator.js";
import type * as lib_helpers_auth_helpers from "../lib/helpers/auth_helpers.js";
import type * as lib_pdf_data_preparer from "../lib/pdf_data_preparer.js";
import type * as lib_stripe_client from "../lib/stripe/client.js";
import type * as lib_stripe_index from "../lib/stripe/index.js";
import type * as lib_stripe_products from "../lib/stripe/products.js";
import type * as lib_stripe_status from "../lib/stripe/status.js";
import type * as permissions from "../permissions.js";
import type * as public_api from "../public_api.js";
import type * as queries_templates from "../queries/templates.js";
import type * as s3_utils from "../s3_utils.js";
import type * as secure_s3 from "../secure_s3.js";
import type * as security from "../security.js";
import type * as settings from "../settings.js";
import type * as stripe_webhook from "../stripe_webhook.js";
import type * as subscriptions from "../subscriptions.js";
import type * as users from "../users.js";
import type * as webhooks from "../webhooks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

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
  api_keys: typeof api_keys;
  auth: typeof auth;
  clerk: typeof clerk;
  clients: typeof clients;
  crons: typeof crons;
  dealerships: typeof dealerships;
  deals: typeof deals;
  deeplink: typeof deeplink;
  desktopAuth: typeof desktopAuth;
  desktop_subscriptions: typeof desktop_subscriptions;
  developer: typeof developer;
  documentPacks: typeof documentPacks;
  "documents/deal_generator": typeof documents_deal_generator;
  "documents/fields": typeof documents_fields;
  "documents/generator": typeof documents_generator;
  "documents/templates": typeof documents_templates;
  documents: typeof documents;
  domain_verification: typeof domain_verification;
  employees: typeof employees;
  external_api: typeof external_api;
  guards: typeof guards;
  http: typeof http;
  index: typeof index;
  internal: typeof internal_;
  inventory: typeof inventory;
  "lib/data_transformer": typeof lib_data_transformer;
  "lib/expression_evaluator": typeof lib_expression_evaluator;
  "lib/helpers/auth_helpers": typeof lib_helpers_auth_helpers;
  "lib/pdf_data_preparer": typeof lib_pdf_data_preparer;
  "lib/stripe/client": typeof lib_stripe_client;
  "lib/stripe/index": typeof lib_stripe_index;
  "lib/stripe/products": typeof lib_stripe_products;
  "lib/stripe/status": typeof lib_stripe_status;
  permissions: typeof permissions;
  public_api: typeof public_api;
  "queries/templates": typeof queries_templates;
  s3_utils: typeof s3_utils;
  secure_s3: typeof secure_s3;
  security: typeof security;
  settings: typeof settings;
  stripe_webhook: typeof stripe_webhook;
  subscriptions: typeof subscriptions;
  users: typeof users;
  webhooks: typeof webhooks;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
