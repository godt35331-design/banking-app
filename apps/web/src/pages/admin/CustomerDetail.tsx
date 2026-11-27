import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowDownLeft, ArrowUpRight, KeyRound, Lock, LockOpen, Mail, Pencil, Phone, Plus, Minus,
  ShieldCheck, Snowflake, Hash, MessageSquare, Eye, Upload,
} from 'lucide-react';
import { loanProduct, loanStatus, recoveryStatus } from '@kestrel/shared';
import { api } from '../../lib/api';
import { amountText, catName } from '../recovery/shared';
import { Flag } from '../../components/Flag';
import { Sheet } from '../../components/Sheet';
import { KestrelCard, cardProps } from '../../components/landing/mocks';
import { DarkGlow } from '../../components/AuthShell';
import {
  Avatar, Badge, Btn, Card, ConfirmSheet, Loading, fmtDate, fmtDateTime, inputCls, money, titleCase,
} from './ui';

type Detail = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  status: 'ACTIVE' | 'FROZEN' | 'LOCKED';
  kycStatus: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  kycIdType: string | null;
  kycSubmittedAt: string | null;
  kycNote: string | null;
  kycDocuments: { type: string; name: string; size: number }[];
  withdrawalHold: boolean | null;
  withdrawalHoldNote: string | null;
  pinFails: number;
  mainCurrency: string;
  createdAt: string;
  wallets: { id: string; currency: string; balanceMinor: number; accountNumber: string }[];
  cards: any[];
  loanApplications: { id: string; reference: string; product: string; status: string; amountMinor: number | null; currency: string | null; termMonths: number | null; submittedAt: string | null }[];
  taxRecoveries: any[];
  recoveryCases: { id: string; reference: string; category: string; status: string; amountMinor: number | null; currency: string | null; submittedAt: string | null }[];
  transactions: any[];
  audit: { id: string; action: string; createdAt: string; detail: any; actor: { name: string } | null }[];
};

type SheetKind = null | 'status' | 'profile' | 'password' | 'pin' | 'adjust' | 'kycReject' | 'hold';

const KYC_LABEL: Record<string, string> = {
  ID_FRONT: 'Photo of ID',
  ID_BACK: 'Back of ID',
  PROOF_OF_ADDRESS: 'Proof of address',
};

export function AdminCustomerDetail() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const { data: c, isLoading, error } = useQuery({
    queryKey: ['admin-user', id],
    queryFn: () => api.get<Detail>(`/admin/users/${id}`),
  });
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [nextStatus, setNextStatus] = useState<Detail['status']>('ACTIVE');
  const [toast, setToast] = useState('');

  const refresh = (msg?: string) => {
    qc.invalidateQueries({ queryKey: ['admin-user', id] });
    qc.invalidateQueries({ queryKey: ['admin-users'] });
    qc.invalidateQueries({ queryKey: ['admin-overview'] });
    setSheet(null);
    if (msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }
  };

  const setStatus = useMutation({
    mutationFn: (reason: string) => api.patch(`/admin/users/${id}/status`, { status: nextStatus, reason: reason || undefined }),
    onSuccess: () => refresh(`Account set to ${nextStatus.toLowerCase()}`),
  });
  const setKyc = useMutation({
    mutationFn: ({ status, note }: { status: string; note?: string }) => api.patch(`/admin/users/${id}/kyc`, { kycStatus: status, note }),
    onSuccess: () => refresh('Identity check updated'),
  });
  const setHold = useMutation({
    mutationFn: ({ hold, note }: { hold: boolean; note?: string }) => api.patch(`/admin/users/${id}/withdrawal-hold`, { hold, note }),
    onSuccess: (_d, v) => refresh(v.hold ? 'Withdrawals on hold' : 'Withdrawal hold released'),
  });
  const cardAction = useMutation({
    mutationFn: ({ cardId, status }: { cardId: string; status: string }) => api.patch(`/admin/cards/${cardId}`, { status }),
    onSuccess: () => refresh('Card updated'),
  });

  if (isLoading) return <Loading h="h-96" />;
  if (error || !c) return <p className="text-sm text-bad">{(error as Error)?.message ?? 'Customer not found'}</p>;

  const askStatus = (s: Detail['status']) => { setNextStatus(s); setSheet('status'); };

  return (
    <div className="space-y-5">
      <Link to="/admin/customers" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-night">
        <ArrowLeft size={15} /> All customers
      </Link>

      {/* Header */}
      <section className="relative overflow-hidden rounded-[28px] bg-night p-6 text-white sm:p-7">
        <DarkGlow className="-right-40 -top-40 h-[380px] w-[380px] opacity-60" />
        <div className="relative flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-center gap-4">
            <Avatar name={c.name} size="h-14 w-14 text-lg" />
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight">{c.name}</h1>
              <p className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/60">
                <span className="flex items-center gap-1.5"><Mail size={13} />{c.email}</span>
                {c.phone && <span className="flex items-center gap-1.5"><Phone size={13} />{c.phone}</span>}
                <span>Customer since {fmtDate(c.createdAt)}</span>
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge status={c.status} />
                <Badge tone={c.kycStatus === 'APPROVED' ? 'green' : c.kycStatus === 'REJECTED' ? 'red' : 'grey'}>
                  ID {c.kycStatus === 'NOT_SUBMITTED' ? 'not checked' : c.kycStatus.toLowerCase()}
                </Badge>
                {c.pinFails > 0 && <Badge tone="amber">{c.pinFails} wrong PIN attempt{c.pinFails > 1 ? 's' : ''}</Badge>}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {c.status !== 'ACTIVE' && <Btn tone="green" onClick={() => askStatus('ACTIVE')}><LockOpen size={14} />{c.status === 'LOCKED' ? 'Unlock' : 'Unfreeze'}</Btn>}
            {c.status === 'ACTIVE' && c.pinFails > 0 && <Btn tone="green" onClick={() => askStatus('ACTIVE')}><LockOpen size={14} />Reset PIN attempts</Btn>}
            {c.status !== 'FROZEN' && <Btn tone="light" className="!bg-white/10 !text-white hover:!bg-white/20" onClick={() => askStatus('FROZEN')}><Snowflake size={14} />Freeze</Btn>}
            {c.status !== 'LOCKED' && <Btn tone="light" className="!bg-white/10 !text-white hover:!bg-red-500/40" onClick={() => askStatus('LOCKED')}><Lock size={14} />Lock</Btn>}
          </div>
        </div>
      </section>

      {toast && <div className="pill-grow flex items-center justify-center rounded-full bg-night py-2.5 text-sm font-semibold text-white">{toast}</div>}

      <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-5">
          {/* Wallets */}
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Wallets</h2>
              <Btn onClick={() => setSheet('adjust')} disabled={!c.wallets.length}><Plus size={14} />Credit / debit</Btn>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {c.wallets.map(w => (
                <div key={w.id} className="rounded-2xl border border-line p-4">
                  <div className="flex items-center gap-2.5"><Flag code={w.currency} size={28} /><span className="font-semibold">{w.currency}</span></div>
                  <p className="mt-3 font-display text-2xl font-semibold tabular-nums">{money(w.balanceMinor, w.currency)}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted"><Hash size={11} />{w.accountNumber}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Transactions */}
          <Card className="p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Recent transactions</h2>
              <Link to={`/admin/transactions?userId=${c.id}`} className="text-sm font-semibold text-brand hover:underline">See all</Link>
            </div>
            {c.transactions.length ? (
              <ul className="divide-y divide-line">
                {c.transactions.slice(0, 12).map(t => (
                  <li key={t.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${t.direction === 'IN' ? 'bg-brand-soft text-brand' : 'bg-paper'}`}>
                      {t.direction === 'IN' ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{t.description}</span>
                      <span className="block truncate text-xs text-muted">{titleCase(t.kind)} · {t.reference} · {fmtDateTime(t.createdAt)}</span>
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
            ) : <p className="py-4 text-center text-sm text-muted">No transactions yet</p>}
          </Card>

          {/* Cards */}
          <Card className="p-6">
            <h2 className="mb-4 font-display text-lg font-semibold">Cards</h2>
            {c.cards.length ? (
              <div className="grid gap-5 sm:grid-cols-2">
                {c.cards.map(card => (
                  <div key={card.id}>
                    <KestrelCard {...cardProps(card)} />
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-sm font-medium">{card.label}</span>
                      <div className="flex shrink-0 gap-1.5">
                        {card.status === 'FROZEN'
                          ? <Btn tone="green" busy={cardAction.isPending} onClick={() => cardAction.mutate({ cardId: card.id, status: 'ACTIVE' })}>Unfreeze</Btn>
                          : <Btn tone="light" busy={cardAction.isPending} onClick={() => cardAction.mutate({ cardId: card.id, status: 'FROZEN' })}>Freeze</Btn>}
                        <Btn tone="light" className="hover:!bg-red-50 hover:!text-bad" busy={cardAction.isPending} onClick={() => confirm(`Block card ending ${card.last4}? It can't be undone.`) && cardAction.mutate({ cardId: card.id, status: 'REMOVED' })}>Block</Btn>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted">No cards</p>}
          </Card>
        </div>

        <div className="space-y-5">
          {/* Profile & security */}
          <Card className="p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Profile & security</h2>
              <Btn tone="light" onClick={() => setSheet('profile')}><Pencil size={13} />Edit</Btn>
            </div>
            <dl className="divide-y divide-line text-sm">
              <Row k="Name" v={c.name} />
              <Row k="Email" v={c.email} />
              <Row k="Phone" v={c.phone ?? '—'} />
              <Row k="Main currency" v={c.mainCurrency} />
            </dl>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Btn tone="light" onClick={() => setSheet('password')}><KeyRound size={14} />Reset password</Btn>
              <Btn tone="light" onClick={() => setSheet('pin')}><KeyRound size={14} />Reset PIN</Btn>
            </div>
          </Card>

          {/* Withdrawals */}
          <Card className={`p-6 ${c.withdrawalHold ? 'ring-2 ring-amber-400' : ''}`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><Upload size={18} />Withdrawals</h2>
              <Badge tone={c.withdrawalHold ? 'amber' : 'green'}>{c.withdrawalHold ? 'On hold' : 'Normal'}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted">
              {c.withdrawalHold
                ? 'The customer can fill in the Withdraw form, but each request shows as "Under review and processing" with your note. You confirm it in Approvals.'
                : 'Withdrawals wait for you to confirm them in Approvals as usual.'}
            </p>
            {c.withdrawalHold && (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-warn">
                {c.withdrawalHoldNote ? <>Note shown to customer: {c.withdrawalHoldNote}</> : 'No note. The customer just sees "Under review and processing".'}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {c.withdrawalHold ? (
                <>
                  <Btn tone="light" onClick={() => setSheet('hold')}><Pencil size={13} />Edit note</Btn>
                  <Btn tone="green" busy={setHold.isPending} onClick={() => setHold.mutate({ hold: false })}><LockOpen size={14} />Release hold</Btn>
                </>
              ) : (
                <Btn tone="amber" onClick={() => setSheet('hold')}><Lock size={14} />Put on hold</Btn>
              )}
            </div>
          </Card>

          {/* KYC */}
          <Card className={`p-6 ${c.kycStatus === 'PENDING' ? 'ring-2 ring-amber-400' : ''}`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><ShieldCheck size={18} />Identity check</h2>
              <Badge tone={c.kycStatus === 'APPROVED' ? 'green' : c.kycStatus === 'REJECTED' ? 'red' : c.kycStatus === 'PENDING' ? 'amber' : 'grey'}>
                {c.kycStatus === 'NOT_SUBMITTED' ? 'Nothing sent' : c.kycStatus === 'PENDING' ? 'Waiting for you' : titleCase(c.kycStatus)}
              </Badge>
            </div>
            {c.kycSubmittedAt && (
              <p className="mt-1 text-sm text-muted">
                {titleCase(c.kycIdType ?? 'ID')} · sent {fmtDate(c.kycSubmittedAt)}
              </p>
            )}
            {c.kycDocuments.length > 0 ? (
              <div className="mt-3 space-y-2">
                {c.kycDocuments.map(d => (
                  <a key={d.type} href={`/api/admin/users/${c.id}/kyc-documents/${d.type}`} target="_blank" rel="noreferrer"
                    className="group flex items-center gap-2.5 rounded-xl border border-line px-3 py-2 text-sm hover:border-night">
                    <Eye size={14} className="shrink-0 text-muted group-hover:text-night" />
                    <span className="min-w-0">
                      <span className="block font-medium">{KYC_LABEL[d.type] ?? d.type}</span>
                      <span className="block truncate text-[11px] text-muted">{d.name}</span>
                    </span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">The customer hasn't uploaded ID documents yet.</p>
            )}
            {c.kycNote && c.kycStatus === 'REJECTED' && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-bad">Rejected: {c.kycNote}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <Btn tone="green" busy={setKyc.isPending} disabled={c.kycStatus === 'APPROVED'} onClick={() => setKyc.mutate({ status: 'APPROVED' })}>Mark verified</Btn>
              <Btn tone="red" disabled={c.kycStatus === 'REJECTED'} onClick={() => setSheet('kycReject')}>Reject</Btn>
            </div>
          </Card>

          {/* Services */}
          <Card className="p-6">
            <h2 className="mb-3 font-display text-lg font-semibold">Services</h2>
            <ul className="divide-y divide-line text-sm">
              {c.loanApplications.map(l => (
                <ServiceRow key={l.id} to={`/admin/loans/${l.id}`} title={`${l.reference} · ${loanProduct(l.product)?.name ?? l.product}`}
                  sub={`${amountText(l.amountMinor, l.currency)}${l.termMonths ? ` · ${l.termMonths} months` : ''} · ${fmtDate(l.submittedAt)}`} status={l.status} label={loanStatus(l.status)?.label} />
              ))}
              {c.taxRecoveries.map(t => (
                <ServiceRow key={t.id} to="/admin/tax-refunds" title={`Tax refund · ${t.taxYear}`} sub={fmtDate(t.createdAt)} status={t.status} />
              ))}
              {c.recoveryCases.map(f => (
                <ServiceRow key={f.id} to={`/admin/fund-recovery/${f.id}`} title={`${f.reference} · ${catName(f.category)}`} sub={`${amountText(f.amountMinor, f.currency)} · ${fmtDate(f.submittedAt)}`} status={f.status} label={recoveryStatus(f.status)?.label} />
              ))}
              {!c.loanApplications.length &&!c.taxRecoveries.length && !c.recoveryCases.length && <li className="py-2 text-muted">No loans or claims</li>}
            </ul>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
              <Link to={`/admin/support?user=${c.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
                <MessageSquare size={14} /> Open support chat
              </Link>
              <Link to={`/admin/mail?user=${c.id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
                <Mail size={14} /> Send email
              </Link>
            </div>
          </Card>

          {/* History */}
          <Card className="p-6">
            <h2 className="mb-3 font-display text-lg font-semibold">Staff actions on this account</h2>
            {c.audit.length ? (
              <ul className="space-y-3 text-sm">
                {c.audit.map(a => (
                  <li key={a.id} className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-night/30" />
                    <span>
                      <span className="font-medium">{describeAction(a.action)}</span>
                      <span className="block text-xs text-muted">{a.actor?.name ?? 'Staff'} · {fmtDateTime(a.createdAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted">Nothing yet</p>}
          </Card>
        </div>
      </div>

      {/* Sheets */}
      <ConfirmSheet
        open={sheet === 'status'}
        onClose={() => setSheet(null)}
        title={nextStatus === 'ACTIVE' ? (c.status === 'ACTIVE' ? 'Reset PIN attempts?' : `Reactivate ${c.name}?`) : nextStatus === 'FROZEN' ? `Freeze ${c.name}?` : `Lock ${c.name}?`}
        subtitle={
          nextStatus === 'FROZEN' ? 'They can still log in and contact support, but every payment is blocked.'
            : nextStatus === 'LOCKED' ? 'They are signed out and cannot log in until unlocked.'
              : 'The account works normally again and wrong PIN attempts are reset.'
        }
        confirmLabel={nextStatus === 'ACTIVE' ? 'Reactivate' : nextStatus === 'FROZEN' ? 'Freeze account' : 'Lock account'}
        tone={nextStatus === 'ACTIVE' ? 'green' : 'red'}
        reason="Reason (shown to the customer)"
        busy={setStatus.isPending}
        error={setStatus.isError ? (setStatus.error as Error).message : ''}
        onConfirm={r => setStatus.mutate(r)}
      />
      <ConfirmSheet
        open={sheet === 'kycReject'}
        onClose={() => setSheet(null)}
        title="Reject identity documents?"
        subtitle="The customer is asked to upload new documents."
        confirmLabel="Reject"
        tone="red"
        reason="What's wrong? (shown to the customer)"
        reasonRequired
        busy={setKyc.isPending}
        error={setKyc.isError ? (setKyc.error as Error).message : ''}
        onConfirm={note => setKyc.mutate({ status: 'REJECTED', note })}
      />
      <ConfirmSheet
        open={sheet === 'hold'}
        onClose={() => setSheet(null)}
        title={c.withdrawalHold ? 'Edit the withdrawal note' : `Put ${c.name}'s withdrawals on hold?`}
        subtitle='Their withdrawals show as "Under review and processing" with the note below, until you confirm or reject them in Approvals.'
        confirmLabel={c.withdrawalHold ? 'Save note' : 'Put on hold'}
        tone="amber"
        reason="Note shown to the customer"
        initialReason={c.withdrawalHoldNote ?? ''}
        busy={setHold.isPending}
        error={setHold.isError ? (setHold.error as Error).message : ''}
        onConfirm={note => setHold.mutate({ hold: true, note })}
      />
      <ProfileSheet key={`${c.name}|${c.email}|${c.phone}`} open={sheet === 'profile'} customer={c} onClose={() => setSheet(null)} onDone={() => refresh('Profile updated')} />
      <ResetSheet open={sheet === 'password'} kind="password" customerId={c.id} onClose={() => setSheet(null)} onDone={() => refresh('Password reset')} />
      <ResetSheet open={sheet === 'pin'} kind="pin" customerId={c.id} onClose={() => setSheet(null)} onDone={() => refresh('PIN reset')} />
      <AdjustSheet open={sheet === 'adjust'} customer={c} onClose={() => setSheet(null)} onDone={msg => refresh(msg)} />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="text-muted">{k}</dt>
      <dd className="min-w-0 truncate text-right font-medium">{v}</dd>
    </div>
  );
}

function ServiceRow({ to, title, sub, status, label }: { to: string; title: string; sub: string; status: string; label?: string }) {
  return (
    <li>
      <Link to={to} className="flex items-center gap-3 py-2.5 hover:opacity-80">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{title}</span>
          <span className="block truncate text-xs text-muted">{sub}</span>
        </span>
        <Badge status={status}>{label}</Badge>
      </Link>
    </li>
  );
}

export function describeAction(action: string) {
  const map: Record<string, string> = {
    'customer.active': 'Account reactivated',
    'customer.frozen': 'Account frozen',
    'customer.locked': 'Account locked',
    'customer.kyc': 'Identity check updated',
    'customer.profile': 'Profile edited',
    'customer.reset_password': 'Password reset',
    'customer.reset_pin': 'PIN reset',
    'wallet.credit': 'Wallet credited',
    'wallet.debit': 'Wallet debited',
    'customer.withdrawal_hold': 'Withdrawals put on hold',
    'customer.withdrawal_release': 'Withdrawal hold released',
    'withdrawal.note': 'Withdrawal note updated',
    'mail.sent': 'Email sent to customer',
    'mail.template': 'Automatic email changed',
    'mail.failed': 'Email to customer failed',
    'mail.not_configured': 'Message saved (email not set up)',
    'withdrawal.approve': 'Withdrawal confirmed as sent',
    'withdrawal.reject': 'Withdrawal rejected',
    'transfer.approve': 'Large transfer approved',
    'transfer.reject': 'Large transfer rejected',
    'check.clear': 'Check deposit cleared',
    'check.bounce': 'Check deposit bounced',
    'transaction.reverse': 'Transaction reversed',
    'card.update': 'Card updated',
    'loan.approve': 'Loan approved and paid out',
    'loan.decline': 'Loan declined',
    'loan.repaid': 'Loan marked repaid',
    'fund_recovery.investigating': 'Fund recovery: investigation started',
    'fund_recovery.approved': 'Fund recovery approved',
    'fund_recovery.rejected': 'Fund recovery rejected',
    'fund_recovery.refund': 'Fund recovery refunded',
    'support.reply': 'Replied in support chat',
    'settings.update': 'Bank settings changed',
  };
  if (action.startsWith('recovery.')) {
    const key = action.slice(9).toUpperCase();
    return key === 'MESSAGE' ? 'Messaged customer about a recovery case' : `Recovery case set to ${recoveryStatus(key)?.label ?? titleCase(key)}`;
  }
  if (action.startsWith('loan.') && !map[action]) {
    const key = action.slice(5).toUpperCase();
    const special: Record<string, string> = {
      MESSAGE: 'Messaged customer about a loan application', ASSIGN: 'Loan application assigned',
      ASSESSMENT: 'Loan assessment updated', FORWARD: 'Loan application forwarded to lender',
    };
    return special[key] ?? `Loan application set to ${loanStatus(key)?.label ?? titleCase(key)}`;
  }
  return map[action] ?? titleCase(action.replace(/\./g, ' '));
}

/* ---------- sheets ---------- */

function ProfileSheet({ open, customer, onClose, onDone }: { open: boolean; customer: Detail; onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ name: customer.name, email: customer.email, phone: customer.phone ?? '' });
  const save = useMutation({ mutationFn: () => api.patch(`/admin/users/${customer.id}/profile`, f), onSuccess: onDone });
  return (
    <Sheet open={open} onClose={onClose} title="Edit profile" subtitle="Correct the customer's details.">
      <div className="space-y-3">
        {(['name', 'email', 'phone'] as const).map(k => (
          <label key={k} className="block text-sm font-medium capitalize">{k}
            <input value={f[k]} onChange={e => setF(x => ({ ...x, [k]: e.target.value }))} className={`${inputCls} mt-1.5`} />
          </label>
        ))}
      </div>
      {save.isError && <p className="mt-3 text-sm text-bad">{(save.error as Error).message}</p>}
      <Btn busy={save.isPending} onClick={() => save.mutate()} className="mt-6 w-full !py-3.5 !text-sm">Save changes</Btn>
    </Sheet>
  );
}

function ResetSheet({ open, kind, customerId, onClose, onDone }: { open: boolean; kind: 'password' | 'pin'; customerId: string; onClose: () => void; onDone: () => void }) {
  const [v, setV] = useState('');
  const save = useMutation({
    mutationFn: () => api.post(`/admin/users/${customerId}/reset-${kind}`, { value: v }),
    onSuccess: () => { setV(''); onDone(); },
  });
  const ok = kind === 'pin' ? /^\d{4}$/.test(v) : v.length >= 8;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={kind === 'pin' ? 'Set a new PIN' : 'Set a new password'}
      subtitle="Tell the customer the new value in person or by phone. They should change it after logging in."
    >
      <input
        value={v}
        onChange={e => setV(kind === 'pin' ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value)}
        inputMode={kind === 'pin' ? 'numeric' : undefined}
        placeholder={kind === 'pin' ? '4 digits' : 'At least 8 characters'}
        className={`${inputCls} tracking-wider`}
        autoComplete="off"
      />
      {save.isError && <p className="mt-3 text-sm text-bad">{(save.error as Error).message}</p>}
      <Btn busy={save.isPending} disabled={!ok} onClick={() => save.mutate()} className="mt-6 w-full !py-3.5 !text-sm">
        {kind === 'pin' ? 'Set PIN' : 'Set password'}
      </Btn>
    </Sheet>
  );
}

function AdjustSheet({ open, customer, onClose, onDone }: { open: boolean; customer: Detail; onClose: () => void; onDone: (msg: string) => void }) {
  const [walletId, setWalletId] = useState(customer.wallets[0]?.id ?? '');
  const [direction, setDirection] = useState<'IN' | 'OUT'>('IN');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const wallet = customer.wallets.find(w => w.id === walletId);
  const minor = Math.round(parseFloat(amount) * 100);
  const save = useMutation({
    mutationFn: () => api.post(`/admin/users/${customer.id}/adjust`, { walletId, direction, amountMinor: minor, reason }),
    onSuccess: () => {
      onDone(`${direction === 'IN' ? 'Credited' : 'Debited'} ${money(minor, wallet?.currency)}`);
      setAmount(''); setReason('');
    },
  });
  return (
    <Sheet open={open} onClose={onClose} title="Credit or debit a wallet" subtitle="Recorded as an adjustment, with your reason, on the customer's statement.">
      <div className="grid grid-cols-2 gap-2">
        {(['IN', 'OUT'] as const).map(d => (
          <button
            key={d}
            onClick={() => setDirection(d)}
            className={`flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold ${direction === d ? 'bg-night text-white' : 'bg-paper'}`}
          >
            {d === 'IN' ? <Plus size={15} /> : <Minus size={15} />}{d === 'IN' ? 'Credit (add money)' : 'Debit (take money)'}
          </button>
        ))}
      </div>
      <label className="mt-4 block text-sm font-medium">Wallet
        <select value={walletId} onChange={e => setWalletId(e.target.value)} className={`${inputCls} mt-1.5`}>
          {customer.wallets.map(w => <option key={w.id} value={w.id}>{w.currency} · {money(w.balanceMinor, w.currency)}</option>)}
        </select>
      </label>
      <label className="mt-3 block text-sm font-medium">Amount ({wallet?.currency})
        <input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={`${inputCls} mt-1.5`} />
      </label>
      <label className="mt-3 block text-sm font-medium">Reason (shown to the customer)
        <input value={reason} onChange={e => setReason(e.target.value)} maxLength={140} placeholder="e.g. Goodwill credit for delayed transfer" className={`${inputCls} mt-1.5`} />
      </label>
      {save.isError && <p className="mt-3 text-sm text-bad">{(save.error as Error).message}</p>}
      <Btn
        tone={direction === 'IN' ? 'green' : 'red'}
        busy={save.isPending}
        disabled={!(minor > 0) || !reason.trim() || !walletId}
        onClick={() => save.mutate()}
        className="mt-6 w-full !py-3.5 !text-sm"
      >
        {minor > 0 ? `${direction === 'IN' ? 'Credit' : 'Debit'} ${money(minor, wallet?.currency)}` : 'Enter an amount'}
      </Btn>
    </Sheet>
  );
}
