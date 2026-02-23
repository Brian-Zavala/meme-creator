import { useRef, useCallback, useEffect } from 'react';
import toast, { useToasterStore } from 'react-hot-toast';
import { TOAST_DURATIONS } from './useToast';

// Stage display names
const STAGE_NAMES = {
  preparing: 'Preparing export...',
  preparing_share: 'Preparing to share...',
  rendering: 'Rendering...',
  encoding: 'Encoding video...',
  encoding_gif: 'Encoding GIF...',
  optimizing: 'Optimizing...',
  uploading: 'Uploading...',
  generating_link: 'Generating shareable link...',
  finalizing: 'Finalizing download...',
  finalizing_clipboard: 'Copying to clipboard...',
};

// Contextual encouragement messages per stage
const ENCOURAGEMENT_MESSAGES = {
  preparing: [
    'Gathering ingredients...',
    'Warming up the oven...',
    'Getting everything ready...',
    'Just a moment...',
  ],
  rendering: [
    'Cooking your meme...',
    'Adding special sauce...',
    'Crafting each frame...',
    'We\'re working hard for you...',
  ],
  encoding: [
    'Encoding your masterpiece...',
    'Compressing the magic...',
    'Almost there, hang tight...',
    'Man, we\'re sweating, just a bit longer...',
  ],
  optimizing: [
    'Making it perfect...',
    'Polishing the details...',
    'Shrinking the file size...',
    'This is the good part...',
  ],
  uploading: [
    'Sending to the cloud...',
    'Delivering your creation...',
    'Upload in progress...',
    'Nearly there...',
  ],
  generating_link: [
    'Creating your shareable link...',
    'Cooking up that URL...',
    'Generating magic link...',
    'Almost done...',
  ],
  finalizing: [
    'Putting the finishing touches...',
    'Wrapping it up...',
    'Just one more second...',
    'Preparing your download...',
  ],
};

export function useExportToast() {
  const toastIdRef = useRef(null);
  const currentStageRef = useRef(null);
  const currentProgressRef = useRef(null);
  const currentBytesRef = useRef({ uploaded: 0, total: 0 });
  const messageIndexRef = useRef(0);
  const intervalRef = useRef(null);

  // Mirror the current toast store so we can check visibility inside callbacks
  // without adding toasts as a useCallback dependency.
  const toastsRef = useRef([]);
  const { toasts } = useToasterStore();
  useEffect(() => { toastsRef.current = toasts; }, [toasts]);

  // Cleanup helper
  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Update the toast with current stage + encouragement
  const updateToastMessage = useCallback(() => {
    if (!toastIdRef.current || !currentStageRef.current) return;

    // Bug fix: if the user manually dismissed the loading toast (by clicking it),
    // UPSERT_TOAST would revive it by spreading { visible: true, dismissed: false }
    // from createToast() onto the dismissed store entry.  Guard against that here.
    const liveToast = toastsRef.current.find((t) => t.id === toastIdRef.current);
    if (liveToast && !liveToast.visible) return; // user dismissed — don't revive

    const stageName = STAGE_NAMES[currentStageRef.current] || currentStageRef.current;
    const messages = ENCOURAGEMENT_MESSAGES[currentStageRef.current.replace(/_share|_gif|_clipboard/, '')] || [];

    if (messages.length === 0) return;

    // Get current encouragement message
    const encouragement = messages[messageIndexRef.current % messages.length];

    // Build line 1: stage + progress
    let line1 = stageName;
    if (currentProgressRef.current !== null && currentProgressRef.current > 0) {
      line1 += ` (${currentProgressRef.current}%)`;
    } else if (currentStageRef.current === 'uploading' && currentBytesRef.current.total > 0) {
      const uploadedMB = (currentBytesRef.current.uploaded / (1024 * 1024)).toFixed(1);
      const totalMB = (currentBytesRef.current.total / (1024 * 1024)).toFixed(1);
      line1 += ` (${uploadedMB}MB / ${totalMB}MB)`;
    }

    // Build two-line message
    const message = `${line1}\n${encouragement}`;

    toast.loading(message, { id: toastIdRef.current, duration: Infinity });
  }, []);

  const start = useCallback((flowType, format) => {
    cleanup();

    // Determine initial stage based on flow type
    const initialStage = flowType === 'share' ? 'preparing_share' : 'preparing';

    currentStageRef.current = initialStage;
    currentProgressRef.current = null;
    currentBytesRef.current = { uploaded: 0, total: 0 };
    messageIndexRef.current = 0;

    // Create toast
    toastIdRef.current = toast.loading('Starting...', { duration: Infinity });

    // Update immediately
    updateToastMessage();

    // Start 4-second rotation
    intervalRef.current = setInterval(() => {
      messageIndexRef.current += 1;
      updateToastMessage();
    }, 4000);
  }, [cleanup, updateToastMessage]);

  const setStage = useCallback((stageName, options = {}) => {
    currentStageRef.current = stageName;
    currentProgressRef.current = options.progress ?? null;

    if (options.bytesUploaded !== undefined && options.bytesTotal !== undefined) {
      currentBytesRef.current = {
        uploaded: options.bytesUploaded,
        total: options.bytesTotal,
      };
    }

    // Reset message rotation to first message for new stage
    messageIndexRef.current = 0;

    updateToastMessage();
  }, [updateToastMessage]);

  const setProgress = useCallback((percent) => {
    currentProgressRef.current = percent;
    updateToastMessage();
  }, [updateToastMessage]);

  const success = useCallback((message) => {
    cleanup();
    if (toastIdRef.current) {
      toast.success(message, { id: toastIdRef.current, duration: TOAST_DURATIONS.export });
      toastIdRef.current = null;
    }
  }, [cleanup]);

  const error = useCallback((message) => {
    cleanup();
    if (toastIdRef.current) {
      toast.error(message, { id: toastIdRef.current, duration: TOAST_DURATIONS.export });
      toastIdRef.current = null;
    }
  }, [cleanup]);

  return {
    start,
    setStage,
    setProgress,
    success,
    error,
  };
}
