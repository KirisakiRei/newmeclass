const MIDTRANS_SCRIPT_ID = 'midtrans-snap-script';
const MIDTRANS_PRECONNECT_ID = 'midtrans-snap-preconnect';

const isProduction = String(process.env.REACT_APP_MIDTRANS_IS_PRODUCTION || 'false').toLowerCase() === 'true';
const CLIENT_KEY = String(process.env.REACT_APP_MIDTRANS_CLIENT_KEY || '').trim();
let snapLoadPromise: Promise<any> | null = null;

declare global {
  interface Window {
    snap?: {
      pay: (token: string, callbacks?: Record<string, any>) => void;
    };
  }
}

function getScriptUrl() {
  return isProduction
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js';
}

function getMidtransOrigin() {
  return isProduction
    ? 'https://app.midtrans.com'
    : 'https://app.sandbox.midtrans.com';
}

function ensureMidtransPreconnect() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(MIDTRANS_PRECONNECT_ID)) return;

  const origin = getMidtransOrigin();
  const preconnect = document.createElement('link');
  preconnect.id = MIDTRANS_PRECONNECT_ID;
  preconnect.rel = 'preconnect';
  preconnect.href = origin;
  preconnect.crossOrigin = 'anonymous';
  document.head.appendChild(preconnect);

  const dnsPrefetch = document.createElement('link');
  dnsPrefetch.rel = 'dns-prefetch';
  dnsPrefetch.href = origin;
  document.head.appendChild(dnsPrefetch);
}

export function getMidtransClientKey() {
  return CLIENT_KEY;
}

export async function ensureMidtransSnapLoaded() {
  if (typeof window === 'undefined') {
    throw new Error('Midtrans Snap hanya tersedia di browser.');
  }
  if (!CLIENT_KEY) {
    throw new Error('REACT_APP_MIDTRANS_CLIENT_KEY belum dikonfigurasi.');
  }
  if (window.snap?.pay) {
    return window.snap;
  }
  if (snapLoadPromise) {
    return snapLoadPromise;
  }

  ensureMidtransPreconnect();

  const existing = document.getElementById(MIDTRANS_SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    snapLoadPromise = new Promise<void>((resolve, reject) => {
      if (window.snap?.pay) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Gagal memuat Midtrans Snap JS.')), { once: true });
    });
    await snapLoadPromise.finally(() => {
      snapLoadPromise = null;
    });
    if (!window.snap?.pay) {
      throw new Error('Midtrans Snap JS belum siap digunakan.');
    }
    return window.snap;
  }

  snapLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.id = MIDTRANS_SCRIPT_ID;
    script.src = getScriptUrl();
    script.async = true;
    script.setAttribute('data-client-key', CLIENT_KEY);
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Gagal memuat Midtrans Snap JS.'));
    document.body.appendChild(script);
  });
  await snapLoadPromise.finally(() => {
    snapLoadPromise = null;
  });

  if (!window.snap?.pay) {
    throw new Error('Midtrans Snap JS belum siap digunakan.');
  }
  return window.snap;
}
