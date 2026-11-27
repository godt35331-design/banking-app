import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, FileWarning, MessageSquare, Plus } from 'lucide-react';
import { api } from '../../lib/api';
import { NEEDS_CUSTOMER, StageBar, StatusBadge, amountText, catName, fmtDate, type CaseSummary } from './shared';

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'ACTION', label: 'Needs your action' },
  { key: 'OPEN', label: 'In progress' },
  { key: 'DRAFT', label: 'Drafts' },
  { key: 'DONE', label: 'Closed' },
] as const;
const DONE = ['RESOLVED', 'UNSUCCESSFUL', 'CLOSED'];

export function Applications() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('ALL');
  const { data, isLoading } = useQuery({
    queryKey: ['recovery-cases'],
    queryFn: () => api.get<CaseSummary[]>('/recovery/cases'),
    refetchInterval: 20_000,
  });
  const match = (c: CaseSummary, k: string) =>
    k === 'ALL' ? true
      : k === 'ACTION' ? NEEDS_CUSTOMER.includes(c.status) || (c.unreadMessages ?? 0) > 0
        : k === 'DRAFT' ? c.status === 'DRAFT'
          : k === 'DONE' ? DONE.includes(c.status)
            : c.status !== 'DRAFT' && !DONE.includes(c.status);
  const shown = (data ?? []).filter(c => match(c, filter));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.03em]">My applications</h1>
          <p className="mt-1 text-sm text-muted">Every recovery application you've started or submitted.</p>
        </div>
        <Link to="/dashboard/fund-recovery/new" className="flex items-center gap-2 rounded-full bg-night px-5 py-2.5 text-sm font-semibold text-white">
          <Plus size={16} /> New application
        </Link>
      </div>
      <div className="mb-4 chip-row flex flex-wrap gap-2">
        {FILTERS.map(f => {
          const n = (data ?? []).filter(c => match(c, f.key)).length;
          return (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${filter === f.key ? 'bg-night text-white' : 'bg-white hover:bg-black/5'}`}>
              {f.label} <span className="opacity-60">{n}</span>
            </button>
          );
        })}
      </div>

      {isLoading ? <div className="skeleton h-60" /> : !shown.length ? (
        <div className="rounded-[24px] bg-white p-10 text-center">
          <p className="font-medium">No applications here</p>
          <p className="mt-1 text-sm text-muted">Start a recovery application to see it here.</p>
          <Link to="/dashboard/fund-recovery/new" className="mt-4 inline-block rounded-full bg-night px-5 py-2.5 text-sm font-semibold text-white">Start recovery</Link>
        </div>
      ) : (
        <div className="stagger grid gap-3 md:grid-cols-2">
          {shown.map((c, i) => {
            const draft = c.status === 'DRAFT';
            return (
              <Link
                key={c.id}
                to={draft ? `/dashboard/fund-recovery/apply/${c.id}` : `/dashboard/fund-recovery/applications/${c.id}`}
                style={{ ['--i' as string]: Math.min(i, 8) }}
                className={`group flex flex-col rounded-[22px] bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg ${NEEDS_CUSTOMER.includes(c.status) ? 'ring-2 ring-orange-300' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-lg font-semibold tracking-wide">{c.reference ?? 'Draft'}</p>
                    <p className="text-sm text-muted">{catName(c.category)}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <p className="mt-3 text-sm"><span className="text-muted">Amount: </span><span className="font-semibold tabular-nums">{amountText(c.amountMinor, c.currency)}</span></p>
                <p className="mt-1 line-clamp-2 text-sm">
                  <span className="text-muted">Latest update: </span>
                  {draft ? 'Not submitted yet. Continue where you left off.' : c.latestUpdate}
                </p>
                {!draft && <div className="mt-4"><StageBar status={c.status} /></div>}
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  {(c.openRequests ?? 0) > 0 && <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 font-semibold text-orange-700"><FileWarning size={12} />{c.openRequests} document{c.openRequests! > 1 ? 's' : ''} requested</span>}
                  {(c.unreadMessages ?? 0) > 0 && <span className="flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 font-semibold text-brand"><MessageSquare size={12} />{c.unreadMessages} new message{c.unreadMessages! > 1 ? 's' : ''}</span>}
                  <span className="ml-auto flex items-center gap-1 text-muted">
                    {draft ? `Started ${fmtDate(c.createdAt)}` : `Submitted ${fmtDate(c.submittedAt)}`}
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
