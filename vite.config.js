import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react({ babel: { plugins: ["babel-plugin-react-compiler"] } }), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-hot-toast"],
          "vendor-media": ["gif.js", "omggif", "html2canvas-pro"],
          "vendor-utils": ["clsx", "tailwind-merge", "lucide-react"],
          "vendor-analytics": ["posthog-js"],
        },
      },
    },
  },
});
