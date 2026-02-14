
/**
 * VideoFrameProvider - Hosts video elements on Main Thread
 * and serves frames to the Worker via MessagePort.
 */
export class VideoFrameProvider {
    constructor() {
        this.videos = new Map(); // panelId -> HTMLVideoElement
        this.bitmaps = new Map(); // panelId -> ImageBitmap (cache?)
    }

    async init(meme) {
        const promises = meme.panels.filter(p => p.isVideo || (p.url && p.url.match(/\.(mp4|webm|mov)$/i))).map(async (panel) => {
             const video = document.createElement('video');
             // FIX: Only set crossOrigin if NOT a blob/data URL
             if (!panel.url.startsWith('blob:') && !panel.url.startsWith('data:')) {
                 video.crossOrigin = "anonymous";
             }
             video.src = panel.url;
             video.muted = true;
             video.playsInline = true;

             await new Promise((resolve, reject) => {
                 video.onloadedmetadata = () => resolve();
                 video.onerror = (e) => {
                     console.warn("Video load failed", e);
                     resolve(); // Ignore fail, worker will handle null
                 };
             });

             this.videos.set(panel.id, video);
        });

        await Promise.all(promises);
    }

    handleMessage(e, port) {
        const { reqId, panelId, timeMs, type } = e.data;
        const video = this.videos.get(panelId);

        if (!video) {
            port.postMessage({ reqId, error: 'Video not found' });
            return;
        }

        // 1. Handle Metadata Request (Sync)
        if (type === 'METADATA') {
             port.postMessage({
                 reqId,
                 meta: {
                     width: video.videoWidth,
                     height: video.videoHeight,
                     duration: video.duration
                 }
             });
             return;
        }

        // 2. Handle Frame Request (Async w/ Seek)
        const time = timeMs / 1000;

        // Use a small epsilon for float comparison
        if (Math.abs(video.currentTime - time) < 0.05 && video.readyState >= 2) {
             // Already at time, just capture
             this.captureFrame(video, reqId, port);
        } else {
             // Seek needed
             // Important: Set listener BEFORE setting currentTime to avoid race condition
             const onSeeked = () => {
                 this.captureFrame(video, reqId, port);
             };
             video.addEventListener('seeked', onSeeked, { once: true });
             video.currentTime = time;
        }
    }

    async captureFrame(video, reqId, port) {
        try {
            const bitmap = await createImageBitmap(video);
            port.postMessage({ reqId, bitmap }, [bitmap]);
        } catch (err) {
            port.postMessage({ reqId, error: err.message });
        }
    }


    cleanup() {
        this.videos.forEach(video => {
            video.pause();
            video.src = "";
            video.load();
        });
        this.videos.clear();
        this.bitmaps.clear();
    }
}
