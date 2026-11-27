import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, BadgeCheck, CircleDot, Eye, FileSignature, FileWarning, Handshake, Loader2, Wallet, XCircle } from 'lucide-react';
import {
  BANKING_FIELDS, EMPLOYMENT_FIELDS, LOAN_FINAL, PERSONAL_FIELDS, loanDocuments, loanProduct, loanStatus, requirementFields,
  type LoanOffer,
} from '@kestrel/shared';
import { api } from '../../lib/api';
import { Fold } from '../../components/Fold';
import {
  AgreementText, DropZone, GroupList, LoanStageBar, LoanStatusBadge, OfferFigures, PRODUCT_ICON, Panel, Thread,
  amountText, anyMoney, fmtDate, fmtDateTime, fmtSize,
  RepaymentList, repaymentSummary,
  type CaseEvent, type CaseMessage, type DocRequest, type Group, type LoanDoc, type Repayment, type WalletLite,
} from './shared';

export type LoanDetailT = {
  id: string;
  reference: string | null;
  product: string;
  status: string;
  amountMinor: number | null;
  currency: string | null;
  termMonths: number | null;
  requirements: Group | null;
  answers: Group | null;
  personal: Group | null;
  employment: Group | null;
  banking: Group | null;
  latestUpdate: string | null;
  lender: string | null;
  decision: string | null;
  decisionNote: string | null;
  conditions: string | null;
  decidedAt: string | null;
  offer: LoanOffer | null;
  offerAcceptedAt: string | null;
  signedName: string | null;
  signedAt: string | null;
  disbursement: { method: 'WALLET' | 'EXTERNAL'; reference?: string; amountMinor: number; currency: string; at: string } | null;
  submittedAt: string | null;
  createdAt: string;
  documents: LoanDoc[];
  requests: DocRequest[];
  messages: CaseMessage[];
  events: CaseEvent[];
  repayments: Repayment[];
};

export function LoanDetail() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const { data: a, isLoading, error } = useQuery({
    queryKey: ['loan-app', id],
    queryFn: () => api.get<LoanDetailT>(`/loans/applications/${id}`),
    refetchInterval: 15_000,
  });
  const { data: wallets } = useQuery({ queryKey: ['wallets'], queryFn: () => api.get<WalletLite[]>('/wallets') });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['loan-app', id] });
    qc.invalidateQueries({ queryKey: ['loan-apps'] });
    qc.invalidateQueries({ queryKey: ['loan-centre'] });
    qc.invalidateQueries({ queryKey: ['wallets'] });
  };

  const unread = a?.messages.filter(m => m.sender === 'STAFF' && !m.readAt).length ?? 0;
  const markRead = useMutation({ mutationFn: () => api.post(`/loans/applications/${id}/messages/read`), onSuccess: refresh });
  useEffect(() => { if (unread) markRead.mutate(); }, [unread]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = useMutation({ mutationFn: (body: string) => api.post(`/loans/applications/${id}/messages`, { body }), onSuccess: refresh });
  const upload = useMutation({
    mutationFn: ({ file, requestId }: { file: File; requestId?: string }) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', requestId ? 'REQUESTED' : 'ADDITIONAL');
      if (requestId) fd.append('requestId', requestId);
      return api.upload(`/loans/applications/${id}/documents`, fd);
    },
    onSuccess: refresh,
  });

  // Opened from "Offers & agreements" → scroll to the offer.
  useEffect(() => {
    if (a?.offer && window.location.hash === '#offer') setTimeout(() => document.getElementById('offer')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
  }, [a?.offer]);

  if (isLoading) return <div className="skeleton h-96" />;
  if (error || !a) return <p className="text-sm text-bad">{(error as Error)?.message ?? 'Application not found'}</p>;
  if (a.status === 'DRAFT') return <Navigate to={`/dashboard/loans/apply/${a.id}`} replace />;

  const p = loanProduct(a.product)!;
  const Icon = PRODUCT_ICON[a.product];
  const final = (LOAN_FINAL as string[]).includes(a.status);
  const openRequests = a.requests.filter(r => !r.fulfilledAt);
  const cur = a.currency ?? undefined;
  const docLabel = (k: string) => loanDocuments(p).find(d => d.key === k)?.label ?? (k === 'REQUESTED' ? 'Requested document' : 'Additional');

  return (
    <div className="space-y-5">
      <Link to="/dashboard/loans/applications" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-night">
        <ArrowLeft size={15} /> My applications
      </Link>

      <section className="rounded-[28px] bg-night p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-brand-bright"><Icon size={22} /></span>
            <div>
              <p className="font-display text-2xl font-semibold tracking-wide">{a.reference}</p>
              <p className="text-sm text-white/60">{p.name} · submitted {fmtDate(a.submittedAt)}</p>
            </div>
          </div>
          <div className="text-right">
            <LoanStatusBadge status={a.status} className="!text-xs" />
            <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{amountText(a.amountMinor, a.currency)}</p>
            <p className="text-xs text-white/50">Requested</p>
          </div>
        </div>
        <div className="mt-6"><LoanStageBar status={a.status} dark /></div>
        <div className="mt-5 rounded-2xl bg-white/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">Latest update</p>
          <p className="mt-1 text-sm leading-relaxed">{a.latestUpdate}</p>
          <p className="mt-1 text-xs text-white/50">{loanStatus(a.status)?.meaning}</p>
        </div>
      </section>

      {/* Documents requested */}
      {openRequests.length > 0 && (
        <Panel className="ring-2 ring-orange-300">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><FileWarning size={18} /> Documents requested</h2>
          <p className="mt-1 text-sm text-muted">Your loan officer needs the following to continue.</p>
          <div className="mt-4 space-y-3">
            {openRequests.map(r => (
              <div key={r.id}>
                <DropZone label={r.label} hint={r.note ?? `Requested ${fmtDate(r.createdAt)}`}
                  busy={upload.isPending && upload.variables?.requestId === r.id} onFile={file => upload.mutate({ file, requestId: r.id })} />
              </div>
            ))}
          </div>
          {upload.isError && <p className="mt-3 text-sm text-bad">{(upload.error as Error).message}</p>}
        </Panel>
      )}

      {/* Decision */}
      {a.decision && (
        <Panel className={a.decision === 'REJECTED' ? 'bg-red-50' : 'bg-brand-soft'}>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            {a.decision === 'REJECTED' ? <XCircle size={18} className="text-bad" /> : <BadgeCheck size={18} className="text-brand" />}
            Lending decision: {loanStatus(a.decision)?.label}
          </h2>
          <p className="mt-1 text-xs text-muted">Decided by {a.lender ?? 'Sterling Crest Bank'} · {fmtDate(a.decidedAt)}</p>
          {a.decisionNote && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{a.decisionNote}</p>}
          {a.conditions && (
            <div className="mt-3 rounded-2xl bg-white/70 p-4 text-sm">
              <p className="font-semibold">Conditions of approval</p>
              <p className="mt-1 whitespace-pre-wrap">{a.conditions}</p>
            </div>
          )}
        </Panel>
      )}

      {a.offer && <OfferSection a={a} onDone={refresh} />}

      {/* Disbursement */}
      {a.disbursement && (
        <Panel className="bg-brand-soft">
          <h2 className="font-display text-lg font-semibold">Funds sent</h2>
          <p className="pill-grow mt-3 flex items-center justify-between rounded-2xl bg-night px-5 py-4 text-white">
            <span className="flex items-center gap-2 text-sm"><Wallet size={16} />
              {a.disbursement.method === 'WALLET' ? `Paid into your ${a.disbursement.currency} wallet` : `Sent to your bank account · ref ${a.disbursement.reference}`}
            </span>
            <span className="font-display text-xl font-semibold">{anyMoney(a.disbursement.amountMinor, a.disbursement.currency)}</span>
          </p>
          <p className="mt-2 text-xs text-muted">{fmtDateTime(a.disbursement.at)}</p>
        </Panel>
      )}

      {a.repayments?.length > 0 && <RepaymentsSection a={a} wallets={wallets ?? []} onDone={refresh} />}

      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr] lg:gap-5">
        <div className="space-y-4 lg:space-y-5">
          <Fold
            title="Messages with your loan officer"
            defaultOpen={a.messages.length > 0}
            summary={a.messages.length ? `${a.messages.length} message${a.messages.length > 1 ? 's' : ''}` : 'No messages yet · tap to ask a question'}
          >
            <Thread messages={a.messages} me="CUSTOMER" staffLabel="Loan officer" onSend={body => send.mutateAsync(body)} sending={send.isPending}
              error={send.isError ? (send.error as Error).message : ''} disabled={a.status === 'CLOSED'} disabledText="This application is closed. Contact support if you need help." />
          </Fold>
          <Fold title="Application details" summary={`${amountText(a.amountMinor, a.currency)} · ${a.requirements?.purpose ?? ''} · ${a.termMonths ? `${a.termMonths} months` : ''}`}>
            <Fold inner title="Loan requirements" summary={`${amountText(a.amountMinor, a.currency)} · ${a.requirements?.purpose ?? ''}`}>
              <GroupList fields={requirementFields(p)} values={a.requirements ?? {}} currency={cur} />
              {p.questions.length > 0 && <><p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted">About your {p.name.toLowerCase()}</p><GroupList fields={p.questions} values={a.answers ?? {}} currency={cur} /></>}
            </Fold>
            <Fold inner title="Personal information" summary={`${a.personal?.fullName ?? ''} · ${a.personal?.phone ?? ''}`}>
              <GroupList fields={PERSONAL_FIELDS} values={a.personal ?? {}} />
            </Fold>
            <Fold inner title="Employment and income" summary={a.requirements?.employmentStatus ?? ''}>
              <GroupList fields={EMPLOYMENT_FIELDS} values={a.employment ?? {}} currency={cur} />
            </Fold>
            <Fold inner title="Payout account" summary={a.banking?.payout ?? ''}>
              <GroupList fields={BANKING_FIELDS} values={a.banking ?? {}} wallets={wallets} />
            </Fold>
          </Fold>
        </div>

        <div className="space-y-4 lg:space-y-5">
          <Fold title={`Documents (${a.documents.length})`} summary={final ? 'View your uploaded documents' : 'View your documents or add another'}>
            <ul className="space-y-1.5">
              {a.documents.map(d => (
                <li key={d.id}>
                  <a href={`/api/loans/applications/${a.id}/documents/${d.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm hover:bg-paper">
                    <Eye size={14} className="shrink-0 text-muted" />
                    <span className="min-w-0 flex-1"><span className="block truncate">{d.name}</span><span className="block text-xs text-muted">{docLabel(d.kind)} · {fmtSize(d.size)}</span></span>
                  </a>
                </li>
              ))}
            </ul>
            {!final && (
              <div className="mt-4">
                <DropZone label="Add another document" hint="PDF, JPG or PNG, up to 10 MB" compact busy={upload.isPending && !upload.variables?.requestId} onFile={file => upload.mutate({ file })} />
              </div>
            )}
          </Fold>
          <Fold title="Application timeline" summary={`${a.events.length} update${a.events.length === 1 ? '' : 's'} · last ${fmtDateTime(a.events[a.events.length - 1]?.createdAt)}`}>
            <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-line">
              {[...a.events].reverse().map((e, i) => (
                <li key={e.id} className="relative flex gap-3">
                  <span className={`relative z-[1] mt-0.5 grid h-[15px] w-[15px] shrink-0 place-items-center rounded-full ${i === 0 ? 'bg-night text-white' : 'bg-white text-night/40 ring-1 ring-line'}`}><CircleDot size={9} /></span>
                  <div className="min-w-0">
                    {e.status && <p className="text-sm font-semibold">{loanStatus(e.status)?.label}</p>}
                    {e.note && <p className="text-sm text-night/80">{e.note}</p>}
                    <p className="text-xs text-muted">{fmtDateTime(e.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Fold>
        </div>
      </div>
    </div>
  );
}

/** Repayment progress, next payment, pay from wallet, and the full schedule. */
function RepaymentsSection({ a, wallets, onDone }: { a: LoanDetailT; wallets: (WalletLite & { balanceMinor?: number })[]; onDone: () => void }) {
  const s = repaymentSummary(a.repayments);
  const wallet = wallets.find(w => w.currency === s.currency);
  const balance = wallet?.balanceMinor ?? 0;
  const [confirm, setConfirm] = useState<null | 'next' | 'all'>(null);
  const pay = useMutation({
    mutationFn: (count: number) => api.post(`/loans/applications/${a.id}/repayments/pay`, { walletId: wallet?.id, count }),
    onSuccess: () => { setConfirm(null); onDone(); },
  });
  const unpaidCount = s.count - s.paidCount;
  const amountFor = confirm === 'all' ? s.remainingMinor : s.next?.amountMinor ?? 0;
  const enough = balance >= amountFor;
  const pct = s.count ? Math.round((s.paidCount / s.count) * 100) : 0;

  return (
    <Panel className={s.overdue.length ? 'ring-2 ring-red-300' : ''}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">{s.done ? 'Loan fully repaid' : 'Repayments'}</h2>
        {s.overdue.length > 0 && <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-bad">{s.overdue.length} overdue</span>}
      </div>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-paper"><div className="h-full rounded-full bg-brand transition-all duration-700" style={{ width: `${pct}%` }} /></div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div><dt className="text-xs text-muted">Paid</dt><dd className="font-semibold tabular-nums">{s.paidCount} of {s.count}</dd></div>
        <div><dt className="text-xs text-muted">Left to repay</dt><dd className="font-semibold tabular-nums">{anyMoney(s.remainingMinor, s.currency)}</dd></div>
        <div><dt className="text-xs text-muted">{s.next ? 'Next payment' : 'Status'}</dt><dd className={`font-semibold ${s.overdue.length ? 'text-bad' : ''}`}>{s.next ? fmtDate(s.next.dueDate) : 'All paid'}</dd></div>
      </dl>

      {s.next && a.status === 'DISBURSED' && (
        <div className="mt-4 rounded-2xl bg-paper p-4">
          {confirm === null ? (
            <>
              <p className="text-sm">Next instalment: <b>{anyMoney(s.next.amountMinor, s.currency)}</b> due {fmtDate(s.next.dueDate)}</p>
              <p className="mt-0.5 text-xs text-muted">{wallet ? `Paid from your ${wallet.currency} wallet · balance ${anyMoney(balance, wallet.currency)}` : `You need a ${s.currency} wallet to pay online, or pay at any branch.`}</p>
              {wallet && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => setConfirm('next')} className="rounded-full bg-night px-5 py-2.5 text-sm font-semibold text-white">Pay next instalment</button>
                  {unpaidCount > 1 && <button onClick={() => setConfirm('all')} className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold">Pay off in full</button>}
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-sm font-semibold">{confirm === 'all' ? `Pay off the remaining ${unpaidCount} instalments?` : 'Pay the next instalment?'}</p>
              <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{anyMoney(amountFor, s.currency)}</p>
              <p className="text-xs text-muted">From your {s.currency} wallet · balance after: {anyMoney(balance - amountFor, s.currency)}</p>
              {!enough && (
                <p className="mt-2 text-sm text-bad">Not enough in your wallet. <Link to="/dashboard/deposit" className="font-semibold underline">Add money</Link> first.</p>
              )}
              {pay.isError && <p className="mt-2 text-sm text-bad">{(pay.error as Error).message}</p>}
              <div className="mt-3 flex items-center gap-2">
                <button onClick={() => pay.mutate(confirm === 'all' ? unpaidCount : 1)} disabled={!enough || pay.isPending}
                  className="rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Confirm payment</button>
                <button onClick={() => setConfirm(null)} className="px-3 text-sm font-semibold text-muted">Cancel</button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="mt-4">
        <Fold inner title="Repayment schedule" summary={`${s.count} monthly instalments`}>
          <RepaymentList reps={a.repayments} />
        </Fold>
      </div>
    </Panel>
  );
}

/** Offer review (accept/decline), agreement signing, and the signed agreement. */
export function OfferSection({ a, onDone }: { a: LoanDetailT; onDone: () => void }) {
  const o = a.offer!;
  const [comment, setComment] = useState('');
  const [name, setName] = useState('');
  const [agree, setAgree] = useState(false);
  const decide = useMutation({
    mutationFn: (accept: boolean) => api.post(`/loans/applications/${a.id}/offer`, { accept, comment: comment.trim() || undefined }),
    onSuccess: onDone,
  });
  const sign = useMutation({ mutationFn: () => api.post(`/loans/applications/${a.id}/sign`, { name, agree }), onSuccess: onDone });
  const borrower = a.personal?.fullName ?? '';
  const expired = o.expiresAt ? new Date(o.expiresAt) < new Date() : false;

  return (
    <Panel className={a.status === 'OFFER_ISSUED' || a.status === 'AWAITING_SIGNATURE' ? 'ring-2 ring-orange-300' : ''}>
      <div id="offer" className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Handshake size={18} /> Your loan offer</h2>
          <p className="text-xs text-muted">From {o.lender} · issued {fmtDate(o.issuedAt)}{o.expiresAt ? ` · valid until ${fmtDate(o.expiresAt)}` : ''}</p>
        </div>
        {a.signedAt && <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">Signed {fmtDate(a.signedAt)}</span>}
      </div>
      <div className="mt-4"><OfferFigures o={o} /></div>
      {(o.fees || o.conditions) && (
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {o.fees && <div className="rounded-2xl bg-paper p-3"><dt className="text-xs text-muted">Fees</dt><dd className="mt-0.5 whitespace-pre-wrap">{o.fees}</dd></div>}
          {o.conditions && <div className="rounded-2xl bg-paper p-3"><dt className="text-xs text-muted">Conditions</dt><dd className="mt-0.5 whitespace-pre-wrap">{o.conditions}</dd></div>}
        </dl>
      )}

      {a.status === 'OFFER_ISSUED' && (
        <div className="mt-5">
          {expired ? (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-bad">This offer has expired. Message your loan officer to ask about a new one.</p>
          ) : (
            <>
              <p className="text-sm text-muted">Read the offer carefully. Accepting takes you to the loan agreement to sign; nothing is binding until you sign.</p>
              <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} maxLength={500} placeholder="Comment for your loan officer (optional)"
                className="mt-3 w-full resize-none rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none focus:border-night" />
              {decide.isError && <p className="mt-2 text-sm text-bad">{(decide.error as Error).message}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => decide.mutate(true)} disabled={decide.isPending} className="flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                  {decide.isPending && decide.variables ? <Loader2 size={15} className="animate-spin" /> : null} Accept offer
                </button>
                <button onClick={() => confirm('Decline this offer? Your application will be closed.') && decide.mutate(false)} disabled={decide.isPending}
                  className="rounded-full bg-paper px-5 py-2.5 text-sm font-semibold disabled:opacity-50">Decline</button>
              </div>
            </>
          )}
        </div>
      )}

      {(a.status === 'AWAITING_SIGNATURE' || a.signedAt) && (
        <div className="mt-5">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><FileSignature size={16} /> Loan agreement</p>
          <AgreementText o={o} borrower={borrower} product={a.product} />
          {a.signedAt ? (
            <p className="mt-3 rounded-xl bg-brand-soft px-4 py-3 text-sm">
              Signed electronically by <b className="font-display italic">{a.signedName}</b> on {fmtDateTime(a.signedAt)}.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#8b6a3e]" />
                <span>I have read and understood the loan agreement and agree to its terms, including the repayments.</span>
              </label>
              <label className="block text-sm font-medium">Type your full legal name to sign
                <input value={name} onChange={e => setName(e.target.value)} placeholder={borrower}
                  className="mt-1.5 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 font-display text-lg italic outline-none focus:border-night" />
              </label>
              {sign.isError && <p className="text-sm text-bad">{(sign.error as Error).message}</p>}
              <button onClick={() => sign.mutate()} disabled={!agree || !name.trim() || sign.isPending}
                className="flex items-center gap-2 rounded-full bg-night px-6 py-3 text-sm font-semibold text-white disabled:opacity-40">
                {sign.isPending ? <Loader2 size={15} className="animate-spin" /> : <FileSignature size={15} />} Sign agreement
              </button>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
