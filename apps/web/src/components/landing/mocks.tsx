import { useEffect, useId, useState, type CSSProperties } from 'react';
import { ArrowDownLeft, CheckCircle2, Lock } from 'lucide-react';
import { BANK_NAME } from '@kestrel/shared';
import { prefersReducedMotion } from './motion';
import { Flag } from '../Flag';

/* ---------- Realistic virtual card ---------- */

type Skin = {
  label: string;
  number: string;
  holder: string;
  bg: string;
  fg: string;
  pattern: string;
  glass?: boolean;
  hologram?: boolean;
};

const SKINS: Skin[] = [
  {
    label: 'Everyday Debit',
    number: '6029 4417 2290 4821',
    holder: 'CARDHOLDER NAME',
    bg: 'linear-gradient(135deg,#2c4a72 0%,#1a3355 38%,#10233d 72%,#0a1729 100%)',
    fg: '#f2fffa',
    pattern: 'repeating-radial-gradient(circle at 105% -10%, rgba(255,255,255,0.07) 0 1px, transparent 1px 10px)',
  },
  {
    label: 'Travel · Multi-currency',
    number: '6029 8810 7734 7730',
    holder: 'CARDHOLDER NAME',
    bg: 'linear-gradient(135deg,rgba(255,255,255,0.28) 0%,rgba(255,255,255,0.08) 55%,rgba(212,180,131,0.14) 100%)',
    fg: '#ffffff',
    pattern: 'repeating-linear-gradient(120deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 12px)',
    glass: true,
  },
  {
    label: 'Premium Debit',
    number: '6029 5530 1055 1055',
    holder: 'CARDHOLDER NAME',
    bg: 'linear-gradient(145deg,#2a2f2d 0%,#141817 45%,#0a0c0b 100%)',
    fg: '#e9ece9',
    pattern: 'repeating-radial-gradient(circle at -10% 110%, rgba(255,255,255,0.045) 0 1px, transparent 1px 8px)',
    hologram: true,
  },
  {
    label: 'Debit',
    number: '6029 3321 6640 2210',
    holder: 'CARDHOLDER NAME',
    bg: 'linear-gradient(135deg,#3b7bff 0%,#1f4fd1 45%,#122f86 100%)',
    fg: '#f3f7ff',
    pattern: 'repeating-radial-gradient(circle at 105% -10%, rgba(255,255,255,0.07) 0 1px, transparent 1px 10px)',
  },
  {
    label: 'Debit',
    number: '6029 9902 1187 3361',
    holder: 'CARDHOLDER NAME',
    bg: 'linear-gradient(135deg,#9b6bff 0%,#6a3fd6 45%,#3d1f8a 100%)',
    fg: '#f8f4ff',
    pattern: 'repeating-radial-gradient(circle at -10% 110%, rgba(255,255,255,0.06) 0 1px, transparent 1px 9px)',
    hologram: true,
  },
];

/** Maps the `color` stored on a user's card to a card design. */
export function skinForColor(color?: string) {
  return ({ brand: 0, glass: 1, ink: 2, blue: 3, purple: 4 } as Record<string, number>)[color ?? ''] ?? 2;
}

/** Scattered snow/sparkle dots for the frozen overlay. */
const SPARKLES =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='140'><g fill='white'><circle cx='14' cy='22' r='1.3' opacity='.9'/><circle cx='52' cy='86' r='0.9' opacity='.8'/><circle cx='88' cy='34' r='1.6' opacity='.95'/><circle cx='120' cy='110' r='1' opacity='.7'/><circle cx='160' cy='18' r='0.8' opacity='.8'/><circle cx='196' cy='72' r='1.4' opacity='.9'/><circle cx='34' cy='128' r='1.1' opacity='.75'/><circle cx='140' cy='62' r='0.7' opacity='.9'/><circle cx='72' cy='58' r='0.6' opacity='.8'/><circle cx='206' cy='126' r='0.9' opacity='.8'/><path d='M100 80l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2z' opacity='.95'/><path d='M178 104l.9 2.2 2.2.9-2.2.9-.9 2.2-.9-2.2-2.2-.9 2.2-.9z' opacity='.9'/><path d='M24 64l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z' opacity='.9'/></g></svg>\")";

const RADIUS = '4.5% / 7.14%'; // ~18px on a 400px card, keeps the real ID-1 corner ratio
const NOISE =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.55'/></svg>\")";

function Chip() {
  const id = useId();
  return (
    <svg viewBox="0 0 50 38" className="w-[12.5cqw] drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fbeeb8" />
          <stop offset="0.35" stopColor="#d9b45a" />
          <stop offset="0.65" stopColor="#f3dc8e" />
          <stop offset="1" stopColor="#b8913d" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="49" height="37" rx="6" fill={`url(#${id})`} stroke="#8f6e27" strokeWidth="0.7" />
      <g stroke="#8a6a22" strokeWidth="0.8" fill="none" opacity="0.75">
        <path d="M0 12.5h15M0 25.5h15M35 12.5h15M35 25.5h15M15 0v38M35 0v38" />
        <rect x="15" y="8" width="20" height="22" rx="4.5" />
        <path d="M15 19h20M25 8v22" />
      </g>
    </svg>
  );
}

function Contactless() {
  return (
    <svg viewBox="0 0 24 24" className="w-[6.5cqw] opacity-85" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M7.5 8.5a5 5 0 0 1 0 7" />
      <path d="M11 6a9 9 0 0 1 0 12" />
      <path d="M14.5 3.5a13 13 0 0 1 0 17" />
    </svg>
  );
}

export function KestrelCard({
  skin = 0,
  className = '',
  number,
  holder,
  expiry,
  label,
  frozen = false,
}: {
  skin?: number;
  className?: string;
  /** Overrides for showing a real user's card. */
  number?: string;
  holder?: string;
  expiry?: string;
  label?: string;
  frozen?: boolean;
}) {
  const base = SKINS[skin % SKINS.length];
  const s = {
    ...base,
    number: number ?? base.number,
    holder: holder ?? base.holder,
    label: label ?? base.label,
  };
  const exp = expiry ?? '09/29';
  const emboss: CSSProperties = {
    textShadow: s.glass
      ? '0 1px 2px rgba(0,0,0,0.35)'
      : '0 1px 0 rgba(255,255,255,0.22), 0 -1px 0 rgba(0,0,0,0.45), 0 2px 3px rgba(0,0,0,0.25)',
  };
  return (
    <div
      className={`relative aspect-[1.586] w-full overflow-hidden [container-type:inline-size] ${className}`}
      style={{
        borderRadius: RADIUS,
        background: s.bg,
        color: s.fg,
        boxShadow: '0 40px 70px -25px rgba(0,0,0,0.6), 0 10px 20px -10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
        border: s.glass ? '1px solid rgba(255,255,255,0.35)' : '1px solid rgba(255,255,255,0.08)',
        backdropFilter: s.glass ? 'blur(18px) saturate(150%)' : undefined,
        WebkitBackdropFilter: s.glass ? 'blur(18px) saturate(150%)' : undefined,
      }}
    >
      {/* texture layers */}
      <div className="pointer-events-none absolute inset-0" style={{ background: s.pattern }} />
      <div className="pointer-events-none absolute inset-0 mix-blend-overlay" style={{ backgroundImage: NOISE, opacity: s.glass ? 0.25 : 0.35 }} />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(115deg, transparent 28%, rgba(255,255,255,0.16) 42%, rgba(255,255,255,0.04) 52%, transparent 62%)' }}
      />
      <div
        className="pointer-events-none absolute -right-[12%] -top-[30%] h-[90%] w-[55%] rounded-full opacity-40 blur-2xl"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.5), transparent 70%)' }}
      />

      <div className="relative flex h-full flex-col p-[6cqw]">
        {/* top row */}
        <div className="flex items-start justify-between">
          <div>
            <div className="font-display text-[5cqw] font-semibold leading-none tracking-tight">{BANK_NAME}</div>
            <div className="mt-[1.2cqw] text-[2.7cqw] uppercase tracking-[0.16em] opacity-70">{s.label}</div>
          </div>
          <Contactless />
        </div>

        {/* chip + hologram */}
        <div className="mt-[5cqw] flex items-center justify-between">
          <Chip />
          {s.hologram && (
            <span
              className="h-[8cqw] w-[11cqw] rounded-[1.5cqw] opacity-80"
              style={{ background: 'conic-gradient(from 200deg, #9be7ff, #f6b7ff, #fff3a8, #a6ffd8, #9be7ff)' }}
            />
          )}
        </div>

        {/* number */}
        <div className="mt-auto font-display text-[6.4cqw] font-medium leading-none tracking-[0.09em] tabular-nums" style={emboss}>
          {s.number}
        </div>

        {/* bottom row */}
        <div className="mt-[4cqw] flex items-end justify-between">
          <div className="flex gap-[6cqw]" style={emboss}>
            <div>
              <div className="text-[2.1cqw] uppercase tracking-[0.14em] opacity-60">Card holder</div>
              <div className="mt-[0.8cqw] font-display text-[3.4cqw] font-medium tracking-[0.12em]">{s.holder}</div>
            </div>
            <div>
              <div className="text-[2.1cqw] uppercase tracking-[0.14em] opacity-60">Valid thru</div>
              <div className="mt-[0.8cqw] font-display text-[3.4cqw] font-medium tracking-[0.12em] tabular-nums">{exp}</div>
            </div>
          </div>
          <div className="text-right leading-none">
            <div className="font-display text-[4.6cqw] font-bold italic tracking-tight">KESTREL</div>
            <div className="mt-[0.6cqw] text-[2.3cqw] font-semibold uppercase tracking-[0.3em] opacity-70">debit</div>
          </div>
        </div>
      </div>

      {frozen && (
        <>
          {/* frost layer: washes the colours out and sweeps in from the left */}
          <div
            className="frost pointer-events-none absolute inset-0"
            style={{
              background: `${SPARKLES}, linear-gradient(135deg, rgba(235,245,255,0.62), rgba(210,225,240,0.5))`,
              backdropFilter: 'saturate(30%) brightness(1.15) blur(1.5px)',
              WebkitBackdropFilter: 'saturate(30%) brightness(1.15) blur(1.5px)',
            }}
          />
          <div className="fade-in-late absolute inset-0 grid place-items-center">
            <span className="flex items-center gap-[1.6cqw] rounded-full bg-night/80 px-[3.6cqw] py-[1.6cqw] font-display text-[3.2cqw] font-semibold text-white shadow-lg">
              <Lock className="w-[3.6cqw]" strokeWidth={2.4} /> Frozen
            </span>
          </div>
        </>
      )}
    </div>
  );
}

/** Back of the card: magnetic stripe, signature panel with the CVV, and issuer small print. */
export function KestrelCardBack({
  skin = 0,
  className = '',
  cvv,
  holder,
  last4,
}: {
  skin?: number;
  className?: string;
  cvv?: string;
  holder?: string;
  last4?: string;
}) {
  const s = SKINS[skin % SKINS.length];
  return (
    <div
      className={`relative aspect-[1.586] w-full overflow-hidden [container-type:inline-size] ${className}`}
      style={{
        borderRadius: RADIUS,
        background: s.glass ? 'linear-gradient(135deg,#1d2d45 0%,#0e1a2c 100%)' : s.bg,
        color: s.fg,
        boxShadow: '0 40px 70px -25px rgba(0,0,0,0.6), 0 10px 20px -10px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="pointer-events-none absolute inset-0" style={{ background: s.pattern }} />
      <div className="pointer-events-none absolute inset-0 mix-blend-overlay" style={{ backgroundImage: NOISE, opacity: 0.35 }} />

      {/* magnetic stripe */}
      <div
        className="absolute inset-x-0 top-[9%] h-[19%]"
        style={{ background: 'linear-gradient(180deg,#0b0b0b 0%,#1c1c1c 45%,#090909 100%)' }}
      />

      <div className="absolute inset-x-[6cqw] top-[36%]">
        <div className="mt-[1.2cqw] flex items-stretch gap-[2cqw]">
          {/* signature strip */}
          <div
            className="flex h-[10cqw] flex-1 items-center overflow-hidden rounded-[0.8cqw] px-[2.5cqw] text-[#2b2b2b]"
            style={{ background: 'repeating-linear-gradient(-45deg,#f4f1e6 0 2cqw,#e7e1cd 2cqw 4cqw)' }}
          >
            <span className="truncate font-[cursive] text-[3.6cqw] italic opacity-75">{holder ?? 'Cardholder Name'}</span>
            <span className="ml-auto pl-[2cqw] font-display text-[2.8cqw] tabular-nums tracking-[0.1em] opacity-70">{last4 ?? '0000'}</span>
          </div>
          {/* CVV box */}
          <div className="flex h-[10cqw] w-[15cqw] flex-col items-center justify-center rounded-[0.8cqw] bg-white text-[#111]">
            <span className="text-[1.8cqw] font-semibold uppercase tracking-[0.14em] text-[#666]">CVV</span>
            <span className="font-display text-[4.6cqw] font-bold italic leading-none tracking-[0.08em] tabular-nums">{cvv ?? '•••'}</span>
          </div>
        </div>
      </div>

      <div className="absolute inset-x-[6cqw] bottom-[6cqw] flex items-end justify-end gap-[4cqw]">
        <div className="flex items-center gap-[2cqw]">
          <span
            className="h-[8cqw] w-[11cqw] rounded-[1.5cqw] opacity-80"
            style={{ background: 'conic-gradient(from 200deg, #9be7ff, #f6b7ff, #fff3a8, #a6ffd8, #9be7ff)' }}
          />
          <div className="text-right leading-none">
            <div className="font-display text-[4cqw] font-bold italic tracking-tight">KESTREL</div>
            <div className="mt-[0.6cqw] text-[2cqw] font-semibold uppercase tracking-[0.3em] opacity-70">debit</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Groups a full card number into blocks of four. */
export function formatCardNumber(n: string) {
  return n.replace(/\D/g, '').replace(/(.{4})(?=.)/g, '$1 ');
}

/** Formats a stored card into the overrides KestrelCard expects. */
export function cardProps(card: { last4: string; holderName: string; expMonth: number; expYear: number; label: string; color?: string; status?: string }) {
  return {
    skin: skinForColor(card.color),
    number: `•••• •••• •••• ${card.last4}`,
    holder: card.holderName.toUpperCase(),
    expiry: `${String(card.expMonth).padStart(2, '0')}/${String(card.expYear).slice(-2)}`,
    label: card.label,
    frozen: card.status === 'FROZEN',
  };
}

/* ---------- Hero card stack ---------- */

// Transform-only slots (no filter/opacity on the wrapper) so the glass card's backdrop blur keeps working.
const SLOTS = [
  { transform: 'translate(0px,0px) rotate(-7deg) scale(1)', z: 3, shade: 0 },
  { transform: 'translate(62px,-56px) rotate(2deg) scale(0.93)', z: 2, shade: 0.18 },
  { transform: 'translate(124px,-112px) rotate(11deg) scale(0.86)', z: 1, shade: 0.38 },
];

/** Three cards that rotate through front/middle/back slots. Designed at 540×440, scaled down on small screens. */
export function CardStack({
  sizeClass = 'h-[270px] sm:h-[380px] lg:h-[440px]',
  scaleClass = 'scale-[0.6] sm:scale-[0.86] lg:scale-100',
}: { sizeClass?: string; scaleClass?: string } = {}) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = setInterval(() => setTick(t => t + 1), 3400);
    return () => clearInterval(id);
  }, []);
  return (
    <div className={`flex justify-center ${sizeClass}`}>
      <div className={`relative h-[440px] w-[540px] shrink-0 origin-top ${scaleClass}`}>
        {[0, 1, 2].map(i => {
          const slot = SLOTS[(i - (tick % 3) + 3) % 3];
          return (
            <div
              key={i}
              className="absolute bottom-4 left-0 w-[400px] transition-transform duration-[1000ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ transform: slot.transform, zIndex: slot.z }}
            >
              <KestrelCard skin={i} />
              <div
                className="pointer-events-none absolute inset-0 bg-night transition-opacity duration-[1000ms]"
                style={{ borderRadius: RADIUS, opacity: slot.shade }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Toast ---------- */

/** "Money received" toast that loops in and out. `glass` for dark backgrounds. */
export function ReceivedToast({ className = '', glass = false }: { className?: string; glass?: boolean }) {
  return (
    <div
      className={`toast-loop flex items-center gap-3 rounded-2xl px-4 py-3 ${
        glass
          ? 'glass-strong text-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)]'
          : 'bg-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.25)]'
      } ${className}`}
    >
      <span className={`grid h-9 w-9 place-items-center rounded-full ${glass ? 'bg-brand-bright/20 text-brand-bright' : 'bg-brand-soft text-brand'}`}>
        <ArrowDownLeft size={18} />
      </span>
      <div className="font-body">
        <div className={`text-xs ${glass ? 'text-white/70' : 'text-muted'}`}>Transfer received</div>
        <div className={`font-display text-sm font-semibold ${glass ? 'text-white' : 'text-night'}`}>+$1,200.00</div>
      </div>
    </div>
  );
}

/* ---------- Phone mock ---------- */

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-7 pt-3.5 font-display text-[13px] font-semibold text-night">
      <span>9:41</span>
      <span className="flex items-center gap-1.5">
        {/* signal */}
        <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor" aria-hidden="true">
          <rect x="0" y="7" width="3" height="4" rx="0.8" /><rect x="4.5" y="5" width="3" height="6" rx="0.8" />
          <rect x="9" y="2.5" width="3" height="8.5" rx="0.8" /><rect x="13.5" y="0" width="3" height="11" rx="0.8" />
        </svg>
        {/* wifi */}
        <svg width="15" height="11" viewBox="0 0 15 11" fill="currentColor" aria-hidden="true">
          <path d="M7.5 2.2c2.1 0 4 .8 5.5 2.1l1.1-1.2A9.6 9.6 0 0 0 7.5.5 9.6 9.6 0 0 0 .9 3.1L2 4.3a8 8 0 0 1 5.5-2.1Zm0 3.3c1.2 0 2.3.4 3.2 1.2l1.1-1.2a6.4 6.4 0 0 0-8.6 0l1.1 1.2c.9-.8 2-1.2 3.2-1.2Zm0 3.3c.4 0 .8.1 1.1.4L7.5 10.5 6.4 9.2c.3-.3.7-.4 1.1-.4Z" />
        </svg>
        {/* battery */}
        <span className="relative flex h-[12px] w-[25px] items-center rounded-[4px] border border-night/40 p-[1.5px]">
          <span className="h-full w-[78%] rounded-[2px] bg-night" />
          <span className="absolute -right-[3px] top-1/2 h-[4px] w-[1.5px] -translate-y-1/2 rounded-r bg-night/40" />
        </span>
      </span>
    </div>
  );
}

/** Realistic smartphone showing the dashboard home screen. */
export function PhoneHome() {
  const wallets = [
    { code: 'USD', name: 'US Dollar', amount: '$8,420.50' },
    { code: 'EUR', name: 'Euro', amount: '€2,310.00' },
    { code: 'GBP', name: 'British Pound', amount: '£940.25' },
  ];
  const tx = [
    { name: 'Salary deposit', date: 'Today', amt: '+$3,200.00', pos: true },
    { name: 'To A. Mensah', date: 'Yesterday', amt: '−$250.00', pos: false },
    { name: 'Swap USD → EUR', date: 'Mon', amt: '−$500.00', pos: false },
  ];
  const side = 'linear-gradient(90deg,#6b706e,#c9cecc 40%,#8d9290 70%,#5c615f)';
  return (
    <div className="relative mx-auto w-[300px]">
      {/* hardware buttons */}
      <span className="absolute -left-[3px] top-[110px] h-[30px] w-[4px] rounded-l-md" style={{ background: side }} />
      <span className="absolute -left-[3px] top-[160px] h-[56px] w-[4px] rounded-l-md" style={{ background: side }} />
      <span className="absolute -left-[3px] top-[226px] h-[56px] w-[4px] rounded-l-md" style={{ background: side }} />
      <span className="absolute -right-[3px] top-[180px] h-[86px] w-[4px] rounded-r-md" style={{ background: side }} />

      {/* titanium frame */}
      <div
        className="rounded-[54px] p-[3px] shadow-[0_50px_90px_-30px_rgba(8,19,15,0.55),0_20px_40px_-20px_rgba(8,19,15,0.35)]"
        style={{ background: 'linear-gradient(145deg,#d9dddb 0%,#7d8280 22%,#4a4e4c 50%,#9aa09d 78%,#e3e6e4 100%)' }}
      >
        {/* black bezel */}
        <div className="rounded-[51px] bg-black p-[9px]">
          {/* screen */}
          <div className="relative h-[600px] overflow-hidden rounded-[43px] bg-paper font-body">
            {/* dynamic island */}
            <div className="absolute left-1/2 top-[11px] z-20 flex h-[30px] w-[100px] -translate-x-1/2 items-center justify-end rounded-full bg-black pr-3">
              <span className="h-[10px] w-[10px] rounded-full bg-[#1a1f2e] ring-2 ring-[#0b0d12]" />
            </div>

            <StatusBar />

            <div className="px-5 pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-muted">Good morning</div>
                  <div className="font-display text-[15px] font-semibold text-night">Ama Mensah</div>
                </div>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-brand font-display text-xs font-semibold text-white">AM</span>
              </div>

              <div className="relative mt-4 overflow-hidden rounded-[22px] bg-night p-4 text-white">
                <div
                  className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl"
                  style={{ background: 'radial-gradient(circle, rgba(212,180,131,0.55), transparent 70%)' }}
                />
                <div className="relative text-[11px] text-white/60">Total balance</div>
                <div className="relative mt-1 font-display text-[28px] font-semibold leading-none tracking-tight">$12,121.56</div>
                <div className="relative mt-2 text-[10px] text-brand-bright">3 wallets · shown in USD</div>
                <div className="relative mt-3 grid grid-cols-3 gap-1.5 text-center text-[10px]">
                  {['Send', 'Deposit', 'Swap'].map(a => (
                    <span key={a} className="rounded-xl bg-white/10 py-1.5 text-white/85">{a}</span>
                  ))}
                </div>
              </div>

              <div className="mt-4 space-y-1.5">
                {wallets.map(w => (
                  <div key={w.code} className="flex items-center justify-between rounded-2xl bg-white px-3 py-2.5">
                    <span className="flex items-center gap-2.5">
                      <Flag code={w.code} size={26} />
                      <span>
                        <span className="block text-[12px] font-semibold leading-tight text-night">{w.code}</span>
                        <span className="block text-[10px] leading-tight text-muted">{w.name}</span>
                      </span>
                    </span>
                    <span className="font-display text-[13px] font-semibold text-night">{w.amount}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-[11px] font-medium text-muted">Recent activity</div>
              <div className="mt-1.5 space-y-2">
                {tx.map(t => (
                  <div key={t.name} className="flex items-center justify-between text-[11.5px]">
                    <span>
                      <span className="block text-night">{t.name}</span>
                      <span className="block text-[10px] text-muted">{t.date}</span>
                    </span>
                    <span className={`font-display font-semibold ${t.pos ? 'text-brand' : 'text-night'}`}>{t.amt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* home indicator */}
            <span className="absolute bottom-2 left-1/2 h-[5px] w-[120px] -translate-x-1/2 rounded-full bg-night/80" />
            {/* glass reflection */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: 'linear-gradient(125deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 28%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.08) 100%)' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Status timeline ---------- */

/** Status timeline used by the tracking + recovery mocks. */
export function StatusSteps({ steps, current, dark = false }: { steps: string[]; current: number; dark?: boolean }) {
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s} className="flex items-center gap-3 text-sm">
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                done
                  ? 'bg-brand-bright text-night'
                  : active
                    ? dark ? 'bg-white/15 text-white ring-2 ring-brand-bright' : 'bg-brand-soft text-brand ring-2 ring-brand'
                    : dark ? 'bg-white/10 text-white/40' : 'bg-paper text-muted'
              }`}
            >
              {done ? <CheckCircle2 size={14} /> : <span className="text-[10px] font-semibold">{i + 1}</span>}
            </span>
            <span className={done || active ? (dark ? 'text-white' : 'text-night') : dark ? 'text-white/45' : 'text-muted'}>
              {s}
              {active && <span className={`ml-2 text-xs ${dark ? 'text-brand-bright' : 'text-brand'}`}>In progress</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
