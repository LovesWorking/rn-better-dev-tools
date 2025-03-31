import { defineConfig } from "vite";

// https://vitejs.dev/config
export default defineConfig({
  build: {
    // Optimize build size
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // Don't generate source maps for production
    sourcemap: false,
  },
});
