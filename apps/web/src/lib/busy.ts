/**
 * Automatic loading state for buttons.
 *
 * When a button is clicked (or a form is submitted) and that starts a request to the API,
 * the button shows a spinner in place of its label until the request finishes.
 * - Buttons that already show their own spinner (`.animate-spin`) are left alone.
 * - Add `data-no-busy` to a button to opt out.
 * - Nothing shows for requests that finish within ~150 ms, so fast actions don't flicker.
 */

let last: { el: HTMLElement; at: number } | null = null;
const counts = new WeakMap<HTMLElement, number>();
const CLICK_WINDOW_MS = 600;
const SHOW_AFTER_MS = 150;

if (typeof document !== 'undefined') {
  document.addEventListener(
    'click',
    e => {
      const el = (e.target as Element | null)?.closest?.('button, [role="button"]') as HTMLElement | null;
      if (el) last = { el, at: performance.now() };
    },
    true,
  );
  document.addEventListener(
    'submit',
    e => {
      const ev = e as SubmitEvent;
      const form = ev.target as HTMLFormElement;
      const el = (ev.submitter as HTMLElement | null) ?? (form.querySelector('button[type="submit"], button:not([type])') as HTMLElement | null);
      if (el) last = { el, at: performance.now() };
    },
    true,
  );
}

function mark(el: HTMLElement) {
  if (!el.isConnected || el.hasAttribute('data-no-busy') || el.querySelector('.animate-spin')) return;
  const cs = getComputedStyle(el);
  el.style.setProperty('--busy-c', cs.color);
  if (cs.position === 'static') el.classList.add('busy-rel');
  el.classList.add('is-busy');
  el.setAttribute('aria-busy', 'true');
}

function unmark(el: HTMLElement) {
  el.classList.remove('is-busy', 'busy-rel');
  el.removeAttribute('aria-busy');
  el.style.removeProperty('--busy-c');
}

/** Wraps a request: if it was started by a recent click, that button shows a spinner until it settles. */
export function trackBusy<T>(p: Promise<T>): Promise<T> {
  if (!last || performance.now() - last.at > CLICK_WINDOW_MS) return p;
  const el = last.el;
  counts.set(el, (counts.get(el) ?? 0) + 1);
  const timer = setTimeout(() => mark(el), SHOW_AFTER_MS);
  const done = () => {
    clearTimeout(timer);
    const n = (counts.get(el) ?? 1) - 1;
    counts.set(el, n);
    if (n <= 0) unmark(el);
  };
  p.then(done, done);
  return p;
}
