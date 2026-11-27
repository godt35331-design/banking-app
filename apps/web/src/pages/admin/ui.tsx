import { useEffect, useState, type ReactNode } from 'react';
import { Loader2, Search } from 'lucide-react';
import { formatMoney, type Currency } from '@kestrel/shared';
import { Sheet } from '../../components/Sheet';

/* Shared pieces for the admin area. */

export const money = (minor: number, currency: string = 'USD') => formatMoney(minor, currency as Currency);
export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
export const fmtDateTime = (d?: string | null) =>
  d
    ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—';
export const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ');

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.03em]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const TONES: Record<string, string> = {
  green: 'bg-brand-soft text-brand',
  amber: 'bg-amber-50 text-warn',
  red: 'bg-red-50 text-bad',
  blue: 'bg-blue-50 text-blue-700',
  grey: 'bg-paper text-muted',
  dark: 'bg-night text-white',
  sky: 'bg-sky-50 text-sky-700',
};

/** Picks a colour for any status word used in the app. */
export function toneFor(status: string) {
  if (['ACTIVE', 'COMPLETED', 'APPROVED', 'PAID', 'REFUNDED', 'REPAID', 'IN'].includes(status)) return 'green';
  if (['PENDING', 'AWAITING_APPROVAL', 'UNDER_REVIEW', 'INVESTIGATING', 'APPLIED', 'SUBMITTED'].includes(status)) return 'amber';
  if (['REJECTED', 'DECLINED', 'FAILED', 'LOCKED', 'REMOVED', 'OUT'].includes(status)) return 'red';
  if (['FROZEN'].includes(status)) return 'sky';
  return 'grey';
}

export function Badge({ children, tone, status }: { children?: ReactNode; tone?: keyof typeof TONES; status?: string }) {
  const t = tone ?? (status ? toneFor(status) : 'grey');
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${TONES[t]}`}>
      {children ?? (status ? titleCase(status) : '')}
    </span>
  );
}

export function Avatar({ name, size = 'h-9 w-9 text-xs' }: { name: string; size?: string }) {
  const initials = (name || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  return <span className={`grid shrink-0 place-items-center rounded-full bg-night font-display font-semibold text-white ${size}`}>{initials}</span>;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[22px] bg-white ${className}`}>{children}</div>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-[22px] bg-white p-10 text-center text-sm text-muted">{children}</div>;
}

export function Loading({ h = 'h-40' }: { h?: string }) {
  return <div className={`skeleton ${h}`} />;
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  // Debounce typing so we don't query on every keystroke.
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  useEffect(() => {
    const t = setTimeout(() => v !== value && onChange(v), 300);
    return () => clearTimeout(t);
  }, [v]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <label className="relative block w-full max-w-sm">
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
      <input
        value={v}
        onChange={e => setV(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border border-line bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-night"
      />
    </label>
  );
}

export function Chips<T extends string>({
  options, value, onChange,
}: { options: { key: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="chip-row flex flex-wrap gap-2">
      {options.map(o => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            value === o.key ? 'bg-night text-white' : 'bg-white text-night hover:bg-black/5'
          }`}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1 opacity-60">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-2 text-sm">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-full bg-white px-4 py-2 font-medium disabled:opacity-40">Previous</button>
      <span className="px-2 text-muted">Page {page} of {pages}</span>
      <button disabled={page >= pages} onClick={() => onPage(page + 1)} className="rounded-full bg-white px-4 py-2 font-medium disabled:opacity-40">Next</button>
    </div>
  );
}

export function Btn({
  children, onClick, tone = 'dark', disabled, busy, className = '', type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: 'dark' | 'green' | 'red' | 'light' | 'amber';
  disabled?: boolean;
  busy?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  const tones = {
    dark: 'bg-night text-white',
    green: 'bg-brand text-white',
    red: 'bg-bad text-white',
    amber: 'bg-amber-500 text-white',
    light: 'bg-paper text-night hover:bg-black/10',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all active:scale-[0.97] disabled:opacity-45 ${tones[tone]} ${className}`}
    >
      {busy && <Loader2 size={13} className="animate-spin" />}
      {children}
    </button>
  );
}

export const inputCls = 'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-night';

/**
 * Confirmation sheet for admin actions. Optional reason field (required when `reasonRequired`).
 */
export function ConfirmSheet({
  open, onClose, title, subtitle, confirmLabel, tone = 'dark', reason, reasonRequired, initialReason, busy, error, onConfirm, children,
}: {
  initialReason?: string;
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  confirmLabel: string;
  tone?: 'dark' | 'green' | 'red' | 'amber';
  reason?: string;
  reasonRequired?: boolean;
  busy?: boolean;
  error?: string;
  onConfirm: (reason: string) => void;
  children?: ReactNode;
}) {
  const [text, setText] = useState('');
  useEffect(() => { if (open) setText(initialReason ?? ''); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Sheet open={open} onClose={onClose} title={title} subtitle={subtitle}>
      {children}
      {reason !== undefined && (
        <label className="mt-2 block text-sm font-medium">
          {reason}
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={3}
            maxLength={500}
            className={`${inputCls} mt-1.5 resize-none`}
            placeholder={reasonRequired ? 'Required' : 'Optional'}
          />
        </label>
      )}
      {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-bad">{error}</p>}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button onClick={onClose} className="rounded-full bg-paper py-3.5 text-sm font-semibold">Cancel</button>
        <Btn
          tone={tone}
          busy={busy}
          disabled={reasonRequired && !text.trim()}
          onClick={() => onConfirm(text.trim())}
          className="!py-3.5 !text-sm"
        >
          {confirmLabel}
        </Btn>
      </div>
    </Sheet>
  );
}
