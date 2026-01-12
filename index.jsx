import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { PostHogProvider } from 'posthog-js/react'

const options = {
  api_host: import.meta.env.DEV
    ? import.meta.env.VITE_PUBLIC_POSTHOG_HOST
    : `${window.location.origin}/ph`,
  ui_host: 'https://us.posthog.com',
  defaults: '2025-11-30',
}

const RESET_KEY = "global_reset_v1";


if (!localStorage.getItem(RESET_KEY)) {
  localStorage.clear();

  localStorage.setItem(RESET_KEY, "true");

  if ('caches' in window) {
    caches.keys().then((names) => {
      Promise.all(names.map((name) => caches.delete(name))).finally(() => {
        window.location.reload(true);
      });
    });
  } else {
    window.location.reload(true);
  }
} else {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <PostHogProvider apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY} options={options}>
        <App />
      </PostHogProvider>
    </StrictMode>
  )
}
