import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Wallet } from 'lucide-react';
import { formatMoney, CURRENCIES, CURRENCY_META } from '@kestrel/shared';
import { api } from '../../lib/api';

export function Wallets() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [currency, setCurrency] = useState('EUR');

  const { data: wallets, isLoading } = useQuery({
    queryKey: ['wallets'],
    queryFn: () => api.get<any[]>('/wallets'),
  });

  const create = useMutation({
    mutationFn: () => api.post('/wallets', { currency }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wallets'] }); setShowCreate(false); },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Wallets</h1>
          <p className="text-sm text-muted">Manage your currency wallets</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity">
          <Plus size={16} /> New Wallet
        </button>
      </div>

      {showCreate && (
        <div className="mb-6 rounded-xl border border-line bg-surface p-4">
          <h3 className="font-semibold mb-3">Create New Wallet</h3>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Currency</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand">
                {CURRENCIES.map(c => <option key={c} value={c}>{CURRENCY_META[c].name} ({c})</option>)}
              </select>
            </div>
            <button onClick={() => create.mutate()} disabled={create.isPending}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
              {create.isPending ? 'Creating...' : 'Create'}
            </button>
            <button onClick={() => setShowCreate(false)} className="rounded-lg border border-line px-4 py-2 text-sm">Cancel</button>
          </div>
          {create.isError && <p className="mt-2 text-sm text-bad">{(create.error as Error).message}</p>}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-10 text-muted">Loading wallets...</div>
      ) : !wallets?.length ? (
        <div className="rounded-xl border border-line bg-surface p-10 text-center">
          <Wallet className="mx-auto text-muted" size={40} />
          <p className="mt-3 font-medium">No wallets yet</p>
          <p className="text-sm text-muted">Create your first wallet to get started</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {wallets.map((w: any) => (
            <div key={w.id} className="rounded-xl border border-line bg-surface p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <Wallet size={20} />
                </div>
                <span className="rounded-full bg-canvas px-2 py-0.5 text-xs font-semibold">{w.currency}</span>
              </div>
              <p className="text-2xl font-bold">{formatMoney(w.balanceMinor, w.currency)}</p>
              <p className="mt-1 text-xs text-muted">Account: {w.accountNumber}</p>
              <p className="text-xs text-muted">Created: {new Date(w.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
