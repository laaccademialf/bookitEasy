'use client';

import { useEffect } from 'react';

const HEALTH_PROBE_URL = '/_next/static/chunks/webpack.js';
const POLL_INTERVAL_MS = 500;
const POLL_TIMEOUT_MS = 30_000;
const MIN_RELOAD_GAP_MS = 5_000;
const LAST_RELOAD_AT_KEY = 'bookiteasy-dev-last-reload-at';

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
    lower.includes("cannot read properties of undefined (reading 'call')") ||
    lower.includes("mime type ('text/html')")
  );
}

function shouldRecoverFromResourceError(event: Event | ErrorEvent) {
  const target = (event as ErrorEvent).target as HTMLElement | null;
  const scriptEl = target as HTMLScriptElement | null;
  const linkEl = target as HTMLLinkElement | null;

  const scriptSrc = scriptEl?.src;
  const stylesheetHref = linkEl?.href;
  if (shouldHandleAssetUrl(scriptSrc) || shouldHandleAssetUrl(stylesheetHref)) {
    return true;
  }

  const message = (event as ErrorEvent).message || '';
  if (isChunkLikeErrorMessage(message)) {
    return true;
  }

  const filename = (event as ErrorEvent).filename || '';
  return shouldHandleAssetUrl(filename);
}

async function probeAsset(): Promise<boolean> {
  try {
    const response = await fetch(`${HEALTH_PROBE_URL}?probe=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!response.ok) return false;
    const contentType = response.headers.get('content-type') || '';
    return contentType.includes('javascript');
  } catch {
    return false;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function DevChunkRecovery() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    let recovering = false;
    let banner: HTMLDivElement | null = null;

    const showBanner = (text: string) => {
      if (banner) {
        banner.textContent = text;
        return;
      }
      banner = document.createElement('div');
      banner.setAttribute('role', 'status');
      banner.style.cssText = [
        'position:fixed',
        'left:50%',
        'top:16px',
        'transform:translateX(-50%)',
        'z-index:2147483647',
        'padding:10px 16px',
        'border-radius:9999px',
        'background:rgba(15,23,42,0.92)',
        'color:#e2e8f0',
        'font:600 12px/1.2 system-ui,-apple-system,Segoe UI,sans-serif',
        'box-shadow:0 8px 24px rgba(15,23,42,0.35)',
        'pointer-events:none',
      ].join(';');
      banner.textContent = text;
      document.body.appendChild(banner);
    };

    const hideBanner = () => {
      banner?.remove();
      banner = null;
    };

    const safeHardReload = () => {
      try {
        const now = Date.now();
        const lastRaw = sessionStorage.getItem(LAST_RELOAD_AT_KEY);
        const last = lastRaw ? Number(lastRaw) : 0;
        if (now - last < MIN_RELOAD_GAP_MS) return;
        sessionStorage.setItem(LAST_RELOAD_AT_KEY, String(now));

        const url = new URL(window.location.href);
        url.searchParams.set('__dev_asset_retry', String(now));
        window.location.replace(url.toString());
      } catch {
        window.location.reload();
      }
    };

    const recover = async (reason: string) => {
      if (recovering) return;
      recovering = true;

      showBanner(`Відновлення з ${reason}...`);

      const deadline = Date.now() + POLL_TIMEOUT_MS;
      let healthy = false;
      while (Date.now() < deadline) {
        healthy = await probeAsset();
        if (healthy) break;
        await sleep(POLL_INTERVAL_MS);
      }

      if (healthy) {
        showBanner('Перезавантаження...');
        safeHardReload();
      } else {
        showBanner('Dev-сервер не відповідає. Перезапустіть npm run dev.');
        setTimeout(hideBanner, 4000);
      }

      recovering = false;
    };

    const onWindowError = (event: ErrorEvent) => {
      if (shouldRecoverFromResourceError(event)) {
        void recover('помилки завантаження статичного ресурсу');
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
        void recover('помилки чанка');
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      probeAsset().then((ok) => {
        if (!ok) void recover('відновлення після перемикання вкладки');
      });
    };

    window.addEventListener('error', onWindowError, true);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('error', onWindowError, true);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      hideBanner();
    };
  }, []);

  return null;
}
