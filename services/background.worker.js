import { removeBackground } from "@imgly/background-removal";

self.onmessage = async (event) => {
    const { imageSource, config } = event.data;

    const progressCallback = (key, current, total) => {
        self.postMessage({ type: 'progress', progress: current / total });
    };

    // Strategy: Try GPU first for performance, fall back to CPU if GPU fails
    // This handles iOS (no WebGPU), older Android, and devices with WebGL issues

    const tryRemoveBackground = async (device) => {
        return await removeBackground(imageSource, {
            ...config,
            device, // 'gpu' or 'cpu'
            progress: progressCallback
        });
    };

    try {
        // First attempt: GPU (uses WebGPU if available, falls back to WebGL internally)
        const blob = await tryRemoveBackground('gpu');
        self.postMessage({ type: 'result', blob, usedFallback: false });
    } catch (gpuError) {
        console.warn("GPU background removal failed, trying CPU fallback:", gpuError.message);

        // Reset progress for retry
        self.postMessage({ type: 'progress', progress: 0 });

        try {
            // Second attempt: CPU (pure WASM, slower but most compatible)
            const blob = await tryRemoveBackground('cpu');
            self.postMessage({ type: 'result', blob, usedFallback: true });
        } catch (cpuError) {
            // Both failed - report the error
            console.error("CPU fallback also failed:", cpuError.message);
            self.postMessage({
                type: 'error',
                error: `Background removal failed on this device: ${cpuError.message}`
            });
        }
    }
};
