import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Lock, LockOpen, Eye, EyeOff, RotateCw, SlidersHorizontal, Trash2, Check,
  ChevronLeft, ChevronRight, Wifi, Globe, Banknote, Plane, AlertTriangle, Copy,
} from 'lucide-react';
import { formatMoney } from '@kestrel/shared';
import { api } from '../../lib/api';
import { DarkGlow } from '../../components/AuthShell';
import { Sheet } from '../../components/Sheet';
import { useTween, prefersReducedMotion } from '../../components/landing/motion';
import { KestrelCard, KestrelCardBack, cardProps, formatCardNumber } from '../../components/landing/mocks';

type Card = {
  id: string;
  label: string;
  last4: string;
  expMonth: number;
  expYear: number;
  holderName: string;
  color: string;
  status: 'ACTIVE' | 'FROZEN' | 'ISSUED';
  kind: 'VIRTUAL' | 'PHYSICAL';
  monthlyLimitMinor: number | null;
  spentMinor?: number;
  categories?: { name: string; amountMinor: number }[];
};
type Details = { number: string; cvv: string };

/** How long a revealed number / CVV stays visible before hiding again. */
const HIDE_AFTER_MS = 30_000;
const usd = (minor: number) => formatMoney(Math.round(minor), 'USD');
const usd0 = (minor: number) => '$' + Math.round(minor / 100).toLocaleString('en-US');

export function Cards() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: cards, isLoading } = useQuery({ queryKey: ['cards'], queryFn: () => api.get<Card[]>('/cards') });

  const [index, setIndex] = useState(0);
  const [details, setDetails] = useState<Record<string, Details>>({});
  const [showNumber, setShowNumber] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [sheet, setSheet] = useState<'limit' | 'create' | 'remove' | null>(null);

  const list = cards ?? [];
  const card = list[Math.min(index, Math.max(0, list.length - 1))];
  const frozen = card?.status === 'FROZEN';
  const revealed = card ? details[card.id] : undefined;

  // Switching cards hides anything revealed on the previous one.
  useEffect(() => { setShowNumber(false); setFlipped(false); setError(''); }, [card?.id]);

  // Revealed details hide themselves again after a while.
  useEffect(() => {
    if (!showNumber && !flipped) return;
    const t = setTimeout(() => { setShowNumber(false); setFlipped(false); }, HIDE_AFTER_MS);
    return () => clearTimeout(t);
  }, [showNumber, flipped]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['cards'] });

  const freeze = useMutation({
    mutationFn: (id: string) => api.patch(`/cards/${id}/freeze`),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/cards/${id}`),
    onSuccess: () => { setSheet(null); setIndex(0); refresh(); },
  });
  const setLimit = useMutation({
    mutationFn: ({ id, minor }: { id: string; minor: number | null }) =>
      api.patch(`/cards/${id}/limit`, { monthlyLimitMinor: minor }),
    onSuccess: (_d, v) => {
      setSheet(null);
      setToast(v.minor === null ? 'Monthly limit removed' : `Limit set to ${usd0(v.minor)}`);
      refresh();
    },
  });

  const loadDetails = async () => {
    if (!card) return null;
    if (details[card.id]) return details[card.id];
    setBusy(true);
    setError('');
    try {
      const d = await api.get<Details>(`/cards/${card.id}/reveal`);
      setDetails(m => ({ ...m, [card.id]: d }));
      return d;
    } catch (e) {
      setError((e as Error).message || 'Could not load card details');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const toggleNumber = async () => {
    if (showNumber) return setShowNumber(false);
    if (await loadDetails()) { setFlipped(false); setShowNumber(true); }
  };
  const toggleCvv = async () => {
    if (flipped) return setFlipped(false);
    if (await loadDetails()) setFlipped(true);
  };

  const reportLost = () => {
    if (card && !frozen) freeze.mutate(card.id);
    navigate('/dashboard/support');
  };

  return (
    <div className="space-y-5">
      {/* Dark header with the card carousel */}
      <section className="relative overflow-hidden rounded-[28px] bg-night px-5 pb-6 pt-5 text-white sm:px-8 sm:pt-7">
        <DarkGlow className="-right-40 -top-40 h-[420px] w-[420px] opacity-70" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.03em] sm:text-[34px]">Cards</h1>
            <p className="mt-1 text-sm text-white/55">
              {list.length ? `${list.length} virtual card${list.length > 1 ? 's' : ''} · swipe or use the arrows` : 'Your virtual debit cards'}
            </p>
          </div>
          <button
            onClick={() => setSheet('create')}
            className="flex h-11 items-center gap-2 rounded-full bg-white pl-3 pr-4 text-sm font-semibold text-night transition-transform hover:scale-[1.03] active:scale-95"
          >
            <Plus size={18} /> New card
          </button>
        </div>

        {isLoading ? (
          <div className="relative mx-auto mt-8 aspect-[1.586] w-full max-w-[440px] skeleton skeleton-dark" style={{ borderRadius: 20 }} />
        ) : !list.length ? (
          <button
            onClick={() => setSheet('create')}
            className="relative mx-auto mt-8 grid aspect-[1.586] w-full max-w-[440px] place-items-center rounded-[20px] border-2 border-dashed border-white/20 text-white/60 transition-colors hover:border-brand-bright hover:text-white"
          >
            <span className="flex flex-col items-center gap-2">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-white/10"><Plus /></span>
              <span className="font-display font-semibold">Add your first card</span>
            </span>
          </button>
        ) : (
          <>
            <Carousel
              cards={list}
              index={Math.min(index, list.length - 1)}
              onIndex={setIndex}
              flipped={flipped}
              showNumber={showNumber}
              details={revealed}
            />
            <div className="relative mt-6 flex items-end justify-between gap-4">
              <div key={card.id} className="min-w-0" style={{ animation: 'rise-in .35s cubic-bezier(.2,.8,.2,1) both' }}>
                <p className="truncate font-display text-lg font-semibold">{card.label}</p>
                <p className="text-sm text-white/55">
                  Virtual · •••• {card.last4}
                  {frozen && <span className="text-sky-200"> · Frozen</span>}
                </p>
              </div>
              <Dots count={list.length} index={Math.min(index, list.length - 1)} onIndex={setIndex} />
            </div>
          </>
        )}
      </section>

      {card && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* Left: actions + spending */}
          <div className="space-y-5">
            <div className="rounded-[24px] bg-white p-5">
              <div className="grid grid-cols-5 gap-2">
                <ActionButton
                  icon={frozen ? LockOpen : Lock}
                  label={frozen ? 'Unfreeze' : 'Freeze'}
                  active={frozen}
                  disabled={freeze.isPending}
                  onClick={() => freeze.mutate(card.id)}
                />
                <ActionButton
                  icon={showNumber ? EyeOff : Eye}
                  label={showNumber ? 'Hide card' : 'Reveal card'}
                  active={showNumber}
                  disabled={busy}
                  onClick={toggleNumber}
                />
                <ActionButton
                  icon={RotateCw}
                  label={flipped ? 'Hide CVV' : 'Reveal CVV'}
                  active={flipped}
                  disabled={busy}
                  onClick={toggleCvv}
                />
                <ActionButton icon={SlidersHorizontal} label="Limit" onClick={() => setSheet('limit')} />
                <ActionButton icon={Trash2} label="Remove" danger onClick={() => setSheet('remove')} />
              </div>
              {error && <p className="mt-3 text-center text-sm text-bad">{error}</p>}
              {(showNumber || flipped) && revealed && (
                <div className="pill-grow mt-4 flex items-center justify-between gap-3 rounded-2xl bg-paper px-4 py-2.5 text-sm">
                  <span className="text-muted">Details hide automatically after 30 seconds</span>
                  <CopyButton value={showNumber ? revealed.number : revealed.cvv} label={showNumber ? 'Copy number' : 'Copy CVV'} />
                </div>
              )}
            </div>

            <SpendingCard card={card} toast={toast} onSetLimit={() => setSheet('limit')} />
          </div>

          {/* Right: card settings */}
          <CardSettings card={card} frozen={frozen} onReportLost={reportLost} />
        </div>
      )}

      {card && (
        <LimitSheet
          open={sheet === 'limit'}
          card={card}
          saving={setLimit.isPending}
          error={setLimit.isError ? (setLimit.error as Error).message : ''}
          onClose={() => setSheet(null)}
          onSave={minor => setLimit.mutate({ id: card.id, minor })}
        />
      )}

      {card && (
        <Sheet open={sheet === 'remove'} onClose={() => setSheet(null)} title="Remove this card?" subtitle={`${card.label} · •••• ${card.last4}`}>
          <p className="text-sm leading-relaxed text-muted">
            The card stops working straight away and can't be added back. Your wallet balance isn't affected.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button onClick={() => setSheet(null)} className="rounded-full bg-paper py-3.5 text-sm font-semibold">Keep card</button>
            <button
              onClick={() => remove.mutate(card.id)}
              disabled={remove.isPending}
              className="rounded-full bg-bad py-3.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {remove.isPending ? 'Removing…' : 'Remove card'}
            </button>
          </div>
        </Sheet>
      )}

      <CreateCardSheet
        open={sheet === 'create'}
        onClose={() => setSheet(null)}
        onCreated={() => { setSheet(null); setIndex(0); refresh(); setToast(''); }}
      />
    </div>
  );
}

/* ---------- Carousel: horizontal 3D swipe, pointer tilt, flip ---------- */

function Carousel({
  cards, index, onIndex, flipped, showNumber, details,
}: {
  cards: Card[];
  index: number;
  onIndex: (i: number) => void;
  flipped: boolean;
  showNumber: boolean;
  details?: Details;
}) {
  const [drag, setDrag] = useState<{ x0: number; dx: number } | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const stage = useRef<HTMLDivElement>(null);
  const reduce = prefersReducedMotion();

  const go = (i: number) => onIndex(Math.max(0, Math.min(cards.length - 1, i)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input,textarea,select,[role=dialog]')) return;
      if (e.key === 'ArrowRight') go(index + 1);
      if (e.key === 'ArrowLeft') go(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const moved = useRef(false);
  const onDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    moved.current = false;
    setDrag({ x0: e.clientX, dx: 0 });
  };
  const onMove = (e: ReactPointerEvent) => {
    const el = stage.current;
    if (drag) {
      const dx = e.clientX - drag.x0;
      // Only start capturing once it's clearly a drag, so plain clicks still reach the cards.
      if (!moved.current && Math.abs(dx) > 6) {
        moved.current = true;
        try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
      }
      setDrag({ ...drag, dx });
      return;
    }
    if (!el || reduce || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setTilt({ x: Math.max(-1, Math.min(1, px * 2)), y: Math.max(-1, Math.min(1, py * 2)) });
  };
  const onUp = () => {
    if (!drag) return;
    if (drag.dx < -60) go(index + 1);
    else if (drag.dx > 60) go(index - 1);
    setDrag(null);
  };

  const dx = drag?.dx ?? 0;
  const width = stage.current?.offsetWidth ?? 440;

  return (
    <div className="relative mt-8 select-none" style={{ perspective: '1200px' }}>
      {/* peeking deck edges behind the front card */}
      <div className="pointer-events-none absolute left-1/2 top-0 w-full max-w-[440px] -translate-x-1/2">
        <div className="absolute -top-[14px] left-[8%] right-[8%] h-6 rounded-t-[16px] bg-white/[0.06]" />
        <div className="absolute -top-[7px] left-[4%] right-[4%] h-6 rounded-t-[18px] bg-white/[0.11]" />
      </div>

      <div
        ref={stage}
        className="relative mx-auto aspect-[1.586] w-full max-w-[440px] touch-pan-y"
        style={{ transformStyle: 'preserve-3d', cursor: drag ? 'grabbing' : cards.length > 1 ? 'grab' : 'default' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onPointerLeave={() => { setTilt({ x: 0, y: 0 }); }}
      >
        {cards.map((c, i) => {
          const offset = i - index;
          const isFront = offset === 0;
          const props = cardProps(c);
          const skin = props.skin === 1 ? 2 : props.skin;
          const dragShift = dx / width; // in card widths
          const pos = offset + dragShift * 0.9;
          const abs = Math.abs(pos);
          const hidden = Math.abs(offset) > 2;

          const translate = pos * 82; // % of card width
          const rotY = Math.max(-28, Math.min(28, -pos * 22)) + (isFront && !drag ? tilt.x * 7 : 0);
          const rotX = isFront && !drag ? -tilt.y * 5 : 0;
          const scale = 1 - Math.min(abs, 1.6) * 0.16;
          const shade = Math.min(abs, 1.5) * 0.45;

          return (
            <div
              key={c.id}
              className="absolute inset-0"
              style={{
                transform: `translateX(${translate}%) rotateY(${rotY}deg) rotateX(${rotX}deg) scale(${scale})`,
                transformStyle: 'preserve-3d',
                zIndex: 10 - Math.abs(offset),
                transition: drag ? 'none' : reduce ? 'none' : 'transform 0.72s cubic-bezier(.2,.9,.28,1.08)',
                visibility: hidden ? 'hidden' : 'visible',
                cursor: isFront ? undefined : 'pointer',
              }}
              onClick={() => { if (!isFront && !moved.current) onIndex(i); }}
            >
              {/* flip layer */}
              <div
                className="relative h-full w-full"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isFront && flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  transition: reduce ? 'none' : 'transform 0.55s cubic-bezier(.45,.05,.35,1)',
                }}
              >
                <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                  <KestrelCard
                    {...props}
                    skin={skin}
                    number={isFront && showNumber && details ? formatCardNumber(details.number) : props.number}
                  />
                  {/* depth shade on side cards */}
                  <div
                    className="pointer-events-none absolute inset-0 bg-night transition-opacity duration-500"
                    style={{ opacity: shade, borderRadius: '4.5% / 7.14%' }}
                  />
                  {/* moving light glare following the tilt */}
                  {isFront && !reduce && (
                    <div
                      className="pointer-events-none absolute inset-0 transition-opacity duration-300"
                      style={{
                        borderRadius: '4.5% / 7.14%',
                        opacity: tilt.x || tilt.y ? 1 : 0,
                        background: `radial-gradient(circle at ${50 + tilt.x * 40}% ${50 + tilt.y * 40}%, rgba(255,255,255,0.22), transparent 55%)`,
                      }}
                    />
                  )}
                </div>
                <div
                  className="absolute inset-0"
                  style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <KestrelCardBack
                    skin={skin}
                    cvv={isFront && flipped && details ? details.cvv : undefined}
                    holder={c.holderName}
                    last4={c.last4}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {cards.length > 1 && (
        <>
          <ArrowButton side="left" disabled={index === 0} onClick={() => go(index - 1)} />
          <ArrowButton side="right" disabled={index === cards.length - 1} onClick={() => go(index + 1)} />
        </>
      )}
    </div>
  );
}

function ArrowButton({ side, disabled, onClick }: { side: 'left' | 'right'; disabled: boolean; onClick: () => void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={side === 'left' ? 'Previous card' : 'Next card'}
      className={`glass-strong absolute top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full text-white transition-all hover:scale-105 disabled:pointer-events-none disabled:opacity-0 sm:grid ${
        side === 'left' ? 'left-0' : 'right-0'
      }`}
    >
      <Icon size={20} />
    </button>
  );
}

function Dots({ count, index, onIndex }: { count: number; index: number; onIndex: (i: number) => void }) {
  if (count < 2) return null;
  return (
    <div className="flex shrink-0 items-center gap-1.5 pb-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          onClick={() => onIndex(i)}
          aria-label={`Card ${i + 1}`}
          className={`h-1.5 rounded-full transition-all duration-300 ${i === index ? 'w-6 bg-white' : 'w-1.5 bg-white/30 hover:bg-white/60'}`}
        />
      ))}
    </div>
  );
}

/* ---------- Action buttons ---------- */

function ActionButton({
  icon: Icon, label, onClick, active = false, danger = false, disabled = false,
}: {
  icon: typeof Lock;
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} className="group flex flex-col items-center gap-2 disabled:opacity-50">
      <span
        className={`grid h-14 w-14 place-items-center rounded-full border transition-all duration-150 group-hover:scale-105 group-active:scale-95 ${
          active
            ? 'border-night bg-night text-white'
            : danger
              ? 'border-line text-bad group-hover:border-bad group-hover:bg-red-50'
              : 'border-line text-night group-hover:border-night'
        }`}
      >
        <Icon size={20} />
      </span>
      <span className="text-center text-xs font-medium leading-tight text-night/80">{label}</span>
    </button>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(value).catch(() => {});
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="flex shrink-0 items-center gap-1.5 rounded-full bg-night px-3 py-1.5 text-xs font-semibold text-white"
    >
      {done ? <Check size={13} /> : <Copy size={13} />} {done ? 'Copied' : label}
    </button>
  );
}

/* ---------- Spending ---------- */

const SEGMENT_TONES = ['bg-night', 'bg-night/45', 'bg-night/20', 'bg-night/10'];

function SpendingCard({ card, toast, onSetLimit }: { card: Card; toast: string; onSetLimit: () => void }) {
  const spent = card.spentMinor ?? 0;
  const limit = card.monthlyLimitMinor;
  const spentT = useTween(spent);
  const limitT = useTween(limit ?? 0);
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    setGrown(false);
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setGrown(true)));
    return () => cancelAnimationFrame(r);
  }, [card.id]);

  const now = new Date();
  const daysLeft = Math.ceil((new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime() - now.getTime()) / 86_400_000);
  const pct = limit ? Math.min(100, (spent / limit) * 100) : 0;
  const cats = card.categories ?? [];
  const frozen = card.status === 'FROZEN';

  return (
    <div className="rounded-[24px] bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Spent this month</p>
          <p className="mt-1 font-display text-[34px] font-medium leading-none tracking-[-0.03em] tabular-nums">{usd(spentT)}</p>
        </div>
        <button onClick={onSetLimit} className="text-right">
          <p className="text-sm text-muted">Limit</p>
          <p className="mt-1 font-display text-lg font-semibold tabular-nums underline-offset-4 hover:underline">
            {limit ? usd0(limitT) : 'Set limit'}
          </p>
        </button>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-paper">
        <div
          className="h-full rounded-full bg-night transition-[width] duration-700 ease-out"
          style={{ width: grown ? `${limit ? pct : 0}%` : '0%' }}
        />
      </div>
      <p className="mt-2 text-xs text-muted">
        {limit ? `${usd(Math.max(0, limit - spent))} left · ` : 'No monthly limit · '}
        resets in {daysLeft} day{daysLeft === 1 ? '' : 's'}
      </p>

      {/* status pills */}
      {(frozen || toast) && (
        <div className="mt-4 space-y-2">
          {toast && (
            <div key={toast} className="pill-grow flex items-center justify-center gap-2 rounded-full bg-night py-2.5 text-sm font-semibold text-white">
              <Check size={15} /> {toast}
            </div>
          )}
          {frozen && (
            <div className="pill-grow flex items-center justify-center gap-2 rounded-full bg-night py-2.5 text-sm font-semibold text-white">
              <Lock size={15} /> Card frozen
            </div>
          )}
        </div>
      )}

      <div className="mt-6">
        {cats.length ? (
          <>
            <div className="flex h-2 gap-1 overflow-hidden rounded-full">
              {cats.map((c, i) => (
                <div
                  key={c.name}
                  className={`h-full rounded-full transition-[width] duration-700 ease-out ${SEGMENT_TONES[Math.min(i, 3)]}`}
                  style={{ width: grown ? `${(c.amountMinor / spent) * 100}%` : '0%' }}
                />
              ))}
            </div>
            <ul className="stagger mt-4 divide-y divide-line">
              {cats.map((c, i) => (
                <li key={c.name} style={{ ['--i' as string]: i }} className="flex items-center justify-between py-3 text-sm">
                  <span className="flex items-center gap-2.5">
                    <span className={`h-2 w-2 rounded-full ${SEGMENT_TONES[Math.min(i, 3)]}`} />
                    {c.name}
                  </span>
                  <span className="flex items-center gap-4 tabular-nums">
                    <span className="font-medium">{usd(c.amountMinor)}</span>
                    <span className="w-9 text-right text-muted">{Math.round((c.amountMinor / spent) * 100)}%</span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="rounded-2xl bg-paper px-4 py-5 text-center">
            <p className="text-sm font-medium">No card purchases yet this month</p>
            <p className="mt-1 text-xs text-muted">Purchases with this card will show here, grouped by category.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Card settings ---------- */

const CONTROLS = [
  { key: 'contactless', icon: Wifi, title: 'Contactless payments', desc: 'Tap to pay in shops' },
  { key: 'online', icon: Globe, title: 'Online purchases', desc: 'Shopping on websites and in apps' },
  { key: 'atm', icon: Banknote, title: 'ATM withdrawals', desc: 'Take out cash at ATMs' },
  { key: 'abroad', icon: Plane, title: 'Spending abroad', desc: 'Payments outside your home country' },
] as const;
type ControlKey = (typeof CONTROLS)[number]['key'];
const DEFAULT_CONTROLS: Record<ControlKey, boolean> = { contactless: true, online: true, atm: true, abroad: false };

/** Card controls are saved in this browser only. */
function useControls(cardId: string) {
  const storageKey = `kestrel.card-controls.${cardId}`;
  const read = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? { ...DEFAULT_CONTROLS, ...JSON.parse(raw) } : DEFAULT_CONTROLS;
    } catch {
      return DEFAULT_CONTROLS;
    }
  };
  const [state, setState] = useState<Record<ControlKey, boolean>>(read);
  useEffect(() => setState(read()), [cardId]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggle = (k: ControlKey) =>
    setState(s => {
      const next = { ...s, [k]: !s[k] };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  return [state, toggle] as const;
}

function CardSettings({ card, frozen, onReportLost }: { card: Card; frozen: boolean; onReportLost: () => void }) {
  const [controls, toggle] = useControls(card.id);
  return (
    <div className="flex flex-col rounded-[24px] bg-white p-6">
      <h2 className="font-display text-lg font-semibold">Card settings</h2>
      <p className="text-sm text-muted">{frozen ? 'Unfreeze the card to change these.' : 'Choose where this card can be used.'}</p>

      <ul className="mt-4 divide-y divide-line">
        {CONTROLS.map(({ key, icon: Icon, title, desc }) => (
          <li key={key} className={`flex items-center gap-4 py-4 transition-opacity ${frozen ? 'opacity-45' : ''}`}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-paper text-night/70">
              <Icon size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{title}</span>
              <span className="block truncate text-xs text-muted">{desc}</span>
            </span>
            <Toggle on={controls[key]} disabled={frozen} onChange={() => toggle(key)} label={title} />
          </li>
        ))}
      </ul>

      <div className="mt-2 rounded-2xl bg-paper px-4 py-3 text-xs leading-relaxed text-muted">
        Card numbers and CVVs are stored encrypted. Only you can reveal them, and they hide again after 30 seconds.
      </div>

      <button
        onClick={onReportLost}
        className="mt-auto flex items-center justify-center gap-2 pt-6 text-sm font-semibold text-bad hover:underline"
      >
        <AlertTriangle size={15} /> Report lost or stolen
      </button>
    </div>
  );
}

function Toggle({ on, onChange, disabled, label }: { on: boolean; onChange: () => void; disabled?: boolean; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 disabled:cursor-not-allowed ${on ? 'bg-night' : 'bg-black/15'}`}
    >
      <span
        className="absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ease-[cubic-bezier(.2,.8,.2,1)]"
        style={{ transform: on ? 'translateX(20px)' : 'none' }}
      />
    </button>
  );
}

/* ---------- Limit sheet ---------- */

const PRESETS = [1_000, 2_500, 5_000, 10_000];
const MAX_LIMIT = 20_000;

function LimitSheet({
  open, card, saving, error, onClose, onSave,
}: {
  open: boolean;
  card: Card;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSave: (minor: number | null) => void;
}) {
  const [dollars, setDollars] = useState(2_500);
  useEffect(() => {
    if (open) setDollars(card.monthlyLimitMinor ? Math.round(card.monthlyLimitMinor / 100) : 2_500);
  }, [open, card.monthlyLimitMinor]);
  const shown = useTween(open ? dollars * 100 : 0, 350);
  const fill = (Math.min(dollars, MAX_LIMIT) / MAX_LIMIT) * 100;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Monthly limit"
      subtitle={`${card.label} · ${usd(card.spentMinor ?? 0)} spent so far`}
    >
      <p className="py-4 text-center font-display text-[52px] font-medium leading-none tracking-[-0.04em] tabular-nums">
        {usd0(shown)}
      </p>
      <input
        type="range"
        min={100}
        max={MAX_LIMIT}
        step={50}
        value={dollars}
        onChange={e => setDollars(Number(e.target.value))}
        className="range mt-4"
        style={{ ['--fill' as string]: `${fill}%` }}
        aria-label="Monthly limit"
      />
      <div className="mt-5 grid grid-cols-4 gap-2">
        {PRESETS.map(p => (
          <button
            key={p}
            onClick={() => setDollars(p)}
            className={`rounded-full py-2.5 text-sm font-semibold transition-colors ${dollars === p ? 'bg-night text-white' : 'bg-paper text-night hover:bg-black/10'}`}
          >
            ${p.toLocaleString('en-US')}
          </button>
        ))}
      </div>
      {error && <p className="mt-3 text-sm text-bad">{error}</p>}
      <button
        onClick={() => onSave(dollars * 100)}
        disabled={saving}
        className="mt-6 w-full rounded-full bg-night py-4 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save limit'}
      </button>
      {card.monthlyLimitMinor ? (
        <button onClick={() => onSave(null)} disabled={saving} className="mt-3 w-full py-2 text-sm font-medium text-muted hover:text-night">
          Remove limit
        </button>
      ) : null}
    </Sheet>
  );
}

/* ---------- Create card sheet ---------- */

const COLORS = [
  { value: 'ink', label: 'Black', swatch: 'linear-gradient(145deg,#2a2f2d,#0a0c0b)' },
  { value: 'brand', label: 'Green', swatch: 'linear-gradient(135deg,#14a586,#043229)' },
  { value: 'blue', label: 'Blue', swatch: 'linear-gradient(135deg,#3b7bff,#122f86)' },
  { value: 'purple', label: 'Purple', swatch: 'linear-gradient(135deg,#9b6bff,#3d1f8a)' },
];
const EMPTY_FORM = { label: '', cardNumber: '', cvv: '', expMonth: '', expYear: '', holderName: '', color: 'ink' };

function CreateCardSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState(EMPTY_FORM);
  useEffect(() => { if (open) setForm(EMPTY_FORM); }, [open]);

  const create = useMutation({
    mutationFn: () =>
      api.post('/cards', {
        ...form,
        cardNumber: form.cardNumber.replace(/\D/g, ''),
        expMonth: parseInt(form.expMonth),
        expYear: parseInt(form.expYear),
      }),
    onSuccess: onCreated,
  });

  const set = (field: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const digits = form.cardNumber.replace(/\D/g, '');
  const previewNumber = (digits + '•'.repeat(Math.max(0, 16 - digits.length))).slice(0, 16).replace(/(.{4})(?=.)/g, '$1 ');
  const input = 'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-night';

  return (
    <Sheet open={open} onClose={onClose} title="New virtual card" subtitle="Enter the card details. They're stored encrypted.">
      <div className="mx-auto w-full max-w-[340px]">
        <KestrelCard
          skin={{ brand: 0, ink: 2, blue: 3, purple: 4 }[form.color] ?? 2}
          number={previewNumber}
          holder={(form.holderName || 'Your name').toUpperCase()}
          expiry={`${(form.expMonth || 'MM').padStart(2, '0')}/${form.expYear ? form.expYear.slice(-2) : 'YY'}`}
          label={form.label || 'Virtual debit'}
        />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">Card label
          <input value={form.label} onChange={set('label')} placeholder="e.g. Shopping card" className={`${input} mt-1`} />
        </label>
        <label className="text-sm font-medium">Name on card
          <input value={form.holderName} onChange={set('holderName')} placeholder="Name on card" className={`${input} mt-1`} />
        </label>
        <label className="text-sm font-medium sm:col-span-2">Card number
          <input value={form.cardNumber} onChange={set('cardNumber')} inputMode="numeric" placeholder="4242 4242 4242 4242" maxLength={19} className={`${input} mt-1 tabular-nums tracking-wider`} />
        </label>
        <div className="grid grid-cols-3 gap-3 sm:col-span-2">
          <label className="text-sm font-medium">Month
            <input type="number" min={1} max={12} value={form.expMonth} onChange={set('expMonth')} placeholder="MM" className={`${input} mt-1`} />
          </label>
          <label className="text-sm font-medium">Year
            <input type="number" min={2025} value={form.expYear} onChange={set('expYear')} placeholder="YYYY" className={`${input} mt-1`} />
          </label>
          <label className="text-sm font-medium">CVV
            <input value={form.cvv} onChange={set('cvv')} inputMode="numeric" placeholder="123" maxLength={4} className={`${input} mt-1`} />
          </label>
        </div>
      </div>

      <p className="mt-4 text-sm font-medium">Card colour</p>
      <div className="mt-2 flex gap-3">
        {COLORS.map(c => (
          <button
            key={c.value}
            onClick={() => setForm(f => ({ ...f, color: c.value }))}
            aria-label={c.label}
            className={`h-10 w-10 rounded-full ring-offset-2 transition-all ${form.color === c.value ? 'scale-110 ring-2 ring-night' : 'hover:scale-105'}`}
            style={{ background: c.swatch }}
          />
        ))}
      </div>

      {create.isError && <p className="mt-4 text-sm text-bad">{(create.error as Error).message}</p>}
      <button
        onClick={() => create.mutate()}
        disabled={create.isPending}
        className="mt-6 w-full rounded-full bg-night py-4 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-60"
      >
        {create.isPending ? 'Adding card…' : 'Add card'}
      </button>
    </Sheet>
  );
}
