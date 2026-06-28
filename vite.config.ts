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
          if (id.includes("jspdf-autotable")) {
            return "pdf-table";
          }
          if (id.includes("jspdf")) {
            return "pdf-core";
          }
          if (id.includes("html2canvas")) {
            return "pdf-canvas";
          }
          if (id.includes("dompurify") || id.includes("canvg") || id.includes("rgbcolor") || id.includes("raf")) {
            return "pdf-rendering";
          }
          if (id.includes("axios") || id.includes("lucide-react") || id.includes("react-hook-form")) {
            return "vendor";
          }
          return undefined;
        }
      }
    }
  },
  server: {
    port: 5173
  },
  preview: {
    host: "0.0.0.0",
    port: 4173
  }
});
