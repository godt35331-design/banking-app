import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Bitcoin, Check, Clock, Landmark, Loader2, Mail, MessageSquare, ShieldAlert, Undo2 } from 'lucide-react';
import {
  CRYPTO_ASSETS, WITHDRAWAL_COUNTRIES, cryptoAsset, cryptoNetwork, destinationLabel, formatMoney, withdrawalErrors,
  type Currency, type WithdrawalMethod,
} from '@kestrel/shared';
import { api } from '../lib/api';
import { Flag } from '../components/Flag';
import { useAuth } from '../hooks/useAuth';

type Wallet = { id: string; currency: Currency; balanceMinor: number; accountNumber: string };
type Withdrawal = {
  id: string; reference: string; kind: string; status: string; amountMinor: number; currency: Currency;
  createdAt: string; completedAt: string | null; reason: string | null; meta: any;
  emailSent?: boolean; // set on a new withdrawal when the automatic email went out
};

const input = 'w-full rounded-xl border border-line bg-white px-3.5 py-3 text-sm outline-none transition-colors focus:border-night';
const fmt = (d: string) => new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Withdraw from a wallet to the customer's own bank account or crypto wallet. */
export function Withdraw() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: wallets } = useQuery({ queryKey: ['wallets'], queryFn: () => api.get<Wallet[]>('/wallets') });
  const { data: history } = useQuery({ queryKey: ['withdrawals'], queryFn: () => api.get<Withdrawal[]>('/withdrawals'), refetchInterval: 20_000 });

  const [walletId, setWalletId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<WithdrawalMethod>('BANK');
  const [bank, setBank] = useState({ accountHolder: '', bankName: '', accountNumber: '', swift: '', country: '' });
  const [crypto, setCrypto] = useState({ asset: 'USDT', network: 'TRX', address: '', memo: '' });
  const [step, setStep] = useState<'form' | 'review' | 'done'>('form');
  const [touched, setTouched] = useState(false);
  const [checked, setChecked] = useState(false);

  const wallet = wallets?.find(w => w.id === walletId) ?? wallets?.[0];
  const amountMinor = Math.round(parseFloat(amount.replace(/,/g, '')) * 100);
  const asset = cryptoAsset(crypto.asset);
  const network = cryptoNetwork(crypto.asset, crypto.network);

  const errors = useMemo(() => {
    const e = withdrawalErrors(method, bank, crypto);
    if (!wallet) e.wallet = 'You need a wallet first';
    if (!(amountMinor >= 100)) e.amount = 'Enter at least 1.00';
    else if (wallet && amountMinor > wallet.balanceMinor) e.amount = `You have ${formatMoney(wallet.balanceMinor, wallet.currency)} in this wallet`;
    return e;
  }, [method, bank, crypto, wallet, amountMinor]);
  const err = (k: string) => (touched && errors[k] ? <p className="mt-1.5 text-xs text-bad">{errors[k]}</p> : null);

  const submit = useMutation({
    mutationFn: () => api.post<Withdrawal>('/withdrawals', {
      walletId: wallet!.id, amountMinor, method,
      bank: method === 'BANK' ? bank : undefined,
      crypto: method === 'CRYPTO' ? crypto : undefined,
    }),
    onSuccess: () => {
      setStep('done');
      qc.invalidateQueries({ queryKey: ['wallets'] });
      qc.invalidateQueries({ queryKey: ['withdrawals'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const reset = () => {
    setStep('form'); setAmount(''); setTouched(false); setChecked(false); submit.reset();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.03em]">Withdraw</h1>
        <p className="mt-1 text-sm text-muted">Send money from your wallet to your own bank account or crypto wallet.</p>
      </div>

      {step === 'done' && submit.data?.emailSent && (
        <div role="alert" className="pill-grow flex gap-3.5 rounded-[20px] border border-brand/30 bg-brand-soft p-4 sm:p-5">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-white"><Mail size={19} /></span>
          <div className="text-sm">
            <p className="font-display text-base font-semibold text-night">Check your email to complete the next step</p>
            <p className="mt-1 leading-relaxed text-muted">
              We've sent an email to <span className="font-semibold text-night">{user?.email ?? 'your email address'}</span> with the subject
              "Update on your withdrawal". Please read it and follow the steps. If you can't find it, check your spam or junk folder.
            </p>
          </div>
        </div>
      )}

      {step === 'done' && submit.data?.meta?.hold ? (
        <section className="rounded-[24px] bg-white p-7 text-center" style={{ animation: 'rise-in .45s cubic-bezier(.2,.8,.2,1) both' }}>
          <span className="pill-grow mx-auto grid h-16 w-16 place-items-center rounded-full bg-amber-50 text-warn"><Clock size={30} /></span>
          <h2 className="mt-4 font-display text-2xl font-semibold">Under review and processing</h2>
          <p className="mt-2 text-sm text-muted">
            Your withdrawal of {formatMoney(submit.data.amountMinor, submit.data.currency)} ({submit.data.reference}) has been received and is being reviewed.
            You'll get a notification when it's confirmed.
          </p>
          {submit.data.meta.adminNote && (
            <p className="mx-auto mt-4 max-w-md whitespace-pre-line rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm leading-relaxed text-warn">
              {submit.data.meta.adminNote}
            </p>
          )}
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            <Link to="/dashboard/support" className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white">
              <MessageSquare size={16} /> Contact support
            </Link>
            <button onClick={reset} className="rounded-full bg-night px-6 py-3 text-sm font-semibold text-white">Done</button>
          </div>
        </section>
      ) : step === 'done' ? (
        <section className="rounded-[24px] bg-white p-7 text-center" style={{ animation: 'rise-in .45s cubic-bezier(.2,.8,.2,1) both' }}>
          <span className="pill-grow mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand text-white"><Check size={30} /></span>
          <h2 className="mt-4 font-display text-2xl font-semibold">Withdrawal requested</h2>
          <p className="mt-2 text-sm text-muted">
            {wallet && formatMoney(amountMinor, wallet.currency)} has been reserved from your {wallet?.currency} wallet. We check every withdrawal and send it, usually within one working day.
            You'll get a notification with the reference when it's sent.
          </p>
          <button onClick={reset} className="mt-5 rounded-full bg-night px-6 py-3 text-sm font-semibold text-white">Done</button>
        </section>
      ) : step === 'review' && wallet ? (
        <section className="rounded-[24px] bg-white p-5 sm:p-6">
          <button onClick={() => setStep('form')} className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-night"><ArrowLeft size={15} /> Edit</button>
          <h2 className="font-display text-lg font-semibold">Check your withdrawal</h2>
          <p className="mt-3 font-display text-[34px] font-semibold tabular-nums">{formatMoney(amountMinor, wallet.currency)}</p>
          <p className="text-xs text-muted">From your {wallet.currency} wallet · no fee · balance after {formatMoney(wallet.balanceMinor - amountMinor, wallet.currency)}</p>
          <dl className="mt-4 divide-y divide-line rounded-2xl bg-paper px-4 text-sm">
            {(method === 'BANK'
              ? [['To', 'Bank account'], ['Account holder', bank.accountHolder], ['Bank', bank.bankName], ['Account / IBAN', bank.accountNumber.replace(/\s/g, '').toUpperCase()], ['SWIFT / BIC', bank.swift || '—'], ['Country', bank.country]]
              : [['To', 'Crypto wallet'], ['Coin', asset?.label ?? ''], ['Network', network?.label ?? ''], ['Address', crypto.address.trim()], ...(crypto.memo ? [['Memo / tag', crypto.memo]] : [])]
            ).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5"><dt className="shrink-0 text-muted">{k}</dt><dd className="min-w-0 break-all text-right font-medium">{v}</dd></div>
            ))}
          </dl>
          {method === 'CRYPTO' && (
            <p className="mt-3 rounded-xl bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-warn">
              Crypto sent to a wrong address or on the wrong network can't be recovered. We send {crypto.asset} at the exchange rate on the day it's sent.
            </p>
          )}
          <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm">
            <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#8b6a3e]" />
            <span>The {method === 'BANK' ? 'account' : 'address'} above is mine and the details are correct.</span>
          </label>
          {submit.isError && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-bad">{(submit.error as Error).message}</p>}
          <button onClick={() => submit.mutate()} disabled={!checked || submit.isPending}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3.5 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-40">
            {submit.isPending ? <><Loader2 size={16} className="animate-spin" /> Sending request…</> : 'Confirm withdrawal'}
          </button>
        </section>
      ) : (
        <section className="space-y-5 rounded-[24px] bg-white p-5 sm:p-6">
          {/* Wallet */}
          <div>
            <p className="mb-2 text-sm font-medium">From</p>
            {!wallets?.length ? <p className="text-sm text-muted">You don't have a wallet yet.</p> : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {wallets.map(w => (
                  <button key={w.id} type="button" onClick={() => setWalletId(w.id)}
                    className={`flex items-center gap-2.5 rounded-2xl px-3 py-3 text-left transition-colors ${wallet?.id === w.id ? 'bg-night text-white' : 'bg-paper hover:bg-black/10'}`}>
                    <Flag code={w.currency} size={26} />
                    <span className="min-w-0">
                      <span className="block text-xs opacity-70">{w.currency}</span>
                      <span className="block truncate text-sm font-semibold tabular-nums">{formatMoney(w.balanceMinor, w.currency)}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Amount</label>
            <div className="relative">
              <input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value.replace(/[^\d.,]/g, ''))} placeholder="0.00" className={`${input} pr-24 font-display text-xl tabular-nums`} />
              {wallet && (
                <button type="button" onClick={() => setAmount((wallet.balanceMinor / 100).toFixed(2))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-paper px-3 py-1.5 text-xs font-semibold">Max</button>
              )}
            </div>
            {err('amount')}
          </div>

          {/* Method */}
          <div>
            <p className="mb-2 text-sm font-medium">To</p>
            <div className="grid grid-cols-2 gap-2">
              {([['BANK', 'Bank account', Landmark], ['CRYPTO', 'Crypto wallet', Bitcoin]] as const).map(([k, label, Icon]) => (
                <button key={k} type="button" onClick={() => setMethod(k)}
                  className={`flex items-center justify-center gap-2 rounded-2xl px-3 py-3.5 text-sm font-semibold transition-colors ${method === k ? 'bg-night text-white' : 'bg-paper hover:bg-black/10'}`}>
                  <Icon size={17} /> {label}
                </button>
              ))}
            </div>
          </div>

          {method === 'BANK' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2"><label className="mb-1.5 block text-sm font-medium">Account holder name</label><input value={bank.accountHolder} onChange={e => setBank({ ...bank, accountHolder: e.target.value })} autoComplete="name" className={input} />{err('accountHolder')}</div>
              <div><label className="mb-1.5 block text-sm font-medium">Bank name</label><input value={bank.bankName} onChange={e => setBank({ ...bank, bankName: e.target.value })} className={input} />{err('bankName')}</div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Country</label>
                <select value={bank.country} onChange={e => setBank({ ...bank, country: e.target.value })} className={input}>
                  <option value="">Choose…</option>
                  {WITHDRAWAL_COUNTRIES.map(c => <option key={c}>{c}</option>)}
                </select>{err('country')}
              </div>
              <div><label className="mb-1.5 block text-sm font-medium">Account number or IBAN</label><input value={bank.accountNumber} onChange={e => setBank({ ...bank, accountNumber: e.target.value })} autoComplete="off" className={`${input} tabular-nums`} />{err('accountNumber')}</div>
              <div><label className="mb-1.5 block text-sm font-medium">SWIFT / BIC <span className="font-normal text-muted">(optional)</span></label><input value={bank.swift} onChange={e => setBank({ ...bank, swift: e.target.value })} autoComplete="off" className={`${input} uppercase`} />{err('swift')}</div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Coin</label>
                <div className="chip-row flex flex-wrap gap-2">
                  {CRYPTO_ASSETS.map(a => (
                    <button key={a.key} type="button" onClick={() => setCrypto({ ...crypto, asset: a.key, network: a.networks[0].key })}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${crypto.asset === a.key ? 'bg-night text-white' : 'bg-paper hover:bg-black/10'}`}>{a.label}</button>
                  ))}
                </div>
              </div>
              {asset && asset.networks.length > 1 && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Network</label>
                  <div className="chip-row flex flex-wrap gap-2">
                    {asset.networks.map(n => (
                      <button key={n.key} type="button" onClick={() => setCrypto({ ...crypto, network: n.key })}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${crypto.network === n.key ? 'bg-night text-white' : 'bg-paper hover:bg-black/10'}`}>{n.label}</button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-muted">Use the same network your receiving wallet or exchange shows.</p>
                </div>
              )}
              <div>
                <label className="mb-1.5 block text-sm font-medium">Receiving address ({network?.label})</label>
                <input value={crypto.address} onChange={e => setCrypto({ ...crypto, address: e.target.value.trim() })} placeholder={network?.example} autoComplete="off" spellCheck={false}
                  className={`${input} font-mono text-xs sm:text-sm`} />
                {err('address')}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Memo / tag <span className="font-normal text-muted">(only if your exchange asks for one)</span></label>
                <input value={crypto.memo} onChange={e => setCrypto({ ...crypto, memo: e.target.value })} autoComplete="off" className={input} />
              </div>
              <p className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs leading-relaxed text-warn">
                <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                Only enter your public receiving address. Never share your private key, recovery (seed) phrase or wallet password with anyone, including us.
              </p>
            </div>
          )}

          <button onClick={() => { setTouched(true); if (!Object.keys(errors).length) setStep('review'); }}
            className={`w-full rounded-full py-3.5 text-sm font-semibold text-white transition-all active:scale-[0.98] ${Object.keys(errors).length ? 'bg-night/40' : 'bg-night'}`}>
            Continue
          </button>
          <p className="text-center text-xs text-muted">No fee. We check every withdrawal before sending it, usually within one working day.</p>
        </section>
      )}

      {/* History */}
      {(history?.length ?? 0) > 0 && (
        <section className="rounded-[24px] bg-white p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold">Your withdrawals</h2>
          <ul className="mt-3 divide-y divide-line">
            {history!.map(w => {
              const sent = w.status === 'COMPLETED';
              const back = w.status === 'REJECTED';
              return (
                <li key={w.id} className="flex items-start gap-3 py-3 text-sm">
                  <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${sent ? 'bg-brand-soft text-brand' : back ? 'bg-red-50 text-bad' : 'bg-amber-50 text-warn'}`}>
                    {sent ? <Check size={16} /> : back ? <Undo2 size={16} /> : <Clock size={16} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{destinationLabel(w.meta)}</span>
                    <span className="block text-xs text-muted">
                      {sent ? `Sent ${fmt(w.completedAt ?? w.createdAt)}${w.meta?.payoutReference ? ` · ref ${w.meta.payoutReference}` : ''}`
                        : back ? `Not sent, money returned${w.reason ? ` · ${w.reason}` : ''}`
                          : w.meta?.hold ? `Requested ${fmt(w.createdAt)} · under review and processing` : `Requested ${fmt(w.createdAt)} · being processed`}
                    </span>
                    {!sent && !back && w.meta?.adminNote && (
                      <span className="mt-1.5 block rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs leading-relaxed text-warn">
                        <span className="block whitespace-pre-line">{w.meta.adminNote}</span>
                        <Link to="/dashboard/support" className="mt-1 inline-flex items-center gap-1 font-semibold text-brand underline">
                          <MessageSquare size={12} /> Contact support
                        </Link>
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">−{formatMoney(w.amountMinor, w.currency)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      <p className="text-center text-xs text-muted">Questions about a withdrawal? <Link to="/dashboard/support" className="font-semibold text-brand underline">Contact support</Link></p>
    </div>
  );
}
