import { useState } from 'react';
import { Link } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { KestrelCard, cardProps } from '../../components/landing/mocks';
import { Btn, Chips, ConfirmSheet, Empty, Loading, PageHeader, SearchBox, money } from './ui';

export function AdminCards() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'FROZEN'>('ALL');
  const [block, setBlock] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-cards', search, status],
    queryFn: () => api.get<any[]>(`/admin/cards?search=${encodeURIComponent(search)}${status !== 'ALL' ? `&status=${status}` : ''}`),
    placeholderData: keepPreviousData,
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.patch(`/admin/cards/${id}`, { status }),
    onSuccess: () => { setBlock(null); qc.invalidateQueries({ queryKey: ['admin-cards'] }); },
  });

  return (
    <div>
      <PageHeader title="Cards" subtitle="Every customer card. Card numbers and CVVs stay hidden from staff." />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <SearchBox value={search} onChange={setSearch} placeholder="Search last 4 digits, name or label" />
        <Chips value={status} onChange={setStatus} options={[{ key: 'ALL', label: 'All' }, { key: 'ACTIVE', label: 'Active' }, { key: 'FROZEN', label: 'Frozen' }]} />
      </div>

      {isLoading ? <Loading h="h-80" /> : !data?.length ? <Empty>No cards match.</Empty> : (
        <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
          {data.map(card => (
            <div key={card.id}>
              <KestrelCard {...cardProps(card)} />
              <div className="mt-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{card.label}</p>
                  <p className="truncate text-xs text-muted">
                    <Link to={`/admin/customers/${card.user.id}`} className="font-medium text-night hover:underline">{card.user.name}</Link>
                    {card.monthlyLimitMinor ? ` · limit ${money(card.monthlyLimitMinor)}/month` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {card.status === 'FROZEN'
                    ? <Btn tone="green" busy={update.isPending} onClick={() => update.mutate({ id: card.id, status: 'ACTIVE' })}>Unfreeze</Btn>
                    : <Btn tone="light" busy={update.isPending} onClick={() => update.mutate({ id: card.id, status: 'FROZEN' })}>Freeze</Btn>}
                  <Btn tone="light" className="hover:!bg-red-50 hover:!text-bad" onClick={() => setBlock(card)}>Block</Btn>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {block && (
        <ConfirmSheet
          open
          onClose={() => setBlock(null)}
          title={`Block card ending ${block.last4}?`}
          subtitle={`${block.user.name} · ${block.label}. The card stops working permanently.`}
          confirmLabel="Block card"
          tone="red"
          busy={update.isPending}
          error={update.isError ? (update.error as Error).message : ''}
          onConfirm={() => update.mutate({ id: block.id, status: 'REMOVED' })}
        />
      )}
    </div>
  );
}
