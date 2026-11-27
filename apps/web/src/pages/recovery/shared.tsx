import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Loader2, Paperclip, Send } from 'lucide-react';
import {
  RECOVERY_DOC_MAX_BYTES, RECOVERY_DOC_MIME, formatAnyMoney, recoveryCategory, recoveryStatus,
} from '@kestrel/shared';
import { Sheet } from '../../components/Sheet';

/* Shared pieces for the Funds Recovery Assistance portal (customer) and the case officer screens. */

export type CaseSummary = {
  id: string;
  reference: string | null;
  category: string;
  status: string;
  amountMinor: number | null;
  currency: string | null;
  latestUpdate: string | null;
  institution: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  openRequests?: number;
  unreadMessages?: number;
  _count?: { documents: number };
};

export type DocMeta = { id: string; kind: string; requestId: string | null; name: string; mime: string; size: number; uploadedBy: string; createdAt: string };
export type DocRequest = { id: string; label: string; note: string | null; fulfilledAt: string | null; createdAt: string };
export type CaseMessage = { id: string; sender: 'CUSTOMER' | 'STAFF'; body: string; readAt: string | null; createdAt: string };
export type CaseEvent = { id: string; status: string | null; note: string | null; internal: boolean; createdAt: string; actorName?: string | null };

export const amountText = (minor: number | null, currency: string | null) =>
  minor && currency ? formatAnyMoney(minor, currency) : '—';
export const catName = (key: string) => recoveryCategory(key)?.name ?? key;
export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
export const fmtDateTime = (d?: string | null) =>
  d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
export const fmtSize = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

const STATUS_TONE: Record<string, string> = {
  DRAFT: 'bg-paper text-muted',
  SUBMITTED: 'bg-blue-50 text-blue-700',
  UNDER_REVIEW: 'bg-amber-50 text-warn',
  DOCUMENTS_REQUIRED: 'bg-orange-100 text-orange-700',
  ASSESSMENT_COMPLETE: 'bg-indigo-50 text-indigo-700',
  AWAITING_CUSTOMER_APPROVAL: 'bg-orange-100 text-orange-700',
  RECOVERY_ACTIVE: 'bg-brand-soft text-brand',
  AWAITING_THIRD_PARTY: 'bg-sky-50 text-sky-700',
  RESOLVED: 'bg-emerald-600 text-white',
  UNSUCCESSFUL: 'bg-red-50 text-bad',
  CLOSED: 'bg-night text-white',
};

export function StatusBadge({ status, className = '' }: { status: string; className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_TONE[status] ?? 'bg-paper'} ${className}`}>
      {recoveryStatus(status)?.label ?? status}
    </span>
  );
}

/** Statuses that need something from the customer. */
export const NEEDS_CUSTOMER = ['DOCUMENTS_REQUIRED', 'AWAITING_CUSTOMER_APPROVAL'];

/** Five stages a case moves through, for the progress bar. */
const STAGES = ['Submitted', 'Review', 'Assessment', 'Recovery', 'Outcome'];
const STAGE_OF: Record<string, number> = {
  DRAFT: -1, SUBMITTED: 0, UNDER_REVIEW: 1, DOCUMENTS_REQUIRED: 1, ASSESSMENT_COMPLETE: 2, AWAITING_CUSTOMER_APPROVAL: 2,
  RECOVERY_ACTIVE: 3, AWAITING_THIRD_PARTY: 3, RESOLVED: 4, UNSUCCESSFUL: 4, CLOSED: 4,
};

export function StageBar({ status, dark = false }: { status: string; dark?: boolean }) {
  const at = STAGE_OF[status] ?? 0;
  const bad = status === 'UNSUCCESSFUL';
  const done = dark ? 'bg-brand-bright' : 'bg-night';
  const current = dark ? 'bg-brand-bright/50' : 'bg-night/50';
  const todo = dark ? 'bg-white/15' : 'bg-black/10';
  return (
    <ol className="grid grid-cols-5 gap-1.5">
      {STAGES.map((s, i) => (
        <li key={s} className="min-w-0">
          <div className={`h-1.5 rounded-full transition-colors duration-500 ${i < at || (i === at && i === 4) ? (bad && i === 4 ? 'bg-bad' : done) : i === at ? current : todo}`} />
          <p className={`mt-1.5 truncate text-[11px] font-medium ${i <= at ? (dark ? 'text-white/80' : 'text-night') : dark ? 'text-white/40' : 'text-muted'}`}>{s}</p>
        </li>
      ))}
    </ol>
  );
}

/** File picker + drop zone with type/size checks. Calls onFile with one valid file. */
export function DropZone({
  label, hint, onFile, busy, done, compact = false,
}: { label: string; hint?: string; onFile: (f: File) => void; busy?: boolean; done?: boolean; compact?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState('');
  const accept = (f?: File | null) => {
    if (!f) return;
    if (!RECOVERY_DOC_MIME.includes(f.type)) return setError('Use a PDF, JPG or PNG file');
    if (f.size > RECOVERY_DOC_MAX_BYTES) return setError('The file is larger than 10 MB');
    setError('');
    onFile(f);
  };
  return (
    <div
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); accept(e.dataTransfer.files?.[0]); }}
      className={`flex items-center gap-3 rounded-2xl border-2 border-dashed transition-colors ${compact ? 'p-3' : 'p-4'} ${
        over ? 'border-night bg-paper' : done ? 'border-brand/40 bg-brand-soft/40' : 'border-line'
      }`}
    >
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${done ? 'bg-brand text-white' : 'bg-paper text-muted'}`}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : done ? <Check size={16} /> : <Paperclip size={15} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{label}</p>
        {error ? <p className="text-xs text-bad">{error}</p> : hint ? <p className="truncate text-xs text-muted">{hint}</p> : null}
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => ref.current?.click()}
        className="shrink-0 rounded-full bg-night px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
      >
        {done ? 'Add another' : 'Upload'}
      </button>
      <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => { accept(e.target.files?.[0]); e.target.value = ''; }} />
    </div>
  );
}

/** Message thread between the customer and their case officer. `me` decides which side is "mine". */
export function Thread({
  messages, me, onSend, sending, disabled, disabledText, error, staffLabel = 'Case officer',
}: {
  messages: CaseMessage[];
  staffLabel?: string;
  me: 'CUSTOMER' | 'STAFF';
  /** Should resolve once sent; the box is cleared then. */
  onSend: (body: string) => Promise<unknown>;
  sending?: boolean;
  disabled?: boolean;
  disabledText?: string;
  error?: string;
}) {
  const [text, setText] = useState('');
  const box = useRef<HTMLDivElement>(null);
  // Show the newest message by scrolling only the message box (never the whole page).
  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [messages.length]);
  return (
    <div className="flex flex-col">
      <div ref={box} className="max-h-[420px] min-h-[160px] space-y-2.5 overflow-y-auto rounded-2xl bg-paper/60 p-4">
        {!messages.length && <p className="py-8 text-center text-sm text-muted">No messages yet.</p>}
        {messages.map(m => {
          const mine = m.sender === me;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${mine ? 'rounded-br-md bg-night text-white' : 'rounded-bl-md bg-white'}`}>
                {!mine && <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">{m.sender === 'STAFF' ? staffLabel : 'Customer'}</p>}
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className={`mt-1 text-[10px] ${mine ? 'text-white/50' : 'text-muted'}`}>{fmtDateTime(m.createdAt)}</p>
              </div>
            </div>
          );
        })}
      </div>
      {disabled ? (
        <p className="mt-3 text-center text-sm text-muted">{disabledText}</p>
      ) : (
        <form
          onSubmit={e => {
            e.preventDefault();
            if (text.trim()) onSend(text.trim()).then(() => setText('')).catch(() => undefined);
          }}
          className="mt-3 flex gap-2"
        >
          <input value={text} onChange={e => setText(e.target.value)} maxLength={4000} placeholder="Write a message…"
            className="flex-1 rounded-full border border-line bg-white px-4 py-2.5 text-sm outline-none focus:border-night" />
          <button type="submit" disabled={!text.trim() || sending} aria-label="Send"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-night text-white disabled:opacity-40">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}

/* ---------- Legal texts (the bank's legal team must review before real use) ---------- */

export const TERMS: { h: string; p: string }[] = [
  { h: 'What this service is', p: 'Funds Recovery Assistance helps you understand and pursue legitimate options to recover money that was mistakenly sent, withheld, disputed or obtained through fraud. We review your information, explain the options available and, where appropriate and with your approval, assist with the relevant process.' },
  { h: 'No guaranteed outcome', p: 'Recovery is never guaranteed. Every case is assessed individually, and the outcome depends on the facts, the evidence, and the decisions of third parties such as banks, merchants, platforms and authorities.' },
  { h: 'Your information', p: 'You confirm that the information and documents you provide are true and belong to you or that you are authorised to share them. You may redact unrelated transactions and personal details that are not needed for your case.' },
  { h: 'What we will never ask for', p: 'We will never ask for your online banking password, card PIN, one-time passcodes, cryptocurrency private keys or recovery (seed) phrases. Do not send them to us or to anyone claiming to act for us.' },
  { h: 'Approval before action', p: 'We will not take recovery action on your behalf without explaining it to you first and receiving your approval in your case.' },
  { h: 'Fees', p: 'There is no charge to submit an application or for the initial assessment. If any fee could apply to a later step, it will be explained in writing before you approve that step.' },
  { h: 'Closing a case', p: 'A case may be closed when it reaches an outcome, when no viable recovery route exists, or if we do not hear from you after repeated requests. You will always be told why.' },
];

export const PRIVACY: { h: string; p: string }[] = [
  { h: 'What we collect', p: 'The details you enter in your application, the documents you upload, and messages with your case officer.' },
  { h: 'Why we use it', p: 'Only to assess and assist with your recovery case, to meet our legal obligations, and to prevent fraud.' },
  { h: 'Who sees it', p: 'Authorised staff working on your case. With your approval, relevant details may be shared with the bank, provider or authority involved in recovering your funds.' },
  { h: 'How it is protected', p: 'Your documents are stored securely, are only visible to you and authorised staff, and are never shown publicly.' },
  { h: 'Your rights', p: 'You can ask what we hold about you, ask us to correct it, or ask us to delete it once the case and any legal retention period has ended. Contact support to make a request.' },
];

export const DISCLAIMER =
  'No guaranteed recovery. Every case is assessed individually. We do not charge upfront fees to recover funds and will never ask for passwords, PINs, one-time codes, private keys or seed phrases.';

export function LegalSheet({ open, onClose, kind }: { open: boolean; onClose: () => void; kind: 'terms' | 'privacy' | 'disclaimer' }) {
  const items = kind === 'terms' ? TERMS : kind === 'privacy' ? PRIVACY : [{ h: 'Important', p: DISCLAIMER }];
  const title = kind === 'terms' ? 'Recovery terms and conditions' : kind === 'privacy' ? 'Privacy policy' : 'Disclaimer';
  return (
    <Sheet open={open} onClose={onClose} title={title} subtitle="Funds Recovery Assistance">
      <div className="space-y-4 text-sm leading-relaxed">
        {items.map(i => (
          <div key={i.h}>
            <p className="font-semibold">{i.h}</p>
            <p className="mt-0.5 text-muted">{i.p}</p>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[24px] bg-white p-5 sm:p-6 ${className}`}>{children}</section>;
}
