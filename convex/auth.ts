// convex/auth.ts
import { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";

export async function auth(
  ctx: QueryCtx | MutationCtx | ActionCtx
): Promise<{ subject: string; email?: string; name?: string } | null> {

  const identity = await ctx.auth.getUserIdentity();

  
  if (!identity) {
    return null;
  }
  return {
    subject: identity.subject, // Use subject consistently
    email: identity.email,
    name: identity.name,
  };
}