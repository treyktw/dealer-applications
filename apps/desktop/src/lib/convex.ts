// src/lib/convex.ts
import { ConvexClient } from "convex/browser";
import { FunctionReference, FunctionReturnType } from "convex/server";

const client = new ConvexClient(import.meta.env.VITE_CONVEX_URL);

// Helper to run Convex queries
export async function convexQuery<Query extends FunctionReference<"query">>(
  query: Query,
  args: Query["_args"]
): Promise<FunctionReturnType<Query>> {
  return client.query(query, args);
}

// Helper to run Convex mutations
export async function convexMutation<Mutation extends FunctionReference<"mutation">>(
  mutation: Mutation,
  args: Mutation["_args"]
): Promise<FunctionReturnType<Mutation>> {
  return client.mutation(mutation, args);
}

// Helper to run Convex actions
export async function convexAction<Action extends FunctionReference<"action">>(
  action: Action,
  args: Action["_args"]
): Promise<FunctionReturnType<Action>> {
  return client.action(action, args);
}

// Set auth token when available
export function setConvexAuth(token: string | null) {
  client.setAuth(() => Promise.resolve(token));
}

export { client as convexClient };