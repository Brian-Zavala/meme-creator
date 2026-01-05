import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react({ babel: { plugins: ["babel-plugin-react-compiler"] } }), tailwindcss()],

  // 1. PREVENT VITE FROM BREAKING THE LIBRARY
  optimizeDeps: {
    exclude: ['@imgly/background-removal']
  },

  // 2. ENABLE MULTI-THREADING (High Performance Mode)
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    }
  },

  // 3. ENABLE WORKER MODULES
  worker: {
    format: 'es',
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-hot-toast"],
          "vendor-media": ["gif.js", "omggif", "html2canvas-pro", "@imgly/background-removal"],
          "vendor-utils": ["clsx", "tailwind-merge", "lucide-react"],
          "vendor-analytics": ["posthog-js"],
        },
      },
    },
  },
});