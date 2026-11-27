import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Zap } from 'lucide-react';
import { BANK_NAME } from '@kestrel/shared';
import { api } from '../../lib/api';
import { Badge, Btn, Card, inputCls } from './ui';

type Template = { subject: string; fields: string[]; enabled: boolean; body: string };

const FIELD_LABEL: Record<string, string> = {
  '{name}': 'Customer name',
  '{amount}': 'Amount',
  '{reference}': 'Reference',
  '{destination}': 'Sent to',
};
const SAMPLE: Record<string, string> = {
  '{name}': 'Jane Doe',
  '{amount}': '$1,250.00',
  '{reference}': 'WDR-1764201234-A1B2C3',
  '{destination}': 'Barclays ····4821',
};

/** Staff write the automatic "Update on your withdrawal" email here. It goes out when a customer submits a withdrawal. */
export function WithdrawalEmailCard() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['admin-mail-auto-withdrawal'], queryFn: () => api.get<Template>('/admin/mail/auto/withdrawal') });
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [body, setBody] = useState('');
  const [saved, setSaved] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (data) { setEnabled(data.enabled); setBody(data.body); } }, [data]);

  const save = useMutation({
    mutationFn: () => api.put<Template>('/admin/mail/auto/withdrawal', { enabled, body }),
    onSuccess: d => {
      qc.setQueryData(['admin-mail-auto-withdrawal'], d);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const insert = (field: string) => {
    const el = ref.current;
    if (!el) return setBody(b => b + field);
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    setBody(body.slice(0, start) + field + body.slice(end));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + field.length, start + field.length); });
  };

  const changed = !!data && (data.body !== body || data.enabled !== enabled);
  const preview = Object.entries(SAMPLE).reduce((t, [k, v]) => t.split(k).join(v), body);

  return (
    <Card className={`p-6 ${enabled ? '' : 'opacity-90'}`}>
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-center justify-between gap-3 text-left">
        <span className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-soft text-brand"><Zap size={17} /></span>
          <span>
            <span className="block font-display text-lg font-semibold">Automatic withdrawal email</span>
            <span className="block text-sm text-muted">Sent to the customer as soon as they submit a withdrawal.</span>
          </span>
        </span>
        <span className="flex items-center gap-2">
          {data && <Badge tone={data.enabled ? 'green' : 'grey'}>{data.enabled ? 'On' : 'Off'}</Badge>}
          <ChevronDown size={18} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && data && (
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {/* Editor */}
          <div className="space-y-4">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
              <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="h-4 w-4 accent-[#8b6a3e]" />
              Send this email automatically
            </label>

            <div>
              <p className="mb-1.5 text-sm font-medium">Subject</p>
              <p className="rounded-xl bg-paper px-3.5 py-2.5 text-sm">{data.subject}</p>
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium">Message</p>
              <div className="overflow-hidden rounded-xl border border-line focus-within:border-night">
                <p className="border-b border-line bg-paper px-3.5 py-2.5 text-sm">
                  Dear <span className="rounded-md bg-brand-soft px-2 py-0.5 font-semibold text-brand">Customer name</span>,
                </p>
                <textarea ref={ref} value={body} onChange={e => setBody(e.target.value)} rows={10} maxLength={10_000}
                  placeholder="Write the message here…"
                  className="block w-full resize-y px-3.5 py-3 text-sm leading-relaxed outline-none" />
              </div>
              <p className="mt-1.5 text-xs text-muted">"Dear" and the customer's name are added automatically. Leave a blank line between paragraphs.</p>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-medium text-muted">Insert the customer's details:</p>
              <div className="flex flex-wrap gap-1.5">
                {data.fields.map(f => (
                  <button key={f} type="button" onClick={() => insert(f)} className="rounded-full bg-paper px-3 py-1.5 text-xs font-semibold hover:bg-black/10">
                    + {FIELD_LABEL[f] ?? f}
                  </button>
                ))}
              </div>
            </div>

            {save.isError && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-bad">{(save.error as Error).message}</p>}
            <Btn className="w-full !py-3 !text-sm" busy={save.isPending} disabled={!changed || !body.trim()} onClick={() => save.mutate()}>
              {saved ? 'Saved' : 'Save email'}
            </Btn>
          </div>

          {/* Preview */}
          <div>
            <p className="mb-1.5 text-sm font-medium">Preview <span className="font-normal text-muted">(example customer)</span></p>
            <div className="overflow-hidden rounded-2xl border border-line">
              <div className="flex justify-center bg-night px-6 py-5">
                <img src="/logo-light.png" alt={BANK_NAME} className="h-16 w-auto" />
              </div>
              <div className="bg-white px-6 py-5 text-sm leading-relaxed">
                <p className="mb-4 font-display text-lg font-semibold">{data.subject}</p>
                <p className="mb-3">Dear {SAMPLE['{name}']},</p>
                {preview.split(/\n{2,}/).map((p, i) => <p key={i} className="mb-3 whitespace-pre-line">{p}</p>)}
              </div>
              <p className="border-t border-line bg-white px-6 py-3 text-[11px] text-muted">
                We will never ask for your password, PIN or full card number by email.
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
