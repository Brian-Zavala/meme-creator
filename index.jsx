// StrictMode removed: incompatible with DotLottieWorkerReact
// (double-invokes effects -> transferControlToOffscreen crash)
import { /* StrictMode */ } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { PostHogProvider } from 'posthog-js/react'

// PostHog configuration - only used if API key is available
const posthogApiKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const posthogOptions = {
  api_host: import.meta.env.DEV
    ? import.meta.env.VITE_PUBLIC_POSTHOG_HOST
    : `${window.location.origin}/ph`,
  ui_host: 'https://us.posthog.com',
  defaults: '2025-11-30',
  // Prevent PostHog from blocking render on initialization failure
  bootstrap: { distinctID: undefined },
  loaded: (posthog) => {
    // PostHog loaded successfully
    if (import.meta.env.DEV) console.log('PostHog initialized');
  },
}

const RESET_KEY = "global_reset_v1";

/**
 * Wrapper component that conditionally includes PostHog
 * This prevents the app from crashing if PostHog fails to initialize
 */
function AppWithProviders() {
  // Only wrap with PostHog if API key exists and is valid
  if (posthogApiKey && typeof posthogApiKey === 'string' && posthogApiKey.length > 0) {
    return (
      <PostHogProvider apiKey={posthogApiKey} options={posthogOptions}>
        <App />
      </PostHogProvider>
    );
  }

  // Render without PostHog if no API key
  if (import.meta.env.DEV) {
    console.warn('PostHog API key not found - analytics disabled');
  }
  return <App />;
}

// Handle cache reset for version migrations
if (!localStorage.getItem(RESET_KEY)) {
  try {
    localStorage.clear();
    localStorage.setItem(RESET_KEY, "true");
  } catch (e) {
    // localStorage may be unavailable (incognito, storage full, etc.)
    console.warn('localStorage unavailable:', e);
  }

  if ('caches' in window) {
    caches.keys().then((names) => {
      Promise.all(names.map((name) => caches.delete(name))).finally(() => {
        window.location.reload(true);
      });
    }).catch(() => {
      // Cache API failed, just reload
      window.location.reload(true);
    });
  } else {
    window.location.reload(true);
  }
} else {
  // Normal app startup - wrapped in Error Boundary
  createRoot(document.getElementById('root')).render(
    <ErrorBoundary>
      <AppWithProviders />
    </ErrorBoundary>
  )
}
