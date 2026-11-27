import { useState } from 'react';
import { Link } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ChevronRight, MessageSquare } from 'lucide-react';
import { RECOVERY_CATEGORIES, RECOVERY_STATUSES } from '@kestrel/shared';
import { api } from '../../lib/api';
import { StatusBadge, amountText, catName, fmtDate } from '../recovery/shared';
import { Empty, Loading, PageHeader, SearchBox, inputCls } from './ui';

type Row = {
  id: string;
  reference: string;
  category: string;
  status: string;
  amountMinor: number | null;
  currency: string | null;
  latestUpdate: string | null;
  fullName: string | null;
  country: string | null;
  submittedAt: string | null;
  updatedAt: string;
  unreadMessages: number;
  user: { id: string; name: string; email: string };
};

const GROUPS = [
  { key: 'WAITING_STAFF', label: 'Needs review' },
  { key: 'OPEN', label: 'All open' },
  ...RECOVERY_STATUSES.filter(s => s.key !== 'DRAFT').map(s => ({ key: s.key, label: s.label })),
  { key: 'ALL', label: 'Everything' },
];

/** Case officers' list of Funds Recovery Assistance applications. */
export function AdminFundRecovery() {
  const [status, setStatus] = useState('WAITING_STAFF');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');

  const qs = new URLSearchParams();
  if (status !== 'ALL') qs.set('status', status);
  if (category) qs.set('category', category);
  if (search) qs.set('search', search);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-recovery', qs.toString()],
    queryFn: () => api.get<Row[]>(`/admin/recovery?${qs}`),
    placeholderData: keepPreviousData,
    refetchInterval: 20_000,
  });
  const { data: counts } = useQuery({
    queryKey: ['admin-recovery-counts'],
    queryFn: () => api.get<Record<string, number>>('/admin/recovery/counts'),
    refetchInterval: 20_000,
  });
  const count = (k: string) => {
    const c = counts ?? {};
    if (k === 'ALL') return Object.values(c).reduce((s, n) => s + n, 0);
    if (k === 'WAITING_STAFF') return (c.SUBMITTED ?? 0) + (c.UNDER_REVIEW ?? 0);
    if (k === 'OPEN') return Object.entries(c).filter(([s]) => !['RESOLVED', 'UNSUCCESSFUL', 'CLOSED'].includes(s)).reduce((s, [, n]) => s + n, 0);
    return c[k] ?? 0;
  };

  return (
    <div>
      <PageHeader title="Funds recovery cases" subtitle="Applications submitted by customers. Open a case to review evidence, request documents and update its status." />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchBox value={search} onChange={setSearch} placeholder="Search reference, name or provider" />
        <select value={category} onChange={e => setCategory(e.target.value)} className={`${inputCls} !w-auto !rounded-full`}>
          <option value="">All categories</option>
          {RECOVERY_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.name}</option>)}
        </select>
      </div>
      <div className="mb-5 chip-row flex flex-wrap gap-2">
        {GROUPS.map(g => (
          <button key={g.key} onClick={() => setStatus(g.key)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${status === g.key ? 'bg-night text-white' : 'bg-white hover:bg-black/5'}`}>
            {g.label} <span className="opacity-60">{count(g.key)}</span>
          </button>
        ))}
      </div>

      {isLoading ? <Loading h="h-80" /> : !data?.length ? <Empty>No cases here.</Empty> : (
        <div className="overflow-hidden rounded-[22px] bg-white">
          <ul className="divide-y divide-line">
            {data.map(c => (
              <li key={c.id}>
                <Link to={`/admin/fund-recovery/${c.id}`} className="grid items-center gap-3 px-5 py-4 transition-colors hover:bg-paper/60 md:grid-cols-[1.2fr_1.5fr_1fr_auto_20px] md:gap-5">
                  <span className="min-w-0">
                    <span className="block font-semibold tracking-wide">{c.reference}</span>
                    <span className="block truncate text-xs text-muted">{catName(c.category)}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{c.fullName ?? c.user.name}</span>
                    <span className="block truncate text-xs text-muted">{c.country} · submitted {fmtDate(c.submittedAt)}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{amountText(c.amountMinor, c.currency)}</span>
                  <span className="flex items-center gap-2">
                    {c.unreadMessages > 0 && <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-700"><MessageSquare size={11} />{c.unreadMessages}</span>}
                    <StatusBadge status={c.status} />
                  </span>
                  <ChevronRight size={16} className="hidden text-muted md:block" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
