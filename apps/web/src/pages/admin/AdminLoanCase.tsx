import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, ChevronDown, Eye,Lock, Plus, Send, StickyNote, Trash2, UserRound, X } from 'lucide-react';
import {
  BANKING_FIELDS, EMPLOYMENT_FIELDS, LOAN_CURRENCIES, LOAN_STATUSES, PERSONAL_FIELDS, loanAffordability, loanDocuments,
  PAYOUT_EXTERNAL, loanMonthlyPayment, loanProduct, loanStatus, requirementFields, type LoanStatus,
} from '@kestrel/shared';
import { useAuth } from '../../hooks/useAuth';
import { Fold } from '../../components/Fold';
import { api } from '../../lib/api';
import type { LoanDetailT } from '../loans/LoanDetail';
import {
  AgreementText, GroupList, LoanStageBar, LoanStatusBadge, OfferFigures, RepaymentList, Thread, amountText, repaymentSummary, anyMoney, fmtDate, fmtDateTime, fmtSize, productName,
} from '../loans/shared';
import { Badge, Btn, Card, Loading, inputCls } from './ui';

type Wallet = { id: string; currency: string; accountNumber: string; balanceMinor: number };
type AdminApp = LoanDetailT & {
  status: LoanStatus;
  assignedToId: string | null;
  assignedTo: string | null;
  forwardedAt: string | null;
  consentAt: string | null;
  assessment: { checks: Record<string, boolean>; findings: string; recommendation: string; at: string } | null;
  user: { id: string; name: string; email: string; phone: string | null; status: string; kycStatus: string; createdAt: string; wallets: Wallet[] };
  otherApplications: { id: string; reference: string; product: string; status: string; amountMinor: number | null; currency: string | null; submittedAt: string | null }[];
  events: (LoanDetailT['events'][number] & { actorName?: string | null })[];
};

const CHECKS: [string, string][] = [
  ['complete', 'Application complete'],
  ['identity', 'Identity verified'],
  ['address', 'Address verified'],
  ['income', 'Income verified'],
  ['bankStatements', 'Bank statements reviewed'],
  ['affordability', 'Affordability assessed'],
  ['creditCheck', 'Credit check done'],
];
const RECOMMEND = [
  ['', 'No recommendation yet'], ['APPROVE', 'Approve'], ['APPROVE_WITH_CONDITIONS', 'Approve with conditions'],
  ['MORE_INFO', 'Need more information'], ['DECLINE', 'Decline'],
];

export function AdminLoanCase() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const { data: a, isLoading, error } = useQuery({
    queryKey: ['admin-loan', id],
    queryFn: () => api.get<AdminApp>(`/admin/loans/${id}`),
    refetchInterval: 15_000,
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-loan', id] });
    qc.invalidateQueries({ queryKey: ['admin-loans'] });
    qc.invalidateQueries({ queryKey: ['admin-loan-stats'] });
    qc.invalidateQueries({ queryKey: ['admin-overview'] });
  };
  const unread = a?.messages.filter(m => m.sender === 'CUSTOMER' && !m.readAt).length ?? 0;
  const read = useMutation({ mutationFn: () => api.post(`/admin/loans/${id}/messages/read`), onSuccess: refresh });
  useEffect(() => { if (unread) read.mutate(); }, [unread]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = useMutation({ mutationFn: (body: string) => api.post(`/admin/loans/${id}/messages`, { body }), onSuccess: refresh });
  const cancelReq = useMutation({ mutationFn: (rid: string) => api.del(`/admin/loans/${id}/requests/${rid}`), onSuccess: refresh });
  const review = useMutation({
    mutationFn: (b: { docId: string; review: string; note?: string }) => api.patch(`/admin/loans/${id}/documents/${b.docId}`, b),
    onSuccess: refresh,
  });
  const [note, setNote] = useState('');
  const addNote = useMutation({ mutationFn: () => api.post(`/admin/loans/${id}/notes`, { note }), onSuccess: () => { setNote(''); refresh(); } });

  if (isLoading) return <Loading h="h-96" />;
  if (error || !a) return <p className="text-sm text-bad">{(error as Error)?.message ?? 'Application not found'}</p>;

  const p = loanProduct(a.product)!;
  const cur = a.currency ?? undefined;
  const aff = loanAffordability(a.employment ?? {});
  const docLabel = (k: string) => loanDocuments(p).find(d => d.key === k)?.label ?? (k === 'REQUESTED' ? 'Requested' : 'Additional');
  const missingRequired = loanDocuments(p).filter(d => d.required && !a.documents.some(x => x.kind === d.key));

  return (
    <div className="space-y-5">
      <Link to="/admin/loans" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-night"><ArrowLeft size={15} /> All applications</Link>

      <section className="rounded-[28px] bg-night p-6 text-white sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-display text-2xl font-semibold tracking-wide">{a.reference}</p>
            <p className="text-sm text-white/60">{p.name} · submitted {fmtDate(a.submittedAt)} · consent given {fmtDateTime(a.consentAt)}</p>
            <p className="mt-2 text-sm">
              <Link to={`/admin/customers/${a.user.id}`} className="font-semibold hover:underline">{a.user.name}</Link>
              <span className="text-white/60"> · {a.user.email}{a.user.phone ? ` · ${a.user.phone}` : ''}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {a.user.status !== 'ACTIVE' && <Badge status={a.user.status} />}
              <Badge tone={a.user.kycStatus === 'APPROVED' ? 'green' : 'grey'}>ID {a.user.kycStatus === 'APPROVED' ? 'verified' : 'not verified'}</Badge>
              <Badge tone="grey">Officer: {a.assignedTo ?? 'unassigned'}</Badge>
            </div>
          </div>
          <div className="text-right">
            <LoanStatusBadge status={a.status} className="!text-xs" />
            <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{amountText(a.amountMinor, a.currency)}</p>
            <p className="text-xs text-white/50">requested over {a.termMonths ?? '—'} months</p>
          </div>
        </div>
        <div className="mt-5"><LoanStageBar status={a.status} dark /></div>
        {a.latestUpdate && <p className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm"><span className="text-white/50">Customer sees: </span>{a.latestUpdate}</p>}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-5">
          {/* Key facts stay visible; the full application is folded away. */}
          <Card className="p-5">
            <dl className="grid grid-cols-2 gap-2.5 text-sm sm:grid-cols-4">
              <Fact k="Requested" v={amountText(a.amountMinor, a.currency)} />
              <Fact k="Repayment period" v={a.termMonths ? `${a.termMonths} months` : '—'} />
              <Fact k="Purpose" v={a.requirements?.purpose ?? '—'} />
              <Fact k="Left each month" v={cur ? anyMoney(Math.round(aff.disposable * 100), cur) : '—'} tone={aff.disposable < 0 ? 'text-bad' : 'text-brand'} />
            </dl>
          </Card>

          <Fold title="Application details" summary={`${a.personal?.fullName ?? a.user.name} · ${a.requirements?.employmentStatus ?? ''} · ${a.personal?.country ?? ''}`}>
            <Fold inner title="Loan requirements" summary={`${amountText(a.amountMinor, a.currency)} · ${a.requirements?.purpose ?? ''}`}>
              <GroupList fields={requirementFields(p)} values={a.requirements ?? {}} currency={cur} />
              {p.questions.length > 0 && <><Sub>{p.name} details</Sub><GroupList fields={p.questions} values={a.answers ?? {}} currency={cur} /></>}
            </Fold>
            <Fold inner title="Personal information" summary={`${a.personal?.fullName ?? ''} · ${a.personal?.phone ?? ''}`}>
              <GroupList fields={PERSONAL_FIELDS} values={a.personal ?? {}} />
            </Fold>
            <Fold inner title="Employment and income" summary={cur ? `Income ${anyMoney(Math.round(aff.income * 100), cur)} · outgoings ${anyMoney(Math.round(aff.outgoings * 100), cur)} a month` : ''}>
              <GroupList fields={EMPLOYMENT_FIELDS} values={a.employment ?? {}} currency={cur} />
            </Fold>
            <Fold inner title="Payout account" summary={a.banking?.payout ?? ''}>
              <GroupList fields={BANKING_FIELDS} values={a.banking ?? {}} wallets={a.user.wallets} />
            </Fold>
          </Fold>

          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold">Document verification ({a.documents.length})</h2>
              {missingRequired.length > 0 ? <Badge tone="amber">Not provided yet: {missingRequired.map(d => d.label).join(', ')}</Badge> : <Badge tone="green">All recommended documents received</Badge>}
            </div>
            <ul className="mt-3 divide-y divide-line rounded-2xl border border-line">
              {a.documents.map(d => (
                <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                  <a href={`/api/admin/loans/${a.id}/documents/${d.id}`} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80">
                    <Eye size={14} className="shrink-0 text-muted" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{d.name}</span>
                      <span className="block text-xs text-muted">
                        {d.requestId ? `For request: ${a.requests.find(r => r.id === d.requestId)?.label ?? ''}` : docLabel(d.kind)} · {fmtSize(d.size)} · {fmtDate(d.createdAt)}
                        {d.reviewNote ? ` · ${d.reviewNote}` : ''}
                      </span>
                    </span>
                  </a>
                  <Badge tone={d.review === 'VERIFIED' ? 'green' : d.review === 'REJECTED' ? 'red' : 'grey'}>{d.review.toLowerCase()}</Badge>
                  <button onClick={() => review.mutate({ docId: d.id, review: 'VERIFIED' })} className="grid h-7 w-7 place-items-center rounded-full bg-brand-soft text-brand" aria-label="Verify"><Check size={14} /></button>
                  <button onClick={() => { const r = prompt('Why is this document not accepted? (the customer sees this)'); if (r?.trim()) review.mutate({ docId: d.id, review: 'REJECTED', note: r }); }}
                    className="grid h-7 w-7 place-items-center rounded-full bg-red-50 text-bad" aria-label="Reject"><X size={14} /></button>
                </li>
              ))}
            </ul>
            {review.isError && <p className="mt-2 text-sm text-bad">{(review.error as Error).message}</p>}
            {a.requests.length > 0 && (
              <>
                <Sub>Requests to the customer</Sub>
                <ul className="mt-2 space-y-2 text-sm">
                  {a.requests.map(r => (
                    <li key={r.id} className="flex items-center gap-3 rounded-xl bg-paper px-3 py-2">
                      <span className="min-w-0 flex-1"><span className="block font-medium">{r.label}</span>{r.note && <span className="block truncate text-xs text-muted">{r.note}</span>}</span>
                      {r.fulfilledAt ? <Badge tone="green">Received {fmtDate(r.fulfilledAt)}</Badge> : (
                        <>
                          <Badge tone="amber">Waiting</Badge>
                          <button onClick={() => cancelReq.mutate(r.id)} className="text-muted hover:text-bad" aria-label="Withdraw request"><Trash2 size={14} /></button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="mb-3 font-display text-lg font-semibold">Messages with the customer</h2>
            <Thread messages={a.messages} me="STAFF" staffLabel="Loan officer" onSend={body => send.mutateAsync(body)} sending={send.isPending}
              error={send.isError ? (send.error as Error).message : ''} />
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold">Customer record</h2>
            <p className="mt-1 text-sm text-muted">Customer since {fmtDate(a.user.createdAt)} · {a.user.wallets.length} wallet{a.user.wallets.length === 1 ? '' : 's'}</p>
            <ul className="mt-3 space-y-1.5 text-sm">
              {a.user.wallets.map(w => <li key={w.id} className="flex justify-between rounded-xl bg-paper px-3 py-2"><span>{w.currency} · {w.accountNumber}</span><span className="font-semibold tabular-nums">{anyMoney(w.balanceMinor, w.currency)}</span></li>)}
            </ul>
            <Sub>Other loan applications</Sub>
            {!a.otherApplications.length ? <p className="text-sm text-muted">None.</p> : (
              <ul className="divide-y divide-line text-sm">
                {a.otherApplications.map(o => (
                  <li key={o.id}><Link to={`/admin/loans/${o.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:opacity-80">
                    <span><b>{o.reference}</b> <span className="text-muted">· {productName(o.product)} · {amountText(o.amountMinor, o.currency)}</span></span>
                    <LoanStatusBadge status={o.status} />
                  </Link></li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="order-first space-y-5 lg:order-none">
          <ActionCard a={a} onDone={refresh} missingRequired={missingRequired.map(d => d.label)} />
          <AssignPanel a={a} onDone={refresh} />
          <details className="group rounded-[22px] bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 font-display text-base font-semibold">
              More options
              <span className="text-xs font-normal text-muted group-open:hidden">Assessment notes · partner lender · change status manually</span>
            </summary>
            <div className="space-y-4 px-2 pb-2">
              <AssessmentPanel a={a} onDone={refresh} />
              <ForwardPanel a={a} onDone={refresh} />
              {a.status !== 'CLOSED' ? <StatusPanel a={a} onDone={refresh} /> : <Card className="p-6"><p className="text-sm text-muted">This application is closed. No further status changes are possible.</p></Card>}
            </div>
          </details>

          {a.decision && (
            <Card className="p-6">
              <h2 className="font-display text-lg font-semibold">Lender’s decision</h2>
              <p className="mt-2 text-sm"><LoanStatusBadge status={a.decision} /> <span className="text-muted">by {a.lender ?? 'Sterling Crest Bank'} · {fmtDate(a.decidedAt)}</span></p>
              {a.decisionNote && <p className="mt-2 whitespace-pre-wrap text-sm">{a.decisionNote}</p>}
              {a.conditions && <p className="mt-2 whitespace-pre-wrap rounded-xl bg-paper p-3 text-sm"><b>Conditions: </b>{a.conditions}</p>}
            </Card>
          )}

          {a.offer && (
            <Card className="p-6">
              <h2 className="font-display text-lg font-semibold">Offer and agreement</h2>
              <p className="text-xs text-muted">Issued {fmtDate(a.offer.issuedAt)} by {a.offer.lender}{a.offer.expiresAt ? ` · expires ${fmtDate(a.offer.expiresAt)}` : ''}</p>
              <div className="mt-3"><OfferFigures o={a.offer} /></div>
              <dl className="mt-3 divide-y divide-line text-sm">
                <div className="flex justify-between py-2"><dt className="text-muted">Offer accepted</dt><dd className="font-medium">{a.offerAcceptedAt ? fmtDateTime(a.offerAcceptedAt) : 'Not yet'}</dd></div>
                <div className="flex justify-between py-2"><dt className="text-muted">Agreement signed</dt><dd className="font-medium">{a.signedAt ? `${a.signedName} · ${fmtDateTime(a.signedAt)}` : 'Not yet'}</dd></div>
              </dl>
              {a.signedAt && <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-brand">View signed agreement</summary><div className="mt-2"><AgreementText o={a.offer} borrower={a.personal?.fullName ?? a.user.name} product={a.product} /></div></details>}
            </Card>
          )}

          {a.disbursement && (
            <Card className="p-6">
              <h2 className="font-display text-lg font-semibold">Disbursement record</h2>
              <p className="mt-2 text-sm">{anyMoney(a.disbursement.amountMinor, a.disbursement.currency)} · {a.disbursement.method === 'WALLET' ? 'credited to Sterling Crest wallet' : `external payment, ref ${a.disbursement.reference}`}</p>
              <p className="text-xs text-muted">{fmtDateTime(a.disbursement.at)}</p>
            </Card>
          )}

          <Fold title="Timeline and internal notes" summary={`${a.events.length} update${a.events.length === 1 ? '' : 's'} · last ${fmtDateTime(a.events[a.events.length - 1]?.createdAt)}`}>
            <div className="flex gap-2">
              <input value={note} onChange={e => setNote(e.target.value)} maxLength={2000} placeholder="Internal note (customer can't see it)" className={inputCls} />
              <Btn onClick={() => addNote.mutate()} disabled={!note.trim()} busy={addNote.isPending}><StickyNote size={13} />Add</Btn>
            </div>
            <ol className="mt-4 space-y-3">
              {[...a.events].reverse().map(e => (
                <li key={e.id} className={`rounded-xl px-3 py-2.5 text-sm ${e.internal ? 'bg-amber-50' : 'bg-paper'}`}>
                  <p className="flex flex-wrap items-center gap-2">
                    {e.internal && <span className="flex items-center gap-1 text-[11px] font-semibold text-warn"><Lock size={11} />Internal</span>}
                    {e.status && <span className="font-semibold">{loanStatus(e.status)?.label}</span>}
                  </p>
                  {e.note && <p className="mt-0.5 whitespace-pre-wrap">{e.note}</p>}
                  <p className="mt-0.5 text-xs text-muted">{e.actorName ? `${e.actorName} · ` : ''}{fmtDateTime(e.createdAt)}</p>
                </li>
              ))}
            </ol>
          </Fold>
        </div>
      </div>
    </div>
  );
}

function Fact({ k, v, tone = '' }: { k: string; v: string; tone?: string }) {
  return (
    <div className="rounded-2xl bg-paper px-3.5 py-2.5">
      <dt className="text-xs text-muted">{k}</dt>
      <dd className={`mt-0.5 truncate font-semibold tabular-nums ${tone}`}>{v}</dd>
    </div>
  );
}

const Sub =({ children }: { children: React.ReactNode }) => <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted">{children}</p>;

/** Who is responsible for this application. It doesn't change permissions; every staff member can act on it. */
function AssignPanel({ a, onDone }: { a: AdminApp; onDone: () => void }) {
  const { user } = useAuth();
  const { data: staff } = useQuery({ queryKey: ['admin-loan-staff'], queryFn: () => api.get<{ id: string; name: string }[]>('/admin/loans/staff') });
  const assign = useMutation({ mutationFn: (staffId: string) => api.patch(`/admin/loans/${a.id}/assign`, { staffId: staffId || null }), onSuccess: onDone });
  const mine = a.assignedToId === user?.id;
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${a.assignedTo ? 'bg-night text-white' : 'bg-paper text-muted'}`}><UserRound size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted">Loan officer (who handles this)</p>
          <p className="truncate font-semibold">{mine ? 'You' : a.assignedTo ?? 'Nobody yet'}</p>
        </div>
        {!mine && <Btn busy={assign.isPending} onClick={() => user && assign.mutate(user.id)}>Take this application</Btn>}
      </div>
      {(staff?.length ?? 0) > 1 && (
        <select value={a.assignedToId ?? ''} onChange={e => assign.mutate(e.target.value)} disabled={assign.isPending} className={`${inputCls} mt-3 !py-2 text-xs`}>
          <option value="">Hand over to… (unassigned)</option>
          {staff?.map(s => <option key={s.id} value={s.id}>{s.id === user?.id ? `${s.name} (you)` : s.name}</option>)}
        </select>
      )}
      {assign.isError && <p className="mt-2 text-sm text-bad">{(assign.error as Error).message}</p>}
    </Card>
  );
}

/* ---------- Guided actions: only what makes sense at this stage ---------- */

const REVIEW_STAGES = ['SUBMITTED', 'UNDER_REVIEW', 'DOCUMENTS_REQUIRED', 'VERIFICATION', 'ASSESSMENT'];

function ActionCard({ a, onDone, missingRequired }: { a: AdminApp; onDone: () => void; missingRequired: string[] }) {
  const [mode, setMode] = useState<null | 'approve' | 'conditions' | 'decline' | 'docs' | 'offer' | 'pay'>(null);
  const [text, setText] = useState('');
  const run = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.patch(`/admin/loans/${a.id}/status`, body),
    onSuccess: () => { setMode(null); setText(''); onDone(); },
  });
  const remind = useMutation({
    mutationFn: (body: string) => api.post(`/admin/loans/${a.id}/messages`, { body }),
    onSuccess: onDone,
  });
  const go = (status: LoanStatus, extra: Record<string, unknown> = {}) => run.mutate({ status, ...extra });
  const approved = a.decision === 'APPROVED' || a.decision === 'CONDITIONALLY_APPROVED';
  const verified = a.documents.filter(d => d.review === 'VERIFIED').length;
  const rejectedDocs = a.documents.filter(d => d.review === 'REJECTED').length;
  const aff = loanAffordability(a.employment ?? {});
  const rec = a.assessment?.recommendation;

  const Big = ({ children, onClick, tone = 'dark' }: { children: React.ReactNode; onClick: () => void; tone?: 'dark' | 'green' | 'red' | 'light' }) => (
    <Btn tone={tone} onClick={onClick} busy={run.isPending} className="!px-5 !py-3 !text-sm">{children}</Btn>
  );
  const Cancel = () => <button onClick={() => { setMode(null); setText(''); }} className="px-3 text-sm font-semibold text-muted hover:text-night">Cancel</button>;
  const Err = () => (run.isError ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-bad">{(run.error as Error).message}</p> : null);

  let body: React.ReactNode;
  if (a.status === 'CLOSED') {
    body = <p className="text-sm text-muted">This application is closed. Nothing more to do.</p>;
  } else if (REVIEW_STAGES.includes(a.status) && !approved) {
    body = (
      <>
        <ul className="grid grid-cols-2 gap-2 text-xs">
          <Ready ok={!missingRequired.length} text={missingRequired.length ? `${missingRequired.length} recommended document${missingRequired.length > 1 ? 's' : ''} not provided` : 'All recommended documents in'} />
          <Ready ok={verified === a.documents.length && a.documents.length > 0} text={`${verified} of ${a.documents.length} documents verified`} />
          <Ready ok={a.user.kycStatus === 'APPROVED'} text={a.user.kycStatus === 'APPROVED' ? 'ID verified' : 'ID not verified'} />
          <Ready ok={aff.disposable > 0} text={aff.disposable > 0 ? 'Income covers outgoings' : 'Outgoings exceed income'} />
        </ul>
        {rec && <p className="mt-3 rounded-xl bg-paper px-3 py-2 text-sm">Your assessment recommends: <b>{RECOMMEND.find(r => r[0] === rec)?.[1]}</b></p>}
        {rejectedDocs > 0 && <p className="mt-2 text-xs text-warn">{rejectedDocs} document{rejectedDocs > 1 ? 's were' : ' was'} not accepted. Ask for a replacement.</p>}

        {mode === null && (missingRequired.length > 0 || rejectedDocs > 0) && a.status !== 'DOCUMENTS_REQUIRED' && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-warn">Documents not complete</p>
            <p className="mt-1 text-xs leading-relaxed text-warn">
              {missingRequired.length > 0 && <>Not provided: {missingRequired.join(', ')}. </>}
              {rejectedDocs > 0 && <>{rejectedDocs} document{rejectedDocs > 1 ? 's' : ''} not accepted. </>}
              You decide whether you need them before deciding.
            </p>
            <Btn tone="amber" onClick={() => setMode('docs')} className="mt-3 !px-5 !py-3 !text-sm">Tell the customer what's missing</Btn>
          </div>
        )}
        {mode === null && a.status === 'DOCUMENTS_REQUIRED' && (
          <p className="mt-4 rounded-2xl bg-paper px-4 py-3 text-sm">Waiting for the customer to upload the documents you asked for. When they do, the application comes back to review automatically.</p>
        )}
        {mode === null && (
          <>
            {a.status === 'SUBMITTED' && (
              <div className="mt-4"><Big onClick={() => go('UNDER_REVIEW', { note: 'A loan officer is now reviewing your application.' })}>Start review</Big></div>
            )}
            <p className="mt-4 text-sm font-medium">Decision</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Big tone="green" onClick={() => setMode('approve')}>Approve</Big>
              <Big tone="light" onClick={() => setMode('conditions')}>Approve with conditions</Big>
              <Big tone="red" onClick={() => setMode('decline')}>Decline</Big>
            </div>
            <button onClick={() => setMode('docs')} className="mt-3 text-sm font-semibold text-brand hover:underline">Need more documents or information? Ask the customer</button>
          </>
        )}
        {mode === 'approve' && (
          <Step title="Approve this loan" hint="Next you'll create the offer with the amount, rate and term.">
            <textarea value={text} onChange={e => setText(e.target.value)} rows={2} placeholder="Note to the customer (optional)" className={`${inputCls} resize-y`} />
            <div className="mt-3 flex items-center"><Big tone="green" onClick={() => go('APPROVED', { decisionNote: text, note: text || undefined })}>Confirm approval</Big><Cancel /></div>
          </Step>
        )}
        {mode === 'conditions' && (
          <Step title="Approve with conditions" hint="The customer sees these conditions.">
            <textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder="e.g. Provide a guarantor" className={`${inputCls} resize-y`} />
            <div className="mt-3 flex items-center"><Big tone="green" onClick={() => go('CONDITIONALLY_APPROVED', { conditions: text })}>Confirm</Big><Cancel /></div>
          </Step>
        )}
        {mode === 'decline' && (
          <Step title="Decline this application" hint="Give the reason. The customer sees it.">
            <textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder="e.g. The repayments would not be affordable on the income shown." className={`${inputCls} resize-y`} />
            <div className="mt-3 flex items-center"><Big tone="red" onClick={() => go('REJECTED', { decisionNote: text })}>Confirm decline</Big><Cancel /></div>
          </Step>
        )}
        {mode === 'docs' && <RequestDocs a={a} missing={missingRequired} busy={run.isPending} onSend={(requests, note) => go('DOCUMENTS_REQUIRED', { requests, note })} onCancel={() => setMode(null)} />}
      </>
    );
  } else if (approved && (a.status === 'APPROVED' || a.status === 'CONDITIONALLY_APPROVED' || (a.status === 'OFFER_ISSUED' && mode === 'offer'))) {
    body = <OfferForm a={a} busy={run.isPending} onSend={offer => go('OFFER_ISSUED', { offer })} onCancel={a.status === 'OFFER_ISSUED' ? () => setMode(null) : undefined} />;
  } else if (a.status === 'OFFER_ISSUED' || a.status === 'AWAITING_SIGNATURE') {
    const offerStage = a.status === 'OFFER_ISSUED';
    body = (
      <>
        <p className="text-sm">
          {offerStage
            ? 'The offer has been sent. Waiting for the customer to accept it in their dashboard (Loans → Offers & agreements).'
            : 'The customer accepted the offer. Waiting for them to sign the agreement in their dashboard.'}
        </p>
        {a.offer && <div className="mt-3"><OfferFigures o={a.offer} /></div>}
        <div className="mt-4 flex flex-wrap gap-2">
          <Btn tone="light" busy={remind.isPending} className="!px-5 !py-3 !text-sm"
            onClick={() => remind.mutate(offerStage
              ? `A reminder about your ${productName(a.product)} (${a.reference}): your loan offer is ready. Open Loans → Offers & agreements to review and accept it.`
              : `A reminder about your ${productName(a.product)} (${a.reference}): please sign your loan agreement in Loans → Offers & agreements so we can pay your loan.`)}>
            <Send size={14} /> Send the customer a reminder
          </Btn>
          {offerStage && <Btn tone="light" className="!px-5 !py-3 !text-sm" onClick={() => setMode('offer')}>Change the offer</Btn>}
        </div>
        {remind.isSuccess && <p className="mt-2 text-xs text-brand">Reminder sent.</p>}
      </>
    );
  } else if (a.signedAt && !a.disbursement) {
    body = <PayForm a={a} busy={run.isPending} onPay={disbursement => go('DISBURSED', { disbursement })} />;
  } else if (a.status === 'DISBURSED') {
    body = <AdminRepayments a={a} onDone={onDone} />;
  } else if (a.status === 'REJECTED') {
    body = (
      <>
        <p className="text-sm">This application was declined. Close it when you are done.</p>
        <div className="mt-4"><Big onClick={() => go('CLOSED')}>Close application</Big></div>
      </>
    );
  } else {
    body = <p className="text-sm text-muted">No action needed right now. Use “More options” below to change the status manually.</p>;
  }

  return (
    <Card className="p-6 ring-2 ring-brand/30">
      <h2 className="font-display text-lg font-semibold">What to do now</h2>
      <NextStep a={a} />
      <div className="mt-4">{body}</div>
      <Err />
    </Card>
  );
}

/** Repayment tracking for a paid-out loan. Closes automatically when the last instalment is paid. */
function AdminRepayments({ a, onDone }: { a: AdminApp; onDone: () => void }) {
  const [busyId, setBusyId] = useState<string>();
  const schedule = useMutation({ mutationFn: () => api.post(`/admin/loans/${a.id}/repayments/schedule`), onSuccess: onDone });
  const record = useMutation({
    mutationFn: ({ rid, reference }: { rid: string; reference?: string }) => api.post(`/admin/loans/${a.id}/repayments/${rid}/record`, { reference }),
    onSettled: () => setBusyId(undefined),
    onSuccess: onDone,
  });
  const reminder = useMutation({ mutationFn: (body: string) => api.post(`/admin/loans/${a.id}/messages`, { body }), onSuccess: onDone });

  if (!a.repayments?.length) {
    return (
      <div>
        <p className="text-sm">The loan has been paid out, but it has no repayment schedule yet.</p>
        <Btn onClick={() => schedule.mutate()} busy={schedule.isPending} className="mt-3 !px-5 !py-3 !text-sm">Create repayment schedule</Btn>
        {schedule.isError && <p className="mt-2 text-sm text-bad">{(schedule.error as Error).message}</p>}
      </div>
    );
  }
  const s = repaymentSummary(a.repayments);
  const pct = Math.round((s.paidCount / s.count) * 100);
  return (
    <div>
      <p className="text-sm">The loan is being repaid. It closes automatically when the last instalment is paid.</p>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-paper"><div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} /></div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <Fact k="Paid" v={`${s.paidCount} of ${s.count}`} />
        <Fact k="Left to repay" v={anyMoney(s.remainingMinor, s.currency)} />
        <Fact k={s.overdue.length ? 'Overdue' : 'Next due'} v={s.overdue.length ? `${s.overdue.length} instalment${s.overdue.length > 1 ? 's' : ''}` : s.next ? fmtDate(s.next.dueDate) : '—'} tone={s.overdue.length ? 'text-bad' : ''} />
      </dl>
      {s.overdue.length > 0 && (
        <Btn tone="amber" busy={reminder.isPending} className="mt-3 !px-5 !py-3 !text-sm"
          onClick={() => reminder.mutate(`A reminder about your ${productName(a.product)} (${a.reference}): ${s.overdue.length} repayment${s.overdue.length > 1 ? 's are' : ' is'} overdue, ${anyMoney(s.overdue.reduce((t, r) => t + r.amountMinor, 0), s.currency)} in total. You can pay from your wallet in Loans → My applications, or at any branch. Please contact us if you are having difficulty.`)}>
          <Send size={14} /> Send overdue reminder
        </Btn>
      )}
      {reminder.isSuccess && <p className="mt-2 text-xs text-brand">Reminder sent.</p>}
      <div className="mt-4">
        <Fold inner title="Repayment schedule" summary="Record payments made at a branch or by bank transfer" defaultOpen={s.overdue.length > 0}>
          <RepaymentList reps={a.repayments} busyId={busyId} onRecord={r => {
            const ref = prompt(`Record instalment ${r.number} (${anyMoney(r.amountMinor, r.currency)}) as paid.\nPayment reference (optional):`);
            if (ref === null) return;
            setBusyId(r.id);
            record.mutate({ rid: r.id, reference: ref || undefined });
          }} />
        </Fold>
      </div>
      {record.isError && <p className="mt-2 text-sm text-bad">{(record.error as Error).message}</p>}
    </div>
  );
}

function Ready({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className={`flex items-center gap-1.5 rounded-xl px-2.5 py-2 font-medium ${ok ? 'bg-brand-soft text-brand' : 'bg-amber-50 text-warn'}`}>
      {ok ? <Check size={13} /> : <X size={13} />} {text}
    </li>
  );
}

function Step({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-2xl bg-paper p-4">
      <p className="font-semibold">{title}</p>
      <p className="mb-3 text-xs text-muted">{hint}</p>
      {children}
    </div>
  );
}

function RequestDocs({ a, missing, busy, onSend, onCancel }: {
  a: AdminApp; missing: string[]; busy: boolean;
  onSend: (requests: { label: string }[], note?: string) => void; onCancel: () => void;
}) {
  const p = loanProduct(a.product)!;
  // Pre-tick what's not provided, plus replacements for any document that wasn't accepted.
  const rejected = a.documents
    .filter(d => d.review === 'REJECTED')
    .map(d => loanDocuments(p).find(x => x.key === d.kind)?.label ?? `Replacement for ${d.name}`);
  const [picked, setPicked] = useState<string[]>([...new Set([...missing, ...rejected])]);
  const [other, setOther] = useState('');
  const [note, setNote] = useState('');
  const toggle = (l: string) => setPicked(x => (x.includes(l) ? x.filter(y => y !== l) : [...x, l]));
  const requests = [...picked, ...other.split('\n').map(s => s.trim()).filter(Boolean)].map(label => ({ label }));
  return (
    <Step title="Ask the customer for more" hint="Tick what you need. They get a notification and can upload it straight away.">
      <div className="flex flex-wrap gap-2">
        {loanDocuments(p).map(d => (
          <button key={d.key} type="button" onClick={() => toggle(d.label)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${picked.includes(d.label) ? 'bg-night text-white' : 'bg-white'}`}>
            {picked.includes(d.label) && <Check size={12} className="mr-1 inline" />}{d.label}
          </button>
        ))}
      </div>
      <textarea value={other} onChange={e => setOther(e.target.value)} rows={2} placeholder="Anything else? One item per line" className={`${inputCls} mt-3 resize-y`} />
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="Message to the customer (optional)" className={`${inputCls} mt-2`} />
      <div className="mt-3 flex items-center">
        <Btn onClick={() => onSend(requests, note || undefined)} disabled={!requests.length} busy={busy} className="!px-5 !py-3 !text-sm">Send request ({requests.length})</Btn>
        <button onClick={onCancel} className="px-3 text-sm font-semibold text-muted hover:text-night">Cancel</button>
      </div>
    </Step>
  );
}

function OfferForm({ a, busy, onSend, onCancel }: {
  a: AdminApp; busy: boolean; onSend: (offer: Record<string, string>) => void; onCancel?: () => void;
}) {
  const [o, setO] = useState({
    amount: a.offer ? String(a.offer.amountMinor / 100) : a.amountMinor ? String(a.amountMinor / 100) : '',
    currency: a.offer?.currency ?? a.currency ?? 'USD',
    ratePct: a.offer ? String(a.offer.ratePct) : '',
    termMonths: a.offer ? String(a.offer.termMonths) : a.termMonths ? String(a.termMonths) : '',
    fees: a.offer?.fees ?? '', conditions: a.offer?.conditions ?? a.conditions ?? '', expiresAt: '',
  });
  const amt = parseFloat(o.amount.replace(/,/g, ''));
  const rate = parseFloat(o.ratePct);
  const term = parseInt(o.termMonths, 10);
  const monthly = amt > 0 && rate >= 0 && term > 0 ? loanMonthlyPayment(Math.round(amt * 100), rate, term) : 0;
  return (
    <div>
      <p className="text-sm">{a.status === 'OFFER_ISSUED' ? 'Change the offer. The customer will see the new terms.' : 'Approved. Now create the offer the customer will accept and sign. The requested amount and term are filled in.'}</p>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <L label="Amount"><input inputMode="decimal" value={o.amount} onChange={e => setO({ ...o, amount: e.target.value })} className={inputCls} /></L>
        <L label="Currency"><select value={o.currency} onChange={e => setO({ ...o, currency: e.target.value })} className={inputCls}>{LOAN_CURRENCIES.map(c => <option key={c}>{c}</option>)}</select></L>
        <L label="Interest rate (% a year)"><input inputMode="decimal" value={o.ratePct} onChange={e => setO({ ...o, ratePct: e.target.value })} placeholder="e.g. 12" className={inputCls} /></L>
        <L label="Term (months)"><input inputMode="numeric" value={o.termMonths} onChange={e => setO({ ...o, termMonths: e.target.value })} className={inputCls} /></L>
      </div>
      {monthly > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-night p-3 text-white">
          <div><p className="text-xs text-white/60">Monthly repayment</p><p className="font-display text-lg font-semibold">{anyMoney(monthly, o.currency)}</p></div>
          <div><p className="text-xs text-white/60">Total to repay</p><p className="font-display text-lg font-semibold">{anyMoney(monthly * term, o.currency)}</p></div>
        </div>
      )}
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-semibold text-brand">Fees, conditions and expiry (optional)</summary>
        <div className="mt-2 space-y-2">
          <textarea value={o.fees} onChange={e => setO({ ...o, fees: e.target.value })} rows={2} placeholder="Fees, e.g. arrangement fee" className={`${inputCls} resize-y`} />
          <textarea value={o.conditions} onChange={e => setO({ ...o, conditions: e.target.value })} rows={2} placeholder="Conditions" className={`${inputCls} resize-y`} />
          <L label="Offer valid until"><input type="date" value={o.expiresAt} onChange={e => setO({ ...o, expiresAt: e.target.value })} className={inputCls} /></L>
        </div>
      </details>
      <div className="mt-4 flex items-center">
        <Btn tone="green" busy={busy} disabled={!(monthly > 0)} onClick={() => onSend(o)} className="!px-5 !py-3 !text-sm"><Send size={14} /> Send offer to customer</Btn>
        {onCancel && <button onClick={onCancel} className="px-3 text-sm font-semibold text-muted hover:text-night">Cancel</button>}
      </div>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-muted">{label}<div className="mt-1">{children}</div></label>;
}

function PayForm({ a, busy, onPay }: { a: AdminApp; busy: boolean; onPay: (d: { method: 'WALLET' | 'EXTERNAL'; walletId?: string; reference?: string }) => void }) {
  const cur = a.offer?.currency ?? 'USD';
  const wallets = a.user.wallets.filter(w => w.currency === cur);
  const wantsExternal = a.banking?.payout === PAYOUT_EXTERNAL;
  const [method, setMethod] = useState<'WALLET' | 'EXTERNAL'>(wallets.length && !wantsExternal ? 'WALLET' : 'EXTERNAL');
  const [walletId, setWalletId] = useState((a.banking?.walletId && wallets.some(w => w.id === a.banking!.walletId) ? a.banking.walletId : wallets[0]?.id) ?? '');
  const [ref, setRef] = useState('');
  return (
    <div>
      <p className="text-sm">The customer signed the agreement on {fmtDate(a.signedAt)}. Pay the loan of <b>{a.offer ? anyMoney(a.offer.amountMinor, cur) : ''}</b>.</p>
      <p className="mt-1 text-xs text-muted">Customer asked for: {a.banking?.payout ?? '—'}{a.banking?.bankName ? ` · ${a.banking.bankName} ${a.banking.accountNumber ?? ''}` : ''}</p>
      <div className="mt-3 flex gap-2">
        {(['WALLET', 'EXTERNAL'] as const).map(m => (
          <button key={m} type="button" disabled={m === 'WALLET' && !wallets.length} onClick={() => setMethod(m)}
            className={`flex-1 rounded-2xl px-3 py-3 text-left text-sm disabled:opacity-40 ${method === m ? 'bg-night text-white' : 'bg-paper'}`}>
            <span className="block font-semibold">{m === 'WALLET' ? 'Into their Sterling Crest wallet' : 'Already paid to another bank'}</span>
            <span className={`block text-xs ${method === m ? 'text-white/60' : 'text-muted'}`}>{m === 'WALLET' ? 'Money arrives instantly' : 'Enter the payment reference'}</span>
          </button>
        ))}
      </div>
      {method === 'WALLET' ? (
        wallets.length > 1 && <select value={walletId} onChange={e => setWalletId(e.target.value)} className={`${inputCls} mt-2`}>{wallets.map(w => <option key={w.id} value={w.id}>{w.currency} · {w.accountNumber}</option>)}</select>
      ) : (
        <input value={ref} onChange={e => setRef(e.target.value)} placeholder="Payment reference" className={`${inputCls} mt-2`} />
      )}
      {!wallets.length && <p className="mt-2 text-xs text-muted">The customer has no {cur} wallet, so record an external payment.</p>}
      <div className="mt-4">
        <Btn tone="green" busy={busy} disabled={method === 'EXTERNAL' && !ref.trim()} onClick={() => onPay({ method, walletId, reference: ref })} className="!px-5 !py-3 !text-sm">
          <Check size={14} /> Mark as paid
        </Btn>
      </div>
    </div>
  );
}

function AssessmentPanel({ a, onDone }: { a: AdminApp; onDone: () => void }) {
  const [checks, setChecks] = useState<Record<string, boolean>>(a.assessment?.checks ?? {});
  const [findings, setFindings] = useState(a.assessment?.findings ?? '');
  const [rec, setRec] = useState(a.assessment?.recommendation ?? '');
  const save = useMutation({ mutationFn: () => api.patch(`/admin/loans/${a.id}/assessment`, { checks, findings, recommendation: rec }), onSuccess: onDone });
  return (
    <Card className="p-6">
      <h2 className="font-display text-lg font-semibold">Verification and assessment</h2>
      <p className="text-xs text-muted">Internal only. {a.assessment ? `Last saved ${fmtDateTime(a.assessment.at)}` : 'Not started'}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {CHECKS.map(([k, label]) => (
          <label key={k} className={`flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium ${checks[k] ? 'bg-brand-soft text-brand' : 'bg-paper'}`}>
            <input type="checkbox" checked={!!checks[k]} onChange={e => setChecks(c => ({ ...c, [k]: e.target.checked }))} className="h-3.5 w-3.5 accent-[#8b6a3e]" />{label}
          </label>
        ))}
      </div>
      <textarea value={findings} onChange={e => setFindings(e.target.value)} rows={4} maxLength={4000} placeholder="Assessment findings: income stability, affordability, credit history, risks…" className={`${inputCls} mt-3 resize-y`} />
      <select value={rec} onChange={e => setRec(e.target.value)} className={`${inputCls} mt-2`}>
        {RECOMMEND.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      {save.isError && <p className="mt-2 text-sm text-bad">{(save.error as Error).message}</p>}
      <Btn busy={save.isPending} onClick={() => save.mutate()} className="mt-3">Save assessment</Btn>
    </Card>
  );
}

function ForwardPanel({ a, onDone }: { a: AdminApp; onDone: () => void }) {
  const [lender, setLender] = useState(a.lender ?? 'Sterling Crest Bank');
  const [note, setNote] = useState('');
  const fwd = useMutation({ mutationFn: () => api.post(`/admin/loans/${a.id}/forward`, { lender, note }), onSuccess: () => { setNote(''); onDone(); } });
  return (
    <Card className="p-6">
      <h2 className="font-display text-lg font-semibold">Lending institution</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        The credit decision belongs to the lender. If a partner lender makes it, forward the application and record the decision they give; don’t approve on their behalf.
      </p>
      {a.forwardedAt && <p className="mt-2 rounded-xl bg-paper px-3 py-2 text-sm">Forwarded to <b>{a.lender}</b> on {fmtDateTime(a.forwardedAt)}</p>}
      <input value={lender} onChange={e => setLender(e.target.value)} maxLength={120} placeholder="Lender name" className={`${inputCls} mt-3`} />
      <input value={note} onChange={e => setNote(e.target.value)} maxLength={500} placeholder="Note (optional)" className={`${inputCls} mt-2`} />
      {fwd.isError && <p className="mt-2 text-sm text-bad">{(fwd.error as Error).message}</p>}
      <Btn tone="light" busy={fwd.isPending} onClick={() => fwd.mutate()} disabled={!lender.trim()} className="mt-3"><Send size={13} />Forward for decision</Btn>
    </Card>
  );
}

/** Tells staff what to do next. The customer only signs after staff issue an offer and the customer accepts it. */
function NextStep({ a }: { a: AdminApp }) {
  const approved = a.decision === 'APPROVED' || a.decision === 'CONDITIONALLY_APPROVED';
  const text =
    a.status === 'REJECTED' ? 'The application was declined. Close it when you are done.'
      : a.status === 'DISBURSED' ? 'The loan has been paid. Track the repayments below; the application closes automatically when the last instalment is paid.'
        : a.signedAt ? 'The customer has signed. Arrange payment: set Disbursement Processing, then Disbursed to record the payment.'
          : a.status === 'AWAITING_SIGNATURE' ? 'Waiting for the customer to sign the agreement in their dashboard (Loans → Offers & agreements). You can message them to remind them.'
            : a.status === 'OFFER_ISSUED' ? 'Waiting for the customer to accept the offer in their dashboard. Once they accept, they sign the agreement there.'
              : approved ? 'Approved. Next, choose Offer Issued and enter the lender’s terms (amount, rate, term). The customer then accepts and signs online.'
                : 'Review the documents and assessment, then record the lender’s decision: Approved, Conditionally Approved or Rejected.';
  const steps = ['Review', 'Decision', 'Offer', 'Customer signs', 'Pay out'];
  const at = a.status === 'DISBURSED' || a.status === 'CLOSED' ? 5 : a.signedAt ? 4 : a.offer ? 3 : approved ? 2 : a.status === 'REJECTED' ? 1 : 0;
  return (
    <div className="mt-4 rounded-2xl bg-paper p-3.5">
      <ol className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
        {steps.map((s, i) => (
          <li key={s} className={`rounded-full px-2.5 py-1 ${i < at ? 'bg-night text-white' : i === at ? 'bg-brand text-white' : 'bg-white text-muted'}`}>{i + 1}. {s}</li>
        ))}
      </ol>
      <p className="mt-2.5 text-sm"><span className="font-semibold">Next step: </span>{text}</p>
    </div>
  );
}

/** Move the application to any status, with the extra details that status needs. */
function StatusPanel({ a, onDone }: { a: AdminApp; onDone: () => void }) {
  const p = loanProduct(a.product)!;
  const options = LOAN_STATUSES.filter(s => s.key !== 'DRAFT' && s.key !== 'SUBMITTED');
  const approved = a.decision === 'APPROVED' || a.decision === 'CONDITIONALLY_APPROVED';
  /** Why a status can't be chosen yet (undefined = allowed). Mirrors the server's rules. */
  const blocked = (k: string): string | undefined => {
    if (k === a.status) return undefined;
    if (k === 'OFFER_ISSUED' && !approved) return 'record approval first';
    if (k === 'AWAITING_SIGNATURE' && !a.offer) return 'issue an offer first';
    if (k === 'AGREEMENT_COMPLETED') return a.signedAt ? undefined : 'the customer signs this';
    if ((k === 'DISBURSEMENT_PROCESSING' || k === 'DISBURSED') && !a.signedAt) return 'after the customer signs';
    return undefined;
  };
  const [status, setStatus] = useState<LoanStatus>(a.status === 'SUBMITTED' ? 'UNDER_REVIEW' : a.status);
  const [note, setNote] = useState('');
  const [requests, setRequests] = useState([{ label: '', note: '' }]);
  const [decisionNote, setDecisionNote] = useState('');
  const [conditions, setConditions] = useState(a.conditions ?? '');
  const [lender, setLender] = useState(a.lender ?? 'Sterling Crest Bank');
  const [offer, setOffer] = useState({
    amount: a.amountMinor ? String(a.amountMinor / 100) : '', currency: a.currency ?? 'USD', ratePct: '',
    termMonths: a.termMonths ? String(a.termMonths) : '', fees: '', conditions: a.conditions ?? '', expiresAt: '',
  });
  const offerCur = a.offer?.currency ?? a.currency ?? 'USD';
  const walletsForOffer = a.user.wallets.filter(w => w.currency === offerCur);
  const [method, setMethod] = useState<'WALLET' | 'EXTERNAL'>(walletsForOffer.length ? 'WALLET' : 'EXTERNAL');
  const [walletId, setWalletId] = useState(
    (a.banking?.walletId && walletsForOffer.some(w => w.id === a.banking!.walletId) ? a.banking.walletId : walletsForOffer[0]?.id) ?? '',
  );
  const [payRef, setPayRef] = useState('');

  const amt = parseFloat(offer.amount.replace(/,/g, ''));
  const rate = parseFloat(offer.ratePct);
  const term = parseInt(offer.termMonths, 10);
  const monthly = amt > 0 && rate >= 0 && term > 0 ? loanMonthlyPayment(Math.round(amt * 100), rate, term) : 0;

  const save = useMutation({
    mutationFn: () => api.patch(`/admin/loans/${a.id}/status`, {
      status,
      note: note.trim() || undefined,
      requests: status === 'DOCUMENTS_REQUIRED' ? requests.filter(r => r.label.trim()) : undefined,
      decisionNote: ['APPROVED', 'CONDITIONALLY_APPROVED', 'REJECTED'].includes(status) ? decisionNote : undefined,
      conditions: status === 'CONDITIONALLY_APPROVED' ? conditions : undefined,
      lender,
      offer: status === 'OFFER_ISSUED' ? offer : undefined,
      disbursement: status === 'DISBURSED' ? { method, walletId, reference: payRef } : undefined,
    }),
    onSuccess: () => { setNote(''); setRequests([{ label: '', note: '' }]); setDecisionNote(''); setPayRef(''); onDone(); },
  });

  const isDecision = status === 'APPROVED' || status === 'CONDITIONALLY_APPROVED' || status === 'REJECTED';
  return (
    <Card className="p-6">
      <h2 className="font-display text-lg font-semibold">Update status</h2>
      <p className="text-sm text-muted">The customer is notified and sees your update on their loan dashboard.</p>
      <select value={status} onChange={e => setStatus(e.target.value as LoanStatus)} className={`${inputCls} mt-4`}>
        {options.map(s => {
          const why = blocked(s.key);
          return (
            <option key={s.key} value={s.key} disabled={!!why}>
              {s.label}{s.key === a.status ? ' (current)' : why ? ` (${why})` : ''}
            </option>
          );
        })}
      </select>
      <p className="mt-1.5 text-xs text-muted">{loanStatus(status)?.meaning}</p>

      {status === 'DOCUMENTS_REQUIRED' && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">Documents or information to request</p>
          {requests.map((r, i) => (
            <div key={i} className="rounded-xl bg-paper p-2.5">
              <div className="flex gap-2">
                <input list={`ld-${a.id}`} value={r.label} onChange={e => setRequests(rs => rs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="e.g. Payslips for the last 3 months" className={inputCls} />
                {requests.length > 1 && <button onClick={() => setRequests(rs => rs.filter((_, j) => j !== i))} className="text-muted hover:text-bad" aria-label="Remove"><X size={16} /></button>}
              </div>
              <input value={r.note} onChange={e => setRequests(rs => rs.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))} placeholder="Note for the customer (optional)" className={`${inputCls} mt-2`} />
            </div>
          ))}
          <datalist id={`ld-${a.id}`}>{loanDocuments(p).map(d => <option key={d.key} value={d.label} />)}</datalist>
          <button onClick={() => setRequests(rs => [...rs, { label: '', note: '' }])} className="flex items-center gap-1 text-sm font-semibold text-brand"><Plus size={14} />Another item</button>
        </div>
      )}

      {isDecision && (
        <div className="mt-4 space-y-3">
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-warn">Record the decision made by the lender named below.</p>
          <label className="block text-sm font-medium">Lender<input value={lender} onChange={e => setLender(e.target.value)} className={`${inputCls} mt-1.5`} /></label>
          {status === 'CONDITIONALLY_APPROVED' && (
            <label className="block text-sm font-medium">Conditions (shown to the customer)
              <textarea value={conditions} onChange={e => setConditions(e.target.value)} rows={3} maxLength={2000} className={`${inputCls} mt-1.5 resize-y`} placeholder="e.g. Provide a guarantor; reduced amount of …" />
            </label>
          )}
          <label className="block text-sm font-medium">{status === 'REJECTED' ? 'Reason given by the lender (required)' : 'Decision note (optional)'}
            <textarea value={decisionNote} onChange={e => setDecisionNote(e.target.value)} rows={3} maxLength={2000} className={`${inputCls} mt-1.5 resize-y`} />
          </label>
        </div>
      )}

      {status === 'OFFER_ISSUED' && (
        <div className="mt-4 space-y-2">
          {a.decision !== 'APPROVED' && a.decision !== 'CONDITIONALLY_APPROVED' && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-bad">Record the lender’s approval first. An offer can only follow an approval.</p>
          )}
          <p className="text-sm font-medium">Offer terms from the lender</p>
          <div className="grid grid-cols-[1fr_100px] gap-2">
            <input inputMode="decimal" value={offer.amount} onChange={e => setOffer({ ...offer, amount: e.target.value })} placeholder="Amount" className={inputCls} />
            <select value={offer.currency} onChange={e => setOffer({ ...offer, currency: e.target.value })} className={inputCls}>{LOAN_CURRENCIES.map(c => <option key={c}>{c}</option>)}</select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input inputMode="decimal" value={offer.ratePct} onChange={e => setOffer({ ...offer, ratePct: e.target.value })} placeholder="Interest rate % APR" className={inputCls} />
            <input inputMode="numeric" value={offer.termMonths} onChange={e => setOffer({ ...offer, termMonths: e.target.value })} placeholder="Term (months)" className={inputCls} />
          </div>
          <textarea value={offer.fees} onChange={e => setOffer({ ...offer, fees: e.target.value })} rows={2} maxLength={1000} placeholder="Fees (e.g. arrangement fee, early repayment charge), or leave empty" className={`${inputCls} resize-y`} />
          <textarea value={offer.conditions} onChange={e => setOffer({ ...offer, conditions: e.target.value })} rows={2} maxLength={2000} placeholder="Conditions (optional)" className={`${inputCls} resize-y`} />
          <label className="block text-xs font-medium text-muted">Offer valid until (optional)<input type="date" value={offer.expiresAt} onChange={e => setOffer({ ...offer, expiresAt: e.target.value })} className={`${inputCls} mt-1`} /></label>
          {monthly > 0 && (
            <p className="rounded-xl bg-paper px-3 py-2 text-sm">
              Monthly repayment <b>{anyMoney(monthly, offer.currency)}</b> · total <b>{anyMoney(monthly * term, offer.currency)}</b>
            </p>
          )}
        </div>
      )}

      {(status === 'DISBURSEMENT_PROCESSING' || status === 'DISBURSED' || status === 'AGREEMENT_COMPLETED') && !a.signedAt && (
        <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs text-bad">The customer hasn’t signed the agreement yet.</p>
      )}

      {status === 'DISBURSED' && a.offer && !a.disbursement && (
        <div className="mt-4 space-y-2 rounded-2xl bg-paper p-3">
          <p className="text-sm font-medium">Record the payment of {anyMoney(a.offer.amountMinor, a.offer.currency)}</p>
          <div className="flex gap-2">
            {(['WALLET', 'EXTERNAL'] as const).map(m => (
              <button key={m} type="button" onClick={() => setMethod(m)} disabled={m === 'WALLET' && !walletsForOffer.length}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold disabled:opacity-40 ${method === m ? 'bg-night text-white' : 'bg-white'}`}>
                {m === 'WALLET' ? 'Credit Sterling Crest wallet' : 'Paid externally'}
              </button>
            ))}
          </div>
          {method === 'WALLET' ? (
            <select value={walletId} onChange={e => setWalletId(e.target.value)} className={inputCls}>
              {walletsForOffer.map(w => <option key={w.id} value={w.id}>{w.currency} · {w.accountNumber}</option>)}
            </select>
          ) : (
            <input value={payRef} onChange={e => setPayRef(e.target.value)} maxLength={120} placeholder="Payment reference from the lender" className={inputCls} />
          )}
          {!walletsForOffer.length && <p className="text-xs text-muted">The customer has no {offerCur} wallet, so record an external payment.</p>}
        </div>
      )}

      <label className="mt-4 block text-sm font-medium">Update for the customer
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} maxLength={1000} className={`${inputCls} mt-1.5 resize-y`}
          placeholder={`Optional. Default: "${loanStatus(status)?.meaning}."`} />
      </label>
      {save.isError && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-bad">{(save.error as Error).message}</p>}
      <Btn busy={save.isPending} onClick={() => save.mutate()} className="mt-4 w-full !py-3 !text-sm"
        tone={status === 'REJECTED' || status === 'CLOSED' ? 'red' : ['APPROVED', 'CONDITIONALLY_APPROVED', 'DISBURSED'].includes(status) ? 'green' : 'dark'}>
        {status === a.status ? 'Post update' : `Set to ${loanStatus(status)?.label}`}
      </Btn>
    </Card>
  );
}
