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

          toast((t) => (
            <div className="flex flex-col gap-2">
              <span className="font-medium text-white">An export was interrupted. Resume?</span>
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
    const { meme, texts, stickers, quality } = exportEntry.data;
    const toastId = toast.loading("Resuming export...", {
        style: {
            background: '#1e1e1e',
            color: '#fff',
            border: '1px solid #333'
        }
    });

    try {
        const onProgress = (progress, message) => {
            // Update the toast or UI if possible
        };

        let blob;
        if (exportEntry.type === 'mp4') {
            blob = await exportMemeAsMp4(meme, texts, stickers, onProgress, quality);
        } else {
            blob = await exportMemeAsGif(meme, texts, stickers, onProgress, quality);
        }

        if (blob) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${meme.name || 'meme'}-recovered-${timestamp}.${exportEntry.type}`;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        // Cleanup the old entry AFTER success (or we could do it before, but safer here to ensure it finished)
        await db.activeExports.delete(exportEntry.id);

        toast.success("Export saved! Check your downloads.", { id: toastId });
    } catch (err) {
        console.error("Resume failed:", err);
        toast.error("Failed to resume export.", { id: toastId });
        // Clean up bad entry
        await db.activeExports.delete(exportEntry.id);
    }
  };

  return null; // Renderless component
};
