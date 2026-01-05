import { removeBackground } from "@imgly/background-removal";

self.onmessage = async (event) => {
    const { imageSource, config } = event.data;

    try {
        const blob = await removeBackground(imageSource, {
            ...config,
            // Ensure the worker reports progress back to the main thread
            progress: (key, current, total) => {
                self.postMessage({ type: 'progress', progress: current / total });
            }
        });

        self.postMessage({ type: 'result', blob });
    } catch (error) {
        self.postMessage({ type: 'error', error: error.message });
    }
};
