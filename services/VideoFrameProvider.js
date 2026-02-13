
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
             video.crossOrigin = "anonymous";
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
        const { reqId, panelId, timeMs } = e.data;
        const video = this.videos.get(panelId);

        if (!video) {
            port.postMessage({ reqId, error: 'Video not found' });
            return;
        }

        const time = timeMs / 1000;
        video.currentTime = time;

        // Seek and capture
        const seekHandler = async () => {
            try {
                const bitmap = await createImageBitmap(video);
                port.postMessage({ reqId, bitmap }, [bitmap]);
            } catch (err) {
                port.postMessage({ reqId, error: err.message });
            }
        };

        // If close enough, just capture?
        // Need precise seeking.
        if (Math.abs(video.currentTime - time) < 0.1 && video.readyState >= 2) {
             seekHandler();
        } else {
             video.onseeked = () => {
                 video.onseeked = null;
                 seekHandler();
             };
             // Fallback for timeout?
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
