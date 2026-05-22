'use client';

import { useEffect } from 'react';

const RELOAD_GUARD_KEY = 'bookiteasy-dev-chunk-reload-once';

function shouldHandleAssetUrl(url?: string | null) {
  if (!url) return false;
  return url.includes('/_next/static/');
}

function isChunkLikeErrorMessage(message?: string | null) {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes('chunkloaderror') ||
    lower.includes('loading chunk') ||
    lower.includes('failed to fetch dynamically imported module') ||
    lower.includes('cannot read properties of undefined (reading \'call\')')
  );
}

export default function DevChunkRecovery() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const safeReloadOnce = () => {
      try {
        if (sessionStorage.getItem(RELOAD_GUARD_KEY)) return;
        sessionStorage.setItem(RELOAD_GUARD_KEY, '1');
        window.location.reload();
      } catch {
        window.location.reload();
      }
    };

    const onWindowError = (event: ErrorEvent) => {
      const target = event.target as HTMLElement | null;
      const scriptEl = target as HTMLScriptElement | null;
      const linkEl = target as HTMLLinkElement | null;

      const scriptSrc = scriptEl?.src;
      const stylesheetHref = linkEl?.href;

      if (shouldHandleAssetUrl(scriptSrc) || shouldHandleAssetUrl(stylesheetHref)) {
        safeReloadOnce();
        return;
      }

      if (isChunkLikeErrorMessage(event.message || '')) {
        safeReloadOnce();
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const text =
        typeof reason === 'string'
          ? reason
          : typeof reason?.message === 'string'
          ? reason.message
          : '';

      if (isChunkLikeErrorMessage(text)) {
        safeReloadOnce();
      }
    };

    window.addEventListener('error', onWindowError, true);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('error', onWindowError, true);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
}
