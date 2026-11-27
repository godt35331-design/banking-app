import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Bell, CircleDot, Eye, FileSignature, FileWarning, IdCard, Mail, Phone, Settings, UserRound } from 'lucide-react';
import { loanStatus } from '@kestrel/shared';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import type { LoanDetailT } from './LoanDetail';
import {
  DropZone, LoanStatusBadge, OfferFigures, Panel, Thread, fmtDate, fmtDateTime, fmtSize, productName,
  type LoanDoc, type LoanSummary,
} from './shared';

const H = ({ title, sub }: { title: string; sub: string }) => (
  <div className="mb-5">
    <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.03em]">{title}</h1>
    <p className="mt-1 text-sm text-muted">{sub}</p>
  </div>
);

/* ---------- Documents ---------- */

type Centre = {
  documents: (LoanDoc & { applicationId: string; application: { reference: string | null; product: string } })[];
  requests: { id: string; label: string; note: string | null; createdAt: string; application: { id: string; reference: string | null; product: string; status: string } }[];
};

const REVIEW_TONE = { PENDING: 'bg-paper text-muted', VERIFIED: 'bg-brand-soft text-brand', REJECTED: 'bg-red-50 text-bad' } as const;

export function LoanDocuments() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['loan-centre'], queryFn: () => api.get<Centre>('/loans/centre'), refetchInterval: 20_000 });
  const upload = useMutation({
    mutationFn: ({ file, appId, requestId }: { file: File; appId: string; requestId: string }) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', 'REQUESTED');
      fd.append('requestId', requestId);
      return api.upload(`/loans/applications/${appId}/documents`, fd);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loan-centre'] }); qc.invalidateQueries({ queryKey: ['loan-apps'] }); },
  });
  const groups = new Map<string, Centre['documents']>();
  for (const d of data?.documents ?? []) groups.set(d.applicationId, [...(groups.get(d.applicationId) ?? []), d]);

  return (
    <div className="space-y-5">
      <H title="Documents" sub="Your uploaded documents, and anything your loan officer has asked for." />
      {isLoading ? <div className="skeleton h-60" /> : (
        <>
          <Panel className={data?.requests.length ? 'ring-2 ring-orange-300' : ''}>
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><FileWarning size={18} /> Requested documents</h2>
            {!data?.requests.length ? <p className="mt-2 text-sm text-muted">Nothing requested right now.</p> : (
              <div className="mt-4 space-y-3">
                {data.requests.map(r => (
                  <div key={r.id}>
                    <p className="mb-1.5 text-xs text-muted">
                      <Link to={`/dashboard/loans/applications/${r.application.id}`} className="font-semibold text-night hover:underline">{r.application.reference}</Link>
                      {' · '}{productName(r.application.product)} · requested {fmtDate(r.createdAt)}
                    </p>
                    <DropZone label={r.label} hint={r.note ?? undefined} busy={upload.isPending && upload.variables?.requestId === r.id}
                      onFile={file => upload.mutate({ file, appId: r.application.id, requestId: r.id })} />
                  </div>
                ))}
              </div>
            )}
            {upload.isError && <p className="mt-3 text-sm text-bad">{(upload.error as Error).message}</p>}
          </Panel>
          <Panel>
            <h2 className="font-display text-lg font-semibold">Uploaded documents ({data?.documents.length ?? 0})</h2>
            {!groups.size ? <p className="mt-2 text-sm text-muted">No documents uploaded yet.</p> : (
              <div className="mt-4 space-y-5">
                {[...groups.entries()].map(([appId, docs]) => (
                  <div key={appId}>
                    <p className="text-sm font-semibold">{docs[0].application.reference ?? 'Draft'} <span className="font-normal text-muted">· {productName(docs[0].application.product)}</span></p>
                    <ul className="mt-2 divide-y divide-line rounded-2xl border border-line">
                      {docs.map(d => (
                        <li key={d.id}>
                          <a href={`/api/loans/applications/${appId}/documents/${d.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-paper/60">
                            <Eye size={14} className="shrink-0 text-muted" />
                            <span className="min-w-0 flex-1 truncate">{d.name}</span>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${REVIEW_TONE[d.review]}`}>
                              {d.review === 'PENDING' ? 'Received' : d.review === 'VERIFIED' ? 'Verified' : 'Not accepted'}
                            </span>
                            <span className="hidden shrink-0 text-xs text-muted sm:inline">{fmtSize(d.size)} · {fmtDate(d.createdAt)}</span>
                          </a>
                          {d.review === 'REJECTED' && d.reviewNote && <p className="px-4 pb-2.5 text-xs text-bad">Reason: {d.reviewNote}. Please upload a replacement from the application.</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

/* ---------- Offers & agreements ---------- */

export function LoanOffers() {
  const { data, isLoading } = useQuery({ queryKey: ['loan-apps'], queryFn: () => api.get<LoanSummary[]>('/loans/applications') });
  const withOffer = (data ?? []).filter(a => a.offer);
  return (
    <div>
      <H title="Loan offers and agreements" sub="Formal offers from the lender, and the agreements you have signed." />
      {isLoading ? <div className="skeleton h-60" /> : !withOffer.length ? (
        <div className="rounded-[24px] bg-white p-10 text-center text-sm text-muted">
          You don’t have any offers yet. If an application is approved, the lender’s offer appears here.
        </div>
      ) : (
        <div className="space-y-4">
          {withOffer.map(a => {
            const action = a.status === 'OFFER_ISSUED' ? 'Review offer' : a.status === 'AWAITING_SIGNATURE' ? 'Sign agreement' : 'View agreement';
            return (
              <Panel key={a.id} className={a.status === 'OFFER_ISSUED' || a.status === 'AWAITING_SIGNATURE' ? 'ring-2 ring-orange-300' : ''}>
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-semibold">{a.reference} <span className="font-normal text-muted">· {productName(a.product)}</span></p>
                    <p className="text-xs text-muted">From {a.offer!.lender} · issued {fmtDate(a.offer!.issuedAt)}{a.offer!.expiresAt ? ` · valid until ${fmtDate(a.offer!.expiresAt)}` : ''}</p>
                  </div>
                  <LoanStatusBadge status={a.status} />
                </div>
                <OfferFigures o={a.offer!} />
                <Link to={`/dashboard/loans/applications/${a.id}#offer`} className="mt-4 inline-flex items-center gap-2 rounded-full bg-night px-5 py-2.5 text-sm font-semibold text-white">
                  <FileSignature size={15} /> {action} <ArrowRight size={15} />
                </Link>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- Notifications (application updates) ---------- */

type Update = { id: string; status: string | null; note: string | null; createdAt: string; application: { id: string; reference: string | null; product: string } };

export function LoanUpdates() {
  const { data, isLoading } = useQuery({ queryKey: ['loan-updates'], queryFn: () => api.get<Update[]>('/loans/updates'), refetchInterval: 30_000 });
  return (
    <div>
      <H title="Notifications" sub="Every update on your loan applications, newest first." />
      {isLoading ? <div className="skeleton h-60" /> : !data?.length ? (
        <div className="rounded-[24px] bg-white p-10 text-center text-sm text-muted"><Bell className="mx-auto mb-2" size={22} />No updates yet.</div>
      ) : (
        <Panel>
          <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-line">
            {data.map((e, i) => (
              <li key={e.id} className="relative flex gap-3">
                <span className={`relative z-[1] mt-0.5 grid h-[15px] w-[15px] shrink-0 place-items-center rounded-full ${i === 0 ? 'bg-night text-white' : 'bg-white text-night/40 ring-1 ring-line'}`}><CircleDot size={9} /></span>
                <Link to={`/dashboard/loans/applications/${e.application.id}`} className="min-w-0 flex-1 hover:opacity-80">
                  <p className="text-xs text-muted">{e.application.reference ?? 'Draft'} · {productName(e.application.product)} · {fmtDateTime(e.createdAt)}</p>
                  {e.status && <p className="text-sm font-semibold">{loanStatus(e.status)?.label}</p>}
                  {e.note && <p className="text-sm text-night/80">{e.note}</p>}
                </Link>
              </li>
            ))}
          </ol>
        </Panel>
      )}
    </div>
  );
}

/* ---------- Messages ---------- */

export function LoanMessages() {
  const [params, setParams] = useSearchParams();
  const selected = params.get('app') ?? '';
  const { data } = useQuery({ queryKey: ['loan-apps'], queryFn: () => api.get<LoanSummary[]>('/loans/applications'), refetchInterval: 15_000 });
  const list = (data ?? []).filter(a => a.status !== 'DRAFT');
  return (
    <div>
      <H title="Messages" sub="Talk to the loan officer handling each application." />
      {!list.length ? (
        <div className="rounded-[24px] bg-white p-10 text-center text-sm text-muted">Messages appear here once you’ve submitted an application.</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <ul className={`space-y-2 ${selected ? 'hidden lg:block' : ''}`}>
            {list.map(a => (
              <li key={a.id}>
                <button onClick={() => setParams({ app: a.id })}
                  className={`flex w-full items-center gap-3 rounded-2xl p-4 text-left transition-colors ${selected === a.id ? 'bg-night text-white' : 'bg-white hover:bg-black/5'}`}>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{a.reference}</span>
                    <span className={`block truncate text-xs ${selected === a.id ? 'text-white/60' : 'text-muted'}`}>{productName(a.product)}</span>
                  </span>
                  {(a.unreadMessages ?? 0) > 0
                    ? <span className="grid h-6 min-w-6 place-items-center rounded-full bg-orange-500 px-1.5 text-xs font-bold text-white">{a.unreadMessages}</span>
                    : <LoanStatusBadge status={a.status} />}
                </button>
              </li>
            ))}
          </ul>
          <div className={selected ? '' : 'hidden lg:block'}>
            {selected ? <Conversation id={selected} onBack={() => setParams({})} /> : <div className="rounded-[24px] bg-white p-10 text-center text-sm text-muted">Choose an application.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function Conversation({ id, onBack }: { id: string; onBack: () => void }) {
  const qc = useQueryClient();
  const { data: a } = useQuery({ queryKey: ['loan-app', id], queryFn: () => api.get<LoanDetailT>(`/loans/applications/${id}`), refetchInterval: 8_000 });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['loan-app', id] }); qc.invalidateQueries({ queryKey: ['loan-apps'] }); };
  const send = useMutation({ mutationFn: (body: string) => api.post(`/loans/applications/${id}/messages`, { body }), onSuccess: refresh });
  const read = useMutation({ mutationFn: () => api.post(`/loans/applications/${id}/messages/read`), onSuccess: refresh });
  const unread = a?.messages.filter(m => m.sender === 'STAFF' && !m.readAt).length ?? 0;
  useEffect(() => { if (unread) read.mutate(); }, [unread, id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!a) return <div className="skeleton h-80" />;
  return (
    <section className="rounded-[24px] bg-white p-5">
      <div className="mb-3 flex items-center gap-3">
        <button onClick={onBack} className="lg:hidden" aria-label="Back"><ArrowLeft size={18} /></button>
        <div className="min-w-0 flex-1"><p className="font-semibold">{a.reference}</p><p className="text-xs text-muted">{productName(a.product)}</p></div>
        <LoanStatusBadge status={a.status} />
      </div>
      <Thread messages={a.messages} me="CUSTOMER" staffLabel="Loan officer" onSend={body => send.mutateAsync(body)} sending={send.isPending}
        error={send.isError ? (send.error as Error).message : ''} disabled={a.status === 'CLOSED'} disabledText="This application is closed. Contact support if you need help." />
    </section>
  );
}

/* ---------- Profile ---------- */

export function LoanProfile() {
  const { user } = useAuth();
  const kyc = user?.kycStatus ?? 'NOT_SUBMITTED';
  const kycText = { APPROVED: 'Verified', PENDING: 'Being checked', REJECTED: 'Not accepted, please upload again', NOT_SUBMITTED: 'Not verified yet' }[kyc];
  return (
    <div>
      <H title="My profile" sub="The account details used for your loan applications." />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-night text-white"><UserRound size={24} /></span>
            <div><p className="font-display text-xl font-semibold">{user?.name}</p><p className="text-sm text-muted">Customer since {fmtDate(user?.createdAt)}</p></div>
          </div>
          <dl className="mt-5 divide-y divide-line text-sm">
            <div className="flex items-center justify-between py-3"><dt className="flex items-center gap-2 text-muted"><Mail size={15} />Email</dt><dd className="font-medium">{user?.email}</dd></div>
            <div className="flex items-center justify-between py-3"><dt className="flex items-center gap-2 text-muted"><Phone size={15} />Phone</dt><dd className="font-medium">{user?.phone || '—'}</dd></div>
            <div className="flex items-center justify-between py-3"><dt className="flex items-center gap-2 text-muted"><IdCard size={15} />Identity</dt><dd className={`font-medium ${kyc === 'APPROVED' ? 'text-brand' : ''}`}>{kycText}</dd></div>
          </dl>
          <Link to="/dashboard/settings" className="mt-5 inline-flex items-center gap-2 rounded-full bg-night px-5 py-2.5 text-sm font-semibold text-white"><Settings size={15} /> Edit in Settings</Link>
        </Panel>
        <Panel>
          <h2 className="font-display text-lg font-semibold">How your details are used</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Your name, email and phone are filled in for you when you start an application. You can change them on the application form; the lender uses the details in each application to verify your identity.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Verifying your identity in Settings → Identity can speed up your loan review.
          </p>
        </Panel>
      </div>
    </div>
  );
}
