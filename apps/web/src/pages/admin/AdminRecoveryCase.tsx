import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Eye, Lock, Plus, Send, StickyNote, Trash2, X } from 'lucide-react';
import { RECOVERY_STATUSES, recoveryCategory, recoveryStatus, type RecoveryStatus } from '@kestrel/shared';
import { api } from '../../lib/api';
import { Fold } from '../../components/Fold';
import {
  StageBar, StatusBadge, Thread, amountText, fmtDate, fmtDateTime, fmtSize,
  type CaseEvent, type CaseMessage, type DocMeta, type DocRequest,
} from '../recovery/shared';
import { Badge, Btn, Card, Loading, inputCls, money } from './ui';

type AdminCase = {
  id: string;
  reference: string;
  category: string;
  status: RecoveryStatus;
  fullName: string | null;
  country: string | null;
  incidentDate: string | null;
  amountMinor: number | null;
  currency: string | null;
  paymentMethod: string | null;
  institution: string | null;
  description: string | null;
  contactedProvider: boolean | null;
  previousAction: string | null;
  answers: Record<string, string> | null;
  latestUpdate: string | null;
  proposal: string | null;
  proposalDecision: string | null;
  outcome: string | null;
  creditMinor: number | null;
  creditCurrency: string | null;
  creditTxId: string | null;
  submittedAt: string | null;
  termsAcceptedAt: string | null;
  user: {
    id: string; name: string; email: string; phone: string | null; status: string; kycStatus: string;
    wallets: { id: string; currency: string; accountNumber: string; balanceMinor: number }[];
  };
  documents: DocMeta[];
  requests: DocRequest[];
  messages: CaseMessage[];
  events: CaseEvent[];
};

export function AdminRecoveryCase() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const { data: c, isLoading, error } = useQuery({
    queryKey: ['admin-recovery-case', id],
    queryFn: () => api.get<AdminCase>(`/admin/recovery/${id}`),
    refetchInterval: 15_000,
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['admin-recovery-case', id] });
    qc.invalidateQueries({ queryKey: ['admin-recovery'] });
    qc.invalidateQueries({ queryKey: ['admin-recovery-counts'] });
    qc.invalidateQueries({ queryKey: ['admin-overview'] });
  };

  const unread = c?.messages.filter(m => m.sender === 'CUSTOMER' && !m.readAt).length ?? 0;
  const read = useMutation({ mutationFn: () => api.post(`/admin/recovery/${id}/messages/read`), onSuccess: refresh });
  useEffect(() => { if (unread) read.mutate(); }, [unread]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = useMutation({ mutationFn: (body: string) => api.post(`/admin/recovery/${id}/messages`, { body }), onSuccess: refresh });
  const cancelReq = useMutation({ mutationFn: (rid: string) => api.del(`/admin/recovery/${id}/requests/${rid}`), onSuccess: refresh });
  const [note, setNote] = useState('');
  const addNote = useMutation({
    mutationFn: () => api.post(`/admin/recovery/${id}/notes`, { note }),
    onSuccess: () => { setNote(''); refresh(); },
  });

  if (isLoading) return <Loading h="h-96" />;
  if (error || !c) return <p className="text-sm text-bad">{(error as Error)?.message ?? 'Case not found'}</p>;

  const cat = recoveryCategory(c.category)!;
  const evidenceLabel = (k: string) => cat.evidence.find(e => e.key === k)?.label ?? (k === 'REQUESTED' ? 'Requested document' : 'Other');

  return (
    <div className="space-y-5">
      <Link to="/admin/fund-recovery" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-night">
        <ArrowLeft size={15} /> All cases
      </Link>

      <section className="rounded-[28px] bg-night p-6 text-white sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-display text-2xl font-semibold tracking-wide">{c.reference}</p>
            <p className="text-sm text-white/60">{cat.name} · submitted {fmtDate(c.submittedAt)}</p>
            <p className="mt-2 text-sm">
              <Link to={`/admin/customers/${c.user.id}`} className="font-semibold hover:underline">{c.user.name}</Link>
              <span className="text-white/60"> · {c.user.email}{c.user.phone ? ` · ${c.user.phone}` : ''}</span>
            </p>
            <div className="mt-2 flex gap-2">
              {c.user.status !== 'ACTIVE' && <Badge status={c.user.status} />}
              <Badge tone={c.user.kycStatus === 'APPROVED' ? 'green' : 'grey'}>ID {c.user.kycStatus === 'APPROVED' ? 'verified' : 'not verified'}</Badge>
            </div>
          </div>
          <div className="text-right">
            <StatusBadge status={c.status} className="!text-xs" />
            <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{amountText(c.amountMinor, c.currency)}</p>
          </div>
        </div>
        <div className="mt-5"><StageBar status={c.status} dark /></div>
        {c.latestUpdate && <p className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm"><span className="text-white/50">Customer sees: </span>{c.latestUpdate}</p>}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-5">
          {/* Application (folded) */}
          <Fold title="Application details" summary={`${c.fullName ?? ''} · ${amountText(c.amountMinor, c.currency)} · ${c.institution ?? ''} · ${fmtDate(c.incidentDate)}`}>
            <dl className="grid gap-x-6 text-sm sm:grid-cols-2">
              {[
                ['Full name', c.fullName], ['Country', c.country], ['Incident date', fmtDate(c.incidentDate)],
                ['Amount', amountText(c.amountMinor, c.currency)], ['Payment method', c.paymentMethod], ['Institution / provider', c.institution],
                ['Contacted provider', c.contactedProvider ? 'Yes' : 'No'], ['Terms accepted', fmtDateTime(c.termsAcceptedAt)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-line py-2.5"><dt className="text-muted">{k}</dt><dd className="text-right font-medium">{v || '—'}</dd></div>
              ))}
            </dl>
            {c.previousAction && <p className="mt-3 text-sm"><span className="text-muted">Provider's response: </span>{c.previousAction}</p>}
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted">What happened</p>
            <p className="mt-1 whitespace-pre-wrap rounded-xl bg-paper p-3 text-sm leading-relaxed">{c.description}</p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted">{cat.name} questions</p>
            <dl className="mt-1 divide-y divide-line text-sm">
              {cat.questions.filter(q => c.answers?.[q.key]).map(q => (
                <div key={q.key} className="flex justify-between gap-4 py-2.5"><dt className="text-muted">{q.label}</dt><dd className="text-right font-medium">{c.answers![q.key]}</dd></div>
              ))}
            </dl>
          </Fold>

          {/* Documents */}
          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold">Evidence ({c.documents.length})</h2>
            <ul className="mt-3 divide-y divide-line rounded-2xl border border-line">
              {c.documents.map(d => (
                <li key={d.id}>
                  <a href={`/api/admin/recovery/${c.id}/documents/${d.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-paper/60">
                    <Eye size={14} className="shrink-0 text-muted" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{d.name}</span>
                      <span className="block text-xs text-muted">
                        {d.requestId ? `For request: ${c.requests.find(r => r.id === d.requestId)?.label ?? ''}` : evidenceLabel(d.kind)} · {fmtSize(d.size)}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">{fmtDate(d.createdAt)}</span>
                  </a>
                </li>
              ))}
            </ul>
            {c.requests.length > 0 && (
              <>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Document requests</p>
                <ul className="mt-2 space-y-2 text-sm">
                  {c.requests.map(r => (
                    <li key={r.id} className="flex items-center gap-3 rounded-xl bg-paper px-3 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{r.label}</span>
                        {r.note && <span className="block truncate text-xs text-muted">{r.note}</span>}
                      </span>
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

          {/* Messages */}
          <Card className="p-6">
            <h2 className="mb-3 font-display text-lg font-semibold">Messages with the customer</h2>
            <Thread messages={c.messages} me="STAFF" onSend={body => send.mutateAsync(body)} sending={send.isPending}
              error={send.isError ? (send.error as Error).message : ''} />
          </Card>
        </div>

        <div className="order-first space-y-5 lg:order-none">
          <RecoveryAction c={c} onDone={refresh} />
          <details className="group rounded-[22px] bg-white">
            <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 font-display text-base font-semibold [&::-webkit-details-marker]:hidden">
              More options
              <span className="text-xs font-normal text-muted group-open:hidden">Request documents · change status manually</span>
            </summary>
            <div className="px-2 pb-2">
              {c.status !== 'CLOSED' ? <StatusPanel c={c} onDone={refresh} /> : (
                <Card className="p-6"><p className="text-sm text-muted">This case is closed. No further status changes are possible.</p></Card>
              )}
            </div>
          </details>

          {c.proposal && (
            <Card className="p-6">
              <h2 className="font-display text-lg font-semibold">Proposed assistance</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm">{c.proposal}</p>
              <p className="mt-3 text-sm">
                Customer decision: {c.proposalDecision ? <Badge tone={c.proposalDecision === 'APPROVED' ? 'green' : 'red'}>{c.proposalDecision.toLowerCase()}</Badge> : <Badge tone="amber">waiting</Badge>}
              </p>
            </Card>
          )}
          {(c.outcome || c.creditMinor) && (
            <Card className="p-6">
              <h2 className="font-display text-lg font-semibold">Outcome</h2>
              {c.outcome && <p className="mt-2 whitespace-pre-wrap text-sm">{c.outcome}</p>}
              {c.creditMinor && c.creditCurrency && <p className="mt-3 rounded-xl bg-brand-soft px-3 py-2 text-sm text-brand">Credited {money(c.creditMinor, c.creditCurrency)} to the customer's {c.creditCurrency} wallet.</p>}
            </Card>
          )}

          {/* Timeline + internal notes */}
          <Fold title="Timeline and internal notes" summary={`${c.events.length} update${c.events.length === 1 ? '' : 's'} · last ${fmtDateTime(c.events[c.events.length - 1]?.createdAt)}`}>
            <div className="flex gap-2">
              <input value={note} onChange={e => setNote(e.target.value)} maxLength={2000} placeholder="Internal note (customer can't see it)" className={inputCls} />
              <Btn onClick={() => addNote.mutate()} disabled={!note.trim()} busy={addNote.isPending}><StickyNote size={13} />Add</Btn>
            </div>
            <ol className="mt-4 space-y-3">
              {[...c.events].reverse().map(e => (
                <li key={e.id} className={`rounded-xl px-3 py-2.5 text-sm ${e.internal ? 'bg-amber-50' : 'bg-paper'}`}>
                  <p className="flex flex-wrap items-center gap-2">
                    {e.internal && <span className="flex items-center gap-1 text-[11px] font-semibold text-warn"><Lock size={11} />Internal</span>}
                    {e.status && <span className="font-semibold">{recoveryStatus(e.status)?.label}</span>}
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

/* ---------- Guided actions: only what makes sense at this stage ---------- */

const RSTEPS = ['Review', 'Assessment', 'Customer approves', 'Recovery', 'Outcome'];
const RSTEP_OF: Record<string, number> = {
  SUBMITTED: 0, UNDER_REVIEW: 0, DOCUMENTS_REQUIRED: 0, ASSESSMENT_COMPLETE: 1, AWAITING_CUSTOMER_APPROVAL: 2,
  RECOVERY_ACTIVE: 3, AWAITING_THIRD_PARTY: 3, RESOLVED: 4, UNSUCCESSFUL: 4, CLOSED: 5,
};

function RecoveryAction({ c, onDone }: { c: AdminCase; onDone: () => void }) {
  const cat = recoveryCategory(c.category)!;
  const [mode, setMode] = useState<null | 'docs' | 'propose' | 'resolve' | 'unsuccessful'>(null);
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [other, setOther] = useState('');
  const [credit, setCredit] = useState(true);
  const [walletId, setWalletId] = useState(c.user.wallets.find(w => w.currency === c.currency)?.id ?? c.user.wallets[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const run = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.patch(`/admin/recovery/${c.id}/status`, body),
    onSuccess: () => { setMode(null); setText(''); setPicked([]); setOther(''); setAmount(''); onDone(); },
  });
  const remind = useMutation({ mutationFn: (body: string) => api.post(`/admin/recovery/${c.id}/messages`, { body }), onSuccess: onDone });
  const go = (status: RecoveryStatus, extra: Record<string, unknown> = {}) => run.mutate({ status, ...extra });
  const at = RSTEP_OF[c.status] ?? 0;
  const wallet = c.user.wallets.find(w => w.id === walletId);
  const amt = parseFloat(amount);
  const openRequests = c.requests.filter(r => !r.fulfilledAt).length;

  const B = ({ children, onClick, tone = 'dark', disabled }: { children: React.ReactNode; onClick: () => void; tone?: 'dark' | 'green' | 'red' | 'light' | 'amber'; disabled?: boolean }) => (
    <Btn tone={tone} onClick={onClick} busy={run.isPending} disabled={disabled} className="!px-5 !py-3 !text-sm">{children}</Btn>
  );
  const cancel = <button onClick={() => setMode(null)} className="px-3 text-sm font-semibold text-muted hover:text-night">Cancel</button>;

  let body: React.ReactNode = null;
  if (mode === 'docs') {
    const requests = [...picked, ...other.split('\n').map(s => s.trim()).filter(Boolean)].map(label => ({ label }));
    body = (
      <div className="rounded-2xl bg-paper p-4">
        <p className="font-semibold">Ask the customer for more evidence</p>
        <p className="mb-3 text-xs text-muted">Tick what you need. They get a notification and can upload it straight away.</p>
        <div className="flex flex-wrap gap-2">
          {cat.evidence.map(e => (
            <button key={e.key} type="button" onClick={() => setPicked(x => (x.includes(e.label) ? x.filter(y => y !== e.label) : [...x, e.label]))}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${picked.includes(e.label) ? 'bg-night text-white' : 'bg-white'}`}>{e.label}</button>
          ))}
        </div>
        <textarea value={other} onChange={e => setOther(e.target.value)} rows={2} placeholder="Anything else? One item per line" className={`${inputCls} mt-3 resize-y`} />
        <div className="mt-3 flex items-center"><B disabled={!requests.length} onClick={() => go('DOCUMENTS_REQUIRED', { requests })}>Send request ({requests.length})</B>{cancel}</div>
      </div>
    );
  } else if (mode === 'propose') {
    body = (
      <div className="rounded-2xl bg-paper p-4">
        <p className="font-semibold">Propose assistance</p>
        <p className="mb-3 text-xs text-muted">Explain what you will do, who you will contact, and what to expect. The customer must approve before you act.</p>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={5} className={`${inputCls} resize-y`} />
        <div className="mt-3 flex items-center"><B tone="green" disabled={!text.trim()} onClick={() => go('AWAITING_CUSTOMER_APPROVAL', { proposal: text })}>Send to customer for approval</B>{cancel}</div>
      </div>
    );
  } else if (mode === 'resolve') {
    body = (
      <div className="rounded-2xl bg-paper p-4">
        <p className="font-semibold">Funds received: resolve the case</p>
        <p className="mb-3 text-xs text-muted">Record the outcome and, if money came back, pay it into the customer's wallet.</p>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder="Outcome for the customer, e.g. The bank returned the full amount." className={`${inputCls} resize-y`} />
        {c.user.wallets.length > 0 && !c.creditTxId && (
          <div className="mt-3 rounded-xl bg-white p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={credit} onChange={e => setCredit(e.target.checked)} className="h-4 w-4 accent-[#8b6a3e]" />
              Pay the recovered money into their wallet
            </label>
            {credit && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <select value={walletId} onChange={e => setWalletId(e.target.value)} className={inputCls}>
                  {c.user.wallets.map(w => <option key={w.id} value={w.id}>{w.currency} · {w.accountNumber}</option>)}
                </select>
                <input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder={`Amount (${wallet?.currency ?? ''})`} className={inputCls} />
              </div>
            )}
          </div>
        )}
        <div className="mt-3 flex items-center">
          <B tone="green" disabled={!text.trim() || (credit && !c.creditTxId && c.user.wallets.length > 0 && !(amt > 0))}
            onClick={() => go('RESOLVED', { outcome: text, credit: credit && amt > 0 && !c.creditTxId ? { walletId, amountMinor: Math.round(amt * 100) } : undefined })}>
            {credit && amt > 0 && wallet ? `Resolve and pay ${money(Math.round(amt * 100), wallet.currency)}` : 'Resolve case'}
          </B>{cancel}
        </div>
      </div>
    );
  } else if (mode === 'unsuccessful') {
    body = (
      <div className="rounded-2xl bg-paper p-4">
        <p className="font-semibold">Close as unsuccessful</p>
        <p className="mb-3 text-xs text-muted">Explain why recovery wasn't possible. The customer sees this.</p>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={3} className={`${inputCls} resize-y`} />
        <div className="mt-3 flex items-center"><B tone="red" disabled={!text.trim()} onClick={() => go('UNSUCCESSFUL', { outcome: text })}>Confirm</B>{cancel}</div>
      </div>
    );
  } else if (c.status === 'SUBMITTED' || c.status === 'UNDER_REVIEW') {
    body = (
      <>
        <p className="text-sm">{c.status === 'SUBMITTED' ? 'New case. Read the application and evidence, then decide what comes next.' : 'Reviewing. Ask for more evidence, or finish the assessment.'}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {c.status === 'SUBMITTED' && <B onClick={() => go('UNDER_REVIEW', { note: 'A case officer is now reviewing your application.' })}>Start review</B>}
          <B tone="light" onClick={() => setMode('docs')}>Ask for more evidence</B>
          <B tone="green" onClick={() => setMode('propose')}>Propose assistance</B>
          <B tone="red" onClick={() => setMode('unsuccessful')}>No recovery possible</B>
        </div>
      </>
    );
  } else if (c.status === 'DOCUMENTS_REQUIRED') {
    body = (
      <>
        <p className="text-sm">Waiting for the customer to upload {openRequests} requested item{openRequests === 1 ? '' : 's'}. The case comes back to review automatically when they do.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn tone="light" busy={remind.isPending} className="!px-5 !py-3 !text-sm" onClick={() => remind.mutate(`A reminder about your case ${c.reference}: we're still waiting for the documents we requested. You can upload them in Fund Recovery → Document centre.`)}><Send size={14} /> Send a reminder</Btn>
          <B tone="light" onClick={() => go('UNDER_REVIEW')}>Continue without them</B>
        </div>
      </>
    );
  } else if (c.status === 'ASSESSMENT_COMPLETE') {
    body = (
      <>
        <p className="text-sm">Assessment done. Propose the assistance for the customer to approve, or close the case if no route exists.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <B tone="green" onClick={() => setMode('propose')}>Propose assistance</B>
          <B tone="red" onClick={() => setMode('unsuccessful')}>No recovery possible</B>
        </div>
      </>
    );
  } else if (c.status === 'AWAITING_CUSTOMER_APPROVAL') {
    body = (
      <>
        <p className="text-sm">Waiting for the customer to approve your proposal in their dashboard.</p>
        <div className="mt-3"><Btn tone="light" busy={remind.isPending} className="!px-5 !py-3 !text-sm" onClick={() => remind.mutate(`A reminder about your case ${c.reference}: please review and approve the proposed assistance so we can continue.`)}><Send size={14} /> Send a reminder</Btn></div>
      </>
    );
  } else if (c.status === 'RECOVERY_ACTIVE' || c.status === 'AWAITING_THIRD_PARTY') {
    body = (
      <>
        <p className="text-sm">
          {c.status === 'RECOVERY_ACTIVE'
            ? 'The customer approved. Contact the bank, provider or authority, then mark the case as waiting for them.'
            : 'Waiting for the third party (bank, provider or authority). When the money comes back, resolve the case and pay it in.'}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {c.status === 'RECOVERY_ACTIVE' && <B tone="light" onClick={() => go('AWAITING_THIRD_PARTY')}>Waiting for third party</B>}
          <B tone="green" onClick={() => setMode('resolve')}>Funds received: resolve</B>
          <B tone="red" onClick={() => setMode('unsuccessful')}>Unsuccessful</B>
        </div>
      </>
    );
  } else if (c.status === 'RESOLVED' || c.status === 'UNSUCCESSFUL') {
    body = (
      <>
        <p className="text-sm">{c.status === 'RESOLVED' ? `Resolved${c.creditMinor && c.creditCurrency ? `: ${money(c.creditMinor, c.creditCurrency)} paid into their wallet` : ''}.` : 'Closed as unsuccessful.'} Close the case when everything is done.</p>
        <div className="mt-3"><B onClick={() => go('CLOSED')}>Close case</B></div>
      </>
    );
  } else {
    body = <p className="text-sm text-muted">This case is closed. Nothing more to do.</p>;
  }

  return (
    <Card className="p-6 ring-2 ring-brand/30">
      <h2 className="font-display text-lg font-semibold">What to do now</h2>
      <ol className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
        {RSTEPS.map((s, i) => <li key={s} className={`rounded-full px-2.5 py-1 ${i < at ? 'bg-night text-white' : i === at ? 'bg-brand text-white' : 'bg-paper text-muted'}`}>{i + 1}. {s}</li>)}
      </ol>
      <div className="mt-4">{body}</div>
      {run.isError && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-bad">{(run.error as Error).message}</p>}
      {remind.isSuccess && <p className="mt-2 text-xs text-brand">Reminder sent.</p>}
    </Card>
  );
}

/** Move the case to any status, with the extra details that status needs. */
function StatusPanel({ c, onDone }: { c: AdminCase; onDone: () => void }) {
  const options = RECOVERY_STATUSES.filter(s => s.key !== 'DRAFT' && s.key !== 'SUBMITTED');
  const [status, setStatus] = useState<RecoveryStatus>(c.status === 'SUBMITTED' ? 'UNDER_REVIEW' : c.status);
  const [note, setNote] = useState('');
  const [requests, setRequests] = useState<{ label: string; note: string }[]>([{ label: '', note: '' }]);
  const [proposal, setProposal] = useState(c.proposal ?? '');
  const [outcome, setOutcome] = useState(c.outcome ?? '');
  const [credit, setCredit] = useState(false);
  const [walletId, setWalletId] = useState(c.user.wallets.find(w => w.currency === c.currency)?.id ?? c.user.wallets[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const cat = recoveryCategory(c.category)!;

  const save = useMutation({
    mutationFn: () =>
      api.patch(`/admin/recovery/${c.id}/status`, {
        status,
        note: note.trim() || undefined,
        requests: status === 'DOCUMENTS_REQUIRED' ? requests.filter(r => r.label.trim()) : undefined,
        proposal: status === 'AWAITING_CUSTOMER_APPROVAL' ? proposal : undefined,
        outcome: status === 'RESOLVED' || status === 'UNSUCCESSFUL' ? outcome : undefined,
        credit: status === 'RESOLVED' && credit && parseFloat(amount) > 0 ? { walletId, amountMinor: Math.round(parseFloat(amount) * 100) } : undefined,
      }),
    onSuccess: () => { setNote(''); setRequests([{ label: '', note: '' }]); setAmount(''); setCredit(false); onDone(); },
  });
  const wallet = c.user.wallets.find(w => w.id === walletId);

  return (
    <Card className="p-6">
      <h2 className="font-display text-lg font-semibold">Update status</h2>
      <p className="text-sm text-muted">The customer is notified and sees your update on their dashboard.</p>
      <select value={status} onChange={e => setStatus(e.target.value as RecoveryStatus)} className={`${inputCls} mt-4`}>
        {options.map(s => <option key={s.key} value={s.key}>{s.label}{s.key === c.status ? ' (current)' : ''}</option>)}
      </select>
      <p className="mt-1.5 text-xs text-muted">{recoveryStatus(status)?.meaning}</p>

      {status === 'DOCUMENTS_REQUIRED' && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">Documents to request</p>
          {requests.map((r, i) => (
            <div key={i} className="rounded-xl bg-paper p-2.5">
              <div className="flex gap-2">
                <input list={`ev-${c.id}`} value={r.label} onChange={e => setRequests(rs => rs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                  placeholder="e.g. Bank statement for March" className={inputCls} />
                {requests.length > 1 && <button onClick={() => setRequests(rs => rs.filter((_, j) => j !== i))} className="text-muted hover:text-bad" aria-label="Remove"><X size={16} /></button>}
              </div>
              <input value={r.note} onChange={e => setRequests(rs => rs.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))}
                placeholder="Note for the customer (optional)" className={`${inputCls} mt-2`} />
            </div>
          ))}
          <datalist id={`ev-${c.id}`}>{cat.evidence.map(e => <option key={e.key} value={e.label} />)}</datalist>
          <button onClick={() => setRequests(rs => [...rs, { label: '', note: '' }])} className="flex items-center gap-1 text-sm font-semibold text-brand"><Plus size={14} />Another document</button>
        </div>
      )}

      {status === 'AWAITING_CUSTOMER_APPROVAL' && (
        <label className="mt-4 block text-sm font-medium">Proposed assistance (customer must approve)
          <textarea value={proposal} onChange={e => setProposal(e.target.value)} rows={5} maxLength={4000} className={`${inputCls} mt-1.5 resize-y`}
            placeholder="Explain what you will do, who you will contact, any costs, and what the customer should expect." />
        </label>
      )}

      {(status === 'RESOLVED' || status === 'UNSUCCESSFUL') && (
        <label className="mt-4 block text-sm font-medium">Outcome (shown to the customer)
          <textarea value={outcome} onChange={e => setOutcome(e.target.value)} rows={4} maxLength={2000} className={`${inputCls} mt-1.5 resize-y`} />
        </label>
      )}

      {status === 'RESOLVED' && !c.creditTxId && c.user.wallets.length > 0 && (
        <div className="mt-4 rounded-2xl bg-paper p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={credit} onChange={e => setCredit(e.target.checked)} className="h-4 w-4 accent-[#8b6a3e]" />
            Credit recovered funds to the customer's wallet
          </label>
          {credit && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <select value={walletId} onChange={e => setWalletId(e.target.value)} className={inputCls}>
                {c.user.wallets.map(w => <option key={w.id} value={w.id}>{w.currency} · {w.accountNumber}</option>)}
              </select>
              <input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder={`Amount (${wallet?.currency ?? ''})`} className={inputCls} />
            </div>
          )}
        </div>
      )}

      <label className="mt-4 block text-sm font-medium">Update for the customer
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} maxLength={1000} className={`${inputCls} mt-1.5 resize-y`}
          placeholder={`Optional. Default: "${recoveryStatus(status)?.meaning}."`} />
      </label>
      {save.isError && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-bad">{(save.error as Error).message}</p>}
      <Btn busy={save.isPending} onClick={() => save.mutate()} className="mt-4 w-full !py-3 !text-sm"
        tone={status === 'UNSUCCESSFUL' || status === 'CLOSED' ? 'red' : status === 'RESOLVED' ? 'green' : 'dark'}>
        {status === c.status ? 'Post update' : `Set to ${recoveryStatus(status)?.label}`}
        {status === 'RESOLVED' && credit && parseFloat(amount) > 0 && wallet ? ` and credit ${money(Math.round(parseFloat(amount) * 100), wallet.currency)}` : ''}
      </Btn>
    </Card>
  );
}
