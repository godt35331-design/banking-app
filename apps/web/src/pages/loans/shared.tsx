import { Briefcase, Car, GraduationCap, Home, Timer, User } from 'lucide-react';
import {
  formatAnyMoney, loanAgreementText, loanProduct, loanStatus, splitPhone, termLabel,
  type LoanField, type LoanOffer,
} from '@kestrel/shared';
import { Sheet } from '../../components/Sheet';

export { DropZone, Thread, Panel, fmtDate, fmtDateTime, fmtSize } from '../recovery/shared';
export type { CaseMessage, CaseEvent, DocRequest } from '../recovery/shared';

/* Shared pieces for the Loan Application Portal (customer) and the loan officer screens. */

export const PRODUCT_ICON: Record<string, typeof User> = {
  PERSONAL: User,
  BUSINESS: Briefcase,
  EDUCATION: GraduationCap,
  VEHICLE: Car,
  HOME: Home,
  SHORT_TERM: Timer,
};

export type Group = Record<string, string>;

export type LoanSummary = {
  id: string;
  reference: string | null;
  product: string;
  status: string;
  amountMinor: number | null;
  currency: string | null;
  termMonths: number | null;
  latestUpdate: string | null;
  offer: LoanOffer | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  openRequests?: number;
  unreadMessages?: number;
};

export type LoanDoc = {
  id: string; kind: string; requestId: string | null; name: string; mime: string; size: number;
  review: 'PENDING' | 'VERIFIED' | 'REJECTED'; reviewNote: string | null; uploadedBy: string; createdAt: string;
};

export type Repayment = {
  id: string; number: number; dueDate: string; amountMinor: number; currency: string;
  paidAt: string | null; method: string | null; reference: string | null;
};

/** Progress of a loan's repayment schedule. */
export function repaymentSummary(reps: Repayment[]) {
  const now = Date.now();
  const unpaid = reps.filter(r => !r.paidAt);
  const overdue = unpaid.filter(r => new Date(r.dueDate).getTime() < now);
  return {
    count: reps.length,
    paidCount: reps.length - unpaid.length,
    paidMinor: reps.filter(r => r.paidAt).reduce((s, r) => s + r.amountMinor, 0),
    remainingMinor: unpaid.reduce((s, r) => s + r.amountMinor, 0),
    next: unpaid[0] ?? null,
    overdue,
    currency: reps[0]?.currency ?? 'USD',
    done: reps.length > 0 && unpaid.length === 0,
  };
}

export function RepaymentList({ reps, onRecord, busyId }: { reps: Repayment[]; onRecord?: (r: Repayment) => void; busyId?: string }) {
  const now = Date.now();
  return (
    <ul className="divide-y divide-line text-sm">
      {reps.map(r => {
        const late = !r.paidAt && new Date(r.dueDate).getTime() < now;
        return (
          <li key={r.id} className="flex items-center gap-3 py-2.5">
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold ${r.paidAt ? 'bg-brand-soft text-brand' : late ? 'bg-red-50 text-bad' : 'bg-paper text-muted'}`}>{r.number}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium tabular-nums">{anyMoney(r.amountMinor, r.currency)}</span>
              <span className={`block text-xs ${late ? 'text-bad' : 'text-muted'}`}>
                {r.paidAt ? `Paid ${new Date(r.paidAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}${r.method === 'RECORDED' ? ' · at branch / transfer' : ''}`
                  : `${late ? 'Overdue · was due' : 'Due'} ${new Date(r.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
              </span>
            </span>
            {r.paidAt ? <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-semibold text-brand">Paid</span>
              : onRecord ? (
                <button onClick={() => onRecord(r)} disabled={busyId === r.id} className="rounded-full bg-night px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50">Record payment</button>
              ) : late ? <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-bad">Overdue</span> : null}
          </li>
        );
      })}
    </ul>
  );
}

export type ProductInfo ={ key: string; available: boolean; amountInfo: string | null; rateInfo: string | null; termInfo: string | null };
export type WalletLite = { id: string; currency: string; accountNumber: string };

export const productName = (key: string) => loanProduct(key)?.name ?? key;
export const amountText = (minor: number | null | undefined, currency: string | null | undefined) =>
  minor && currency ? formatAnyMoney(minor, currency) : '—';
export const anyMoney = (minor: number, cur: string) => formatAnyMoney(minor, cur);

const STATUS_TONE: Record<string, string> = {
  DRAFT: 'bg-paper text-muted',
  SUBMITTED: 'bg-blue-50 text-blue-700',
  UNDER_REVIEW: 'bg-amber-50 text-warn',
  DOCUMENTS_REQUIRED: 'bg-orange-100 text-orange-700',
  VERIFICATION: 'bg-indigo-50 text-indigo-700',
  ASSESSMENT: 'bg-indigo-50 text-indigo-700',
  APPROVED: 'bg-brand-soft text-brand',
  CONDITIONALLY_APPROVED: 'bg-teal-50 text-teal-700',
  REJECTED: 'bg-red-50 text-bad',
  OFFER_ISSUED: 'bg-orange-100 text-orange-700',
  AWAITING_SIGNATURE: 'bg-orange-100 text-orange-700',
  AGREEMENT_COMPLETED: 'bg-sky-50 text-sky-700',
  DISBURSEMENT_PROCESSING: 'bg-sky-50 text-sky-700',
  DISBURSED: 'bg-emerald-600 text-white',
  CLOSED: 'bg-night text-white',
};

export function LoanStatusBadge({ status, className = '' }: { status: string; className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_TONE[status] ?? 'bg-paper'} ${className}`}>
      {loanStatus(status)?.label ?? status}
    </span>
  );
}

const STAGES = ['Submitted', 'Review', 'Assessment', 'Decision', 'Offer', 'Disbursed'];
const STAGE_OF: Record<string, number> = {
  DRAFT: -1, SUBMITTED: 0, UNDER_REVIEW: 1, DOCUMENTS_REQUIRED: 1, VERIFICATION: 2, ASSESSMENT: 2,
  APPROVED: 3, CONDITIONALLY_APPROVED: 3, REJECTED: 3, OFFER_ISSUED: 4, AWAITING_SIGNATURE: 4, AGREEMENT_COMPLETED: 4,
  DISBURSEMENT_PROCESSING: 5, DISBURSED: 6, CLOSED: 6,
};

export function LoanStageBar({ status, dark = false }: { status: string; dark?: boolean }) {
  const at = STAGE_OF[status] ?? 0;
  const bad = status === 'REJECTED';
  const done = dark ? 'bg-brand-bright' : 'bg-night';
  const current = dark ? 'bg-brand-bright/50' : 'bg-night/50';
  const todo = dark ? 'bg-white/15' : 'bg-black/10';
  return (
    <ol className="grid grid-cols-6 gap-1.5">
      {STAGES.map((s, i) => (
        <li key={s} className="min-w-0">
          <div className={`h-1.5 rounded-full transition-colors duration-500 ${bad && i === at ? 'bg-bad' : i < at ? done : i === at ? current : todo}`} />
          <p className={`mt-1.5 truncate text-[11px] font-medium ${i <= at ? (dark ? 'text-white/80' : 'text-night') : dark ? 'text-white/40' : 'text-muted'}`}>
            {bad && i === at ? 'Declined' : s}
          </p>
        </li>
      ))}
    </ol>
  );
}

/* ---------- Form fields ---------- */

export const inputCls = 'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-night';

const optionLabel = (f: LoanField, o: string) => (f.key === 'termMonths' ? termLabel(Number(o)) : o);

/** Renders one field from the shared definitions. */
export function FieldInput({
  f, value, onChange, error, wallets = [], currency, dial,
}: {
  f: LoanField; value: string; onChange: (v: string) => void; error?: string; wallets?: WalletLite[]; currency?: string;
  /** Phone fields: dialling code of the chosen country ('' = country not chosen / no code). */
  dial?: string;
}) {
  if (f.type === 'tel' && f.dialCodeFrom) {
    const { rest } = splitPhone(value);
    return (
      <div className={f.half ? '' : 'sm:col-span-2'}>
        <label className="mb-1.5 block text-sm font-medium">{f.label}</label>
        <div className="flex overflow-hidden rounded-xl border border-line bg-white transition-colors focus-within:border-night">
          <span key={dial} className={`check-text flex shrink-0 items-center border-r border-line px-3.5 text-sm font-semibold tabular-nums ${dial ? 'bg-brand-soft text-brand' : 'bg-paper text-muted'}`}>
            {dial || '+ ···'}
          </span>
          <input
            type="tel"
            inputMode="tel"
            value={rest}
            onChange={e => {
              const local = e.target.value.replace(/[^\d\s-]/g, '');
              onChange(dial ? (local.trim() ? `${dial} ${local}` : '') : local);
            }}
            maxLength={20}
            placeholder={dial ? 'Local number' : f.placeholder}
            className="min-w-0 flex-1 px-3.5 py-2.5 text-sm outline-none tabular-nums"
          />
        </div>
        {error ? <p className="mt-1.5 text-xs text-bad">{error}</p>
          : <p className="mt-1.5 text-xs text-muted">{dial ? 'The code follows your country of residence.' : 'Choose your country of residence to set the dialling code.'}</p>}
      </div>
    );
  }
  return (
    <div className={f.half ? '' : 'sm:col-span-2'}>
      <label className="mb-1.5 block text-sm font-medium">
        {f.label}{!f.required && <span className="font-normal text-muted"> (optional)</span>}
      </label>
      {f.type === 'chips' ? (
        <div className="flex flex-wrap gap-2">
          {f.options!.map(o => (
            <button key={o} type="button" onClick={() => onChange(o)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${value === o ? 'bg-night text-white' : 'bg-paper hover:bg-black/10'}`}>
              {o}
            </button>
          ))}
        </div>
      ) : f.type === 'select' ? (
        <select value={value} onChange={e => onChange(e.target.value)} className={inputCls}>
          <option value="">Choose…</option>
          {f.options!.map(o => <option key={o} value={o}>{optionLabel(f, o)}</option>)}
        </select>
      ) : f.type === 'wallet' ? (
        wallets.length ? (
          <div className="grid gap-2 sm:grid-cols-3">
            {wallets.map(w => (
              <button key={w.id} type="button" onClick={() => onChange(w.id)}
                className={`rounded-2xl px-4 py-3 text-left text-sm transition-colors ${value === w.id ? 'bg-night text-white' : 'bg-paper hover:bg-black/10'}`}>
                <span className="block font-semibold">{w.currency} wallet</span>
                <span className={`block text-xs ${value === w.id ? 'text-white/60' : 'text-muted'}`}>{w.accountNumber}</span>
              </button>
            ))}
          </div>
        ) : <p className="text-sm text-muted">You don't have a wallet yet. Choose “Another bank account”.</p>
      ) : f.type === 'textarea' ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} maxLength={3000} placeholder={f.placeholder} className={`${inputCls} resize-y`} />
      ) : f.type === 'money' ? (
        <div className="relative">
          <input inputMode="decimal" value={value} onChange={e => onChange(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="0.00"
            className={`${inputCls} tabular-nums ${currency ? 'pr-14' : ''}`} />
          {currency && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">{currency}</span>}
        </div>
      ) : (
        <input
          type={f.type === 'date' ? 'date' : f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : 'text'}
          value={value}
          onChange={e => onChange(e.target.value)}
          maxLength={200}
          placeholder={f.placeholder}
          max={f.adult ? new Date().toISOString().slice(0, 10) : undefined}
          className={`${inputCls} ${f.type === 'date' ? 'max-w-xs' : ''}`}
        />
      )}
      {error ? <p className="mt-1.5 text-xs text-bad">{error}</p> : f.hint ? <p className="mt-1.5 text-xs text-muted">{f.hint}</p> : null}
    </div>
  );
}

/** Read-only display value for a field. */
export function displayValue(f: LoanField, v: string | undefined, wallets: WalletLite[] = [], currency?: string) {
  if (!v) return '—';
  if (f.key === 'termMonths') return termLabel(Number(v));
  if (f.type === 'money' && currency) {
    const n = parseFloat(v.replace(/,/g, ''));
    return Number.isFinite(n) ? formatAnyMoney(Math.round(n * 100), currency) : v;
  }
  if (f.type === 'date') return new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  if (f.type === 'wallet') {
    const w = wallets.find(x => x.id === v);
    return w ? `${w.currency} wallet · ${w.accountNumber}` : 'Sterling Crest Bank wallet';
  }
  return v;
}

/** Definition list of a group's answered fields. */
export function GroupList({ fields, values, wallets, currency }: { fields: LoanField[]; values: Group; wallets?: WalletLite[]; currency?: string }) {
  const shown = fields.filter(f => values[f.key]);
  if (!shown.length) return <p className="text-sm text-muted">Nothing entered.</p>;
  return (
    <dl className="divide-y divide-line text-sm">
      {shown.map(f => (
        <div key={f.key} className="flex justify-between gap-4 py-2.5">
          <dt className="shrink-0 text-muted">{f.label}</dt>
          <dd className="min-w-0 whitespace-pre-wrap break-words text-right font-medium">{displayValue(f, values[f.key], wallets, currency)}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------- Offer & agreement ---------- */

export function OfferFigures({ o, dark = false }: { o: LoanOffer; dark?: boolean }) {
  const box = dark ? 'bg-white/10' : 'bg-paper';
  const sub = dark ? 'text-white/55' : 'text-muted';
  return (
    <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {[
        ['Loan amount', anyMoney(o.amountMinor, o.currency)],
        ['Interest rate', `${o.ratePct}% APR`],
        ['Term', `${o.termMonths} months`],
        ['Monthly repayment', anyMoney(o.monthlyMinor, o.currency)],
      ].map(([k, v]) => (
        <div key={k} className={`rounded-2xl px-3.5 py-3 ${box}`}>
          <dt className={`text-xs ${sub}`}>{k}</dt>
          <dd className="mt-0.5 font-display text-lg font-semibold tabular-nums">{v}</dd>
        </div>
      ))}
      <div className={`col-span-2 rounded-2xl px-3.5 py-3 sm:col-span-4 ${box}`}>
        <dt className={`text-xs ${sub}`}>Total amount repayable</dt>
        <dd className="mt-0.5 font-display text-lg font-semibold tabular-nums">{anyMoney(o.totalMinor, o.currency)}</dd>
      </div>
    </dl>
  );
}

export function AgreementText({ o, borrower, product }: { o: LoanOffer; borrower: string; product: string }) {
  return (
    <div className="max-h-80 space-y-2.5 overflow-y-auto rounded-2xl border border-line bg-paper/50 p-4 text-sm leading-relaxed">
      <p className="font-display text-base font-semibold">Loan agreement</p>
      {loanAgreementText(o, borrower, productName(product), anyMoney).map(p => <p key={p.slice(0, 24)}>{p}</p>)}
    </div>
  );
}

/* ---------- Legal texts (the bank's legal team must review before real use) ---------- */

export const LOAN_TERMS: { h: string; p: string }[] = [
  { h: 'Who the lender is', p: 'Sterling Crest Bank is the lender for loans applied for through this portal. Where a loan is arranged with a partner lender, the partner is named in your offer and agreement, and that lender makes the credit decision.' },
  { h: 'No guaranteed approval', p: 'Submitting an application does not mean a loan will be approved. Every application is assessed individually for eligibility, affordability and creditworthiness.' },
  { h: 'Checks we carry out', p: 'With your permission, we verify your identity, address, income and bank account, and may carry out a credit check. These checks help the lender make a responsible decision.' },
  { h: 'Your information', p: 'You confirm that the information and documents you provide are true and complete. Giving false information may lead to your application being declined and may be reported.' },
  { h: 'Offers and agreements', p: 'If approved, you receive a formal offer with the actual amount, interest rate, term, repayments and fees. Nothing is binding until you accept the offer and sign the loan agreement.' },
  { h: 'What we will never ask for', p: 'We will never ask for your online banking password, card PIN or one-time passcodes, and we never charge a fee to release an approved loan.' },
  { h: 'Fees', p: 'There is no charge to apply. Any fee that applies to your loan is set out in your offer before you accept it.' },
];

export const LOAN_PRIVACY: { h: string; p: string }[] = [
  { h: 'What we collect', p: 'The details in your application, the documents you upload, results of verification and credit checks, and messages with your loan officer.' },
  { h: 'Why we use it', p: 'To assess your application, verify your identity, decide whether to lend, manage your loan, meet our legal obligations and prevent fraud.' },
  { h: 'Who sees it', p: 'Authorised staff handling your application. Where needed, identity and credit reference agencies, and the lending partner named in your offer.' },
  { h: 'How it is protected', p: 'Documents are stored securely and are only visible to you and authorised staff.' },
  { h: 'Your rights', p: 'You can ask what we hold about you, ask us to correct it, or ask us to delete it once any legal retention period has ended. Contact support to make a request.' },
];

export const LOAN_DISCLAIMER =
  'Loans are subject to status, eligibility and affordability checks. Approval is not guaranteed. Amounts, interest rates and repayment periods are confirmed in your personalised offer. We will never ask for your passwords, PINs or one-time codes, or charge a fee to release a loan.';

export function LoanLegalSheet({ open, onClose, kind }: { open: boolean; onClose: () => void; kind: 'terms' | 'privacy' | 'disclaimer' }) {
  const items = kind === 'terms' ? LOAN_TERMS : kind === 'privacy' ? LOAN_PRIVACY : [{ h: 'Important information', p: LOAN_DISCLAIMER }];
  const title = kind === 'terms' ? 'Loan application terms' : kind === 'privacy' ? 'Privacy policy' : 'Important information';
  return (
    <Sheet open={open} onClose={onClose} title={title} subtitle="Loan Application Portal">
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
