import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, Undo2, X } from 'lucide-react';
import { api } from '../../lib/api';
import { Badge, Btn, ConfirmSheet, Empty, Loading, PageHeader, Pager, SearchBox, fmtDateTime, inputCls, money, titleCase } from './ui';

const KINDS = [
  'DEPOSIT_BANK', 'DEPOSIT_CHECK', 'DEPOSIT_CASH', 'TRANSFER_LOCAL', 'TRANSFER_INTL', 'SWAP',
  'CARD_PURCHASE', 'REFUND', 'LOAN_PAYOUT', 'LOAN_REPAYMENT', 'WITHDRAWAL_BANK', 'WITHDRAWAL_CRYPTO', 'ADJUSTMENT',
];
const STATUSES = ['PENDING', 'AWAITING_APPROVAL', 'COMPLETED', 'DECLINED', 'FAILED', 'REJECTED'];

export function AdminTransactions() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const userId = params.get('userId') ?? '';
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [reverse, setReverse] = useState<any>(null);

  const qs = new URLSearchParams({ page: String(page) });
  if (search) qs.set('search', search);
  if (kind) qs.set('kind', kind);
  if (status) qs.set('status', status);
  if (userId) qs.set('userId', userId);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-transactions', qs.toString()],
    queryFn: () => api.get<{ items: any[]; total: number; page: number; pages: number }>(`/admin/transactions?${qs}`),
    placeholderData: keepPreviousData,
  });

  const doReverse = useMutation({
    mutationFn: (reason: string) => api.post(`/admin/transactions/${reverse.id}/reverse`, { reason }),
    onSuccess: () => {
      setReverse(null);
      qc.invalidateQueries({ queryKey: ['admin-transactions'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
    },
  });

  return (
    <div>
      <PageHeader title="Transactions" subtitle={data ? `${data.total} transaction${data.total === 1 ? '' : 's'}` : undefined} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchBox value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search reference, description or customer" />
        <select value={kind} onChange={e => { setKind(e.target.value); setPage(1); }} className={`${inputCls} !w-auto !rounded-full`}>
          <option value="">All types</option>
          {KINDS.map(k => <option key={k} value={k}>{titleCase(k)}</option>)}
        </select>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className={`${inputCls} !w-auto !rounded-full`}>
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{titleCase(s)}</option>)}
        </select>
        {userId && (
          <button onClick={() => { params.delete('userId'); setParams(params); setPage(1); }} className="flex items-center gap-1.5 rounded-full bg-night px-3 py-2 text-xs font-semibold text-white">
            One customer only <X size={13} />
          </button>
        )}
      </div>

      {isLoading ? <Loading h="h-96" /> : !data?.items.length ? <Empty>No transactions match.</Empty> : (
        <div className="overflow-hidden rounded-[22px] bg-white">
          <ul className="divide-y divide-line">
            {data.items.map(t => {
              const canReverse = t.status === 'COMPLETED' && !t.reversedById && t.kind !== 'SWAP';
              return (
                <li key={t.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 text-sm">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${t.direction === 'IN' ? 'bg-brand-soft text-brand' : 'bg-paper'}`}>
                    {t.direction === 'IN' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{t.description}</span>
                    <span className="block truncate text-xs text-muted">
                      <Link to={`/admin/customers/${t.user?.id}`} className="font-medium text-night hover:underline">{t.user?.name}</Link>
                      {' · '}{titleCase(t.kind)} · {t.reference} · {fmtDateTime(t.createdAt)}
                      {t.reason ? ` · ${t.reason}` : ''}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-right">
                      <span className={`block font-semibold tabular-nums ${t.direction === 'IN' ? 'text-brand' : ''}`}>
                        {t.direction === 'IN' ? '+' : '−'}{money(t.amountMinor, t.currency)}
                      </span>
                      {t.feeMinor > 0 && <span className="block text-[11px] text-muted">fee {money(t.feeMinor, t.currency)}</span>}
                    </span>
                    <span className="flex w-28 flex-col items-end gap-1">
                      <Badge status={t.status} />
                      {t.reversedById && <Badge tone="grey">Reversed</Badge>}
                    </span>
                    <Btn tone="light" disabled={!canReverse} onClick={() => setReverse(t)} className="!px-3" >
                      <Undo2 size={13} /> Reverse
                    </Btn>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {data && <Pager page={data.page} pages={data.pages} onPage={setPage} />}

      {reverse && (
        <ConfirmSheet
          open
          onClose={() => setReverse(null)}
          title={`Reverse ${money(reverse.amountMinor, reverse.currency)}?`}
          subtitle={`${reverse.user?.name} · ${reverse.reference}. ${reverse.direction === 'IN' ? 'The money will be taken back from' : 'The money (and fee) will be returned to'} the customer's wallet.`}
          confirmLabel="Reverse transaction"
          tone="red"
          reason="Reason (shown to the customer)"
          reasonRequired
          busy={doReverse.isPending}
          error={doReverse.isError ? (doReverse.error as Error).message : ''}
          onConfirm={r => doReverse.mutate(r)}
        />
      )}
    </div>
  );
}
