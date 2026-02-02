import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "path";

export default defineConfig({
  plugins: [
    TanStackRouterVite({ autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 4823,
    proxy: {
      "/api": {
        target: "http://localhost:4822",
        changeOrigin: true,
      },
      "/ondc-site-verification.html": {
        target: "http://localhost:4822",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "../server/public",
    emptyOutDir: true,
  },
});
