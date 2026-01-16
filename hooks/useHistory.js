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

/**
 * Creates a structural diff between two states
 * Only stores changed properties to reduce memory usage
 * @param {Object} oldState - Previous state
 * @param {Object} newState - New state  
 * @returns {Object} Patch object with only changed values
 */
function createPatch(oldState, newState) {
  const patch = { __baseRef: oldState };
  const changes = {};
  let hasChanges = false;

  for (const key of Object.keys(newState)) {
    if (oldState[key] !== newState[key]) {
      changes[key] = newState[key];
      hasChanges = true;
    }
  }

  // Also check for removed keys
  for (const key of Object.keys(oldState)) {
    if (!(key in newState)) {
      changes[key] = undefined;
      hasChanges = true;
    }
  }

  return hasChanges ? { ...patch, changes } : null;
}

/**
 * Applies a patch to reconstruct the full state
 * @param {Object} patch - Patch object with __baseRef and changes
 * @returns {Object} Reconstructed full state
 */
function applyPatch(patch) {
  if (!patch.__baseRef) return patch; // Not a patch, return as-is
  
  const result = { ...patch.__baseRef };
  for (const [key, value] of Object.entries(patch.changes)) {
    if (value === undefined) {
      delete result[key];
    } else {
      result[key] = value;
    }
  }
  return result;
}

export default function useHistory(initialState) {
  const [state, setState] = useState(initialState);
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  // Use a ref to always have access to the latest state for history pushes
  // This prevents race conditions where the closure-captured 'state' is stale
  const stateRef = useRef(state);
  stateRef.current = state;

  // Throttle ref to prevent rapid history saves
  const lastSaveTimeRef = useRef(0);
  const pendingStateRef = useRef(null);
  const throttleTimerRef = useRef(null);

  // Show hook state in React DevTools
  useDebugValue({ past: past.length, future: future.length });

  // Standard update: Clears future, pushes current to past
  const updateState = useCallback((newState) => {
    setState((current) => {
      const resolvedState = typeof newState === "function" ? newState(current) : newState;
      const now = Date.now();
      
      // Throttle history saves to prevent memory bloat from rapid changes
      if (now - lastSaveTimeRef.current >= HISTORY_THROTTLE_MS) {
        // Create a patch instead of storing full state copy
        const patch = createPatch({}, current); // Store full state for first entry
        
        setPast((prev) => {
          const newPast = [...prev, patch || current];
          // Limit history size to prevent memory leaks
          if (newPast.length > MAX_HISTORY_SIZE) {
            return newPast.slice(-MAX_HISTORY_SIZE);
          }
          return newPast;
        });
        setFuture([]);
        lastSaveTimeRef.current = now;
        pendingStateRef.current = null;
        
        // Clear any pending throttled save
        if (throttleTimerRef.current) {
          clearTimeout(throttleTimerRef.current);
          throttleTimerRef.current = null;
        }
      } else {
        // Store pending state and schedule a save
        pendingStateRef.current = current;
        
        if (!throttleTimerRef.current) {
          throttleTimerRef.current = setTimeout(() => {
            if (pendingStateRef.current) {
              setPast((prev) => {
                const newPast = [...prev, pendingStateRef.current];
                if (newPast.length > MAX_HISTORY_SIZE) {
                  return newPast.slice(-MAX_HISTORY_SIZE);
                }
                return newPast;
              });
              setFuture([]);
              lastSaveTimeRef.current = Date.now();
              pendingStateRef.current = null;
            }
            throttleTimerRef.current = null;
          }, HISTORY_THROTTLE_MS);
        }
      }

      return resolvedState;
    });
  }, []);

  // Transient update: Updates state WITHOUT saving to history
  const updateTransient = useCallback((newState) => {
    setState((current) => {
      return typeof newState === "function" ? newState(current) : newState;
    });
  }, []);

  const undo = useCallback(() => {
    setPast((currentPast) => {
      if (currentPast.length === 0) return currentPast;

      const previousPatch = currentPast[currentPast.length - 1];
      const previous = previousPatch.__baseRef ? applyPatch(previousPatch) : previousPatch;
      const newPast = currentPast.slice(0, currentPast.length - 1);

      setState((currentState) => {
        setFuture((prevFuture) => {
          const newFuture = [currentState, ...prevFuture];
          // Also limit future size
          if (newFuture.length > MAX_HISTORY_SIZE) {
            return newFuture.slice(0, MAX_HISTORY_SIZE);
          }
          return newFuture;
        });
        return previous;
      });

      return newPast;
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((currentFuture) => {
      if (currentFuture.length === 0) return currentFuture;

      const next = currentFuture[0];
      const newFuture = currentFuture.slice(1);

      setState((currentState) => {
        setPast((prevPast) => {
          const newPast = [...prevPast, currentState];
          if (newPast.length > MAX_HISTORY_SIZE) {
            return newPast.slice(-MAX_HISTORY_SIZE);
          }
          return newPast;
        });
        return next;
      });

      return newFuture;
    });
  }, []);

  // Replace state entirely (useful for hydration) without adding to history
  const replaceState = useCallback((newState) => {
    setState(typeof newState === "function" ? newState(stateRef.current) : newState);
  }, []);

  // Clear all history (useful after save operations)
  const clearHistory = useCallback(() => {
    setPast([]);
    setFuture([]);
  }, []);

  return {
    state,
    updateState,
    updateTransient,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    replaceState,
    clearHistory,
    historySize: past.length + future.length,
  };
}
