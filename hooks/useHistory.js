import { useState, useCallback, useRef, useDebugValue } from "react";

/**
 * Maximum number of history states to keep
 * Prevents unbounded memory growth during long editing sessions
 */
const MAX_HISTORY_SIZE = 50;

/**
 * Minimum time between history saves (ms)
 * Prevents rapid state changes from flooding history
 */
const HISTORY_THROTTLE_MS = 300;

// Helper to check deep equality to prevent duplicate history entries
function areStatesEqual(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return a === b;
  
  try {
    // Fast path: JSON stringify
    // We exclude sourceBlob/File objects from comparison as they serialize to {}
    // and we rely on URL strings or other props for uniqueness
    return JSON.stringify(a, (key, value) => {
      if (key === 'sourceBlob' || value instanceof Blob || value instanceof File) {
        return undefined;
      }
      return value;
    }) === JSON.stringify(b, (key, value) => {
      if (key === 'sourceBlob' || value instanceof Blob || value instanceof File) {
        return undefined;
      }
      return value;
    });
  } catch (e) {
    console.warn("History equality check failed", e);
    return false;
  }
}

export default function useHistory(initialState, initialHistory = null) {
  // Store all history state in a single object to ensure atomicity
  // and prevent synchronization issues (like the "double click" bug)
  const [history, setHistory] = useState(initialHistory || {
    past: [],
    present: initialState,
    future: []
  });

  // Refs for throttling logic
  const lastSaveTimeRef = useRef(0);
  const timerRef = useRef(null);
  const pendingSnapshotRef = useRef(null); // Stores state to be saved during throttling

  // Show hook state in React DevTools
  useDebugValue({ past: history.past.length, future: history.future.length });

  // Standard update with throttling
  const updateState = useCallback((newStateOrFn) => {
    setHistory((curr) => {
      const newPresent = typeof newStateOrFn === "function" 
        ? newStateOrFn(curr.present) 
        : newStateOrFn;
      
      // 1. Identity Check: If strict equality, assume no change and return
      if (newPresent === curr.present) {
        return curr;
      }

      const now = Date.now();

      // Immediate Save (Not Throttled)
      if (now - lastSaveTimeRef.current >= HISTORY_THROTTLE_MS) {
        lastSaveTimeRef.current = now;
        
        // Clear any pending throttled save since we are saving now
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }

        // Dedup Check: Don't push to past if same as last entry
        const lastPast = curr.past[curr.past.length - 1];
        if (lastPast && areStatesEqual(curr.present, lastPast)) {
           return {
             ...curr,
             present: newPresent,
             future: []
           };
        }

        const newPast = [...curr.past, curr.present];
        if (newPast.length > MAX_HISTORY_SIZE) {
          newPast.shift(); // Remove oldest
        }

        return {
          past: newPast,
          present: newPresent,
          future: []
        };
      } 
      
      // Throttled Save
      // We update 'present' immediately for responsiveness, but delay pushing to 'past'
      
      // Capture the state *before* this update as a candidate for history
      pendingSnapshotRef.current = curr.present;

      if (!timerRef.current) {
        timerRef.current = setTimeout(() => {
          setHistory((latest) => {
            const snapshot = pendingSnapshotRef.current;
            if (!snapshot) return latest;

            lastSaveTimeRef.current = Date.now();
            timerRef.current = null;
            pendingSnapshotRef.current = null;

            // Dedup Check inside timer
            const lastPast = latest.past[latest.past.length - 1];
            if (lastPast && areStatesEqual(snapshot, lastPast)) {
               return latest; // Don't add duplicate
            }

            const newPast = [...latest.past, snapshot];
            if (newPast.length > MAX_HISTORY_SIZE) {
              newPast.shift();
            }

            return {
              ...latest,
              past: newPast,
              // We don't change present here, just archiving the snapshot
              future: [] 
            };
          });
        }, HISTORY_THROTTLE_MS);
      }

      return {
        ...curr,
        present: newPresent,
        future: [] // Any change clears future
      };
    });
  }, []);

  // Transient update: Updates present WITHOUT touching history logic
  const updateTransient = useCallback((newStateOrFn) => {
    setHistory((curr) => {
      const newPresent = typeof newStateOrFn === "function" 
        ? newStateOrFn(curr.present) 
        : newStateOrFn;
      
      return {
        ...curr,
        present: newPresent
      };
    });
  }, []);

  const undo = useCallback(() => {
    // Clear pending throttle timers to prevent delayed saves overwriting undo
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      pendingSnapshotRef.current = null;
    }

    setHistory((curr) => {
      if (curr.past.length === 0) return curr;

      const previous = curr.past[curr.past.length - 1];
      const newPast = curr.past.slice(0, -1);

      return {
        past: newPast,
        present: previous,
        future: [curr.present, ...curr.future]
      };
    });
  }, []);

  const redo = useCallback(() => {
    // Clear pending throttle timers
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      pendingSnapshotRef.current = null;
    }

    setHistory((curr) => {
      if (curr.future.length === 0) return curr;

      const next = curr.future[0];
      const newFuture = curr.future.slice(1);

      return {
        past: [...curr.past, curr.present],
        present: next,
        future: newFuture
      };
    });
  }, []);

  // Replace state entirely (useful for hydration) without adding to history
  const replaceState = useCallback((newStateOrFn) => {
    // Clear pending throttle timers
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    setHistory((curr) => {
      const newPresent = typeof newStateOrFn === "function" 
        ? newStateOrFn(curr.present) 
        : newStateOrFn;
      
      return {
        ...curr,
        present: newPresent
      };
    });
  }, []);

  // Hydrate entire history stack (for persistent storage restoration)
  const hydrateHistory = useCallback((fullHistory) => {
      if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
      }
      setHistory(fullHistory);
  }, []);

  // Clear all history
  const clearHistory = useCallback(() => {
    setHistory(curr => ({
      ...curr,
      past: [],
      future: []
    }));
  }, []);

  return {
    state: history.present,
    updateState,
    updateTransient,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    replaceState,
    hydrateHistory,
    clearHistory,
    historySize: history.past.length + history.future.length,
    history // Expose full history for persistence
  };
}
