import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/[\\/]node_modules[\\/](recharts)[\\/]/.test(id)) return "charts";
          if (/[\\/]node_modules[\\/]@supabase[\\/]supabase-js[\\/]/.test(id)) return "supabase";
          if (
            /[\\/]node_modules[\\/](react-hook-form|@hookform[\\/]resolvers|zod)[\\/]/.test(id)
          ) {
            return "forms";
          }
          if (/[\\/]node_modules[\\/](react|react-dom|react-router-dom|scheduler)[\\/]/.test(id)) {
            return "react";
          }
        },
      },
    },
  },
});
