import { ConvexReactClient } from 'convex/react';

const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL;

if (!CONVEX_URL) {
  throw new Error(
    'Missing EXPO_PUBLIC_CONVEX_URL environment variable.\n' +
      'Add it to your .env file or set it in your environment.'
  );
}

/**
 * Convex client instance
 * This is the single instance used throughout the app
 */
export const convex = new ConvexReactClient(CONVEX_URL);
