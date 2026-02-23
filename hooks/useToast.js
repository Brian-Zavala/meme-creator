/**
 * useToast.js — Single source of truth for all toast configuration and behavior.
 *
 * ALL toast durations, limits, and default styles live here.
 * Components import TOAST_DURATIONS / appToast from here instead of using
 * react-hot-toast directly, so a single edit fixes the entire app.
 *
 * The AppToaster component passes TOAST_OPTS into useToaster() so these
 * defaults are applied even to calls that don't specify a duration.
 */

import toast from 'react-hot-toast';

// ─── Timing constants ────────────────────────────────────────────────────────

export const TOAST_DURATIONS = {
  success: 2500,
  error:   3500,
  info:    3000,
  tip:     4000,
  export:  5000, // success/error at end of a long export operation
};

// Maximum number of simultaneously visible non-loading toasts.
export const TOAST_LIMIT = 2;

// ─── Default options passed into useToaster() in AppToaster ──────────────────
// This is what react-hot-toast merges onto every toast that doesn't override.

export const TOAST_OPTS = {
  duration: TOAST_DURATIONS.info,
  className: 'toast-gradient-border',
  style: {
    background: '#1e293b',
    color: '#fff',
    border: '1px solid #334155',
  },
  success: { duration: TOAST_DURATIONS.success },
  error:   { duration: TOAST_DURATIONS.error   },
};

// ─── Convenience wrappers ─────────────────────────────────────────────────────
// Use these for all new toast calls so durations are always explicit.
// Existing call sites that pass `toast.success/error/loading` directly still
// receive the correct defaults because AppToaster supplies TOAST_OPTS to
// useToaster(), which merges them in the store.

export const appToast = {
  /** 2.5 s success feedback */
  success: (msg, opts = {}) =>
    toast.success(msg, { duration: TOAST_DURATIONS.success, ...opts }),

  /** 3.5 s error feedback */
  error: (msg, opts = {}) =>
    toast.error(msg, { duration: TOAST_DURATIONS.error, ...opts }),

  /** 3 s neutral info message */
  info: (msg, opts = {}) =>
    toast(msg, { duration: TOAST_DURATIONS.info, ...opts }),

  /** 4 s tip / hint message */
  tip: (msg, opts = {}) =>
    toast(msg, { duration: TOAST_DURATIONS.tip, ...opts }),

  /** 5 s success toast used after a long export finishes */
  exportSuccess: (msg, opts = {}) =>
    toast.success(msg, { duration: TOAST_DURATIONS.export, ...opts }),

  /** 5 s error toast used when an export fails */
  exportError: (msg, opts = {}) =>
    toast.error(msg, { duration: TOAST_DURATIONS.export, ...opts }),

  /** Loading spinner — stays until explicitly dismissed. Always use duration:Infinity. */
  loading: (msg, opts = {}) =>
    toast.loading(msg, { duration: Infinity, ...opts }),

  /** Dismiss a toast by id (or all toasts if no id given) */
  dismiss: (id) => toast.dismiss(id),

  /** Immediately remove a toast (no exit animation) */
  remove: (id) => toast.remove(id),

  /** Custom JSX toast */
  custom: (renderer, opts = {}) =>
    toast(renderer, { duration: TOAST_DURATIONS.info, ...opts }),
};
