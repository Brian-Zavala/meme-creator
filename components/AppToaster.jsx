/**
 * AppToaster.jsx — Single-source-of-truth custom Toaster component.
 *
 * WHY this exists instead of react-hot-toast's <Toaster>:
 *
 * Bug #1 — Stuck pausedAt (ALL toasts stop auto-dismissing):
 *   react-hot-toast's <Toaster> wraps the entire viewport in a position:fixed
 *   container and attaches onMouseEnter=startPause / onMouseLeave=endPause to
 *   it.  When pausedAt is set, useToaster's auto-dismiss useEffect returns
 *   early and sets ZERO timers.  In some browsers, if a toast disappears while
 *   the cursor is over it, onMouseLeave never fires — pausedAt stays set
 *   forever and every future toast is stuck on screen.
 *
 *   Fix: move startPause/endPause onto each individual toast element so pause
 *   is scoped to that toast, and endPause always fires on mouseleave of the
 *   specific element.
 *
 * Bug #2 — Wrong exit-animation direction:
 *   The <Toaster> children-prop form (added in ceb2a56) calls
 *   <ToastBar toast={t} /> without a position prop, so ToastBar falls back to
 *   'top-center' and plays the wrong exit animation for bottom-right toasts.
 *
 *   Fix: pass position={toastPosition} explicitly to every <ToastBar>.
 *
 * Bug #3 — ToastLimiter lives in App.jsx as a separate component.
 *   Fix: built-in to this component via useToastLimit().
 */

import { useCallback, useEffect } from 'react';
import toast, { useToaster, ToastBar, useToasterStore } from 'react-hot-toast';
import { TOAST_OPTS, TOAST_LIMIT } from '../hooks/useToast';

// ─── Constants ────────────────────────────────────────────────────────────────

const GUTTER          = 8;
const CONTAINER_PAD   = 16;
const DEFAULT_POS     = 'bottom-right';

// ─── Helpers (mirrors react-hot-toast internals) ──────────────────────────────

function getPositionStyle(position, offset) {
  const isTop   = position.includes('top');
  const factor  = isTop ? 1 : -1;

  const verticalStyle   = isTop ? { top: 0 } : { bottom: 0 };
  const horizontalStyle = position.includes('center')
    ? { justifyContent: 'center' }
    : position.includes('right')
      ? { justifyContent: 'flex-end' }
      : {};

  return {
    left:       0,
    right:      0,
    display:    'flex',
    position:   'absolute',
    transition: 'all 230ms cubic-bezier(.21,1.02,.73,1)',
    transform:  `translateY(${offset * factor}px)`,
    ...verticalStyle,
    ...horizontalStyle,
  };
}

// ─── Toast limit enforcer ─────────────────────────────────────────────────────

function useToastLimit(limit) {
  const { toasts } = useToasterStore();

  useEffect(() => {
    // Loading toasts are excluded from the count — they persist until the
    // operation they describe is complete.
    const visible = toasts.filter((t) => t.visible && t.type !== 'loading');

    if (visible.length > limit) {
      // Dismiss oldest (toasts are stored newest-first, so take from the end)
      visible.slice(limit).forEach((t) => toast.dismiss(t.id));
    }
  }, [toasts, limit]);
}

// ─── Individual toast entry ───────────────────────────────────────────────────

function ToastEntry({ t, toastPosition, offset, onHeightUpdate, startPause, endPause }) {
  // Callback ref replicates ToastWrapper's height-measurement logic from
  // react-hot-toast.  Height is required for correct vertical stacking.
  const refCallback = useCallback(
    (el) => {
      if (!el) return;
      const measure = () => onHeightUpdate(t.id, el.getBoundingClientRect().height);
      measure();
      // MutationObserver re-measures when content changes (e.g. loading text updates)
      new MutationObserver(measure).observe(el, {
        subtree:       true,
        childList:     true,
        characterData: true,
      });
      // Observer is GC'd when the element unmounts — same pattern as upstream.
    },
    [t.id, onHeightUpdate],
  );

  const posStyle = getPositionStyle(toastPosition, offset);

  return (
    <div
      style={{
        ...posStyle,
        // Only active (visible) toasts intercept pointer events
        zIndex: t.visible ? 9999 : undefined,
      }}
    >
      {/*
        Per-toast pause handlers:
          - startPause / endPause are now attached HERE, not on the full-screen
            container.  This means pausedAt is only set while the cursor is
            physically over this toast, and endPause fires reliably on mouseout
            because the target element is always small and well-defined.
      */}
      <div
        ref={refCallback}
        style={{
          position:      'relative', // needed for .toast-gradient-border ::before
          pointerEvents: t.visible ? 'auto' : 'none',
          cursor:        'pointer',
        }}
        onMouseEnter={startPause}
        onMouseLeave={endPause}
        onClick={() => toast.dismiss(t.id)}
        title="Tap to dismiss"
      >
        {/* Pass position explicitly so ToastBar uses the correct animation direction */}
        <ToastBar toast={t} position={toastPosition} />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AppToaster() {
  // Enforce the toast limit
  useToastLimit(TOAST_LIMIT);

  // useToaster supplies merged toasts (TOAST_OPTS applied as defaults) and
  // the handlers needed for stacking, height measurement, and pause/resume.
  const { toasts, handlers } = useToaster(TOAST_OPTS);

  return (
    /*
      The outer container must span the full viewport so that position:absolute
      toast entries can be placed at any corner/edge via getPositionStyle().
      pointer-events:none ensures the transparent overlay never blocks clicks
      on the page — only the individual toast entries (which set pointer-events:auto)
      are interactive.
    */
    <div
      aria-live="polite"
      aria-label="Notifications"
      style={{
        position:      'fixed',
        zIndex:        9999,
        top:           CONTAINER_PAD,
        left:          CONTAINER_PAD,
        right:         CONTAINER_PAD,
        bottom:        CONTAINER_PAD,
        pointerEvents: 'none',
        // NOTE: no onMouseEnter/onMouseLeave here — that's the entire fix for Bug #1
      }}
    >
      {toasts.map((t) => {
        const toastPosition = t.position || DEFAULT_POS;
        const offset = handlers.calculateOffset(t, {
          reverseOrder:    false,
          gutter:          GUTTER,
          defaultPosition: DEFAULT_POS,
        });

        return (
          <ToastEntry
            key={t.id}
            t={t}
            toastPosition={toastPosition}
            offset={offset}
            onHeightUpdate={handlers.updateHeight}
            startPause={handlers.startPause}
            endPause={handlers.endPause}
          />
        );
      })}
    </div>
  );
}
