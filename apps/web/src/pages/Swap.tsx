import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { formatMoney, CURRENCIES, CURRENCY_META } from '@kestrel/shared';
import { api } from '../lib/api';

export function Swap() {
  const [form, setForm] = useState({ fromWalletId: '', toCurrency: 'EUR', amount: '' });
  const [success, setSuccess] = useState('');

  const { data: wallets } = useQuery({
    queryKey: ['wallets'],
    queryFn: () => api.get<any[]>('/wallets'),
  });

  const selectedWallet = wallets?.find((w: any) => w.id === form.fromWalletId);

  const { data: quote } = useQuery({
    queryKey: ['quote', selectedWallet?.currency, form.toCurrency, form.amount],
    queryFn: () => api.get<any>(`/swap/quote?from=${selectedWallet?.currency}&to=${form.toCurrency}&amount=${Math.round(parseFloat(form.amount) * 100)}`),
    enabled: !!selectedWallet && !!form.toCurrency && !!form.amount && parseFloat(form.amount) > 0 && selectedWallet.currency !== form.toCurrency,
  });

  const swap = useMutation({
    mutationFn: () => api.post('/swap', {
      fromWalletId: form.fromWalletId,
      toCurrency: form.toCurrency,
      amountMinor: Math.round(parseFloat(form.amount) * 100),
    }),
    onSuccess: (data: any) => {
      setSuccess(`Swapped ${formatMoney(data.amountMinor, data.currency)} successfully!`);
      setForm({ fromWalletId: '', toCurrency: 'EUR', amount: '' });
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Currency Swap</h1>
      <p className="text-sm text-muted mb-6">Exchange between currencies at competitive rates</p>

      {success && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-ok">{success}</div>
      )}

      <div className="rounded-xl border border-line bg-surface p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1">From Wallet</label>
            <select value={form.fromWalletId} onChange={e => setForm(f => ({ ...f, fromWalletId: e.target.value }))}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand">
              <option value="">Select wallet</option>
              {wallets?.map((w: any) => (
                <option key={w.id} value={w.id}>{w.currency} — {formatMoney(w.balanceMinor, w.currency)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">To Currency</label>
            <select value={form.toCurrency} onChange={e => setForm(f => ({ ...f, toCurrency: e.target.value }))}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand">
              {CURRENCIES.filter(c => c !== selectedWallet?.currency).map(c => (
                <option key={c} value={c}>{CURRENCY_META[c].name} ({c})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Amount</label>
            <input type="number" step="0.01" min="0.01" value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand" />
          </div>
          {quote && (
            <div className="flex items-center">
              <div className="rounded-lg bg-canvas p-3 w-full">
                <p className="text-xs text-muted">You'll receive approximately</p>
                <p className="text-lg font-bold text-brand">{formatMoney(quote.toAmountMinor, form.toCurrency as any)}</p>
                <p className="text-xs text-muted">Rate: 1 {selectedWallet?.currency} = {quote.rate.toFixed(4)} {form.toCurrency}</p>
              </div>
            </div>
          )}
        </div>

        <button onClick={() => swap.mutate()} disabled={swap.isPending || !form.fromWalletId || !form.amount}
          className="mt-4 flex items-center gap-2 rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
          <RefreshCw size={16} /> {swap.isPending ? 'Swapping...' : 'Swap Currency'}
        </button>
        {swap.isError && <p className="mt-2 text-sm text-bad">{(swap.error as Error).message}</p>}
      </div>
    </div>
  );
}
