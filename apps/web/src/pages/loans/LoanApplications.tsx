import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, FileWarning, MessageSquare, Plus } from 'lucide-react';
import { LOAN_NEEDS_CUSTOMER } from '@kestrel/shared';
import { api } from '../../lib/api';
import { LoanStageBar, LoanStatusBadge, amountText, fmtDate, productName, type LoanSummary } from './shared';

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'ACTION', label: 'Needs your action' },
  { key: 'OPEN', label: 'In progress' },
  { key: 'DRAFT', label: 'Drafts' },
  { key: 'DONE', label: 'Completed' },
] as const;
const DONE = ['REJECTED', 'DISBURSED', 'CLOSED'];
const NEEDS = LOAN_NEEDS_CUSTOMER as string[];

export function LoanApplications() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('ALL');
  const { data, isLoading } = useQuery({ queryKey: ['loan-apps'], queryFn: () => api.get<LoanSummary[]>('/loans/applications'), refetchInterval: 20_000 });
  const match = (a: LoanSummary, k: string) =>
    k === 'ALL' ? true
      : k === 'ACTION' ? NEEDS.includes(a.status) || (a.unreadMessages ?? 0) > 0
        : k === 'DRAFT' ? a.status === 'DRAFT'
          : k === 'DONE' ? DONE.includes(a.status)
            : a.status !== 'DRAFT' && !DONE.includes(a.status);
  const shown = (data ?? []).filter(a => match(a, filter));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.03em]">My loan applications</h1>
          <p className="mt-1 text-sm text-muted">Every loan application you’ve started or submitted.</p>
        </div>
        <Link to="/dashboard/loans/apply" className="flex items-center gap-2 rounded-full bg-night px-5 py-2.5 text-sm font-semibold text-white"><Plus size={16} /> New application</Link>
      </div>
      <div className="mb-4 chip-row flex flex-wrap gap-2">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${filter === f.key ? 'bg-night text-white' : 'bg-white hover:bg-black/5'}`}>
            {f.label} <span className="opacity-60">{(data ?? []).filter(a => match(a, f.key)).length}</span>
          </button>
        ))}
      </div>

      {isLoading ? <div className="skeleton h-60" /> : !shown.length ? (
        <div className="rounded-[24px] bg-white p-10 text-center">
          <p className="font-medium">No applications here</p>
          <p className="mt-1 text-sm text-muted">Apply for a loan to see it here.</p>
          <Link to="/dashboard/loans/apply" className="mt-4 inline-block rounded-full bg-night px-5 py-2.5 text-sm font-semibold text-white">Apply for a loan</Link>
        </div>
      ) : (
        <div className="stagger grid gap-3 md:grid-cols-2">
          {shown.map((a, i) => {
            const draft = a.status === 'DRAFT';
            return (
              <Link key={a.id} to={draft ? `/dashboard/loans/apply/${a.id}` : `/dashboard/loans/applications/${a.id}`} style={{ ['--i' as string]: Math.min(i, 8) }}
                className={`group flex flex-col rounded-[22px] bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg ${NEEDS.includes(a.status) ? 'ring-2 ring-orange-300' : ''}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-lg font-semibold tracking-wide">{a.reference ?? 'Draft'}</p>
                    <p className="text-sm text-muted">{productName(a.product)}</p>
                  </div>
                  <LoanStatusBadge status={a.status} />
                </div>
                <p className="mt-3 font-display text-2xl font-semibold tabular-nums">
                  {a.offer ? amountText(a.offer.amountMinor, a.offer.currency) : amountText(a.amountMinor, a.currency)}
                </p>
                <p className="text-xs text-muted">{a.offer ? 'Offered amount' : 'Requested amount'}</p>
                <p className="mt-2 line-clamp-2 text-sm"><span className="text-muted">Latest update: </span>{draft ? 'Not submitted yet. Continue where you left off.' : a.latestUpdate}</p>
                {!draft && <div className="mt-4"><LoanStageBar status={a.status} /></div>}
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  {(a.openRequests ?? 0) > 0 && <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 font-semibold text-orange-700"><FileWarning size={12} />{a.openRequests} requested</span>}
                  {(a.unreadMessages ?? 0) > 0 && <span className="flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 font-semibold text-brand"><MessageSquare size={12} />{a.unreadMessages} new</span>}
                  <span className="ml-auto flex items-center gap-1 text-muted">
                    {draft ? `Started ${fmtDate(a.createdAt)}` : `Submitted ${fmtDate(a.submittedAt)}`}
                    <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
