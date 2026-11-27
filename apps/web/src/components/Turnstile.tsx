import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

/** True when the bot check is switched on (site key set in the build). */
export const turnstileEnabled = !!SITE_KEY;

declare global {
  interface Window { turnstile?: any }
}

let loader: Promise<void> | null = null;
function loadScript() {
  if (window.turnstile) return Promise.resolve();
  if (!loader) {
    loader = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { loader = null; reject(new Error('Turnstile failed to load')); };
      document.head.appendChild(s);
    });
  }
  return loader;
}

export type TurnstileHandle = { reset: () => void };

/** Cloudflare Turnstile widget. Renders nothing when no site key is configured. */
export const Turnstile = forwardRef<TurnstileHandle, { onToken: (token: string | null) => void }>(
  function Turnstile({ onToken }, ref) {
    const el = useRef<HTMLDivElement>(null);
    const widgetId = useRef<string | null>(null);
    const cb = useRef(onToken);
    cb.current = onToken;

    useImperativeHandle(ref, () => ({
      // Each answer can be used once, so get a fresh one after every attempt.
      reset() {
        cb.current(null);
        if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
      },
    }));

    useEffect(() => {
      if (!SITE_KEY) return;
      let gone = false;
      loadScript()
        .then(() => {
          if (gone || !el.current) return;
          widgetId.current = window.turnstile.render(el.current, {
            sitekey: SITE_KEY,
            theme: 'light',
            callback: (t: string) => cb.current(t),
            'expired-callback': () => cb.current(null),
            'error-callback': () => cb.current(null),
          });
        })
        .catch(() => cb.current(null));
      return () => {
        gone = true;
        if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      };
    }, []);

    if (!SITE_KEY) return null;
    return <div ref={el} className="min-h-[65px]" />;
  },
);
