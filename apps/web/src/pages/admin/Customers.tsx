import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react';
import { api } from '../../lib/api';
import { Flag } from '../../components/Flag';
import { Avatar, Badge, Chips, Empty, Loading, PageHeader, Pager, SearchBox, fmtDate, money } from './ui';

type Row = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  kycStatus: string;
  createdAt: string;
  pinFails: number;
  wallets: { currency: string; balanceMinor: number }[];
  _count: { cards: number; transactions: number };
};

export function AdminCustomers() {
  const [params] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'FROZEN' | 'LOCKED' | 'KYC'>(params.get('kyc') === 'PENDING' ? 'KYC' : 'ALL');
  const [page, setPage] = useState(1);

  const filter = status === 'KYC' ? '&kyc=PENDING' : status !== 'ALL' ? `&status=${status}` : '';
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, status, page],
    queryFn: () =>
      api.get<{ users: Row[]; total: number; page: number; pages: number }>(
        `/admin/users?page=${page}&search=${encodeURIComponent(search)}${filter}`,
      ),
    placeholderData: keepPreviousData,
  });

  return (
    <div>
      <PageHeader title="Customers" subtitle={data ? `${data.total} customer${data.total === 1 ? '' : 's'}` : undefined} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SearchBox value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search name, email or phone" />
        <Chips
          value={status}
          onChange={v => { setStatus(v); setPage(1); }}
          options={[
            { key: 'ALL', label: 'All' },
            { key: 'ACTIVE', label: 'Active' },
            { key: 'FROZEN', label: 'Frozen' },
            { key: 'LOCKED', label: 'Locked' },
            { key: 'KYC', label: 'ID to check' },
          ]}
        />
      </div>

      {isLoading ? (
        <Loading h="h-80" />
      ) : !data?.users.length ? (
        <Empty>No customers match.</Empty>
      ) : (
        <div className="overflow-hidden rounded-[22px] bg-white">
          <div className="hidden grid-cols-[2fr_1.4fr_1fr_1fr_24px] gap-4 border-b border-line px-5 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-muted md:grid">
            <span>Customer</span><span>Balances</span><span>Status</span><span>Joined</span><span />
          </div>
          <ul className="divide-y divide-line">
            {data.users.map(u => (
              <li key={u.id}>
                <Link
                  to={`/admin/customers/${u.id}`}
                  className="grid items-center gap-3 px-5 py-3.5 transition-colors hover:bg-paper/60 md:grid-cols-[2fr_1.4fr_1fr_1fr_24px] md:gap-4"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar name={u.name} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{u.name}</span>
                      <span className="block truncate text-xs text-muted">{u.email}</span>
                    </span>
                  </span>
                  <span className="flex flex-wrap gap-x-3 gap-y-1 text-sm tabular-nums">
                    {u.wallets.map(w => (
                      <span key={w.currency} className="flex items-center gap-1.5"><Flag code={w.currency} size={16} />{money(w.balanceMinor, w.currency)}</span>
                    ))}
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    <Badge status={u.status} />
                    {u.kycStatus !== 'APPROVED' && <Badge tone="grey">ID {u.kycStatus === 'NOT_SUBMITTED' ? 'not checked' : u.kycStatus.toLowerCase()}</Badge>}
                    {u.pinFails > 0 && <Badge tone="amber">{u.pinFails} wrong PIN</Badge>}
                  </span>
                  <span className="text-sm text-muted">{fmtDate(u.createdAt)}</span>
                  <ChevronRight size={16} className="hidden text-muted md:block" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {data && <Pager page={data.page} pages={data.pages} onPage={setPage} />}
    </div>
  );
}
