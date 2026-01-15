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
        ],
        // Offline fallback for navigation requests
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/ph/]
      },
      manifest: {
        start_url: 'https://meme-creator.app/',
        scope: 'https://meme-creator.app/',
        id: 'meme-creator',
        name: 'Meme Creator',
        short_name: 'MemeCreator',
        description: 'Create ultra-high quality memes with AI and localized processing.',
        theme_color: '#ef4444',
        background_color: '#1a1a1a',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone'],
        orientation: 'portrait',
        dir: 'ltr',
        lang: 'en',
        categories: ['entertainment', 'photo', 'social'],
        handle_links: 'preferred',
        launch_handler: {
          client_mode: 'navigate-existing'
        },
        shortcuts: [
          {
            name: 'Create New Meme',
            short_name: 'New Meme',
            description: 'Start with a fresh canvas',
            url: '/?action=new',
            icons: [{ src: '/images/favicons/favicon-96x96.png', sizes: '96x96', type: 'image/png' }]
          },
          {
            name: 'Search GIFs',
            short_name: 'GIFs',
            description: 'Browse trending GIFs from Giphy',
            url: '/?action=gif-search',
            icons: [{ src: '/images/favicons/favicon-96x96.png', sizes: '96x96', type: 'image/png' }]
          }
        ],
        share_target: {
          action: '/',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
            files: [
              {
                name: 'media',
                accept: ['image/*', 'image/gif', 'image/png', 'image/jpeg', 'image/webp']
              }
            ]
          }
        },
        screenshots: [
          {
            src: '/images/screenshots/PWA_Landscape.png',
            sizes: '2543x1296',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Desktop meme editor with AI tools'
          },
          {
            src: '/images/screenshots/PWA_Mobile.png',
            sizes: '536x1165',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Mobile meme creation experience'
          }
        ],
        icons: [
          {
            src: '/images/favicons/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/images/favicons/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/images/favicons/favicon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/images/maskable-icon/maskable_icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
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
