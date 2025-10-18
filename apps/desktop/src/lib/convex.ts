// src/lib/convex.ts - Updated for Desktop Auth
import { ConvexReactClient } from "convex/react";
import type { FunctionReference, FunctionReturnType } from "convex/server";
import { invoke } from '@tauri-apps/api/core';

// Create a shared Convex client instance
const client = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

// Storage key for auth token
const STORAGE_KEY = 'dealer_auth_token';

// Helper to get stored token
async function getStoredToken(): Promise<string | null> {
  try {
    const token = await invoke<string | null>('retrieve_secure', { key: STORAGE_KEY });
    return token;
  } catch (error) {
    console.error('Failed to retrieve token:', error);
    return null;
  }
}

// Helper to run Convex queries with auto-injected auth token
export async function convexQuery<Query extends FunctionReference<"query">>(
  query: Query,
  args: Query["_args"]
): Promise<FunctionReturnType<Query>> {
  const token = await getStoredToken();
  const argsWithAuth = token ? { ...args, authToken: token } : args;
  return client.query(query, argsWithAuth as Query["_args"]);
}

// Helper to run Convex mutations with auto-injected auth token
export async function convexMutation<Mutation extends FunctionReference<"mutation">>(
  mutation: Mutation,
  args: Mutation["_args"]
): Promise<FunctionReturnType<Mutation>> {
  const token = await getStoredToken();
  const argsWithAuth = token ? { ...args, authToken: token } : args;
  return client.mutation(mutation, argsWithAuth as Mutation["_args"]);
}

// Helper to run Convex actions
export async function convexAction<Action extends FunctionReference<"action">>(
  action: Action,
  args: Action["_args"]
): Promise<FunctionReturnType<Action>> {
  return client.action(action, args);
}

// Set auth token when available (kept for backwards compatibility)
export function setConvexAuth(_token: string | null) {
  // Token is now passed in each query/mutation instead of set globally
  // This function is kept for backwards compatibility
  console.log('🔐 Convex auth token updated');
}

export { client as convexClient };