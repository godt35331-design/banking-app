import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { BANK_NAME } from '@kestrel/shared';
import { Eyebrow, Reveal } from './landing/motion';

/** Sterling Crest shield: gold outline, twin bars, "S" monogram. Vector, so it stays sharp at any size. */
export function ShieldMark({ dark = false, className = 'h-10 w-auto' }: { dark?: boolean; className?: string }) {
  const gold = '#B8956A';
  return (
    <svg viewBox="0 0 40 48" className={className} aria-hidden="true">
      <path
        d="M20 2.5C14.5 6.6 9.4 8.2 3.5 8.2V33.6C10.2 35 15.2 38.9 20 45.5C24.8 38.9 29.8 35 36.5 33.6V8.2C30.6 8.2 25.5 6.6 20 2.5Z"
        fill="none" stroke={gold} strokeWidth="2.2" strokeLinejoin="round"
      />
      <path d="M9 14.5V31M11.6 14.5V31M28.4 14.5V31M31 14.5V31" stroke={gold} strokeWidth="1.1" strokeLinecap="round" />
      <text x="20" y="31.2" textAnchor="middle" fontFamily="'Inter Tight', Inter, system-ui, sans-serif" fontSize="22" fontWeight="500" fill={dark ? '#fff' : '#0f2238'}>S</text>
    </svg>
  );
}

/**
 * The bank's logo. On dark backgrounds it uses the official artwork (/logo-light.png: gold shield, white lettering).
 * On light backgrounds it uses the drawn version, because the official white lettering would be invisible there.
 */
export function BrandMark({ dark = false }: { dark?: boolean }) {
  const showBank = BANK_NAME.endsWith(' Bank');
  const line1 = showBank ? BANK_NAME.slice(0, -5) : BANK_NAME;
  if (dark) {
    return (
      <Link to="/" className="inline-flex items-center" aria-label={BANK_NAME}>
        <img src="/logo-light.png" alt={BANK_NAME} className="h-16 w-auto select-none" draggable={false} />
      </Link>
    );
  }
  return (
    <Link to="/" className="inline-flex items-center gap-3" aria-label={BANK_NAME}>
      <ShieldMark dark={dark} className="h-10 w-auto shrink-0" />
      <span className="flex flex-col leading-none">
        <span className={`font-display text-[15px] font-semibold uppercase tracking-[0.14em] ${dark ? 'text-white' : 'text-night'}`}>{line1}</span>
        {showBank && <span className="mt-1 font-display text-[10px] font-semibold uppercase tracking-[0.42em] text-[#B8956A]">Bank</span>}
      </span>
    </Link>
  );
}

export function DarkGlow({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute rounded-full blur-3xl ${className}`}
      style={{ background: 'radial-gradient(circle, rgba(212,180,131,0.45) 0%, rgba(139,106,62,0.25) 40%, transparent 70%)' }}
    />
  );
}

/**
 * Split auth layout: dark showcase panel (desktop only) + form column, on the grey canvas
 * used by the landing page.
 */
export function AuthShell({
  eyebrow, title, subtitle, showcase, children,
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  showcase: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-start gap-5 bg-paper p-3 font-body text-night antialiased sm:p-5">
      <aside className="sticky top-5 hidden h-[calc(100vh-40px)] w-[46%] max-w-[640px] flex-col overflow-hidden rounded-[32px] bg-night p-10 text-white lg:flex">
        <DarkGlow className="-right-40 -top-40 h-[560px] w-[560px]" />
        <DarkGlow className="-bottom-48 -left-40 h-[420px] w-[420px] opacity-60" />
        <div className="relative"><BrandMark dark /></div>
        <div className="relative mt-auto">
          <Reveal><Eyebrow dark>{eyebrow}</Eyebrow></Reveal>
          <Reveal delay={80}>
            <h2 className="mt-5 font-display text-[44px] font-semibold leading-[1.04] tracking-[-0.04em]">{title}</h2>
          </Reveal>
          <Reveal delay={160}><p className="mt-4 max-w-md text-white/60">{subtitle}</p></Reveal>
        </div>
        <div className="relative mt-10">{showcase}</div>
        <p className="relative mt-10 text-xs text-white/35">Secure environment — your funds and cards are protected.</p>
      </aside>

      <main className="flex min-h-[calc(100vh-24px)] flex-1 items-center justify-center rounded-[24px] bg-white px-5 py-10 sm:min-h-[calc(100vh-40px)] sm:rounded-[32px] sm:px-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-10 lg:hidden"><BrandMark /></div>
          {children}
        </div>
      </main>
    </div>
  );
}

export function AuthHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="font-display text-[32px] font-semibold leading-tight tracking-[-0.03em]">{title}</h1>
      <p className="mt-2 text-muted">{subtitle}</p>
    </div>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="mt-6 flex items-start gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-bad">
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      {message}
    </div>
  );
}

const INPUT =
  'h-12 w-full rounded-2xl border border-transparent bg-paper px-4 text-[15px] text-night outline-none transition placeholder:text-night/35 focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10';

export function Field({
  label, hint, password = false, ...props
}: { label: string; hint?: string; password?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-sm font-medium">
        {label}
        {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
      </span>
      <span className="relative block">
        <input {...props} type={password ? (show ? 'text' : 'password') : props.type} className={`${INPUT} ${password ? 'pr-12' : ''}`} />
        {password && (
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:text-night"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </span>
    </label>
  );
}

/** Six PIN boxes driven by one hidden numeric input. */
/** PIN length used everywhere (sign in, registration, changing the PIN). */
export const PIN_LENGTH = 4;

/**
 * Four PIN boxes. `state` drives feedback: "success" turns them green and makes them hop one after another;
 * "error" shakes them.
 */
export function PinBoxes({
  value, onChange, autoFocus = false, label, state = 'idle', disabled = false,
}: {
  value: string; onChange: (v: string) => void; autoFocus?: boolean; label?: string;
  state?: 'idle' | 'success' | 'error'; disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const ok = state === 'success';
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium">{label}</span>}
      <span className={`relative flex gap-3 ${state === 'error' ? 'pin-shake' : ''}`}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => {
          const filled = i < value.length;
          const active = focused && !ok && i === Math.min(value.length, PIN_LENGTH - 1);
          return (
            <span
              key={i}
              style={{ ['--i' as string]: i }}
              className={`grid h-16 flex-1 place-items-center rounded-2xl border-2 transition-colors duration-300 ${
                ok ? 'pin-hop border-emerald-500 bg-emerald-500 shadow-lg shadow-emerald-500/30'
                  : state === 'error' ? 'border-red-300 bg-red-50'
                    : active ? 'border-brand bg-white ring-4 ring-brand/10'
                      : filled ? 'border-transparent bg-brand-soft' : 'border-transparent bg-paper'
              }`}
            >
              {filled && <span className={`h-3.5 w-3.5 rounded-full transition-colors ${ok ? 'bg-white' : state === 'error' ? 'bg-bad' : 'bg-night'}`} />}
            </span>
          );
        })}
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={PIN_LENGTH}
          value={value}
          autoFocus={autoFocus}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label={label ?? 'PIN'}
        />
      </span>
    </label>
  );
}
