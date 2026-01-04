import ReactDOM from 'react-dom/client';
import './index.css';
import App from "./App"
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'

posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST,
})

ReactDOM
    .createRoot(document.getElementById('root'))
    .render(
        <PostHogProvider client={posthog}>
            <App />
        </PostHogProvider>
    );