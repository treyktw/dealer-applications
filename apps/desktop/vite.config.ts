import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter, TanStackRouterVite } from '@tanstack/router-vite-plugin'
import path from 'path'

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
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
    // Make sure Vite prebundles convex browser client if you use it directly.
    include: ["convex/browser"]
  },


  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
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
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
