import React, { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { db } from '../services/db';
import { exportMemeAsGif } from '../services/gifExporter';
import { exportMemeAsMp4 } from '../services/mp4Exporter';

/**
 * Checks for interrupted exports on mount and offers to resume them.
 * Mount this once at the top level of the app.
 */
export const ExportRecoveryManager = () => {
  useEffect(() => {
    const checkRecoverableExports = async () => {
      try {
        // Find any exports that were interrupted (stuck in 'starting' or 'rendering')
        // We can check if they are older than 10 seconds (to avoid race with current active ones if mounted twice?
        // actually app mount happens only once per reload).
        // Since JS environment is fresh, ANY entry in activeExports is a leftover from a previous session crash/reload.
        const pendingExports = await db.activeExports.toArray();

        if (pendingExports.length > 0) {
          // Found an interrupted export!
          const lastExport = pendingExports[pendingExports.length - 1]; // Take the latest one
          const isShare = lastExport.data?.action === 'share';
          const message = isShare ? "A share was interrupted. Resume?" : "An export was interrupted. Resume?";

          toast((t) => (
            <div className="flex flex-col gap-2">
              <span className="font-medium text-white">{message}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    resumeExport(lastExport);
                  }}
                  className="bg-brand px-3 py-1 rounded text-sm text-white font-bold"
                >
                  Resume
                </button>
                <button
                  onClick={() => {
                    toast.dismiss(t.id);
                    db.activeExports.clear();
                    toast.success("Interrupted export discarded", { duration: 3000 });
                  }}
                  className="px-3 py-1 text-sm text-gray-400 hover:text-white"
                >
                  Discard
                </button>
              </div>
            </div>
          ), {
            duration: 10000,
            style: {
              background: '#1e1e1e',
              border: '1px solid #333',
              color: '#fff'
            }
          });
        }
      } catch (e) {
        console.warn("Failed to check for recoverable exports:", e);
      }
    };

    checkRecoverableExports();
  }, []);

  const resumeExport = async (exportEntry) => {
    if (!exportEntry.data) {
        toast.error("Cannot resume: missing data");
        await db.activeExports.delete(exportEntry.id);
        return;
    }
    const { meme, texts, stickers, quality, action } = exportEntry.data;
    const isShare = action === 'share';

    const toastId = toast.loading(isShare ? "Resuming share..." : "Resuming export...", {
        style: {
            background: '#1e1e1e',
            color: '#fff',
            border: '1px solid #333'
        }
    });

    let isFinished = false;

    try {
        const onProgress = (progress, message) => {
            if (isFinished) return;
            toast.loading(`${message || 'Exporting'} (${Math.round(progress)}%)`, {
                id: toastId,
                style: {
                    background: '#1e1e1e',
                    color: '#fff',
                    border: '1px solid #333'
                }
            });
        };

        let blob;
        if (exportEntry.type === 'mp4') {
            blob = await exportMemeAsMp4(meme, texts, stickers, onProgress, quality, action);
        } else {
            blob = await exportMemeAsGif(meme, texts, stickers, onProgress, quality, action);
        }

        if (blob) {
            isFinished = true;
            if (isShare) {
                // Share Logic
                if (exportEntry.type === 'gif' && typeof ClipboardItem !== "undefined") {
                    try {
                        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
                        // Note: GIFs via clipboard usually need PNG format or special handling,
                        // but main Main.jsx logic handles this complexity.
                        // For recovery, let's try standard PNG write for broad compatibility or fall back.
                        // Actually, Main.jsx converts GIF to HTML/Text for robust clipboard support.
                        // Replicating that full logic here is heavy.
                        // Let's settle for "Download for Manual Share" for reliability if simple copy fails,
                        // OR just try writing the blob.

                        // Retry with GIF/PNG shim if needed? for now just blob.
                        toast.dismiss(toastId);
                        toast.success("Ready! Copied to clipboard.", { duration: 5000 });
                    } catch (e) {
                         // Fallback to download
                         downloadBlob(blob, meme.name, exportEntry.type);
                         toast.dismiss(toastId);
                         toast.success("Recovered! Downloaded for manual sharing.", { duration: 5000 });
                    }
                } else {
                     // MP4 or unsupported clipboard: Download
                     downloadBlob(blob, meme.name, exportEntry.type);
                     toast.dismiss(toastId);
                     toast.success("Recovered! Downloaded for manual sharing.", { duration: 5000 });
                }
            } else {
                // Download Logic
                downloadBlob(blob, meme.name, exportEntry.type);
                toast.dismiss(toastId);
                toast.success("Export saved! Check your downloads.", { duration: 5000 });
            }
        }

        // Cleanup the old entry AFTER success (or we could do it before, but safer here to ensure it finished)
        await db.activeExports.delete(exportEntry.id);

    } catch (err) {
        isFinished = true;
        console.error("Resume failed:", err);
        toast.dismiss(toastId);
        toast.error("Failed to resume.", { duration: 5000 });
        // Clean up bad entry
        await db.activeExports.delete(exportEntry.id);
    }
  };

  const downloadBlob = (blob, name, type) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${name || 'meme'}-recovered-${timestamp}.${type}`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
  };

  return null; // Renderless component
};
