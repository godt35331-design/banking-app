import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownLeft, ArrowUpRight, ArrowRightLeft, RefreshCw, Plus, Upload,
  MessageSquare, ChevronRight, Copy, Check, ShieldCheck,
} from 'lucide-react';
import { formatMoney } from '@kestrel/shared';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { DarkGlow } from '../../components/AuthShell';
import { ServicePhoto } from '../../components/ServicePhoto';
import { Flag } from '../../components/Flag';
import { Reveal, prefersReducedMotion } from '../../components/landing/motion';
import { KestrelCard, cardProps } from '../../components/landing/mocks';

const CURRENCY_NAMES: Record<string, string> = { USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound' };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

/** Counts a money amount (in minor units) up from 0 the first time it loads. */
function useCountUp(target: number | undefined, duration = 1100) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (target === undefined) return;
    if (prefersReducedMotion()) return setN(target);
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return n;
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === 'COMPLETED' ? 'bg-brand-soft text-brand'
      : status === 'PENDING' || status === 'AWAITING_APPROVAL' ? 'bg-amber-50 text-warn'
        : status === 'FAILED' || status === 'REJECTED' || status === 'DECLINED' ? 'bg-red-50 text-bad'
          : 'bg-paper text-muted';
  const text = status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${tone}`}>{text}</span>;
}

function CopyAccount({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(value).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-night"
      title="Copy account number"
    >
      {value}
      {copied ? <Check size={13} className="text-brand" /> : <Copy size={13} />}
    </button>
  );
}

export function Home() {
  const { user } = useAuth();
  const { data: balance } = useQuery({
    queryKey: ['balance'],
    queryFn: () => api.get<{ totalUsdMinor: number; wallets: any[] }>('/wallets/balance'),
  });
  const { data: transactions } = useQuery({
    queryKey: ['recent-tx'],
    queryFn: () => api.get<any[]>('/transactions?limit=8'),
  });
  const { data: cards } = useQuery({
    queryKey: ['cards'],
    queryFn: () => api.get<any[]>('/cards'),
  });

  const total = useCountUp(balance?.totalUsdMinor);
  const firstName = user?.name?.split(' ')[0] ?? '';
  const wallets = balance?.wallets ?? [];
  const firstCard = cards?.[0];

  const actions = [
    { to: '/dashboard/transfer', icon: ArrowRightLeft, label: 'Transfer' },
    { to: '/dashboard/withdraw', icon: Upload, label: 'Withdraw' },
    { to: '/dashboard/swap', icon: RefreshCw, label: 'Swap' },
    { to: '/dashboard/cards', icon: Plus, label: 'New card' },
  ];

  return (
    <div className="space-y-5">
      {/* Greeting */}
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-3 px-1">
          <div>
            <p className="text-sm text-muted">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="mt-1 font-display text-[28px] font-semibold tracking-[-0.03em] sm:text-[34px]">
              {greeting()}, {firstName}
            </h1>
          </div>
          <Link to="/dashboard/support" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-night/80 hover:text-night">
            <MessageSquare size={16} className="text-brand" /> Need help?
          </Link>
        </div>
      </Reveal>

      {/* Identity verification prompt */}
      {user?.kycStatus && user.kycStatus !== 'APPROVED' && (
        <Link
          to="/dashboard/settings?tab=identity"
          className={`flex items-center gap-4 rounded-[22px] p-4 transition-transform hover:-translate-y-0.5 ${
            user.kycStatus === 'PENDING' ? 'bg-amber-50' : user.kycStatus === 'REJECTED' ? 'bg-red-50' : 'bg-white'
          }`}
        >
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
            user.kycStatus === 'PENDING' ? 'bg-amber-500 text-white' : user.kycStatus === 'REJECTED' ? 'bg-bad text-white' : 'bg-brand-soft text-brand'
          }`}>
            <ShieldCheck size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">
              {user.kycStatus === 'PENDING' ? "We're checking your ID" : user.kycStatus === 'REJECTED' ? 'Please send new ID documents' : 'Verify your identity'}
            </span>
            <span className="block text-sm text-muted">
              {user.kycStatus === 'PENDING' ? "We'll let you know when it's done, usually within 1–2 working days."
                : user.kycStatus === 'REJECTED' ? "We couldn't verify the documents you sent. See why and try again."
                  : 'Upload a photo ID and proof of address. It only takes a minute.'}
            </span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-muted" />
        </Link>
      )}

      {/* Balance hero */}
      <Reveal delay={80}>
        <section className="relative overflow-hidden rounded-[28px] bg-night p-6 text-white sm:p-8">
          <DarkGlow className="-right-32 -top-40 h-[480px] w-[480px]" />
          <DarkGlow className="-bottom-48 left-10 h-[360px] w-[360px] opacity-50" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.15fr_1fr]">
            <div>
              <p className="text-sm text-white/60">Total balance</p>
              <p className="mt-2 font-display text-[40px] font-semibold leading-none tracking-[-0.04em] tabular-nums sm:text-[56px]">
                {balance ? formatMoney(total, 'USD') : '—'}
              </p>
              <p className="mt-3 text-sm text-white/55">
                Across {wallets.length} {wallets.length === 1 ? 'wallet' : 'wallets'} · {cards?.length ?? 0} {cards?.length === 1 ? 'card' : 'cards'} · shown in USD
              </p>

              <div className="mt-8 grid grid-cols-5 gap-1.5 sm:gap-3">
                {actions.map(({ to, icon: Icon, label }) => (
                  <Link
                    key={to}
                    to={to}
                    className="glass group flex min-w-0 flex-col items-center gap-1.5 rounded-2xl px-1 py-3 text-[11px] text-white/80 transition-colors hover:bg-white/15 hover:text-white sm:gap-2 sm:px-2 sm:py-3.5 sm:text-sm"
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-bright text-night transition-transform group-hover:-translate-y-0.5 sm:h-10 sm:w-10">
                      <Icon size={17} />
                    </span>
                    <span className="max-w-full truncate">{label}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[400px]">
              {firstCard ? (
                <Link to="/dashboard/cards" className="block">
                  {cards && cards.length > 1 && (
                    <div className="absolute inset-x-0 top-0 translate-x-[6%] -translate-y-[8%] rotate-[5deg]">
                      <KestrelCard {...cardProps(cards[1])} />
                      <div className="absolute inset-0 bg-night/35" style={{ borderRadius: '4.5% / 7.14%' }} />
                    </div>
                  )}
                  <div className="relative -rotate-[3deg] transition-transform duration-500 hover:rotate-0 hover:scale-[1.02]">
                    <KestrelCard {...cardProps(firstCard)} />
                  </div>
                  {cards && cards.length > 1 && (
                    <span className="glass-strong absolute -bottom-3 right-2 rounded-full px-3 py-1 text-xs">+{cards.length - 1} more</span>
                  )}
                </Link>
              ) : (
                <Link to="/dashboard/cards" className="group relative block">
                  <KestrelCard skin={1} holder={(user?.name ?? 'YOUR NAME').toUpperCase()} number="•••• •••• •••• ••••" label="No card yet" />
                  <span className="absolute inset-0 grid place-items-center">
                    <span className="glass-strong inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-transform group-hover:scale-105">
                      <Plus size={16} /> Create your first card
                    </span>
                  </span>
                </Link>
              )}
            </div>
          </div>
        </section>
      </Reveal>

      {/* Wallets */}
      <section>
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="font-display text-lg font-semibold tracking-tight">Your wallets</h2>
          <Link to="/dashboard/wallets" className="inline-flex items-center gap-1 text-sm text-brand hover:underline">
            Manage <ChevronRight size={15} />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {wallets.map((w: any, i: number) => (
            <Reveal key={w.id} delay={i * 80}>
              <div className="h-full rounded-[22px] bg-white p-5 transition-shadow hover:shadow-[0_24px_50px_-30px_rgba(8,19,15,0.35)]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-3">
                    <Flag code={w.currency} size={40} />
                    <span>
                      <span className="block text-sm font-medium">{w.currency}</span>
                      <span className="block text-xs text-muted">{CURRENCY_NAMES[w.currency] ?? 'Wallet'}</span>
                    </span>
                  </span>
                  {w.status && w.status !== 'ACTIVE' && <StatusPill status={w.status} />}
                </div>
                <p className="mt-5 font-display text-[28px] font-semibold leading-none tracking-[-0.03em] tabular-nums">
                  {formatMoney(w.balanceMinor, w.currency)}
                </p>
                <div className="mt-3"><CopyAccount value={w.accountNumber} /></div>
              </div>
            </Reveal>
          ))}
          <Reveal delay={wallets.length * 80}>
            <Link
              to="/dashboard/wallets"
              className="flex h-full min-h-[150px] flex-col items-center justify-center gap-2 rounded-[22px] border-2 border-dashed border-night/10 text-sm text-muted transition-colors hover:border-brand hover:text-brand"
            >
              <Plus size={20} /> Add a wallet
            </Link>
          </Reveal>
        </div>
      </section>

      {/* Activity + services */}
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Reveal>
          <section className="h-full rounded-[24px] bg-white p-5 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold tracking-tight">Recent activity</h2>
              <span className="text-xs text-muted">Last {transactions?.length ?? 0}</span>
            </div>
            {!transactions?.length ? (
              <div className="rounded-2xl bg-paper px-6 py-12 text-center">
                <p className="font-medium">No transactions yet</p>
                <p className="mt-1 text-sm text-muted">Make a transfer and it will show up here.</p>
              </div>
            ) : (
              <ul className="divide-y divide-night/5">
                {transactions.map((tx: any) => {
                  const incoming = tx.direction === 'IN';
                  return (
                    <li key={tx.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${incoming ? 'bg-brand-soft text-brand' : 'bg-paper text-night/70'}`}>
                          {incoming ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{tx.description}</p>
                          <p className="text-xs text-muted">
                            {new Date(tx.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} ·{' '}
                            {new Date(tx.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`font-display text-sm font-semibold tabular-nums ${incoming ? 'text-brand' : 'text-night'}`}>
                          {incoming ? '+' : '−'}{formatMoney(tx.amountMinor, tx.currency)}
                        </p>
                        <div className="mt-1"><StatusPill status={tx.status} /></div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </Reveal>

        <div className="space-y-5">
          <Reveal delay={80}>
            <section className="relative overflow-hidden rounded-[24px] bg-night p-5 text-white sm:p-6">
              <DarkGlow className="-bottom-24 -right-24 h-64 w-64 opacity-70" />
              <h2 className="relative font-display text-lg font-semibold tracking-tight">Services</h2>
              <p className="relative mt-1 text-sm text-white/55">Apply and track everything online.</p>
              <div className="relative mt-4 space-y-2">
                {[
                  { to: '/dashboard/loans', photo: 'loans' as const, label: 'Loans', desc: 'Apply online and track your application' },
                  { to: '/dashboard/tax-recovery', photo: 'tax' as const, label: 'Tax Recovery', desc: 'Claim back overpaid tax' },
                  { to: '/dashboard/fund-recovery', photo: 'fund' as const, label: 'Fund Recovery', desc: 'Report fraud or a failed payment' },
                ].map(({ to, photo, label, desc }) => (
                  <Link key={to} to={to} className="glass group flex items-center gap-3 rounded-2xl p-2.5 transition-colors hover:bg-white/15">
                    <span className="relative h-12 w-14 shrink-0 overflow-hidden rounded-xl">
                      <ServicePhoto service={photo} className="h-full w-full transition-transform duration-500 group-hover:scale-110" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{label}</span>
                      <span className="block truncate text-xs text-white/50">{desc}</span>
                    </span>
                    <ChevronRight size={16} className="text-white/40 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>
            </section>
          </Reveal>

          <Reveal delay={160}>
            <section className="rounded-[24px] bg-brand-soft p-5 sm:p-6">
              <h2 className="font-display text-lg font-semibold tracking-tight">Talk to our team</h2>
              <p className="mt-1 text-sm text-night/65">Questions about your account? Send us a message any time.</p>
              <Link to="/dashboard/support" className="mt-4 inline-flex items-center gap-2 rounded-full bg-night px-4 py-2 text-sm text-white hover:bg-brand">
                <MessageSquare size={15} /> Open support
              </Link>
            </section>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
