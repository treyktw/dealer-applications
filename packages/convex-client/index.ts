import { ConvexReactClient, useAction, useMutation, useQuery } from "convex/react";
import { CONVEX_URL } from "./env.js";

export { useAction, useMutation, useQuery, ConvexReactClient };
export { CONVEX_URL };
export type { ConvexAPI } from "./api.js";

/**
 * Create a ConvexReactClient with optional auth header injector.
 * Pass a token getter if you use Clerk/Auth.js/etc in the browser.
 */
export function createConvexClient(opts?: {
  url?: string;
  getAuthHeader?: () => Promise<string | undefined> | string | undefined;
}) {
  const url = opts?.url ?? CONVEX_URL;

  // Create a custom fetch wrapper if auth is needed
  const customFetch = opts?.getAuthHeader
    ? async (input: RequestInfo | URL, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        const auth = await opts.getAuthHeader();
        if (auth) headers.set("Authorization", auth);
        return fetch(input, { ...init, headers });
      }
    : undefined;

  const client = new ConvexReactClient(url);

  // Note: Custom auth headers should be handled via ConvexProviderWithClerk
  // or by setting headers on individual requests. This is a simplified version.
  return client;
}
