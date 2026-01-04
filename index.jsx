import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { PostHogProvider } from 'posthog-js/react'

const options = {
  api_host: import.meta.env.DEV 
    ? import.meta.env.VITE_PUBLIC_POSTHOG_HOST 
    : `${window.location.origin}/ingest`,
  ui_host: 'https://us.posthog.com',
  defaults: '2025-11-30',
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PostHogProvider apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY} options={options}>
      <App />
    </PostHogProvider>
  </StrictMode>
)
