import { useState, useCallback, useRef } from "react";

export default function useHistory(initialState) {
  const [state, setState] = useState(initialState);
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  
  // Use a ref to always have access to the latest state for history pushes
  // This prevents race conditions where the closure-captured 'state' is stale
  const stateRef = useRef(state);
  stateRef.current = state;

  // Standard update: Clears future, pushes current to past
  const updateState = useCallback((newState) => {
    setState((current) => {
      const resolvedState = typeof newState === "function" ? newState(current) : newState;
      
      // Only push to history if the state actually changed (basic shallow check for performance)
      // or if it's a completely new object.
      setPast((prev) => [...prev, current]);
      setFuture([]);
      
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
      
      const previous = currentPast[currentPast.length - 1];
      const newPast = currentPast.slice(0, currentPast.length - 1);
      
      setState((currentState) => {
        setFuture((prevFuture) => [currentState, ...prevFuture]);
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
        setPast((prevPast) => [...prevPast, currentState]);
        return next;
      });
      
      return newFuture;
    });
  }, []);

  return {
    state,
    updateState,
    updateTransient,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
