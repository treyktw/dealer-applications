// src/deeplink/exchange.ts
import { ConvexClient } from "convex/browser";
import { api } from "@dealer/convex";
import { Effect, pipe } from "effect";
import { AuthService } from "@/effect/domain/Auth";
import { DeepLinkError } from "@/effect/domain/DeepLink";

const convex = new ConvexClient(import.meta.env.VITE_CONVEX_URL);

export const performDeepLinkExchange = (dealId: string, token: string) =>
  pipe(
    Effect.gen(function* (_) {
      const auth = yield* _(AuthService);
      
      // Get auth token
      const authToken = yield* _(auth.getToken());
      
      // Set auth for Convex
      convex.setAuth(() => Promise.resolve(authToken));
      
      // Exchange the token
      const result = yield* _(
        Effect.tryPromise({
          try: () => 
            convex.action(api.api.deeplink.exchangeDeepLinkToken, {
              dealId,
              token,
            }),
          catch: (error) => 
            new DeepLinkError({
              message: `Exchange failed: ${error}`,
              code: "EXCHANGE_FAILED",
            }),
        })
      );
      
      if (!result.success) {
        return yield* _(
          Effect.fail(
            new DeepLinkError({
              message: result.error || "Exchange failed",
              code: "INVALID_TOKEN",
            })
          )
        );
      }
      
      return result;
    })
  );