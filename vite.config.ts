import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2020",
    sourcemap: false,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }
          if (id.includes("react") || id.includes("react-dom") || id.includes("react-router-dom")) {
            return "react";
          }
          if (id.includes("recharts")) {
            return "charts";
          }
          if (id.includes("dompurify")) {
            return "sanitizer";
          }
          // clsx recharts bhi use karta hai: yahan na ho to Rollup ise charts chunk me daal deta
          // aur login page par bhi poora charts (~400KB) preload hota tha.
          if (id.includes("axios") || id.includes("lucide-react") || id.includes("react-hook-form") || id.includes("/clsx/")) {
            return "vendor";
          }
          return undefined;
        }
      }
    }
  },
  server: {
    port: 5173,
    host:true
  },
  preview: {
    host: "0.0.0.0",
    port: 4173
  }
});
