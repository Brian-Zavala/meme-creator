import React, { useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { db } from '../services/db';
import { exportMemeAsGif } from '../services/gifExporter';

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
                    db.activeExports.delete(lastExport.id);
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
    const { meme, texts, stickers } = exportEntry.data;
    const toastId = toast.loading("Resuming export...", {
        style: {
            background: '#1e1e1e',
            color: '#fff',
            border: '1px solid #333'
        }
    });

    try {
        // Reuse export logic
        await exportMemeAsGif(meme, texts, stickers, (progress, message) => {
            // Update the toast directly
            // Not ideal to update toast continually but works for visual feedback
            // Better would be connecting to a global progress store, but for recovery this is fine.
        });

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
