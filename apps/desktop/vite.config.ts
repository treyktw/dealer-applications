import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter, TanStackRouterVite } from '@tanstack/router-vite-plugin'
import path from 'path'

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react(), tailwindcss(), tanstackRouter({
    routesDirectory: './src/routes',
    generatedRouteTree: './src/routeTree.gen.ts',
  })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ["convex/browser"]
  },
  build: {
    sourcemap: false,
    minify: "esbuild",
    rollupOptions: {
      output: {
        // Ensure PDF.js worker files are properly named and accessible
        assetFileNames: (assetInfo) => {
          // Keep worker files with their original names for easier loading
          if (assetInfo.name?.endsWith('.worker.js') || assetInfo.name?.endsWith('.worker.mjs')) {
            return 'assets/[name].[ext]'
          }
          return 'assets/[name]-[hash][extname]'
        },
        // Ensure chunks are properly named
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      }
    },
    // Copy PDF.js viewer files to the build output
    copyPublicDir: true,
  },
  // Ensure public directory assets are accessible
  publicDir: 'public',
  envPrefix: "VITE_",
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});
