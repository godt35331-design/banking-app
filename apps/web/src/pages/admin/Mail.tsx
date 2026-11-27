import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Mail as MailIcon, Search, Send, X } from 'lucide-react';
import { BANK_NAME, destinationLabel } from '@kestrel/shared';
import { api } from '../../lib/api';
import { Avatar, Badge, Btn, Card, Empty, Loading, PageHeader, fmtDateTime, inputCls, money } from './ui';
import { WithdrawalEmailCard } from './WithdrawalEmailCard';
import { AutoEmailsCard } from './AutoEmailsCard';

type Customer = { id: string; name: string; email: string };
type Withdrawal = {
  id: string; reference: string; kind: string; status: string; amountMinor: number; currency: string;
  reason: string | null; meta: any; createdAt: string; completedAt: string | null;
};
type Context = {
  user: Customer & { status: string; kycStatus: string; kycNote: string | null; withdrawalHold: boolean | null; withdrawalHoldNote: string | null };
  withdrawals: Withdrawal[];
};
type Email = {
  id: string; userId: string; toEmail: string; toName: string; category: string; subject: string; body: string;
  status: 'SENT' | 'FAILED' | 'NOT_CONFIGURED'; error: string | null; notified: boolean; sentByName: string | null; createdAt: string;
};

type TemplateKey = 'w_review' | 'w_sent' | 'w_returned' | 'account' | 'identity' | 'general';
const TEMPLATES: { key: TemplateKey; label: string; category: string; needsWithdrawal?: boolean }[] = [
  { key: 'w_review', label: 'Withdrawal under review', category: 'WITHDRAWAL', needsWithdrawal: true },
  { key: 'w_sent', label: 'Withdrawal sent', category: 'WITHDRAWAL', needsWithdrawal: true },
  { key: 'w_returned', label: 'Withdrawal returned', category: 'WITHDRAWAL', needsWithdrawal: true },
  { key: 'account', label: 'Account update', category: 'ACCOUNT' },
  { key: 'identity', label: 'Identity check', category: 'IDENTITY' },
  { key: 'general', label: 'Blank', category: 'GENERAL' },
];

const first = (name: string) => name.split(' ')[0] || name;
const sign = `Kind regards,\n${BANK_NAME} Customer Team`;

/** Fills a template with the customer's real details. Staff can edit everything before sending. */
function fill(key: TemplateKey, ctx: Context, w?: Withdrawal): { subject: string; body: string } {
  const hi = `Dear ${first(ctx.user.name)},`;
  const amt = w ? money(w.amountMinor, w.currency) : '';
  const dest = w ? destinationLabel(w.meta) : '';
  switch (key) {
    case 'w_review':
      return {
        subject: `Your withdrawal ${w?.reference ?? ''} is under review`,
        body: `${hi}\n\nWe have received your withdrawal of ${amt} to ${dest} (reference ${w?.reference}). It is currently under review and being processed.${w?.meta?.adminNote ? `\n\n${w.meta.adminNote}` : ''}\n\nWe will email you again as soon as it has been sent. You can follow its progress at any time on the Withdraw page of your dashboard.\n\n${sign}`,
      };
    case 'w_sent':
      return {
        subject: `Your withdrawal ${w?.reference ?? ''} has been sent`,
        body: `${hi}\n\nGood news: your withdrawal of ${amt} to ${dest} has been sent.${w?.meta?.payoutReference ? `\n\nPayment reference: ${w.meta.payoutReference}` : ''}\n\nDepending on your bank or network it can take a little while to arrive. If it hasn't arrived within 3 working days, reply to this email or contact support from your dashboard.\n\n${sign}`,
      };
    case 'w_returned':
      return {
        subject: `Your withdrawal ${w?.reference ?? ''} was not sent`,
        body: `${hi}\n\nYour withdrawal of ${amt} to ${dest} (reference ${w?.reference}) could not be sent, and the full amount has been returned to your ${w?.currency} wallet.${w?.reason ? `\n\nReason: ${w.reason}` : ''}\n\nYou can make a new withdrawal at any time. If you have questions, contact support from your dashboard.\n\n${sign}`,
      };
    case 'account':
      return {
        subject: 'An update about your account',
        body: `${hi}\n\n[Write the update here.]\n\nIf you have any questions, contact support from your dashboard.\n\n${sign}`,
      };
    case 'identity':
      return {
        subject: 'Please complete your identity check',
        body: `${hi}\n\n${ctx.user.kycStatus === 'REJECTED' && ctx.user.kycNote ? `We couldn't verify your identity with the documents you sent: ${ctx.user.kycNote}\n\n` : ''}To keep your account fully active, please upload your ID documents in Settings → Identity verification on your dashboard. It only takes a few minutes.\n\n${sign}`,
      };
    default:
      return { subject: '', body: `${hi}\n\n\n\n${sign}` };
  }
}

const STATUS: Record<Email['status'], { tone: 'green' | 'red' | 'amber'; label: string }> = {
  SENT: { tone: 'green', label: 'Sent' },
  FAILED: { tone: 'red', label: 'Failed' },
  NOT_CONFIGURED: { tone: 'amber', label: 'Not emailed' },
};

export function AdminMail() {
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const userId = params.get('user') ?? '';
  const txParam = params.get('tx') ?? '';

  const { data: status } = useQuery({ queryKey: ['admin-mail-status'], queryFn: () => api.get<{ configured: boolean; from: string | null }>('/admin/mail/status') });
  const { data: ctx } = useQuery({
    queryKey: ['admin-mail-context', userId],
    queryFn: () => api.get<Context>(`/admin/mail/context/${userId}`),
    enabled: !!userId,
  });
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['admin-mail', userId],
    queryFn: () => api.get<{ items: Email[] }>(`/admin/mail${userId ? `?userId=${userId}` : ''}`),
  });

  const [template, setTemplate] = useState<TemplateKey>('general');
  const [txId, setTxId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [notify, setNotify] = useState(true);
  const [sentMsg, setSentMsg] = useState('');

  const tpl = TEMPLATES.find(t => t.key === template)!;
  const withdrawal = ctx?.withdrawals.find(w => w.id === txId);

  // When a customer loads, pick a sensible starting template (their withdrawal, if they came from Approvals).
  useEffect(() => {
    if (!ctx) return;
    const w = txParam ? ctx.withdrawals.find(x => x.id === txParam) : undefined;
    if (w) {
      const key: TemplateKey = w.status === 'COMPLETED' ? 'w_sent' : w.status === 'REJECTED' ? 'w_returned' : 'w_review';
      apply(key, w.id);
    } else {
      apply('general', ctx.withdrawals[0]?.id ?? '');
    }
  }, [ctx?.user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function apply(key: TemplateKey, wId = txId) {
    if (!ctx) return;
    setTemplate(key);
    setTxId(wId);
    const t = fill(key, ctx, ctx.withdrawals.find(w => w.id === wId));
    setSubject(t.subject);
    setBody(t.body);
  }

  const send = useMutation({
    mutationFn: () => api.post<Email>('/admin/mail', {
      userId, subject, body, category: tpl.category, notify,
      transactionId: tpl.needsWithdrawal ? txId || undefined : undefined,
    }),
    onSuccess: e => {
      qc.invalidateQueries({ queryKey: ['admin-mail'] });
      setSentMsg(e.status === 'SENT' ? `Email sent to ${e.toEmail}` : e.status === 'FAILED' ? `Saved, but the email failed: ${e.error}` : 'Saved and shown in their notifications (email is not set up yet)');
      setTimeout(() => setSentMsg(''), 6000);
      if (ctx) apply('general', txId);
    },
  });

  const chooseCustomer = (id: string) => setParams(id ? { user: id } : {});
  const canSend = !!userId && subject.trim() && body.trim() && (!tpl.needsWithdrawal || txId);

  return (
    <div className="space-y-5">
      <PageHeader title="Mail" subtitle="Email customers about their withdrawals, account and anything else they need to know." />

      {status && !status.configured && (
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-warn">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>
            Email isn't set up yet. Messages are saved and shown in the customer's notifications, but no email is sent.
            Add <code className="font-mono text-xs">SMTP_HOST</code>, <code className="font-mono text-xs">SMTP_USER</code>, <code className="font-mono text-xs">SMTP_PASS</code> and <code className="font-mono text-xs">MAIL_FROM</code> to <code className="font-mono text-xs">apps/api/.env</code> and restart the API.
          </p>
        </div>
      )}

      <WithdrawalEmailCard />
      <AutoEmailsCard />

      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        {/* Compose */}
        <Card className="space-y-5 p-6">
          <div>
            <p className="mb-2 text-sm font-medium">To</p>
            {userId && ctx ? (
              <div className="flex items-center gap-3 rounded-2xl bg-paper px-3 py-2.5">
                <Avatar name={ctx.user.name} />
                <span className="min-w-0 flex-1">
                  <Link to={`/admin/customers/${ctx.user.id}`} className="block truncate text-sm font-medium hover:underline">{ctx.user.name}</Link>
                  <span className="block truncate text-xs text-muted">{ctx.user.email}</span>
                </span>
                <button onClick={() => chooseCustomer('')} className="grid h-8 w-8 place-items-center rounded-full hover:bg-black/10" aria-label="Choose another customer"><X size={16} /></button>
              </div>
            ) : userId ? <Loading h="h-14" /> : <CustomerSearch onPick={c => chooseCustomer(c.id)} />}
          </div>

          {ctx && (
            <>
              <div>
                <p className="mb-2 text-sm font-medium">Template</p>
                <div className="chip-row flex flex-wrap gap-2">
                  {TEMPLATES.map(t => {
                    const off = t.needsWithdrawal && !ctx.withdrawals.length;
                    return (
                      <button key={t.key} type="button" disabled={off} onClick={() => apply(t.key)}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-35 ${template === t.key ? 'bg-night text-white' : 'bg-paper hover:bg-black/10'}`}>
                        {t.label}
                      </button>
                    );
                  })}
                </div>
                {!ctx.withdrawals.length && <p className="mt-1.5 text-xs text-muted">This customer has no withdrawals yet.</p>}
              </div>

              {tpl.needsWithdrawal && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Withdrawal</label>
                  <select value={txId} onChange={e => apply(template, e.target.value)} className={inputCls}>
                    {ctx.withdrawals.map(w => (
                      <option key={w.id} value={w.id}>
                        {w.reference} · {money(w.amountMinor, w.currency)} · {w.status === 'COMPLETED' ? 'sent' : w.status === 'REJECTED' ? 'returned' : 'waiting'} · {fmtDateTime(w.createdAt)}
                      </option>
                    ))}
                  </select>
                  {withdrawal && <p className="mt-1.5 text-xs text-muted">To {destinationLabel(withdrawal.meta)}</p>}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium">Subject</label>
                <input value={subject} onChange={e => setSubject(e.target.value)} maxLength={200} className={inputCls} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Message</label>
                <textarea value={body} onChange={e => setBody(e.target.value)} rows={12} maxLength={10_000} className={`${inputCls} resize-y leading-relaxed`} />
                <p className="mt-1.5 text-xs text-muted">Leave a blank line between paragraphs. Never ask customers for passwords, PINs or card numbers.</p>
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} className="h-4 w-4 accent-[#8b6a3e]" />
                Also show it in their dashboard notifications
              </label>

              {send.isError && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-bad">{(send.error as Error).message}</p>}
              {sentMsg && <p className="pill-grow rounded-xl bg-night px-3 py-2.5 text-center text-sm font-semibold text-white">{sentMsg}</p>}

              <Btn className="w-full !py-3 !text-sm" busy={send.isPending} disabled={!canSend} onClick={() => send.mutate()}>
                <Send size={15} /> {status?.configured ? 'Send email' : 'Save and notify'}
              </Btn>
            </>
          )}
        </Card>

        {/* History */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
            <MailIcon size={18} /> {userId && ctx ? `Emails to ${first(ctx.user.name)}` : 'Recent emails'}
          </h2>
          {historyLoading ? <Loading h="h-60" /> : !history?.items.length ? <Empty>No emails yet.</Empty> : (
            <div className="space-y-2.5">
              {history.items.map(e => <EmailRow key={e.id} e={e} showTo={!userId} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmailRow({ e, showTo }: { e: Email; showTo: boolean }) {
  const [open, setOpen] = useState(false);
  const s = STATUS[e.status] ?? STATUS.FAILED;
  return (
    <Card className="p-4">
      <button onClick={() => setOpen(o => !o)} className="block w-full text-left">
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{e.subject}</span>
            <span className="block truncate text-xs text-muted">
              {showTo ? `${e.toName} · ` : ''}{fmtDateTime(e.createdAt)}{e.sentByName ? ` · by ${e.sentByName}` : ''}
            </span>
          </span>
          <Badge tone={s.tone}>{s.label}</Badge>
        </span>
      </button>
      {open && (
        <div className="mt-3 border-t border-line pt-3">
          <p className="text-xs text-muted">To {e.toEmail}{e.notified ? ' · also in notifications' : ''}</p>
          {e.error && <p className="mt-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs text-bad">{e.error}</p>}
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{e.body}</p>
          {showTo && <Link to={`/admin/mail?user=${e.userId}`} className="mt-3 inline-block text-xs font-semibold text-brand hover:underline">Write to {e.toName}</Link>}
        </div>
      )}
    </Card>
  );
}

function CustomerSearch({ onPick }: { onPick: (c: Customer) => void }) {
  const [q, setQ] = useState('');
  const [term, setTerm] = useState('');
  useEffect(() => { const t = setTimeout(() => setTerm(q.trim()), 300); return () => clearTimeout(t); }, [q]);
  const { data, isFetching } = useQuery({
    queryKey: ['admin-users', 'mail-search', term],
    queryFn: () => api.get<{ users: Customer[] }>(`/admin/users?search=${encodeURIComponent(term)}`),
  });
  return (
    <div>
      <label className="relative block">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search customers by name or email" className={`${inputCls} pl-10`} autoFocus />
      </label>
      <ul className="mt-2 max-h-72 divide-y divide-line overflow-y-auto rounded-2xl border border-line">
        {isFetching && !data ? <li className="p-4 text-sm text-muted">Searching…</li> : !data?.users.length ? <li className="p-4 text-sm text-muted">No customers found</li> : data.users.map(c => (
          <li key={c.id}>
            <button onClick={() => onPick(c)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-paper">
              <Avatar name={c.name} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{c.name}</span>
                <span className="block truncate text-xs text-muted">{c.email}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
