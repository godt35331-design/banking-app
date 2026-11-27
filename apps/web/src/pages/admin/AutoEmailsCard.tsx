import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Mails, Pencil, RotateCcw } from 'lucide-react';
import { BANK_NAME } from '@kestrel/shared';
import { api } from '../../lib/api';
import { Badge, Btn, Card, Loading, inputCls } from './ui';

type AutoEmail = {
  key: string; group: string; label: string; when: string;
  subject: string; body: string; fields: Record<string, string>;
  enabled: boolean; custom: boolean; defaultSubject: string; defaultBody: string;
};
type Data = { groups: { key: string; label: string }[]; emails: AutoEmail[] };

/** Example values for the preview. */
const SAMPLE: Record<string, string> = {
  '{name}': 'Jane Doe', '{date}': '27 November 2026 at 14:05 (UTC)', '{by}': 'by you',
  '{oldEmail}': 'jane.old@example.com', '{newEmail}': 'jane@example.com', '{reason}': 'Example reason',
  '{last4}': '4821', '{action}': 'frozen', '{amount}': '$1,250.00', '{destination}': 'Barclays ····4821',
  '{reference}': 'REF-1764201234', '{payoutReference}': 'PAY-88231', '{recipient}': 'John Smith',
  '{currency}': 'USD', '{direction}': 'returned to', '{product}': 'Personal Loan', '{status}': 'Under review',
  '{update}': 'Our team is reviewing your application.', '{details}': '', '{dueDate}': '30 November 2026',
  '{instalment}': '3', '{category}': 'Bank transfer recovery', '{year}': '2025/26', '{note}': '',
  '{message}': 'Thanks for your message. We have checked your account and everything is in order.',
};
const fillSample = (t: string) => t.replace(/\{[a-zA-Z][a-zA-Z0-9]*\}/g, m => SAMPLE[m] ?? m);

/** Every automatic email except the withdrawal one (which has its own card): switch on/off, edit the wording. */
export function AutoEmailsCard() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-mail-auto'], queryFn: () => api.get<Data>('/admin/mail/auto') });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);

  const update = useMutation({
    mutationFn: ({ key, ...b }: { key: string; enabled?: boolean; subject?: string; body?: string; reset?: boolean }) =>
      api.put<AutoEmail>(`/admin/mail/auto/${key}`, b),
    onSuccess: e => qc.setQueryData<Data>(['admin-mail-auto'], d => d && { ...d, emails: d.emails.map(x => (x.key === e.key ? e : x)) }),
  });

  const on = data?.emails.filter(e => e.enabled).length ?? 0;
  const setAll = (enabled: boolean) => data?.emails.filter(e => e.enabled !== enabled).forEach(e => update.mutate({ key: e.key, enabled }));

  return (
    <Card className="p-6">
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between gap-3 text-left">
        <span className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-brand"><Mails size={17} /></span>
          <span>
            <span className="block font-display text-lg font-semibold">Other automatic emails</span>
            <span className="block text-sm text-muted">Security, money, welcome, loans, refunds and support emails.</span>
          </span>
        </span>
        <span className="flex items-center gap-2">
          {data && <Badge tone={on ? 'green' : 'grey'}>{on} of {data.emails.length} on</Badge>}
          <ChevronDown size={18} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (isLoading || !data ? <div className="mt-5"><Loading h="h-40" /></div> : (
        <div className="mt-5 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-paper px-4 py-3 text-sm">
            <span className="text-muted">Switched-on emails are sent automatically. Every email starts with "Dear [name]," and has the bank logo at the top.</span>
            <span className="flex gap-2">
              <Btn tone="light" className="!bg-white" onClick={() => setAll(true)}>All on</Btn>
              <Btn tone="light" className="!bg-white" onClick={() => setAll(false)}>All off</Btn>
            </span>
          </div>

          {data.groups.map(g => (
            <section key={g.key}>
              <h3 className="mb-2 font-display text-sm font-semibold uppercase tracking-[0.12em] text-muted">{g.label}</h3>
              <ul className="divide-y divide-line rounded-2xl border border-line">
                {data.emails.filter(e => e.group === g.key).map(e => (
                  <li key={e.key} className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Toggle
                        checked={e.enabled}
                        label={`Send "${e.label}" automatically`}
                        onChange={v => update.mutate({ key: e.key, enabled: v })}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                          {e.label}
                          {e.custom && <Badge tone="amber">Edited</Badge>}
                        </span>
                        <span className="block text-xs text-muted">{e.when}</span>
                      </span>
                      <button onClick={() => setEditing(k => (k === e.key ? null : e.key))}
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${editing === e.key ? 'bg-night text-white' : 'bg-paper hover:bg-black/10'}`}>
                        <Pencil size={12} /> {editing === e.key ? 'Close' : 'View / edit'}
                      </button>
                    </div>
                    {editing === e.key && <Editor email={e} busy={update.isPending} error={update.isError ? (update.error as Error).message : ''}
                      onSave={(subject, body) => update.mutate({ key: e.key, subject, body })}
                      onReset={() => update.mutate({ key: e.key, reset: true })} />}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ))}
    </Card>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-brand' : 'bg-night/20'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

function Editor({ email, busy, error, onSave, onReset }: {
  email: AutoEmail; busy: boolean; error: string;
  onSave: (subject: string, body: string) => void; onReset: () => void;
}) {
  const [subject, setSubject] = useState(email.subject);
  const [body, setBody] = useState(email.body);
  const ref = useRef<HTMLTextAreaElement>(null);
  const changed = subject !== email.subject || body !== email.body;

  const insert = (field: string) => {
    const el = ref.current;
    const start = el?.selectionStart ?? body.length;
    const end = el?.selectionEnd ?? body.length;
    setBody(body.slice(0, start) + field + body.slice(end));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + field.length, start + field.length); });
  };

  return (
    <div className="mt-4 grid gap-5 lg:grid-cols-2">
      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">Subject</label>
          <input value={subject} onChange={e => setSubject(e.target.value)} maxLength={200} className={inputCls} />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted">Message</label>
          <div className="overflow-hidden rounded-xl border border-line focus-within:border-night">
            <p className="border-b border-line bg-paper px-3.5 py-2 text-sm">
              Dear <span className="rounded-md bg-brand-soft px-2 py-0.5 font-semibold text-brand">Customer name</span>,
            </p>
            <textarea ref={ref} value={body} onChange={e => setBody(e.target.value)} rows={9} maxLength={10_000}
              className="block w-full resize-y px-3.5 py-3 text-sm leading-relaxed outline-none" />
          </div>
        </div>
        {Object.keys(email.fields).length > 0 && (
          <div>
            <p className="mb-1.5 text-xs text-muted">Insert details:</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(email.fields).map(([f, label]) => (
                <button key={f} type="button" onClick={() => insert(f)} className="rounded-full bg-paper px-2.5 py-1 text-[11px] font-semibold hover:bg-black/10">+ {label}</button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-muted">A paragraph that uses a detail with no value (for example no reason given) is left out.</p>
          </div>
        )}
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-bad">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Btn busy={busy} disabled={!changed || !subject.trim() || !body.trim()} onClick={() => onSave(subject, body)}>Save changes</Btn>
          {email.custom && (
            <Btn tone="light" disabled={busy} onClick={() => { setSubject(email.defaultSubject); setBody(email.defaultBody); onReset(); }}>
              <RotateCcw size={12} /> Back to original wording
            </Btn>
          )}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted">Preview (example customer)</p>
        <div className="overflow-hidden rounded-2xl border border-line">
          <div className="flex justify-center bg-night px-6 py-4"><img src="/logo-light.png" alt={BANK_NAME} className="h-14 w-auto" /></div>
          <div className="bg-white px-5 py-4 text-sm leading-relaxed">
            <p className="mb-3 font-display text-base font-semibold">{fillSample(subject)}</p>
            <p className="mb-3">Dear {SAMPLE['{name}']},</p>
            {fillSample(body).split(/\n{2,}/).filter(p => p.trim()).map((p, i) => <p key={i} className="mb-3 whitespace-pre-line">{p}</p>)}
          </div>
        </div>
      </div>
    </div>
  );
}
