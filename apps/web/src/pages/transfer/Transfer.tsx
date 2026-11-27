import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowRightLeft, Globe, MapPin } from 'lucide-react';
import { formatMoney } from '@kestrel/shared';
import { api } from '../../lib/api';

export function Transfer() {
  const [type, setType] = useState<'TRANSFER_LOCAL' | 'TRANSFER_INTL'>('TRANSFER_LOCAL');
  const [form, setForm] = useState({
    walletId: '', amount: '', recipientName: '', recipientAccount: '', recipientBank: '', swiftCode: '', description: '',
  });
  const [success, setSuccess] = useState('');

  const { data: wallets } = useQuery({
    queryKey: ['wallets'],
    queryFn: () => api.get<any[]>('/wallets'),
  });

  const transfer = useMutation({
    mutationFn: () => api.post('/transfers', {
      walletId: form.walletId,
      type,
      amountMinor: Math.round(parseFloat(form.amount) * 100),
      recipientName: form.recipientName,
      recipientAccount: form.recipientAccount,
      recipientBank: form.recipientBank || undefined,
      swiftCode: form.swiftCode || undefined,
      description: form.description || undefined,
    }),
    onSuccess: (data: any) => {
      setSuccess(`Transfer of ${formatMoney(data.amountMinor, data.currency)} completed! Ref: ${data.reference}`);
      setForm({ walletId: '', amount: '', recipientName: '', recipientAccount: '', recipientBank: '', swiftCode: '', description: '' });
    },
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <div>
      <h1 className="text-2xl font-bold">Transfer Money</h1>
      <p className="text-sm text-muted mb-6">Send money locally or internationally</p>

      <div className="flex gap-3 mb-6">
        {[
          { key: 'TRANSFER_LOCAL' as const, icon: MapPin, label: 'Local Transfer' },
          { key: 'TRANSFER_INTL' as const, icon: Globe, label: 'International Transfer' },
        ].map(({ key, icon: Icon, label }) => (
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
            <label className="block text-sm font-medium mb-1">From Wallet</label>
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
          <div>
            <label className="block text-sm font-medium mb-1">Recipient Name</label>
            <input value={form.recipientName} onChange={set('recipientName')} placeholder="Full name"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Recipient Account</label>
            <input value={form.recipientAccount} onChange={set('recipientAccount')} placeholder="Account number"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand" />
          </div>
          {type === 'TRANSFER_INTL' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Recipient Bank</label>
                <input value={form.recipientBank} onChange={set('recipientBank')} placeholder="Bank name"
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">SWIFT Code</label>
                <input value={form.swiftCode} onChange={set('swiftCode')} placeholder="SWIFT/BIC code"
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand" />
              </div>
            </>
          )}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1">Description (optional)</label>
            <input value={form.description} onChange={set('description')} placeholder="What's this for?"
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand" />
          </div>
        </div>
        <button onClick={() => transfer.mutate()} disabled={transfer.isPending}
          className="mt-4 flex items-center gap-2 rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
          <ArrowRightLeft size={16} /> {transfer.isPending ? 'Processing...' : 'Send Transfer'}
        </button>
        {transfer.isError && <p className="mt-2 text-sm text-bad">{(transfer.error as Error).message}</p>}
      </div>
    </div>
  );
}
