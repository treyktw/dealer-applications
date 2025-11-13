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
import type * as api_licenseAuth from "../api/licenseAuth.js";
import type * as api_keys from "../api_keys.js";
import type * as auth from "../auth.js";
import type * as clerk from "../clerk.js";
import type * as clients from "../clients.js";
import type * as crons from "../crons.js";
import type * as dealerDocumentPackPurchases from "../dealerDocumentPackPurchases.js";
import type * as dealerships from "../dealerships.js";
import type * as deals from "../deals.js";
import type * as deeplink from "../deeplink.js";
import type * as desktopAuth from "../desktopAuth.js";
import type * as desktop_subscriptions from "../desktop_subscriptions.js";
import type * as developer from "../developer.js";
import type * as documentPackTemplates from "../documentPackTemplates.js";
import type * as documentPacks from "../documentPacks.js";
import type * as documents from "../documents.js";
import type * as documents_deal_generator from "../documents/deal_generator.js";
import type * as documents_fields from "../documents/fields.js";
import type * as documents_generator from "../documents/generator.js";
import type * as documents_templates from "../documents/templates.js";
import type * as domain_verification from "../domain_verification.js";
import type * as emailService from "../emailService.js";
import type * as emailTemplates from "../emailTemplates.js";
import type * as employees from "../employees.js";
import type * as external_api from "../external_api.js";
import type * as guards from "../guards.js";
import type * as http from "../http.js";
import type * as index from "../index.js";
import type * as internal_ from "../internal.js";
import type * as inventory from "../inventory.js";
import type * as lib_auth_emailHelpers from "../lib/auth/emailHelpers.js";
import type * as lib_cleanup from "../lib/cleanup.js";
import type * as lib_data_transformer from "../lib/data_transformer.js";
import type * as lib_export from "../lib/export.js";
import type * as lib_expression_evaluator from "../lib/expression_evaluator.js";
import type * as lib_helpers_auth_helpers from "../lib/helpers/auth_helpers.js";
import type * as lib_pdf_data_preparer from "../lib/pdf_data_preparer.js";
import type * as lib_pricing from "../lib/pricing.js";
import type * as lib_resend_client from "../lib/resend/client.js";
import type * as lib_s3_client from "../lib/s3/client.js";
import type * as lib_s3_document_paths from "../lib/s3/document_paths.js";
import type * as lib_s3_index from "../lib/s3/index.js";
import type * as lib_s3_operations from "../lib/s3/operations.js";
import type * as lib_s3_paths from "../lib/s3/paths.js";
import type * as lib_s3_presign from "../lib/s3/presign.js";
import type * as lib_s3_validation from "../lib/s3/validation.js";
import type * as lib_statuses from "../lib/statuses.js";
import type * as lib_stripe_client from "../lib/stripe/client.js";
import type * as lib_stripe_index from "../lib/stripe/index.js";
import type * as lib_stripe_products from "../lib/stripe/products.js";
import type * as lib_stripe_status from "../lib/stripe/status.js";
import type * as lib_subscription_config from "../lib/subscription/config.js";
import type * as lib_subscription_limits from "../lib/subscription/limits.js";
import type * as lib_validation_index from "../lib/validation/index.js";
import type * as lib_validation_schemas from "../lib/validation/schemas.js";
import type * as licenseWebhook from "../licenseWebhook.js";
import type * as licenses from "../licenses.js";
import type * as masterAdmin from "../masterAdmin.js";
import type * as notifications from "../notifications.js";
import type * as permissions from "../permissions.js";
import type * as polar from "../polar.js";
import type * as public_api from "../public_api.js";
import type * as queries_templates from "../queries/templates.js";
import type * as s3 from "../s3.js";
import type * as security from "../security.js";
import type * as settings from "../settings.js";
import type * as standaloneAuth from "../standaloneAuth.js";
import type * as standalonePDF from "../standalonePDF.js";
import type * as standaloneSubscriptions from "../standaloneSubscriptions.js";
import type * as standaloneSync from "../standaloneSync.js";
import type * as standaloneUsers from "../standaloneUsers.js";
import type * as stripe_webhook from "../stripe_webhook.js";
import type * as subscriptions from "../subscriptions.js";
import type * as users from "../users.js";
import type * as webhooks from "../webhooks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminIpManagement: typeof adminIpManagement;
  allowList: typeof allowList;
  "api/licenseAuth": typeof api_licenseAuth;
  api_keys: typeof api_keys;
  auth: typeof auth;
  clerk: typeof clerk;
  clients: typeof clients;
  crons: typeof crons;
  dealerDocumentPackPurchases: typeof dealerDocumentPackPurchases;
  dealerships: typeof dealerships;
  deals: typeof deals;
  deeplink: typeof deeplink;
  desktopAuth: typeof desktopAuth;
  desktop_subscriptions: typeof desktop_subscriptions;
  developer: typeof developer;
  documentPackTemplates: typeof documentPackTemplates;
  documentPacks: typeof documentPacks;
  documents: typeof documents;
  "documents/deal_generator": typeof documents_deal_generator;
  "documents/fields": typeof documents_fields;
  "documents/generator": typeof documents_generator;
  "documents/templates": typeof documents_templates;
  domain_verification: typeof domain_verification;
  emailService: typeof emailService;
  emailTemplates: typeof emailTemplates;
  employees: typeof employees;
  external_api: typeof external_api;
  guards: typeof guards;
  http: typeof http;
  index: typeof index;
  internal: typeof internal_;
  inventory: typeof inventory;
  "lib/auth/emailHelpers": typeof lib_auth_emailHelpers;
  "lib/cleanup": typeof lib_cleanup;
  "lib/data_transformer": typeof lib_data_transformer;
  "lib/export": typeof lib_export;
  "lib/expression_evaluator": typeof lib_expression_evaluator;
  "lib/helpers/auth_helpers": typeof lib_helpers_auth_helpers;
  "lib/pdf_data_preparer": typeof lib_pdf_data_preparer;
  "lib/pricing": typeof lib_pricing;
  "lib/resend/client": typeof lib_resend_client;
  "lib/s3/client": typeof lib_s3_client;
  "lib/s3/document_paths": typeof lib_s3_document_paths;
  "lib/s3/index": typeof lib_s3_index;
  "lib/s3/operations": typeof lib_s3_operations;
  "lib/s3/paths": typeof lib_s3_paths;
  "lib/s3/presign": typeof lib_s3_presign;
  "lib/s3/validation": typeof lib_s3_validation;
  "lib/statuses": typeof lib_statuses;
  "lib/stripe/client": typeof lib_stripe_client;
  "lib/stripe/index": typeof lib_stripe_index;
  "lib/stripe/products": typeof lib_stripe_products;
  "lib/stripe/status": typeof lib_stripe_status;
  "lib/subscription/config": typeof lib_subscription_config;
  "lib/subscription/limits": typeof lib_subscription_limits;
  "lib/validation/index": typeof lib_validation_index;
  "lib/validation/schemas": typeof lib_validation_schemas;
  licenseWebhook: typeof licenseWebhook;
  licenses: typeof licenses;
  masterAdmin: typeof masterAdmin;
  notifications: typeof notifications;
  permissions: typeof permissions;
  polar: typeof polar;
  public_api: typeof public_api;
  "queries/templates": typeof queries_templates;
  s3: typeof s3;
  security: typeof security;
  settings: typeof settings;
  standaloneAuth: typeof standaloneAuth;
  standalonePDF: typeof standalonePDF;
  standaloneSubscriptions: typeof standaloneSubscriptions;
  standaloneSync: typeof standaloneSync;
  standaloneUsers: typeof standaloneUsers;
  stripe_webhook: typeof stripe_webhook;
  subscriptions: typeof subscriptions;
  users: typeof users;
  webhooks: typeof webhooks;
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
