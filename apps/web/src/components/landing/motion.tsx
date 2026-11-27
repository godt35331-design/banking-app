import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';

/** True once the element has scrolled into view (fires once). */
export function useInView<T extends Element>(threshold = 0.1) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, inView };
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Fades content up (or scales it in) the first time it enters the viewport. */
export function Reveal({
  children,
  delay = 0,
  variant = 'up',
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  variant?: 'up' | 'scale';
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`${variant === 'up' ? 'reveal' : 'reveal-scale'} ${inView ? 'is-visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/**
 * Rolls a number from its previous value to the new one whenever it changes
 * (starts from 0 on first render). Used for every money figure in the app.
 */
export function useTween(value: number, duration = 550) {
  const [n, setN] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (prefersReducedMotion()) {
      from.current = value;
      setN(value);
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const v = a + (value - a) * (1 - Math.pow(1 - p, 3));
      from.current = v;
      setN(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return n;
}

/** Counts from 0 to `value` once visible. */
export function CountUp({ value, duration = 1100, prefix = '', suffix = '' }: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.4);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion()) {
      setN(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);
  return (
    <span ref={ref}>
      {prefix}
      {n}
      <span className="text-brand">{suffix}</span>
    </span>
  );
}

type Tone = 'brand' | 'light' | 'dark';
const PILL_TONES: Record<Tone, { cls: string; flood: string; badge: string }> = {
  brand: { cls: 'bg-brand text-white', flood: '#0f2238', badge: 'bg-white text-brand' },
  light: { cls: 'bg-white text-night', flood: '#d4b483', badge: 'bg-night text-white' },
  dark: { cls: 'bg-night text-white', flood: '#8b6a3e', badge: 'bg-white text-night' },
};

function PillInner({ children, tone }: { children: string; tone: Tone }) {
  return (
    <>
      <span className="pill-label">
        <span>{children}</span>
        <span aria-hidden="true">{children}</span>
      </span>
      <span className={`pill-badge ${PILL_TONES[tone].badge}`}>
        <ArrowRight size={18} />
      </span>
    </>
  );
}

/** Signature pill button: rolling label, colour flood, rotating arrow badge. */
export function PillLink({ to, children, tone = 'brand' }: { to: string; children: string; tone?: Tone }) {
  return (
    <Link to={to} className={`pill ${PILL_TONES[tone].cls}`} style={{ ['--pill-flood' as string]: PILL_TONES[tone].flood }}>
      <PillInner tone={tone}>{children}</PillInner>
    </Link>
  );
}

/** Same pill as a real <button>, e.g. for form submits. `full` stretches it to the container width. */
export function PillButton({
  children, tone = 'brand', type = 'submit', disabled = false, onClick, full = false,
}: {
  children: string;
  tone?: Tone;
  type?: 'submit' | 'button';
  disabled?: boolean;
  onClick?: () => void;
  full?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`pill ${PILL_TONES[tone].cls} ${full ? 'w-full justify-between' : ''} disabled:cursor-not-allowed disabled:opacity-60`}
      style={{ ['--pill-flood' as string]: PILL_TONES[tone].flood }}
    >
      <PillInner tone={tone}>{children}</PillInner>
    </button>
  );
}

/** Small uppercase label above section headings. */
export function Eyebrow({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-display text-xs font-medium uppercase tracking-[0.14em] ${
        dark ? 'bg-white/10 text-brand-bright' : 'bg-white text-brand'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dark ? 'bg-brand-bright' : 'bg-brand'}`} />
      {children}
    </span>
  );
}

export function Marquee({ children, duration = 30, className = '' }: {
  children: ReactNode;
  duration?: number;
  className?: string;
}) {
  return (
    <div className={`marquee-mask overflow-hidden ${className}`}>
      <div className="marquee-track" style={{ ['--marquee-duration' as string]: `${duration}s` }}>
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden="true">{children}</div>
      </div>
    </div>
  );
}
