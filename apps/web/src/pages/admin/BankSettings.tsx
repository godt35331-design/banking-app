import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, RotateCcw } from 'lucide-react';
import { DEFAULT_SETTINGS, type BankSettings } from '@kestrel/shared';
import { api } from '../../lib/api';
import { Flag } from '../../components/Flag';
import { Btn, Card, Loading, PageHeader, titleCase } from './ui';

const KINDS = Object.keys(DEFAULT_SETTINGS.fees) as (keyof BankSettings['fees'])[];
const LABEL: Record<string, string> = {
  DEPOSIT_BANK: 'Bank deposit',
  DEPOSIT_CHECK: 'Check deposit',
  DEPOSIT_CASH: 'Cash deposit',
  TRANSFER_LOCAL: 'Local transfer',
  TRANSFER_INTL: 'International transfer',
};

/** Money settings are stored in cents; the form shows dollars. */
const toD = (minor: number) => String(minor / 100);
const toM = (d: string) => Math.round((parseFloat(d) || 0) * 100);

export function AdminBankSettings() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-settings'], queryFn: () => api.get<BankSettings>('/admin/settings') });
  const [s, setS] = useState<BankSettings | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (data) setS(structuredClone(data)); }, [data]);

  const save = useMutation({
    mutationFn: () => api.put<BankSettings>('/admin/settings', s),
    onSuccess: d => {
      qc.setQueryData(['admin-settings'], d);
      qc.invalidateQueries({ queryKey: ['bank-settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  if (isLoading || !s) return <><PageHeader title="Bank settings" /><Loading h="h-96" /></>;

  const dirty = JSON.stringify(s) !== JSON.stringify(data);
  const set = (fn: (x: BankSettings) => void) => setS(prev => { const n = structuredClone(prev!); fn(n); return n; });
  const num = (v: string) => (v === '' ? 0 : Number(v));

  return (
    <div className="pb-24">
      <PageHeader title="Bank settings" subtitle="Changes apply straight away to every customer. Each save is recorded in the activity log." />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold">Exchange rates</h2>
          <p className="mb-4 text-sm text-muted">How much 1 US dollar buys. Used for swaps and for showing totals in USD.</p>
          <div className="space-y-3">
            {(['EUR', 'GBP'] as const).map(c => (
              <Field key={c} label={<span className="flex items-center gap-2"><Flag code={c} size={18} /> 1 USD =</span>} suffix={c}>
                <input type="number" step="0.0001" min="0.0001" value={s.ratesToUSD[c]} onChange={e => set(x => { x.ratesToUSD[c] = num(e.target.value); })} />
              </Field>
            ))}
            <Field label="Swap margin" suffix="%" hint="Added on top of the rate when customers swap currencies">
              <input type="number" step="0.1" min="0" max="20" value={s.swapMarginPct} onChange={e => set(x => { x.swapMarginPct = num(e.target.value); })} />
            </Field>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold">Security & accounts</h2>
          <p className="mb-4 text-sm text-muted">Rules for every customer account.</p>
          <div className="space-y-3">
            <Field label="Transfers need approval from" prefix="$" hint="Transfers of this amount or more wait in Approvals">
              <input type="number" min="0" step="1" value={toD(s.approvalThresholdMinorUSD)} onChange={e => set(x => { x.approvalThresholdMinorUSD = toM(e.target.value); })} />
            </Field>
            <Field label="Cards per customer" hint="Maximum number of cards one customer can have">
              <input type="number" min="1" max="50" value={s.maxCardsPerCustomer} onChange={e => set(x => { x.maxCardsPerCustomer = num(e.target.value); })} />
            </Field>
            <Field label="Wrong PIN attempts before lock" hint="The account locks after this many wrong PINs">
              <input type="number" min="1" max="20" value={s.pinAttempts} onChange={e => set(x => { x.pinAttempts = num(e.target.value); })} />
            </Field>
            <Field label="Sign out after inactivity" suffix="min">
              <input type="number" min="1" max="240" value={s.idleMinutes} onChange={e => set(x => { x.idleMinutes = num(e.target.value); })} />
            </Field>
          </div>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold">Fees and limits</h2>
          <p className="mb-4 text-sm text-muted">Fees are a percentage with a minimum. Limits are in USD; set a limit to 0 for no limit.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.1em] text-muted">
                  <th className="pb-2 pr-3">Type</th><th className="pb-2 pr-3">Fee %</th><th className="pb-2 pr-3">Minimum fee ($)</th>
                  <th className="pb-2 pr-3">Per transaction ($)</th><th className="pb-2">Per day ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {KINDS.map(k => (
                  <tr key={k}>
                    <td className="py-2.5 pr-3 font-medium">{LABEL[k] ?? titleCase(k)}</td>
                    <td className="py-2 pr-3"><Cell value={s.fees[k].pct} step="0.1" onChange={v => set(x => { x.fees[k].pct = num(v); })} /></td>
                    <td className="py-2 pr-3"><Cell value={toD(s.fees[k].minMinor)} onChange={v => set(x => { x.fees[k].minMinor = toM(v); })} /></td>
                    <td className="py-2 pr-3"><Cell value={toD(s.limits[k].perTxMinor)} onChange={v => set(x => { x.limits[k].perTxMinor = toM(v); })} /></td>
                    <td className="py-2"><Cell value={toD(s.limits[k].perDayMinor)} onChange={v => set(x => { x.limits[k].perDayMinor = toM(v); })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Save bar */}
      <div className={`fixed bottom-6 left-1/2 z-30 -translate-x-1/2 transition-all duration-300 ${dirty || saved || save.isError ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'}`}>
        <div className="flex items-center gap-3 rounded-full bg-night py-2 pl-5 pr-2 text-sm text-white shadow-2xl">
          {save.isError ? <span className="max-w-md truncate text-red-300">{(save.error as Error).message}</span>
            : saved ? <span className="flex items-center gap-1.5"><Check size={15} className="text-brand-bright" /> Settings saved</span>
              : <span>You have unsaved changes</span>}
          {dirty && <>
            <button onClick={() => setS(structuredClone(data!))} className="flex items-center gap-1 rounded-full px-3 py-2 text-white/70 hover:text-white"><RotateCcw size={14} /> Undo</button>
            <Btn tone="green" className="!bg-brand-bright !text-night" busy={save.isPending} onClick={() => save.mutate()}>Save changes</Btn>
          </>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, prefix, suffix, children }: { label: React.ReactNode; hint?: string; prefix?: string; suffix?: string; children: React.ReactElement }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium">{label}</span>
        <span className="flex w-40 items-center rounded-xl border border-line px-3 focus-within:border-night">
          {prefix && <span className="text-sm text-muted">{prefix}</span>}
          <span className="flex-1 [&>input]:w-full [&>input]:bg-transparent [&>input]:py-2 [&>input]:text-right [&>input]:text-sm [&>input]:tabular-nums [&>input]:outline-none">{children}</span>
          {suffix && <span className="pl-1.5 text-sm text-muted">{suffix}</span>}
        </span>
      </span>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

function Cell({ value, onChange, step = '1' }: { value: number | string; onChange: (v: string) => void; step?: string }) {
  return (
    <input
      type="number"
      min="0"
      step={step}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full rounded-lg border border-line px-2.5 py-1.5 text-right tabular-nums outline-none focus:border-night"
    />
  );
}
