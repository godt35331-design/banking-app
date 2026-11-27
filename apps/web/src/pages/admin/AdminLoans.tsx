import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, MessageSquare, UserRound } from 'lucide-react';
import { LOAN_PRODUCTS, LOAN_STATUSES, formatAnyMoney } from '@kestrel/shared';
import { api } from '../../lib/api';
import { LoanStatusBadge, amountText, fmtDate, productName, type ProductInfo } from '../loans/shared';
import { Badge, Btn, Card, Chips, Empty, Loading, PageHeader, SearchBox, inputCls } from './ui';

type Row = {
  id: string;
  reference: string;
  product: string;
  status: string;
  amountMinor: number | null;
  currency: string | null;
  termMonths: number | null;
  submittedAt: string | null;
  updatedAt: string;
  unreadMessages: number;
  assignedTo: string | null;
  user: { id: string; name: string; email: string; kycStatus: string };
};

type Stats = {
  total: number; new: number; review: number; approved: number; rejected: number;
  byStatus: Record<string, number>; byProduct: Record<string, number>; disbursedByCurrency: Record<string, number>;
  repaying: number; overdueLoans: number;
};

const GROUPS = [
  { key: 'NEW', label: 'New' },
  { key: 'REVIEW', label: 'In review' },
  { key: 'OPEN', label: 'All open' },
  ...LOAN_STATUSES.filter(s => s.key !== 'DRAFT').map(s => ({ key: s.key, label: s.label })),
  { key: 'ALL', label: 'Everything' },
];

const TABS = [
  { key: 'apps', label: 'Loan applications' },
  { key: 'products', label: 'Loan products' },
  { key: 'reports', label: 'Reports' },
  { key: 'staff', label: 'Staff' },
] as const;

/** Admin loan management dashboard. */
export function AdminLoans() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('apps');
  const { data: stats } = useQuery({ queryKey: ['admin-loan-stats'], queryFn: () => api.get<Stats>('/admin/loans/stats'), refetchInterval: 20_000 });

  return (
    <div>
      <PageHeader title="Loans" subtitle="Review applications, verify documents, record the lender's decision, issue offers and record disbursement." />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Total applications', v: stats?.total },
          { label: 'New applications', v: stats?.new, tone: 'text-blue-700' },
          { label: 'Under review', v: stats?.review, tone: 'text-warn' },
          { label: 'Approved', v: stats?.approved, tone: 'text-brand' },
        ].map(s => (
          <div key={s.label} className="rounded-[20px] bg-white p-4">
            <p className="text-xs text-muted">{s.label}</p>
            <p className={`mt-1.5 font-display text-3xl font-semibold tabular-nums ${s.tone ?? ''}`}>{s.v ?? '—'}</p>
          </div>
        ))}
      </div>
      <div className="mb-5"><Chips value={tab} onChange={setTab} options={TABS.map(t => ({ ...t }))} /></div>
      {tab === 'apps' && <Applications stats={stats} />}
      {tab === 'products' && <Products />}
      {tab === 'reports' && <Reports stats={stats} />}
      {tab === 'staff' && <Staff />}
    </div>
  );
}

function Applications({ stats }: { stats?: Stats }) {
  const [status, setStatus] = useState('NEW');
  const [product, setProduct] = useState('');
  const [assigned, setAssigned] = useState('');
  const [search, setSearch] = useState('');
  const qs = new URLSearchParams();
  if (status !== 'ALL') qs.set('status', status);
  if (product) qs.set('product', product);
  if (assigned) qs.set('assigned', assigned);
  if (search) qs.set('search', search);
  const { data, isLoading } = useQuery({
    queryKey: ['admin-loans', qs.toString()],
    queryFn: () => api.get<Row[]>(`/admin/loans?${qs}`),
    placeholderData: keepPreviousData,
    refetchInterval: 20_000,
  });
  const c = stats?.byStatus ?? {};
  const count = (k: string) =>
    k === 'ALL' ? stats?.total ?? 0
      : k === 'NEW' ? stats?.new ?? 0
        : k === 'REVIEW' ? stats?.review ?? 0
          : k === 'OPEN' ? Object.entries(c).filter(([s]) => !['REJECTED', 'DISBURSED', 'CLOSED'].includes(s)).reduce((s, [, n]) => s + n, 0)
            : c[k] ?? 0;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchBox value={search} onChange={setSearch} placeholder="Search reference, name or email" />
        <select value={product} onChange={e => setProduct(e.target.value)} className={`${inputCls} !w-auto !rounded-full`}>
          <option value="">All loans</option>
          {LOAN_PRODUCTS.map(p => <option key={p.key} value={p.key}>{p.name}</option>)}
        </select>
        <select value={assigned} onChange={e => setAssigned(e.target.value)} className={`${inputCls} !w-auto !rounded-full`}>
          <option value="">Any officer</option>
          <option value="ME">Assigned to me</option>
          <option value="NONE">Unassigned</option>
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
      {isLoading ? <Loading h="h-80" /> : !data?.length ? <Empty>No applications here.</Empty> : (
        <div className="overflow-hidden rounded-[22px] bg-white">
          <ul className="divide-y divide-line">
            {data.map(a => (
              <li key={a.id}>
                <Link to={`/admin/loans/${a.id}`} className="grid items-center gap-3 px-5 py-4 transition-colors hover:bg-paper/60 md:grid-cols-[1.1fr_1.4fr_1fr_0.9fr_auto_20px] md:gap-5">
                  <span className="min-w-0">
                    <span className="block font-semibold tracking-wide">{a.reference}</span>
                    <span className="block truncate text-xs text-muted">{productName(a.product)}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{a.user.name}</span>
                    <span className="block truncate text-xs text-muted">submitted {fmtDate(a.submittedAt)}{a.user.kycStatus !== 'APPROVED' ? ' · ID not verified' : ''}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{amountText(a.amountMinor, a.currency)}</span>
                  <span className="flex items-center gap-1.5 truncate text-xs text-muted"><UserRound size={12} />{a.assignedTo ?? 'Unassigned'}</span>
                  <span className="flex items-center gap-2">
                    {a.unreadMessages > 0 && <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-700"><MessageSquare size={11} />{a.unreadMessages}</span>}
                    <LoanStatusBadge status={a.status} />
                  </span>
                  <ChevronRight size={16} className="hidden text-muted md:block" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function Products() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-loan-products'], queryFn: () => api.get<ProductInfo[]>('/admin/loans/products') });
  if (isLoading || !data) return <Loading h="h-80" />;
  return (
    <div className="space-y-3">
      <p className="rounded-2xl bg-white px-5 py-4 text-sm text-muted">
        What you enter here is shown on each loan page. Leave a field empty and customers see “set by the lender after assessment”. Only publish amounts and rates the lender has actually set.
      </p>
      {LOAN_PRODUCTS.map(p => (
        <ProductEditor key={p.key} name={p.name} info={data.find(x => x.key === p.key)!} onSaved={() => {
          qc.invalidateQueries({ queryKey: ['admin-loan-products'] });
          qc.invalidateQueries({ queryKey: ['loan-products'] });
        }} />
      ))}
    </div>
  );
}

function ProductEditor({ name, info, onSaved }: { name: string; info: ProductInfo; onSaved: () => void }) {
  const [f, setF] = useState({ available: info.available, amountInfo: info.amountInfo ?? '', rateInfo: info.rateInfo ?? '', termInfo: info.termInfo ?? '' });
  useEffect(() => setF({ available: info.available, amountInfo: info.amountInfo ?? '', rateInfo: info.rateInfo ?? '', termInfo: info.termInfo ?? '' }), [info]);
  const save = useMutation({ mutationFn: () => api.put(`/admin/loans/products/${info.key}`, f), onSuccess: onSaved });
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-lg font-semibold">{name}</p>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={f.available} onChange={e => setF({ ...f, available: e.target.checked })} className="h-4 w-4 accent-[#8b6a3e]" />
          Open for applications
        </label>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <label className="text-xs font-medium text-muted">Loan amounts<input value={f.amountInfo} onChange={e => setF({ ...f, amountInfo: e.target.value })} placeholder="e.g. From 500 to 20,000 USD" className={`${inputCls} mt-1`} /></label>
        <label className="text-xs font-medium text-muted">Interest rates<input value={f.rateInfo} onChange={e => setF({ ...f, rateInfo: e.target.value })} placeholder="As set by the lender" className={`${inputCls} mt-1`} /></label>
        <label className="text-xs font-medium text-muted">Repayment periods<input value={f.termInfo} onChange={e => setF({ ...f, termInfo: e.target.value })} placeholder="e.g. 12 to 60 months" className={`${inputCls} mt-1`} /></label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Btn busy={save.isPending} onClick={() => save.mutate()}>Save</Btn>
        {save.isSuccess && <span className="text-xs text-brand">Saved</span>}
        {save.isError && <span className="text-xs text-bad">{(save.error as Error).message}</span>}
      </div>
    </Card>
  );
}

function Reports({ stats }: { stats?: Stats }) {
  if (!stats) return <Loading h="h-80" />;
  const max = (o: Record<string, number>) => Math.max(1, ...Object.values(o));
  const Bar = ({ label, n, of }: { label: string; n: number; of: number }) => (
    <li className="grid grid-cols-[180px_1fr_40px] items-center gap-3 text-sm">
      <span className="truncate text-muted">{label}</span>
      <span className="h-2.5 overflow-hidden rounded-full bg-paper"><span className="block h-full rounded-full bg-night" style={{ width: `${(n / of) * 100}%` }} /></span>
      <span className="text-right font-semibold tabular-nums">{n}</span>
    </li>
  );
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="p-6">
        <h2 className="font-display text-lg font-semibold">Applications by status</h2>
        <ul className="mt-4 space-y-2.5">
          {LOAN_STATUSES.filter(s => s.key !== 'DRAFT').map(s => <Bar key={s.key} label={s.label} n={stats.byStatus[s.key] ?? 0} of={max(stats.byStatus)} />)}
        </ul>
      </Card>
      <div className="space-y-5">
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold">Applications by loan</h2>
          <ul className="mt-4 space-y-2.5">
            {LOAN_PRODUCTS.map(p => <Bar key={p.key} label={p.name} n={stats.byProduct[p.key] ?? 0} of={max(stats.byProduct)} />)}
          </ul>
        </Card>
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold">Decisions and payments</h2>
          <dl className="mt-3 divide-y divide-line text-sm">
            <div className="flex justify-between py-2.5"><dt className="text-muted">Approved (from approval onwards)</dt><dd className="font-semibold">{stats.approved}</dd></div>
            <div className="flex justify-between py-2.5"><dt className="text-muted">Rejected</dt><dd className="font-semibold">{stats.rejected}</dd></div>
            <div className="flex justify-between py-2.5"><dt className="text-muted">Loans being repaid</dt><dd className="font-semibold">{stats.repaying}</dd></div>
            <div className="flex justify-between py-2.5"><dt className="text-muted">Loans with overdue repayments</dt><dd className={`font-semibold ${stats.overdueLoans ? 'text-bad' : ''}`}>{stats.overdueLoans}</dd></div>
            <div className="flex justify-between py-2.5">
              <dt className="text-muted">Total disbursed</dt>
              <dd className="text-right font-semibold">
                {Object.keys(stats.disbursedByCurrency).length
                  ? Object.entries(stats.disbursedByCurrency).map(([c, v]) => <span key={c} className="block">{formatAnyMoney(v, c)}</span>)
                  : '—'}
              </dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}

function Staff() {
  const { data: staff } = useQuery({ queryKey: ['admin-loan-staff'], queryFn: () => api.get<{ id: string; name: string; email: string }[]>('/admin/loans/staff') });
  const { data: open } = useQuery({ queryKey: ['admin-loans', 'status=OPEN'], queryFn: () => api.get<Row[]>('/admin/loans?status=OPEN') });
  if (!staff) return <Loading h="h-60" />;
  const unassigned = (open ?? []).filter(a => !a.assignedTo).length;
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">Loan officers</h2>
        {unassigned > 0 && <Badge tone="amber">{unassigned} open application{unassigned > 1 ? 's' : ''} unassigned</Badge>}
      </div>
      <p className="mt-1 text-sm text-muted">All staff accounts can handle loan applications. Assign an application from its page. Staff accounts are created by the bank, not from this page.</p>
      <ul className="mt-4 divide-y divide-line">
        {staff.map(s => {
          const n = (open ?? []).filter(a => a.assignedTo === s.name).length;
          return (
            <li key={s.id} className="flex items-center gap-3 py-3 text-sm">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-night text-xs font-semibold text-white">{s.name.split(' ').map(x => x[0]).slice(0, 2).join('')}</span>
              <span className="min-w-0 flex-1"><span className="block font-medium">{s.name}</span><span className="block truncate text-xs text-muted">{s.email}</span></span>
              <span className="text-muted">{n} open assigned</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
