import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Eye, Loader2, Wallet } from 'lucide-react';
import {
  EMPLOYMENT_STATUSES, TAX_DOCUMENTS, formatMoney, formatTaxId, taxCountry, taxYearLabel, type Currency,
} from '@kestrel/shared';
import { api } from '../../lib/api';
import { Fold } from '../Fold';

type AdminClaim = {
  id: string;
  country: string | null;
  legalName: string | null;
  dateOfBirth: string | null;
  address: { line1: string; line2: string | null; city: string; postcode: string } | null;
  taxIdNumber: string;
  employmentStatus: string | null;
  taxYear: number;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PAID';
  reviewNote: string | null;
  documents: { type: string; name: string; size: number }[] | null;
  refundMinor: number | null;
  currency: Currency;
  createdAt: string;
  paidAt: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    wallets: { id: string; currency: Currency; accountNumber: string; balanceMinor: number }[];
  };
};

const FILTERS = [
  { key: 'OPEN', label: 'Needs action' },
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'UNDER_REVIEW', label: 'Under review' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'PAID', label: 'Paid' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'ALL', label: 'All' },
] as const;

const BADGE: Record<AdminClaim['status'], string> = {
  SUBMITTED: 'bg-blue-50 text-blue-700',
  UNDER_REVIEW: 'bg-amber-50 text-warn',
  APPROVED: 'bg-brand-soft text-brand',
  PAID: 'bg-emerald-600 text-white',
  REJECTED: 'bg-red-50 text-bad',
};

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export function TaxRefundsAdmin() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('OPEN');
  const { data: claims, isLoading } = useQuery({
    queryKey: ['admin-tax'],
    queryFn: () => api.get<AdminClaim[]>('/admin/tax-recoveries'),
    refetchInterval: 15_000,
  });

  const shown = (claims ?? []).filter(c =>
    filter === 'ALL' ? true : filter === 'OPEN' ? ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'].includes(c.status) : c.status === filter,
  );
  const count = (k: string) =>
    (claims ?? []).filter(c => (k === 'ALL' ? true : k === 'OPEN' ? ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'].includes(c.status) : c.status === k)).length;

  return (
    <div>
      <div className="mb-4 chip-row flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${filter === f.key ? 'bg-night text-white' : 'bg-white text-night hover:bg-black/5'}`}
          >
            {f.label} <span className="opacity-60">{count(f.key)}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="skeleton h-32" />
      ) : !shown.length ? (
        <div className="rounded-2xl bg-white p-10 text-center text-sm text-muted">No claims here</div>
      ) : (
        <div className="space-y-3">
          {shown.map(c => <ClaimRow key={c.id} claim={c} />)}
        </div>
      )}
    </div>
  );
}

function ClaimRow({ claim }: { claim: AdminClaim }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(claim.status !== 'PAID' && claim.status !== 'REJECTED');
  const [note, setNote] = useState('');
  const [walletId, setWalletId] = useState(
    () => claim.user.wallets.find(w => w.currency === (claim.country === 'GB' ? 'GBP' : 'USD'))?.id ?? claim.user.wallets[0]?.id ?? '',
  );
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<null | 'approve' | 'reject'>(null);
  const missing = TAX_DOCUMENTS.filter(t => !claim.documents?.some(d => d.type === t.type)).map(t => t.label);

  const country = claim.country ? taxCountry(claim.country) : undefined;
  const year = claim.country ? taxYearLabel(claim.country, claim.taxYear) : String(claim.taxYear);
  const wallet = claim.user.wallets.find(w => w.id === walletId);
  const done = () => {
    setNote('');
    setMode(null);
    qc.invalidateQueries({ queryKey: ['admin-tax'] });
    qc.invalidateQueries({ queryKey: ['admin-overview'] });
  };

  const review = useMutation({
    mutationFn: (status: 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED') =>
      api.patch(`/admin/tax-recoveries/${claim.id}/status`, { status, reviewNote: note.trim() || undefined }),
    onSuccess: done,
  });
  const pay = useMutation({
    mutationFn: () =>
      api.post(`/admin/tax-recoveries/${claim.id}/pay`, { walletId, amountMinor: Math.round(parseFloat(amount) * 100) }),
    onSuccess: done,
  });
  const amountOk = parseFloat(amount) > 0;
  const error = (review.error ?? pay.error) as Error | null;
  const busy = review.isPending || pay.isPending;

  return (
    <article className="overflow-hidden rounded-2xl bg-white">
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center gap-4 p-4 text-left">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-paper font-display text-xs font-bold">
          {claim.country ?? '—'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{claim.legalName ?? claim.user.name}</span>
          <span className="block truncate text-xs text-muted">
            Tax year {year} · {claim.user.email} · filed {fmtDate(claim.createdAt)}
          </span>
        </span>
        {claim.status === 'PAID' && claim.refundMinor != null && (
          <span className="hidden font-display font-semibold tabular-nums sm:block">{formatMoney(claim.refundMinor, claim.currency)}</span>
        )}
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${BADGE[claim.status]}`}>
          {claim.status.replace('_', ' ')}
        </span>
        <ChevronDown size={18} className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-line p-4 sm:p-5" style={{ animation: 'rise-in .3s cubic-bezier(.2,.8,.2,1) both' }}>
          {/* What to do now */}
          <div className="rounded-2xl p-4 ring-2 ring-brand/30">
            <p className="font-display text-base font-semibold">What to do now</p>
            <ol className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
              {['Review', 'Decision', 'Pay refund'].map((s, i) => {
                const at = claim.status === 'PAID' ? 3 : claim.status === 'APPROVED' ? 2 : claim.status === 'REJECTED' ? 1 : claim.status === 'UNDER_REVIEW' ? 1 : 0;
                return <li key={s} className={`rounded-full px-2.5 py-1 ${i < at ? 'bg-night text-white' : i === at ? 'bg-brand text-white' : 'bg-paper text-muted'}`}>{i + 1}. {s}</li>;
              })}
            </ol>

            {(claim.status === 'SUBMITTED' || claim.status === 'UNDER_REVIEW') && (
              <>
                <p className="mt-3 text-sm">
                  {missing.length ? <>Check the documents below. <b className="text-warn">{missing.length} missing</b>: {missing.join(', ')}.</> : 'All documents are in. Check them below, then decide.'}
                </p>
                {mode === null ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {claim.status === 'SUBMITTED' && (
                      <button disabled={busy} onClick={() => review.mutate('UNDER_REVIEW')} className="rounded-full bg-night px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Start review</button>
                    )}
                    <button disabled={busy} onClick={() => setMode('approve')} className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Approve</button>
                    <button disabled={busy} onClick={() => setMode('reject')} className="rounded-full bg-bad px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Reject</button>
                  </div>
                ) : (
                  <div className="mt-3 rounded-2xl bg-paper p-3">
                    <p className="text-sm font-semibold">{mode === 'approve' ? 'Approve this claim' : 'Reject this claim'}</p>
                    <p className="mb-2 text-xs text-muted">{mode === 'approve' ? 'Next you’ll pay the refund into their wallet.' : 'Say why. The customer sees this on their dashboard.'}</p>
                    <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} maxLength={500}
                      placeholder={mode === 'approve' ? 'Note to the customer (optional)' : 'e.g. The P60 does not match the tax year claimed.'}
                      className="w-full resize-none rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-night" />
                    <div className="mt-2 flex items-center gap-2">
                      <button disabled={busy || (mode === 'reject' && !note.trim())} onClick={() => review.mutate(mode === 'approve' ? 'APPROVED' : 'REJECTED')}
                        className={`rounded-full px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40 ${mode === 'approve' ? 'bg-brand' : 'bg-bad'}`}>
                        {mode === 'approve' ? 'Confirm approval' : 'Confirm rejection'}
                      </button>
                      <button onClick={() => { setMode(null); setNote(''); }} className="px-3 text-sm font-semibold text-muted">Cancel</button>
                    </div>
                  </div>
                )}
              </>
            )}

            {claim.status === 'APPROVED' && (
              <div className="mt-3 rounded-2xl bg-night p-4 text-white">
                <p className="flex items-center gap-2 text-sm font-semibold"><Wallet size={16} /> Approved. Now pay the refund</p>
                {claim.user.wallets.length ? (
                  <>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <select value={walletId} onChange={e => setWalletId(e.target.value)} className="rounded-xl bg-white/10 px-3 py-2.5 text-sm outline-none [&>option]:text-night">
                        {claim.user.wallets.map(w => <option key={w.id} value={w.id}>{w.currency} wallet · {w.accountNumber}</option>)}
                      </select>
                      <input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder={`Refund amount (${wallet?.currency ?? ''})`}
                        className="rounded-xl bg-white/10 px-3 py-2.5 text-sm outline-none placeholder:text-white/40" />
                    </div>
                    <button disabled={busy || !amountOk || !walletId} onClick={() => pay.mutate()}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-brand-bright py-3 text-sm font-semibold text-night disabled:opacity-40">
                      {pay.isPending && <Loader2 size={15} className="animate-spin" />}
                      {amountOk && wallet ? `Pay ${formatMoney(Math.round(parseFloat(amount) * 100), wallet.currency)} and mark as paid` : 'Enter the refund amount'}
                    </button>
                  </>
                ) : <p className="mt-2 text-sm text-white/60">This customer has no wallet to pay into.</p>}
              </div>
            )}

            {claim.status === 'PAID' && (
              <p className="mt-3 rounded-2xl bg-brand-soft px-4 py-3 text-sm text-brand">
                Done. Paid {claim.refundMinor != null ? formatMoney(claim.refundMinor, claim.currency) : ''} on {fmtDate(claim.paidAt)}.
              </p>
            )}
            {claim.status === 'REJECTED' && <p className="mt-3 text-sm text-muted">This claim was rejected. Nothing more to do.</p>}
            {claim.reviewNote && <p className="mt-3 text-xs text-muted"><span className="font-semibold text-night">Last note to the customer:</span> {claim.reviewNote}</p>}
            {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-bad">{error.message}</p>}
          </div>

          {/* Documents */}
          <div>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Documents ({claim.documents?.length ?? 0} of {TAX_DOCUMENTS.length})</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {TAX_DOCUMENTS.map(t => {
                const d = claim.documents?.find(x => x.type === t.type);
                return d ? (
                  <a key={t.type} href={`/api/admin/tax-recoveries/${claim.id}/documents/${t.type}`} target="_blank" rel="noreferrer"
                    className="group flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm hover:border-night">
                    <Eye size={14} className="shrink-0 text-muted group-hover:text-night" />
                    <span className="min-w-0"><span className="block truncate font-medium">{t.label}</span><span className="block truncate text-[11px] text-muted">{d.name}</span></span>
                  </a>
                ) : (
                  <span key={t.type} className="rounded-xl border border-dashed border-line px-3 py-2 text-sm text-muted">{t.label} · missing</span>
                );
              })}
            </div>
          </div>

          {/* Details, folded */}
          <div className="rounded-2xl bg-paper px-4">
            <Fold inner title="Claim details" summary={`${claim.legalName ?? claim.user.name} · ${country?.name ?? ''} · tax year ${year}`}>
              <dl className="divide-y divide-line text-sm">
                <Row k="Full legal name" v={claim.legalName ?? '—'} />
                <Row k="Date of birth" v={fmtDate(claim.dateOfBirth)} />
                <Row k="Address" v={claim.address ? [claim.address.line1, claim.address.line2, claim.address.city, claim.address.postcode].filter(Boolean).join(', ') : '—'} />
                <Row k="Country" v={country?.name ?? '—'} />
                <Row k={country?.idName ?? 'Tax ID'} v={claim.country ? formatTaxId(claim.country, claim.taxIdNumber) : claim.taxIdNumber} mono />
                <Row k="Employment" v={EMPLOYMENT_STATUSES.find(s => s.value === claim.employmentStatus)?.label ?? '—'} />
                <Row k="Tax year" v={year} />
                <Row k="Account holder" v={claim.user.name} />
              </dl>
            </Fold>
          </div>
        </div>
      )}
    </article>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="shrink-0 text-muted">{k}</dt>
      <dd className={`min-w-0 text-right font-medium ${mono ? 'tracking-wider' : ''}`}>{v}</dd>
    </div>
  );
}
