// Tiny, environment-agnostic helpers for resolving the Convex URL without pulling in Node libs.

function readEnv(name: string): string | undefined {
  // Next.js (process.env.* at build) or Node context
  // Guard in case process isn't defined (browser/runtime).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p: any = typeof process !== "undefined" ? process : undefined;
  const fromProcess = p?.env?.[name];

  // Vite/Expo style
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meta: any = typeof import.meta !== "undefined" ? import.meta : undefined;
  const fromImportMeta = meta?.env?.[name];

  return fromProcess ?? fromImportMeta;
}

/**
 * Resolve Convex deployment URL with sane fallbacks.
 * Priority:
 * 1) localStorage 'convexUrl' (handy for dev overrides)
 * 2) NEXT_PUBLIC_CONVEX_URL
 * 3) VITE_CONVEX_URL
 * 4) http://127.0.0.1:3210 (convex dev default)
 */
export function getConvexUrl(): string {
  try {
    if (typeof window !== "undefined") {
      const override = window.localStorage?.getItem("convexUrl");
      if (override) return override;
    }
  } catch {
    // ignore storage errors
  }

  const nextUrl = readEnv("NEXT_PUBLIC_CONVEX_URL");
  if (nextUrl) return nextUrl;

  const viteUrl = readEnv("VITE_CONVEX_URL");
  if (viteUrl) return viteUrl;

  return "http://127.0.0.1:3210";
}

/** Convenience constant for apps that don't need lazy resolution. */
export const CONVEX_URL = getConvexUrl();
