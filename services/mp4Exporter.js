import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { db } from './db';
import { loadMemeAssets, renderMemeFrame, calculateDimensions, applyDeepFry } from './renderService';
import { calculateGifLoopDuration, hasAnimatedText } from '../constants/textAnimations';

/**
 * Exports a meme as an MP4 video using WebCodecs and mp4-muxer
 * @param {Object} meme - The meme state
 * @param {Array} texts - Text overlays
 * @param {Array} stickers - Stickers
 * @param {Function} onProgress - Progress callback (percentage, statusMessage)
 * @returns {Promise<Blob>} - The generated MP4 blob
 */
/**
 * Exports a meme as an MP4 video using WebCodecs and mp4-muxer
 * @param {Object} meme - The meme state
 * @param {Array} texts - Text overlays
 * @param {Array} stickers - Stickers
 * @param {Function} onProgress - Progress callback (percentage, statusMessage)
 * @param {string} quality - Quality preset ('high', 'medium', 'low')
 * @returns {Promise<Blob>} - The generated MP4 blob
 */
import { VideoFrameProvider } from './VideoFrameProvider';

export async function exportMemeAsMp4(meme, texts, stickers, onProgress, quality = 'medium', action = 'download') {
    if (!("VideoEncoder" in window)) {
        throw new Error("WebCodecs (VideoEncoder) is not supported in this browser.");
    }

    // WORKER IMPLEMENTATION
    const exportId = crypto.randomUUID();
    let wakeLock = null;
    let videoProvider = null;

    try {
        if (navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen');

        // Setup Video Proxy
        videoProvider = new VideoFrameProvider();
        await videoProvider.init(meme);
        const { port1, port2 } = new MessageChannel();
        port1.onmessage = (e) => videoProvider.handleMessage(e, port1);

        return new Promise((resolve, reject) => {
            const worker = new Worker(new URL('./exportWorker.js', import.meta.url), { type: 'module' });

            const terminate = () => {
                worker.terminate();
                if (wakeLock) wakeLock.release().catch(() => {});
                db.activeExports.delete(exportId).catch(() => {});
                port1.close();
                videoProvider.cleanup();
            };

            worker.onmessage = (e) => {
                const { type, payload } = e.data;

                if (type === 'PROGRESS') {
                    if (onProgress) {
                        // Map worker messages to simplified stages
                        let stage = 'encoding';
                        if (payload.message.includes('Loading assets')) {
                            stage = 'preparing';
                        } else if (payload.message.includes('Encoding video frame')) {
                            stage = 'encoding';
                        }

                        onProgress({ stage, progress: payload.progress });
                    }
                    if (payload.progress % 10 === 0) {
                        db.activeExports.update(exportId, { progress: payload.progress, status: 'rendering' }).catch(() => {});
                    }
                } else if (type === 'DONE') {
                    terminate();
                    resolve(payload); // Blob
                } else if (type === 'ERROR') {
                    terminate();
                    reject(new Error(payload));
                }
            };

            worker.onerror = (err) => {
                 console.error("Worker Error Event:", err);
                 terminate();
                 reject(err);
            };

            // Start Export
            worker.postMessage({
                type: 'START_EXPORT',
                payload: {
                    exportId,
                    meme: structuredClone(meme),
                    texts: structuredClone(texts),
                    stickers: structuredClone(stickers),
                    quality,
                    format: 'mp4',
                    action,
                    videoProxyPort: port2
                }
            }, [port2]); // Transfer port2

            // Initial DB record
            db.activeExports.add({
                id: exportId,
                type: 'mp4',
                status: 'starting',
                progress: 0,
                data: {
                    meme: structuredClone(meme),
                    texts: structuredClone(texts),
                    stickers: structuredClone(stickers),
                    quality,
                    action
                }
            }).catch(() => {});
        });

    } catch (err) {
        console.error("Export Failed:", err);
        if (wakeLock) await wakeLock.release().catch(() => {});
        if (videoProvider) videoProvider.cleanup();
        throw err;
    }
}
