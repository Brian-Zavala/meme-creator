import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react({ babel: { plugins: ["babel-plugin-react-compiler"] } }), 
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json,onnx}'],
        maximumFileSizeToCacheInBytes: 30000000, // Increase limit to 30MB for heavy models/animations
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/models/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'ai-models-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/animations/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'lottie-animations-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/images/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              }
            }
          }
        ]
      },
      manifest: {
        name: 'Meme Creator Ultra',
        short_name: 'MemeCreator',
        description: 'Create ultra-high quality memes with AI and localized processing.',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'images/favicons/icons8-feels-guy-ios-17-filled-96.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ]
      }
    })
  ],

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