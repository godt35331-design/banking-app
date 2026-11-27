import { useState } from 'react';
import { Link } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { describeAction } from './CustomerDetail';
import { Avatar, Empty, Loading, PageHeader, Pager, fmtDateTime, money } from './ui';

type Entry = {
  id: string;
  action: string;
  target: string | null;
  targetName: string | null;
  detail: any;
  createdAt: string;
  actor: { name: string; email: string } | null;
};

/** A short human summary of what changed, from the stored detail. */
function summary(e: Entry) {
  const d = e.detail ?? {};
  if (d.amountMinor && d.currency) return money(d.amountMinor, d.currency) + (d.reason ? ` · ${d.reason}` : '');
  if (d.amountMinor) return money(d.amountMinor) + (d.note ? ` · ${d.note}` : '');
  if (d.reference) return d.reference + (d.reason ? ` · ${d.reason}` : '');
  if (d.reason) return d.reason;
  if (d.kycStatus) return `Set to ${String(d.kycStatus).toLowerCase().replace('_', ' ')}`;
  if (d.last4) return `Card ending ${d.last4}${d.status ? ` → ${String(d.status).toLowerCase()}` : ''}`;
  if (d.fields) return `Changed ${d.fields.join(', ')}`;
  if (e.action === 'settings.update') return 'Fees, limits, rates or account rules';
  return '';
}

export function AdminActivity() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit', page],
    queryFn: () => api.get<{ items: Entry[]; total: number; page: number; pages: number }>(`/admin/audit?page=${page}`),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });

  return (
    <div>
      <PageHeader title="Activity log" subtitle="Every action taken by bank staff: who did what, to whom, and when." />
      {isLoading ? <Loading h="h-96" /> : !data?.items.length ? <Empty>No staff actions yet.</Empty> : (
        <div className="overflow-hidden rounded-[22px] bg-white">
          <ul className="divide-y divide-line">
            {data.items.map(e => (
              <li key={e.id} className="flex items-start gap-3 px-5 py-3.5 text-sm">
                <Avatar name={e.actor?.name ?? 'Staff'} size="h-8 w-8 text-[11px]" />
                <div className="min-w-0 flex-1">
                  <p>
                    <span className="font-semibold">{e.actor?.name ?? 'Staff'}</span>
                    <span className="text-muted"> · </span>
                    <span>{describeAction(e.action)}</span>
                    {e.targetName && e.target && (
                      <> <span className="text-muted">for</span> <Link to={`/admin/customers/${e.target}`} className="font-medium hover:underline">{e.targetName}</Link></>
                    )}
                  </p>
                  {summary(e) && <p className="truncate text-xs text-muted">{summary(e)}</p>}
                </div>
                <span className="shrink-0 text-xs text-muted">{fmtDateTime(e.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {data && <Pager page={data.page} pages={data.pages} onPage={setPage} />}
    </div>
  );
}
