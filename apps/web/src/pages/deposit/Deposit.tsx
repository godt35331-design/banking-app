import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Download, Building, FileCheck, Banknote } from 'lucide-react';
import { formatMoney } from '@kestrel/shared';
import { api } from '../../lib/api';

const types = [
  { key: 'DEPOSIT_BANK' as const, icon: Building, label: 'Bank Transfer' },
  { key: 'DEPOSIT_CHECK' as const, icon: FileCheck, label: 'Check Deposit' },
  { key: 'DEPOSIT_CASH' as const, icon: Banknote, label: 'Cash Deposit' },
];

export function Deposit() {
  const [type, setType] = useState<string>('DEPOSIT_BANK');
  const [form, setForm] = useState({ walletId: '', amount: '', sourceBank: '', checkNumber: '', cashCode: '', description: '' });
  const [success, setSuccess] = useState('');

  const { data: wallets } = useQuery({
    queryKey: ['wallets'],
    queryFn: () => api.get<any[]>('/wallets'),
  });

  const deposit = useMutation({
    mutationFn: () => api.post('/deposits', {
      walletId: form.walletId,
      type,
      amountMinor: Math.round(parseFloat(form.amount) * 100),
      sourceBank: form.sourceBank || undefined,
      checkNumber: form.checkNumber || undefined,
      cashCode: form.cashCode || undefined,
      description: form.description || undefined,
    }),
    onSuccess: (data: any) => {
      const msg = data.status === 'PENDING'
        ? `Check deposit of ${formatMoney(data.amountMinor, data.currency)} submitted. It will be processed within 2 business days.`
        : `Deposit of ${formatMoney(data.amountMinor, data.currency)} completed! Ref: ${data.reference}`;
      setSuccess(msg);
      setForm({ walletId: '', amount: '', sourceBank: '', checkNumber: '', cashCode: '', description: '' });
    },
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <div>
      <h1 className="text-2xl font-bold">Deposit Funds</h1>
      <p className="text-sm text-muted mb-6">Add money to your wallet</p>

      <div className="flex flex-wrap gap-3 mb-6">
        {types.map(({ key, icon: Icon, label }) => (
          <button key={key} onClick={() => { setType(key); setSuccess(''); }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              type === key ? 'bg-brand text-white' : 'border border-line bg-surface hover:bg-canvas'
            }`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {success && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-ok">{success}</div>
      )}

      <div className="rounded-xl border border-line bg-surface p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1">To Wallet</label>
            <select value={form.walletId} onChange={set('walletId')}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand">
              <option value="">Select wallet</option>
              {wallets?.map((w: any) => (
                <option key={w.id} value={w.id}>{w.currency} — {formatMoney(w.balanceMinor, w.currency)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Amount</label>
            <input type="number" step="0.01" min="0.01" value={form.amount} onChange={set('amount')} placeholder="0.00"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand" />
          </div>

          {type === 'DEPOSIT_BANK' && (
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Source Bank</label>
              <input value={form.sourceBank} onChange={set('sourceBank')} placeholder="Sending bank name"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand" />
            </div>
          )}

          {type === 'DEPOSIT_CHECK' && (
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Check Number</label>
              <input value={form.checkNumber} onChange={set('checkNumber')} placeholder="Check #"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand" />
              <p className="mt-1 text-xs text-warn">Check deposits take up to 2 business days to clear.</p>
            </div>
          )}

          {type === 'DEPOSIT_CASH' && (
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1">Cash Deposit Code</label>
              <input value={form.cashCode} onChange={set('cashCode')} placeholder="Code from receipt"
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand" />
            </div>
          )}

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Description (optional)</label>
            <input value={form.description} onChange={set('description')} placeholder="Note for this deposit"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand" />
          </div>
        </div>

        <button onClick={() => deposit.mutate()} disabled={deposit.isPending}
          className="mt-4 flex items-center gap-2 rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
          <Download size={16} /> {deposit.isPending ? 'Processing...' : 'Make Deposit'}
        </button>
        {deposit.isError && <p className="mt-2 text-sm text-bad">{(deposit.error as Error).message}</p>}
      </div>
    </div>
  );
}
