import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowDownLeft, ArrowUpRight, ChevronRight, CheckCircle2, FileText, Landmark, MessageSquare,
  ShieldCheck, Users, Banknote, IdCard,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { DarkGlow } from '../../components/AuthShell';
import { Flag } from '../../components/Flag';
import { useTween } from '../../components/landing/motion';
import { Avatar, Badge, Card, Loading, PageHeader, fmtDateTime, money, titleCase } from './ui';

type Overview = {
  customers: { total: number; active: number; frozen: number; locked: number; newThisWeek: number };
  money: { heldUsdMinor: number; heldByCurrency: Record<string, number>; todayInUsdMinor: number; todayOutUsdMinor: number; todayCount: number };
  queue: { transfers: number; checks: number; loans: number; tax: number; fund: number; kyc: number; support: number };
  recentTx: any[];
  recentUsers: { id: string; name: string; email: string; createdAt: string; status: string }[];
};

export function AdminOverview() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => api.get<Overview>('/admin/overview'),
    refetchInterval: 30_000,
  });
  const held = useTween(data?.money.heldUsdMinor ?? 0, 900);

  if (isLoading || !data) {
    return (
      <div className="space-y-5">
        <PageHeader title="Overview" />
        <Loading h="h-52" />
        <Loading h="h-40" />
      </div>
    );
  }

  const queue = [
    { to: '/admin/approvals', icon: CheckCircle2, label: 'Transfers & withdrawals to approve', n: data.queue.transfers },
    { to: '/admin/approvals', icon: Banknote, label: 'Check deposits to clear', n: data.queue.checks },
    { to: '/admin/loans', icon: Landmark, label: 'Loan applications', n: data.queue.loans },
    { to: '/admin/tax-refunds', icon: FileText, label: 'Open tax refund claims', n: data.queue.tax },
    { to: '/admin/fund-recovery', icon: ShieldCheck, label: 'Recovery cases to review', n: data.queue.fund },
    { to: '/admin/support', icon: MessageSquare, label: 'Chats waiting for a reply', n: data.queue.support },
    { to: '/admin/customers?kyc=PENDING', icon: IdCard, label: 'Identity checks pending', n: data.queue.kyc },
  ];
  const waiting = queue.reduce((s, q) => s + q.n, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title={`Hello, ${user?.name?.split(' ')[0] ?? 'there'}`}
        subtitle={new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      />

      {/* Money held */}
      <section className="relative overflow-hidden rounded-[28px] bg-night p-6 text-white sm:p-8">
        <DarkGlow className="-right-40 -top-40 h-[420px] w-[420px] opacity-70" />
        <div className="relative grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="text-sm text-white/55">Total held in customer wallets (in USD)</p>
            <p className="mt-2 font-display text-[44px] font-medium leading-none tracking-[-0.04em] tabular-nums sm:text-[56px]">
              {money(held)}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {Object.entries(data.money.heldByCurrency).map(([c, v]) => (
                <span key={c} className="glass flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 text-sm">
                  <Flag code={c} size={22} /> {money(v, c)}
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 self-end">
            <div className="glass rounded-2xl p-4">
              <p className="flex items-center gap-1.5 text-xs text-white/55"><ArrowDownLeft size={14} className="text-brand-bright" /> Money in today</p>
              <p className="mt-2 font-display text-xl font-semibold tabular-nums">{money(data.money.todayInUsdMinor)}</p>
            </div>
            <div className="glass rounded-2xl p-4">
              <p className="flex items-center gap-1.5 text-xs text-white/55"><ArrowUpRight size={14} className="text-red-300" /> Money out today</p>
              <p className="mt-2 font-display text-xl font-semibold tabular-nums">{money(data.money.todayOutUsdMinor)}</p>
            </div>
            <p className="col-span-2 text-xs text-white/45">{data.money.todayCount} completed transactions today</p>
          </div>
        </div>
      </section>

      {/* Customers */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: 'Customers', v: data.customers.total, tone: 'text-night' },
          { label: 'Active', v: data.customers.active, tone: 'text-brand' },
          { label: 'Frozen', v: data.customers.frozen, tone: 'text-sky-700' },
          { label: 'Locked', v: data.customers.locked, tone: 'text-bad' },
          { label: 'New this week', v: data.customers.newThisWeek, tone: 'text-night' },
        ].map(s => (
          <Link key={s.label} to="/admin/customers" className="rounded-[20px] bg-white p-4 transition-transform hover:-translate-y-0.5">
            <p className="flex items-center gap-1.5 text-xs text-muted"><Users size={13} /> {s.label}</p>
            <p className={`mt-1.5 font-display text-3xl font-semibold tabular-nums ${s.tone}`}>{s.v}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.3fr]">
        {/* Needs attention */}
        <Card className="p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Needs attention</h2>
            <Badge tone={waiting ? 'amber' : 'green'}>{waiting ? `${waiting} waiting` : 'All clear'}</Badge>
          </div>
          <ul className="stagger divide-y divide-line">
            {queue.map(({ to, icon: Icon, label, n }, i) => (
              <li key={label} style={{ ['--i' as string]: i }}>
                <Link to={to} className={`group flex items-center gap-3 py-3 ${n ? '' : 'opacity-50'}`}>
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${n ? 'bg-amber-50 text-warn' : 'bg-paper text-muted'}`}>
                    <Icon size={16} />
                  </span>
                  <span className="flex-1 text-sm font-medium">{label}</span>
                  <span className="font-display text-lg font-semibold tabular-nums">{n}</span>
                  <ChevronRight size={16} className="text-muted transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-5">
          {/* Recent activity */}
          <Card className="p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Latest transactions</h2>
              <Link to="/admin/transactions" className="text-sm font-semibold text-brand hover:underline">See all</Link>
            </div>
            {data.recentTx.length ? (
              <ul className="divide-y divide-line">
                {data.recentTx.map(t => (
                  <li key={t.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${t.direction === 'IN' ? 'bg-brand-soft text-brand' : 'bg-paper text-night'}`}>
                      {t.direction === 'IN' ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <Link to={`/admin/customers/${t.user?.id}`} className="block truncate font-medium hover:underline">{t.user?.name ?? '—'}</Link>
                      <span className="block truncate text-xs text-muted">{titleCase(t.kind)} · {fmtDateTime(t.createdAt)}</span>
                    </span>
                    <span className="text-right">
                      <span className={`block font-semibold tabular-nums ${t.direction === 'IN' ? 'text-brand' : ''}`}>
                        {t.direction === 'IN' ? '+' : '−'}{money(t.amountMinor, t.currency)}
                      </span>
                      <Badge status={t.status} />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted">No transactions yet</p>
            )}
          </Card>

          <Card className="p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Newest customers</h2>
              <Link to="/admin/customers" className="text-sm font-semibold text-brand hover:underline">See all</Link>
            </div>
            <ul className="divide-y divide-line">
              {data.recentUsers.map(u => (
                <li key={u.id}>
                  <Link to={`/admin/customers/${u.id}`} className="flex items-center gap-3 py-2.5 text-sm hover:opacity-80">
                    <Avatar name={u.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{u.name}</span>
                      <span className="block truncate text-xs text-muted">{u.email}</span>
                    </span>
                    <Badge status={u.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
