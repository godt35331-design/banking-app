import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, Send, Upload } from 'lucide-react';
import { cryptoNetwork } from '@kestrel/shared';
import { api } from '../../lib/api';
import { Badge, Btn, Card, ConfirmSheet, Empty, Loading, PageHeader, fmtDateTime, money, titleCase } from './ui';

type Tx = {
  id: string;
  reference: string;
  kind: string;
  amountMinor: number;
  feeMinor: number;
  currency: string;
  description: string;
  createdAt: string;
  dueAt: string | null;
  meta: any;
  user: { id: string; name: string; email: string };
};

type Pending = { type: 'transfer' | 'check' | 'withdrawal'; ok: boolean; tx: Tx } | null;
const isWithdrawal = (t: Tx) => t.kind === 'WITHDRAWAL_BANK' || t.kind === 'WITHDRAWAL_CRYPTO';

export function AdminApprovals() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-approvals'],
    queryFn: () => api.get<{ transfers: Tx[]; checks: Tx[] }>('/admin/approvals'),
    refetchInterval: 20_000,
  });
  const [pending, setPending] = useState<Pending>(null);
  const [noteFor, setNoteFor] = useState<Tx | null>(null);

  const saveNote = useMutation({
    mutationFn: ({ tx, note }: { tx: Tx; note: string }) => api.patch(`/admin/approvals/${tx.id}/note`, { note }),
    onSuccess: () => {
      setNoteFor(null);
      qc.invalidateQueries({ queryKey: ['admin-approvals'] });
    },
  });

  const decide = useMutation({
    mutationFn: ({ p, reason }: { p: NonNullable<Pending>; reason: string }) =>
      p.type === 'withdrawal'
        ? api.patch(`/admin/approvals/${p.tx.id}`, p.ok ? { approve: true, payoutReference: reason } : { approve: false, reason: reason || undefined })
        : p.type === 'transfer'
          ? api.patch(`/admin/approvals/${p.tx.id}`, { approve: p.ok, reason: reason || undefined })
          : api.patch(`/admin/checks/${p.tx.id}`, { clear: p.ok, reason: reason || undefined }),
    onSuccess: () => {
      setPending(null);
      qc.invalidateQueries({ queryKey: ['admin-approvals'] });
      qc.invalidateQueries({ queryKey: ['admin-overview'] });
    },
  });

  return (
    <div className="space-y-8">
      <PageHeader title="Approvals" subtitle="Large transfers waiting for a decision, and check deposits waiting to clear." />

      {isLoading || !data ? <Loading h="h-60" /> : (
        <>
          {(() => {
            const list = data.transfers.filter(isWithdrawal);
            return (
              <section>
                <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
                  <Upload size={18} /> Withdrawals <Badge tone={list.length ? 'amber' : 'green'}>{list.length}</Badge>
                </h2>
                <p className="mb-3 text-sm text-muted">
                  The money is already reserved from the customer's wallet. Send it to the details below, then approve with the payment reference
                  (bank reference or crypto transaction hash). Rejecting returns the money to their wallet.
                </p>
                {!list.length ? <Empty>No withdrawals waiting.</Empty> : (
                  <div className="space-y-3">
                    {list.map(t => (
                      <Item key={t.id} tx={t}
                        extra={<>
                          {t.meta?.hold && <Badge tone="amber">On hold</Badge>}
                          <p className={`mt-2 rounded-xl px-3 py-2 text-sm ${t.meta?.adminNote ? 'bg-amber-50 text-warn' : 'bg-paper text-muted'}`}>
                            {t.meta?.adminNote ? <>Note to customer: {t.meta.adminNote}</> : 'No note for the customer'}
                          </p>
                        </>}
                        details={t.meta?.method === 'CRYPTO'
                          ? [['Send', `${t.meta.asset}`], ['Network', cryptoNetwork(t.meta.asset, t.meta.network)?.label ?? t.meta.network], ['Address', t.meta.address], ['Memo', t.meta.memo]]
                          : [['Account holder', t.meta?.accountHolder], ['Bank', t.meta?.bankName], ['Account / IBAN', t.meta?.accountNumber], ['SWIFT', t.meta?.swift], ['Country', t.meta?.country]]}
                        actions={<>
                          <Link to={`/admin/mail?user=${t.user.id}&tx=${t.id}`} className="inline-flex items-center justify-center rounded-full bg-paper px-4 py-2 text-xs font-semibold hover:bg-black/10">Email</Link>
                          <Btn tone="light" onClick={() => setNoteFor(t)}>Edit note</Btn>
                          <Btn tone="green" onClick={() => setPending({ type: 'withdrawal', ok: true, tx: t })}>Sent · approve</Btn>
                          <Btn tone="red" onClick={() => setPending({ type: 'withdrawal', ok: false, tx: t })}>Reject</Btn>
                        </>}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })()}

          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
              <Send size={18} /> Large transfers <Badge tone={data.transfers.filter(t => !isWithdrawal(t)).length ? 'amber' : 'green'}>{data.transfers.filter(t => !isWithdrawal(t)).length}</Badge>
            </h2>
            <p className="mb-3 text-sm text-muted">
              The money was taken from the customer's wallet when they sent it. Approving sends it; rejecting returns it (with the fee).
            </p>
            {!data.transfers.filter(t => !isWithdrawal(t)).length ? <Empty>No transfers waiting.</Empty> : (
              <div className="space-y-3">
                {data.transfers.filter(t => !isWithdrawal(t)).map(t => (
                  <Item key={t.id} tx={t}
                    details={[
                      ['To', t.meta?.recipientName],
                      ['Account', t.meta?.recipientAccount],
                      ['Bank', t.meta?.recipientBank],
                      ['SWIFT', t.meta?.swiftCode],
                      ['Fee', t.feeMinor ? money(t.feeMinor, t.currency) : 'None'],
                    ]}
                    actions={<>
                      <Btn tone="green" onClick={() => setPending({ type: 'transfer', ok: true, tx: t })}>Approve</Btn>
                      <Btn tone="red" onClick={() => setPending({ type: 'transfer', ok: false, tx: t })}>Reject</Btn>
                    </>}
                  />
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold">
              <Banknote size={18} /> Check deposits <Badge tone={data.checks.length ? 'amber' : 'green'}>{data.checks.length}</Badge>
            </h2>
            <p className="mb-3 text-sm text-muted">Clearing adds the money to the customer's wallet. Bouncing marks the deposit as failed.</p>
            {!data.checks.length ? <Empty>No checks waiting.</Empty> : (
              <div className="space-y-3">
                {data.checks.map(t => (
                  <Item key={t.id} tx={t}
                    details={[['Check number', t.meta?.checkNumber], ['Expected by', t.dueAt ? fmtDateTime(t.dueAt) : undefined]]}
                    actions={<>
                      <Btn tone="green" onClick={() => setPending({ type: 'check', ok: true, tx: t })}>Clear</Btn>
                      <Btn tone="red" onClick={() => setPending({ type: 'check', ok: false, tx: t })}>Bounce</Btn>
                    </>}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {noteFor && (
        <ConfirmSheet
          open
          onClose={() => setNoteFor(null)}
          title="Note for the customer"
          subtitle={`${noteFor.user.name} · ${noteFor.reference} · shown under "Under review and processing"`}
          confirmLabel="Save note"
          tone="amber"
          reason="Note (leave empty to remove)"
          initialReason={noteFor.meta?.adminNote ?? ''}
          busy={saveNote.isPending}
          error={saveNote.isError ? (saveNote.error as Error).message : ''}
          onConfirm={note => saveNote.mutate({ tx: noteFor, note })}
        />
      )}

      {pending && (
        <ConfirmSheet
          open
          onClose={() => setPending(null)}
          title={
            pending.type === 'withdrawal'
              ? pending.ok ? `Mark ${money(pending.tx.amountMinor, pending.tx.currency)} withdrawal as sent?` : `Reject this ${money(pending.tx.amountMinor, pending.tx.currency)} withdrawal?`
              : pending.type === 'transfer'
              ? `${pending.ok ? 'Approve' : 'Reject'} ${money(pending.tx.amountMinor, pending.tx.currency)} transfer?`
              : `${pending.ok ? 'Clear' : 'Bounce'} ${money(pending.tx.amountMinor, pending.tx.currency)} check?`
          }
          subtitle={`${pending.tx.user.name} · ${pending.tx.reference}`}
          confirmLabel={pending.type === 'withdrawal' ? (pending.ok ? 'Mark as sent' : 'Reject and return money') : pending.type === 'transfer' ? (pending.ok ? 'Approve' : 'Reject') : pending.ok ? 'Clear check' : 'Bounce check'}
          tone={pending.ok ? 'green' : 'red'}
          reason={
            pending.type === 'withdrawal' && pending.ok
              ? pending.tx.kind === 'WITHDRAWAL_CRYPTO' ? 'Transaction hash (TXID) of the crypto you sent' : 'Bank payment reference'
              : pending.ok ? undefined : 'Reason (shown to the customer)'
          }
          reasonRequired={pending.type === 'withdrawal' && pending.ok}
          busy={decide.isPending}
          error={decide.isError ? (decide.error as Error).message : ''}
          onConfirm={reason => decide.mutate({ p: pending, reason })}
        />
      )}
    </div>
  );
}

function Item({ tx, details, actions, extra }: { tx: Tx; details: [string, string | undefined][]; actions: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-display text-2xl font-semibold tabular-nums">{money(tx.amountMinor, tx.currency)}</p>
          <p className="mt-0.5 text-sm">
            <Link to={`/admin/customers/${tx.user.id}`} className="font-medium hover:underline">{tx.user.name}</Link>
            <span className="text-muted"> · {titleCase(tx.kind)} · {tx.reference} · {fmtDateTime(tx.createdAt)}</span>
          </p>
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {details.filter(([, v]) => v).map(([k, v]) => (
              <div key={k}><dt className="inline text-muted">{k}: </dt><dd className="inline font-medium">{v}</dd></div>
            ))}
          </dl>
          {extra && <div className="mt-2">{extra}</div>}
        </div>
        <div className="flex flex-wrap gap-2">{actions}</div>
      </div>
    </Card>
  );
}
