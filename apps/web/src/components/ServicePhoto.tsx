import { useState, type ReactNode } from 'react';

/**
 * Photos for the three services. Free under the Unsplash License (commercial use, no attribution
 * required — credited anyway). A copy saved at `local` (apps/web/public/...) is used first, so the
 * app works offline; otherwise the browser loads it from Unsplash; otherwise a gradient is shown.
 */
export const SERVICE_PHOTOS = {
  loans: {
    local: '/images/services/loans.jpg',
    remote: 'https://unsplash.com/photos/05XcCfTOzN4/download?w=1200',
    alt: 'Person at a desk holding a small model house next to a calculator',
    credit: 'Towfiqu barbhuiya / Unsplash',
    page: 'https://unsplash.com/photos/man-holding-model-house-at-desk-with-calculator-05XcCfTOzN4',
  },
  tax: {
    local: '/images/services/tax-recovery.jpg',
    remote: 'https://unsplash.com/photos/7edddu99-8Q/download?w=1200',
    alt: 'Tax forms with a calculator and pen on a dark desk',
    credit: 'Kelly Sikkema / Unsplash',
    page: 'https://unsplash.com/photos/tax-forms-with-calculator-and-pen-on-dark-surface-7edddu99-8Q',
  },
  fund: {
    local: '/images/services/fund-recovery.jpg',
    remote: 'https://unsplash.com/photos/FnA5pAzqhMM/download?w=1200',
    alt: 'A golden padlock resting on a laptop keyboard',
    credit: 'Towfiqu barbhuiya / Unsplash',
    page: 'https://unsplash.com/photos/a-golden-padlock-sitting-on-top-of-a-keyboard-FnA5pAzqhMM',
  },
  // Deposit methods
  bank: {
    local: '/images/deposits/bank-transfer.jpg',
    remote: 'https://unsplash.com/photos/j6LFEedJ2FM/download?w=800',
    alt: 'Hands holding a smartphone, making a bank transfer in a banking app',
    credit: 'Atlantic Money / Unsplash',
    page: 'https://unsplash.com/photos/a-person-holding-a-smart-phone-in-their-hand-j6LFEedJ2FM',
  },
  check: {
    local: '/images/deposits/check.jpg',
    remote: 'https://unsplash.com/photos/E0sZxhBH8Ck/download?w=800',
    alt: 'A pen resting over a blank bank check',
    credit: 'Money Knack / Unsplash',
    page: 'https://unsplash.com/photos/pen-poised-over-a-check-ready-to-write-E0sZxhBH8Ck',
  },
  cash: {
    local: '/images/deposits/cash.jpg',
    remote: 'https://unsplash.com/photos/abhSD6aHPTE/download?w=800',
    alt: 'A hand holding a stack of twenty dollar bills',
    credit: 'Jonathan Borba / Unsplash',
    page: 'https://unsplash.com/photos/a-hand-holding-a-stack-of-twenty-dollar-bills-abhSD6aHPTE',
  },
} as const;

export type ServiceKey = keyof typeof SERVICE_PHOTOS;

const FALLBACK_BG = 'linear-gradient(135deg,#8b6a3e 0%,#0f2238 100%)';

/** <img> that tries the local copy, then Unsplash, then falls back to a brand gradient. */
export function ServicePhoto({ service, className = '' }: { service: ServiceKey; className?: string }) {
  const p = SERVICE_PHOTOS[service];
  const [stage, setStage] = useState<0 | 1 | 2>(0);
  if (stage === 2) return <div className={className} style={{ background: FALLBACK_BG }} role="img" aria-label={p.alt} />;
  return (
    <img
      src={stage === 0 ? p.local : p.remote}
      alt={p.alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setStage(s => (s === 0 ? 1 : 2))}
      className={`object-cover ${className}`}
    />
  );
}

/** Photo banner used at the top of each service page in the dashboard. */
export function ServiceBanner({
  service, title, desc, action,
}: { service: ServiceKey; title: string; desc: string; action?: ReactNode }) {
  return (
    <section className="relative mb-6 overflow-hidden rounded-[24px] bg-night text-white">
      <ServicePhoto service={service} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-gradient-to-r from-night via-night/85 to-night/20" />
      <div className="relative flex min-h-[200px] flex-col justify-end gap-5 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8">
        <div className="max-w-lg">
          <h1 className="font-display text-[30px] font-semibold leading-tight tracking-[-0.03em] sm:text-[36px]">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/70 sm:text-base">{desc}</p>
        </div>
        {action}
      </div>
    </section>
  );
}
