import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, CircleDot, Eye, FileWarning, Handshake, Loader2, Wallet } from 'lucide-react';
import { recoveryCategory, recoveryStatus } from '@kestrel/shared';
import { api } from '../../lib/api';
import { Fold } from '../../components/Fold';
import { CATEGORY_ICON } from './RecoveryHome';
import {
  DropZone, Panel, StageBar, StatusBadge, Thread, amountText, fmtDate, fmtDateTime, fmtSize,
  type CaseEvent, type CaseMessage, type DocMeta, type DocRequest,
} from './shared';

export type CaseDetail = {
  id: string;
  reference: string | null;
  category: string;
  status: string;
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
  submittedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  documents: DocMeta[];
  requests: DocRequest[];
  messages: CaseMessage[];
  events: CaseEvent[];
};

export function ApplicationDetail() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const { data: c, isLoading, error } = useQuery({
    queryKey: ['recovery-case', id],
    queryFn: () => api.get<CaseDetail>(`/recovery/cases/${id}`),
    refetchInterval: 15_000,
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['recovery-case', id] });
    qc.invalidateQueries({ queryKey: ['recovery-cases'] });
    qc.invalidateQueries({ queryKey: ['recovery-centre'] });
  };

  const unread = c?.messages.filter(m => m.sender === 'STAFF' && !m.readAt).length ?? 0;
  const markRead = useMutation({ mutationFn: () => api.post(`/recovery/cases/${id}/messages/read`), onSuccess: refresh });
  useEffect(() => { if (unread) markRead.mutate(); }, [unread]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = useMutation({ mutationFn: (body: string) => api.post(`/recovery/cases/${id}/messages`, { body }), onSuccess: refresh });
  const upload = useMutation({
    mutationFn: ({ file, requestId }: { file: File; requestId?: string }) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', requestId ? 'REQUESTED' : 'OTHER');
      if (requestId) fd.append('requestId', requestId);
      return api.upload(`/recovery/cases/${id}/documents`, fd);
    },
    onSuccess: refresh,
  });
  const [comment, setComment] = useState('');
  const decide = useMutation({
    mutationFn: (approve: boolean) => api.post(`/recovery/cases/${id}/proposal`, { approve, comment: comment.trim() || undefined }),
    onSuccess: refresh,
  });

  if (isLoading) return <div className="skeleton h-96" />;
  if (error || !c) return <p className="text-sm text-bad">{(error as Error)?.message ?? 'Application not found'}</p>;
  if (c.status === 'DRAFT') return <Navigate to={`/dashboard/fund-recovery/apply/${c.id}`} replace />;

  const cat = recoveryCategory(c.category)!;
  const Icon = CATEGORY_ICON[c.category];
  const final = ['RESOLVED', 'UNSUCCESSFUL', 'CLOSED'].includes(c.status);
  const openRequests = c.requests.filter(r => !r.fulfilledAt);
  const answered = cat.questions.filter(q => c.answers?.[q.key]);

  return (
    <div className="space-y-5">
      <Link to="/dashboard/fund-recovery/applications" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-night">
        <ArrowLeft size={15} /> My applications
      </Link>

      {/* Header */}
      <section className="rounded-[28px] bg-night p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-brand-bright"><Icon size={22} /></span>
            <div>
              <p className="font-display text-2xl font-semibold tracking-wide">{c.reference}</p>
              <p className="text-sm text-white/60">{cat.name} · submitted {fmtDate(c.submittedAt)}</p>
            </div>
          </div>
          <div className="text-right">
            <StatusBadge status={c.status} className="!text-xs" />
            <p className="mt-2 font-display text-2xl font-semibold tabular-nums">{amountText(c.amountMinor, c.currency)}</p>
          </div>
        </div>
        <div className="mt-6">
          <StageBar status={c.status} dark />
        </div>
        <div className="mt-5 rounded-2xl bg-white/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">Latest update</p>
          <p className="mt-1 text-sm leading-relaxed">{c.latestUpdate}</p>
          <p className="mt-1 text-xs text-white/50">{recoveryStatus(c.status)?.meaning}</p>
        </div>
      </section>

      {/* Needs action: proposal */}
      {c.status === 'AWAITING_CUSTOMER_APPROVAL' && c.proposal && (
        <Panel className="ring-2 ring-orange-300">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Handshake size={18} /> Your approval is needed</h2>
          <p className="mt-1 text-sm text-muted">Your case officer proposes the following assistance. Nothing will happen until you approve it.</p>
          <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-paper p-4 text-sm leading-relaxed">{c.proposal}</p>
          <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} maxLength={500} placeholder="Comment for your case officer (optional)"
            className="mt-4 w-full resize-none rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none focus:border-night" />
          {decide.isError && <p className="mt-2 text-sm text-bad">{(decide.error as Error).message}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => decide.mutate(true)} disabled={decide.isPending} className="flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {decide.isPending && decide.variables ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Approve and proceed
            </button>
            <button onClick={() => decide.mutate(false)} disabled={decide.isPending} className="rounded-full bg-paper px-5 py-2.5 text-sm font-semibold disabled:opacity-50">Decline</button>
          </div>
        </Panel>
      )}

      {/* Needs action: documents requested */}
      {openRequests.length > 0 && (
        <Panel className="ring-2 ring-orange-300">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><FileWarning size={18} /> Documents requested</h2>
          <p className="mt-1 text-sm text-muted">Your case officer needs the following to continue.</p>
          <div className="mt-4 space-y-3">
            {openRequests.map(r => (
              <div key={r.id}>
                <DropZone label={r.label} hint={r.note ?? `Requested ${fmtDate(r.createdAt)}`}
                  busy={upload.isPending && upload.variables?.requestId === r.id}
                  onFile={file => upload.mutate({ file, requestId: r.id })} />
              </div>
            ))}
          </div>
          {upload.isError && <p className="mt-3 text-sm text-bad">{(upload.error as Error).message}</p>}
        </Panel>
      )}

      {/* Outcome */}
      {(c.outcome || c.creditMinor) && (
        <Panel className={c.status === 'UNSUCCESSFUL' ? 'bg-red-50' : 'bg-brand-soft'}>
          <h2 className="font-display text-lg font-semibold">Outcome</h2>
          {c.outcome && <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{c.outcome}</p>}
          {c.creditMinor && c.creditCurrency && (
            <p className="pill-grow mt-4 flex items-center justify-between rounded-2xl bg-night px-5 py-4 text-white">
              <span className="flex items-center gap-2 text-sm"><Wallet size={16} /> Credited to your {c.creditCurrency} wallet</span>
              <span className="font-display text-xl font-semibold">{amountText(c.creditMinor, c.creditCurrency)}</span>
            </p>
          )}
        </Panel>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr] lg:gap-5">
        <div className="space-y-4 lg:space-y-5">
          {/* Messages */}
          <Fold
            title="Messages with your case officer"
            defaultOpen={c.messages.length > 0}
            summary={c.messages.length ? `${c.messages.length} message${c.messages.length > 1 ? 's' : ''}` : 'No messages yet · tap to ask a question'}
          >
            <Thread
              messages={c.messages}
              me="CUSTOMER"
              onSend={body => send.mutateAsync(body)}
              sending={send.isPending}
              error={send.isError ? (send.error as Error).message : ''}
              disabled={c.status === 'CLOSED'}
              disabledText="This case is closed. Contact support if you need help."
            />
          </Fold>

          {/* Details */}
          <Fold title="Application details" summary={`${amountText(c.amountMinor, c.currency)} · ${c.institution ?? ''} · ${fmtDate(c.incidentDate)}`}>
            <dl className="grid gap-x-6 text-sm sm:grid-cols-2">
              {[
                ['Full name', c.fullName], ['Country', c.country], ['Incident date', fmtDate(c.incidentDate)],
                ['Amount', amountText(c.amountMinor, c.currency)], ['Payment method', c.paymentMethod], ['Institution / provider', c.institution],
                ['Contacted provider', c.contactedProvider ? 'Yes' : 'No'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-line py-2.5"><dt className="text-muted">{k}</dt><dd className="text-right font-medium">{v || '—'}</dd></div>
              ))}
            </dl>
            {c.previousAction && <p className="mt-3 text-sm"><span className="text-muted">Provider's response: </span>{c.previousAction}</p>}
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted">What happened</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{c.description}</p>
            {answered.length > 0 && (
              <dl className="mt-4 divide-y divide-line text-sm">
                {answered.map(q => (
                  <div key={q.key} className="flex justify-between gap-4 py-2.5"><dt className="text-muted">{q.label}</dt><dd className="text-right font-medium">{c.answers![q.key]}</dd></div>
                ))}
              </dl>
            )}
          </Fold>
        </div>

        <div className="space-y-4 lg:space-y-5">
          {/* Documents */}
          <Fold title={`Documents (${c.documents.length})`} summary={final ? 'View your uploaded documents' : 'View your documents or add another'}>
            <ul className="space-y-1.5">
              {c.documents.map(d => (
                <li key={d.id}>
                  <a href={`/api/recovery/cases/${c.id}/documents/${d.id}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm hover:bg-paper">
                    <Eye size={14} className="shrink-0 text-muted" />
                    <span className="min-w-0 flex-1 truncate">{d.name}</span>
                    <span className="shrink-0 text-xs text-muted">{fmtSize(d.size)}</span>
                  </a>
                </li>
              ))}
            </ul>
            {!final && (
              <div className="mt-4">
                <DropZone label="Add another document" hint="PDF, JPG or PNG, up to 10 MB" compact
                  busy={upload.isPending && !upload.variables?.requestId} onFile={file => upload.mutate({ file })} />
              </div>
            )}
          </Fold>

          {/* Timeline */}
          <Fold title="Case timeline" summary={`${c.events.length} update${c.events.length === 1 ? '' : 's'} · last ${fmtDateTime(c.events[c.events.length - 1]?.createdAt)}`}>
            <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-line">
              {[...c.events].reverse().map((e, i) => (
                <li key={e.id} className="relative flex gap-3 pl-0">
                  <span className={`relative z-[1] mt-0.5 grid h-[15px] w-[15px] shrink-0 place-items-center rounded-full ${i === 0 ? 'bg-night text-white' : 'bg-white text-night/40 ring-1 ring-line'}`}>
                    <CircleDot size={9} />
                  </span>
                  <div className="min-w-0">
                    {e.status && <p className="text-sm font-semibold">{recoveryStatus(e.status)?.label}</p>}
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
