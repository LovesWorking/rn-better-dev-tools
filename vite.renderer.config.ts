import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { builtinModules } from "module";
import * as path from "path";

// https://vitejs.dev/config
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: [
        "@tanstack/query-devtools",
        "@tanstack/react-query-devtools",
        "@tanstack/react-query",
        ...builtinModules,
      ],
    },
  },
  resolve: {
    alias: {
      "@tanstack/react-query-devtools": path.resolve(
        __dirname,
        "node_modules/@tanstack/react-query-devtools"
      ),
      "@tanstack/query-devtools": path.resolve(
        __dirname,
        "node_modules/@tanstack/query-devtools"
      ),
      "@tanstack/react-query": path.resolve(
        __dirname,
        "node_modules/@tanstack/react-query"
      ),
    },
  },
});
