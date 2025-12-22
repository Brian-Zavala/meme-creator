import { useState, useCallback } from "react";

export default function useHistory(initialState) {
  const [state, setState] = useState(initialState);
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);

  // Standard update: Clears future, pushes current to past
  // Use this for "committed" actions (add sticker, finish drag, etc.)
  const updateState = useCallback((newState) => {
    setPast((prev) => [...prev, state]);
    setState(newState);
    setFuture([]);
  }, [state]);

  // Transient update: Updates state WITHOUT saving to history
  // Use this for "in-progress" actions (dragging, sliding)
  const updateTransient = useCallback((newState) => {
    setState(newState);
  }, []);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    
    setFuture((prev) => [state, ...prev]);
    setState(previous);
    setPast(newPast);
  }, [state, past]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);

    setPast((prev) => [...prev, state]);
    setState(next);
    setFuture(newFuture);
  }, [state, future]);

  return {
    state,
    updateState,     // Commits to history
    updateTransient, // Skips history
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    history: past // Exposed for debugging or advanced features
  };
}
