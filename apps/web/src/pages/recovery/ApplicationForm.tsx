import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, Eye, Loader2, Save, Trash2, TriangleAlert, X,
} from 'lucide-react';
import {
  RECOVERY_COUNTRIES, RECOVERY_CURRENCIES, RECOVERY_PAYMENT_METHODS, activeQuestions, formatAnyMoney, recoveryCategory,
  type RecoveryQuestion,
} from '@kestrel/shared';
import { api } from '../../lib/api';
import { CATEGORY_ICON } from './RecoveryHome';
import { DropZone, LegalSheet, Panel, fmtDate, fmtSize, type DocMeta } from './shared';

type Draft = {
  id: string;
  reference: string | null;
  category: string;
  status: string;
  fullName: string | null;
  country: string | null;
  incidentDate: string | null;
  amountMinor: number | null;
  currency: string | null;
  paymentMethod: string | null;
  institution: string | null;
  description: string | null;
  contactedProvider: boolean | null;
  previousAction: string | null;
  answers: Record<string, string> | null;
  documents: DocMeta[];
};

type Form = {
  fullName: string;
  country: string;
  incidentDate: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  institution: string;
  description: string;
  contactedProvider: '' | 'Yes' | 'No';
  previousAction: string;
  answers: Record<string, string>;
};

const STEPS = ['Incident details', 'Your situation', 'Documents', 'Review & submit'];
const input = 'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-night';

function toForm(d: Draft): Form {
  return {
    fullName: d.fullName ?? '',
    country: d.country ?? '',
    incidentDate: d.incidentDate ? d.incidentDate.slice(0, 10) : '',
    amount: d.amountMinor ? String(d.amountMinor / 100) : '',
    currency: d.currency ?? '',
    paymentMethod: d.paymentMethod ?? '',
    institution: d.institution ?? '',
    description: d.description ?? '',
    contactedProvider: d.contactedProvider === null ? '' : d.contactedProvider ? 'Yes' : 'No',
    previousAction: d.previousAction ?? '',
    answers: d.answers ?? {},
  };
}

export function ApplicationForm() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: draft, isLoading, error } = useQuery({
    queryKey: ['recovery-case', id],
    queryFn: () => api.get<Draft>(`/recovery/cases/${id}`),
  });

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form | null>(null);
  const [touched, setTouched] = useState(false);
  const [accept, setAccept] = useState({ accurate: false, terms: false, noGuarantee: false });
  const [legal, setLegal] = useState<null | 'terms' | 'privacy'>(null);
  const [submitted, setSubmitted] = useState<string | null>(null);
  useEffect(() => { if (draft && !form) setForm(toForm(draft)); }, [draft, form]);

  const cat = draft ? recoveryCategory(draft.category) : undefined;
  const questions = useMemo(() => (cat && form ? activeQuestions(cat, form.answers) : []), [cat, form]);

  const save = useMutation({
    mutationFn: (f: Form) =>
      api.patch(`/recovery/cases/${id}`, {
        ...f,
        contactedProvider: f.contactedProvider || null,
        answers: f.answers,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recovery-cases'] }),
  });
  const upload = useMutation({
    mutationFn: ({ file, kind }: { file: File; kind: string }) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', kind);
      return api.upload(`/recovery/cases/${id}/documents`, fd);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recovery-case', id] }),
  });
  const removeDoc = useMutation({
    mutationFn: (docId: string) => api.del(`/recovery/cases/${id}/documents/${docId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recovery-case', id] }),
  });
  const submit = useMutation({
    mutationFn: async () => {
      await api.patch(`/recovery/cases/${id}`, { ...form!, contactedProvider: form!.contactedProvider || null });
      return api.post<{ reference: string }>(`/recovery/cases/${id}/submit`, accept);
    },
    onSuccess: c => {
      setSubmitted(c.reference);
      qc.invalidateQueries({ queryKey: ['recovery-cases'] });
      qc.invalidateQueries({ queryKey: ['recovery-case', id] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
  const discard = useMutation({
    mutationFn: () => api.del(`/recovery/cases/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recovery-cases'] }); navigate('/dashboard/fund-recovery'); },
  });

  if (isLoading || (!form && draft)) return <div className="skeleton h-96" />;
  if (error || !draft || !cat || !form) return <p className="text-sm text-bad">{(error as Error)?.message ?? 'Application not found'}</p>;
  if (draft.status !== 'DRAFT' && !submitted) return <Navigate to={`/dashboard/fund-recovery/applications/${id}`} replace />;

  if (submitted) return <Submitted reference={submitted} id={id} category={cat.name} />;

  const Icon = CATEGORY_ICON[cat.key];
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f!, [k]: e.target.value }));
  const setAnswer = (k: string, v: string) => setForm(f => ({ ...f!, answers: { ...f!.answers, [k]: v } }));

  // Validation per step (same rules as the server).
  const e0: Partial<Record<keyof Form, string>> = {};
  if (form.fullName.trim().length < 2) e0.fullName = 'Enter your full name';
  if (!form.country) e0.country = 'Choose your country';
  if (!form.incidentDate) e0.incidentDate = 'When did it happen?';
  else if (new Date(form.incidentDate) > new Date()) e0.incidentDate = 'The date cannot be in the future';
  if (!(parseFloat(form.amount.replace(/,/g, '')) > 0)) e0.amount = 'Enter the amount involved';
  if (!form.currency) e0.currency = 'Choose a currency';
  if (!form.paymentMethod) e0.paymentMethod = 'Choose how the payment was made';
  if (!form.institution.trim()) e0.institution = 'Name the bank, merchant or provider';
  if (form.description.trim().length < 20) e0.description = 'Tell us what happened (at least 20 characters)';
  if (!form.contactedProvider) e0.contactedProvider = 'Please answer';
  if (form.contactedProvider === 'Yes' && !form.previousAction.trim()) e0.previousAction = 'What did they say or do?';
  const e1: Record<string, string> = {};
  for (const q of questions) if (q.required && !form.answers[q.key]?.trim()) e1[q.key] = 'Please answer';
  const docs = draft.documents;
  const valid = [Object.keys(e0).length === 0, Object.keys(e1).length === 0, docs.length > 0, true][step];
  const err = (m?: string) => (touched && m ? <p className="mt-1.5 text-xs text-bad">{m}</p> : null);

  const go = (to: number) => {
    if (to > step && !valid) { setTouched(true); return; }
    setTouched(false);
    save.mutate(form);
    setStep(to);
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-5">
      {/* Header + stepper */}
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-soft text-brand"><Icon size={20} /></span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">New application · Draft</p>
              <h1 className="font-display text-xl font-semibold">{cat.name}</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { save.mutate(form); navigate('/dashboard/fund-recovery/applications'); }}
              className="flex items-center gap-1.5 rounded-full bg-paper px-4 py-2 text-xs font-semibold hover:bg-black/10">
              <Save size={14} /> Save & finish later
            </button>
            <button onClick={() => confirm('Delete this draft and its documents?') && discard.mutate()}
              className="grid h-9 w-9 place-items-center rounded-full bg-paper text-muted hover:text-bad" aria-label="Delete draft">
              <Trash2 size={15} />
            </button>
          </div>
        </div>
        <ol className="mt-5 grid grid-cols-4 gap-2">
          {STEPS.map((s, i) => (
            <li key={s}>
              <button onClick={() => i < step && go(i)} disabled={i > step} className="w-full text-left">
                <div className={`h-1.5 rounded-full transition-colors duration-300 ${i <= step ? 'bg-night' : 'bg-paper'}`} />
                <p className={`mt-2 truncate text-xs font-medium ${i === step ? 'text-night' : 'text-muted'}`}>
                  <span className="hidden sm:inline">{i + 1}. </span>{s}
                </p>
              </button>
            </li>
          ))}
        </ol>
        {save.isError && <p className="mt-3 text-xs text-bad">Couldn't save your progress: {(save.error as Error).message}</p>}
      </Panel>

      <div key={step} style={{ animation: 'rise-in .35s cubic-bezier(.2,.8,.2,1) both' }}>
        {/* Step 1: general details */}
        {step === 0 && (
          <Panel>
            <h2 className="font-display text-lg font-semibold">About the incident</h2>
            <p className="text-sm text-muted">These questions are the same for every category.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <L label="Full name">{<input value={form.fullName} onChange={set('fullName')} className={input} autoComplete="name" />}{err(e0.fullName)}</L>
              <L label="Country">
                <select value={form.country} onChange={set('country')} className={input}>
                  <option value="">Where are you located?</option>
                  {RECOVERY_COUNTRIES.map(c => <option key={c}>{c}</option>)}
                </select>{err(e0.country)}
              </L>
              <L label="Incident date"><input type="date" value={form.incidentDate} onChange={set('incidentDate')} max={new Date().toISOString().slice(0, 10)} className={input} />{err(e0.incidentDate)}</L>
              <div className="grid grid-cols-[1fr_120px] gap-2">
                <L label="Amount involved"><input inputMode="decimal" value={form.amount} onChange={set('amount')} placeholder="0.00" className={`${input} tabular-nums`} />{err(e0.amount)}</L>
                <L label="Currency">
                  <select value={form.currency} onChange={set('currency')} className={input}>
                    <option value="">—</option>
                    {RECOVERY_CURRENCIES.map(c => <option key={c}>{c}</option>)}
                  </select>{err(e0.currency)}
                </L>
              </div>
              <L label="Payment method">
                <select value={form.paymentMethod} onChange={set('paymentMethod')} className={input}>
                  <option value="">How was the money paid?</option>
                  {RECOVERY_PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
                </select>{err(e0.paymentMethod)}
              </L>
              <L label="Institution / provider"><input value={form.institution} onChange={set('institution')} placeholder="Bank, merchant or service provider" className={input} />{err(e0.institution)}</L>
              <L label="What happened?" className="sm:col-span-2" hint="Explain in your own words: what you paid for or sent, what went wrong, and what you've noticed since.">
                <textarea value={form.description} onChange={set('description')} rows={5} maxLength={5000} className={`${input} resize-y`} />
                <p className="mt-1 text-right text-[11px] text-muted">{form.description.length}/5000</p>{err(e0.description)}
              </L>
              <L label="Have you contacted the provider about this?" className="sm:col-span-2">
                <YesNo value={form.contactedProvider} onChange={v => setForm(f => ({ ...f!, contactedProvider: v as Form['contactedProvider'] }))} />{err(e0.contactedProvider)}
              </L>
              {form.contactedProvider === 'Yes' && (
                <L label="What did they say or do?" className="sm:col-span-2">
                  <textarea value={form.previousAction} onChange={set('previousAction')} rows={3} maxLength={2000} className={`${input} resize-y`} />{err(e0.previousAction)}
                </L>
              )}
            </div>
          </Panel>
        )}

        {/* Step 2: category questions */}
        {step === 1 && (
          <Panel>
            <h2 className="font-display text-lg font-semibold">About your {cat.name.toLowerCase()} case</h2>
            <p className="text-sm text-muted">These questions help your case officer understand the recovery options.</p>
            {cat.warning && <Warning text={cat.warning} />}
            <div className="mt-5 grid gap-5">
              {questions.map(q => (
                <Question key={q.key} q={q} value={form.answers[q.key] ?? ''} onChange={v => setAnswer(q.key, v)} error={touched ? e1[q.key] : undefined} />
              ))}
            </div>
          </Panel>
        )}

        {/* Step 3: documents */}
        {step === 2 && (
          <Panel>
            <h2 className="font-display text-lg font-semibold">Upload supporting documents</h2>
            <p className="text-sm text-muted">
              PDF, JPG or PNG (including screenshots), up to 10 MB each. Upload what you have; at least one document is needed.
            </p>
            <p className="mt-3 rounded-xl bg-paper px-3 py-2.5 text-xs leading-relaxed text-muted">
              <b className="text-night">Tip:</b> you can blank out unrelated transactions and personal details on statements before uploading. We only need what relates to this case.
            </p>
            {cat.warning && <Warning text={cat.warning} />}

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Checklist for {cat.name}</p>
            <div className="mt-2 grid gap-2.5 md:grid-cols-2">
              {[...cat.evidence, { key: 'OTHER', label: 'Other documents (emails, messages, contracts…)' }].map(e => {
                const mine = docs.filter(d => d.kind === e.key);
                return (
                  <div key={e.key}>
                    <DropZone
                      label={e.label}
                      hint={mine.length ? `${mine.length} uploaded` : 'Optional'}
                      done={mine.length > 0}
                      busy={upload.isPending && upload.variables?.kind === e.key}
                      onFile={file => upload.mutate({ file, kind: e.key })}
                      compact
                    />
                  </div>
                );
              })}
            </div>
            {upload.isError && <p className="mt-3 text-sm text-bad">{(upload.error as Error).message}</p>}

            {docs.length > 0 && (
              <>
                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Uploaded ({docs.length})</p>
                <ul className="mt-2 divide-y divide-line rounded-2xl border border-line">
                  {docs.map(d => (
                    <li key={d.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <CheckCircle2 size={16} className="shrink-0 text-brand" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{d.name}</span>
                        <span className="block text-xs text-muted">{[...cat.evidence, { key: 'OTHER', label: 'Other' }].find(e => e.key === d.kind)?.label} · {fmtSize(d.size)}</span>
                      </span>
                      <a href={`/api/recovery/cases/${id}/documents/${d.id}`} target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center rounded-full hover:bg-paper" aria-label="View"><Eye size={15} /></a>
                      <button onClick={() => removeDoc.mutate(d.id)} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-bad" aria-label="Remove"><X size={15} /></button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {touched && !docs.length && <p className="mt-3 text-sm text-bad">Upload at least one document to continue.</p>}
          </Panel>
        )}

        {/* Step 4: review */}
        {step === 3 && (
          <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
            <Panel>
              <h2 className="font-display text-lg font-semibold">Review your application</h2>
              <dl className="mt-3 divide-y divide-line text-sm">
                <Row k="Recovery category" v={cat.name} edit={() => go(1)} />
                <Row k="Amount" v={`${formatAnyMoney(Math.round(parseFloat(form.amount.replace(/,/g, '')) * 100), form.currency)}`} edit={() => go(0)} />
                <Row k="Full name" v={form.fullName} edit={() => go(0)} />
                <Row k="Country" v={form.country} edit={() => go(0)} />
                <Row k="Incident date" v={fmtDate(form.incidentDate)} edit={() => go(0)} />
                <Row k="Payment details" v={`${form.paymentMethod} · ${form.institution}`} edit={() => go(0)} />
                <Row k="Contacted provider" v={form.contactedProvider === 'Yes' ? `Yes — ${form.previousAction}` : 'No'} edit={() => go(0)} />
                {questions.map(q => <Row key={q.key} k={q.label} v={form.answers[q.key] || '—'} edit={() => go(1)} />)}
              </dl>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Incident description</p>
              <p className="mt-1 whitespace-pre-wrap rounded-xl bg-paper p-3 text-sm">{form.description}</p>
            </Panel>

            <div className="space-y-5">
              <Panel>
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-semibold">Documents ({docs.length})</h2>
                  <button onClick={() => go(2)} className="text-sm font-semibold text-brand hover:underline">Edit</button>
                </div>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {docs.map(d => <li key={d.id} className="flex items-center gap-2 truncate"><Check size={14} className="shrink-0 text-brand" />{d.name}</li>)}
                </ul>
              </Panel>
              <Panel>
                <h2 className="font-display text-lg font-semibold">Before you submit</h2>
                <div className="mt-3 space-y-3 text-sm">
                  <Tick checked={accept.accurate} onChange={v => setAccept(a => ({ ...a, accurate: v }))}>
                    The information and documents I've provided are true and accurate.
                  </Tick>
                  <Tick checked={accept.terms} onChange={v => setAccept(a => ({ ...a, terms: v }))}>
                    I accept the <button type="button" onClick={() => setLegal('terms')} className="font-semibold text-brand underline">recovery terms</button> and the{' '}
                    <button type="button" onClick={() => setLegal('privacy')} className="font-semibold text-brand underline">privacy policy</button>.
                  </Tick>
                  <Tick checked={accept.noGuarantee} onChange={v => setAccept(a => ({ ...a, noGuarantee: v }))}>
                    I understand that recovery is not guaranteed and every case is assessed individually.
                  </Tick>
                </div>
                {submit.isError && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-bad">{(submit.error as Error).message}</p>}
                <button
                  onClick={() => submit.mutate()}
                  disabled={!accept.accurate || !accept.terms || !accept.noGuarantee || submit.isPending}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3.5 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-40"
                >
                  {submit.isPending ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : 'Submit Application'}
                </button>
              </Panel>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      {step < 3 && (
        <div className="flex items-center justify-between">
          <button onClick={() => (step === 0 ? navigate('/dashboard/fund-recovery/new') : go(step - 1))}
            className="flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-muted hover:text-night">
            <ArrowLeft size={16} /> {step === 0 ? 'Change category' : 'Back'}
          </button>
          <button onClick={() => go(step + 1)}
            className={`flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] ${valid ? 'bg-night' : 'bg-night/40'}`}>
            Continue <ArrowRight size={16} />
          </button>
        </div>
      )}
      {step === 3 && (
        <button onClick={() => go(2)} className="flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-muted hover:text-night">
          <ArrowLeft size={16} /> Back
        </button>
      )}

      <LegalSheet open={legal !== null} kind={legal ?? 'terms'} onClose={() => setLegal(null)} />
    </div>
  );
}

function Submitted({ reference, id, category }: { reference: string; id: string; category: string }) {
  return (
    <section className="mx-auto max-w-xl rounded-[28px] bg-white p-8 text-center" style={{ animation: 'rise-in .45s cubic-bezier(.2,.8,.2,1) both' }}>
      <span className="pill-grow mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand text-white"><Check size={30} /></span>
      <h1 className="mt-5 font-display text-2xl font-semibold">Application submitted</h1>
      <p className="mt-2 text-sm text-muted">Your {category} application has been received.</p>
      <p className="mx-auto mt-5 w-fit rounded-2xl bg-night px-6 py-3 font-display text-2xl font-semibold tracking-wider text-white">{reference}</p>
      <p className="mt-2 text-xs text-muted">Keep this reference for your records. A confirmation has been added to your notifications.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link to={`/dashboard/fund-recovery/applications/${id}`} className="rounded-full bg-night px-5 py-3 text-sm font-semibold text-white">Track this application</Link>
        <Link to="/dashboard/fund-recovery" className="rounded-full bg-paper px-5 py-3 text-sm font-semibold">Back to overview</Link>
      </div>
    </section>
  );
}

function L({ label, hint, className = '', children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      {hint && <p className="-mt-1 mb-1.5 text-xs text-muted">{hint}</p>}
      {children}
    </div>
  );
}

function YesNo({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2">
      {['Yes', 'No'].map(v => (
        <button key={v} type="button" onClick={() => onChange(v)}
          className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${value === v ? 'bg-night text-white' : 'bg-paper hover:bg-black/10'}`}>
          {v}
        </button>
      ))}
    </div>
  );
}

function Question({ q, value, onChange, error }: { q: RecoveryQuestion; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{q.label}{!q.required && <span className="font-normal text-muted"> (optional)</span>}</label>
      {q.type === 'yesno' ? <YesNo value={value} onChange={onChange} />
        : q.type === 'select' ? (
          <div className="flex flex-wrap gap-2">
            {q.options!.map(o => (
              <button key={o} type="button" onClick={() => onChange(o)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${value === o ? 'bg-night text-white' : 'bg-paper hover:bg-black/10'}`}>
                {o}
              </button>
            ))}
          </div>
        ) : q.type === 'textarea' ? (
          <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} maxLength={2000} placeholder={q.placeholder} className={`${input} resize-y`} />
        ) : q.type === 'date' ? (
          <input type="date" value={value} onChange={e => onChange(e.target.value)} className={`${input} max-w-xs`} />
        ) : (
          <input value={value} onChange={e => onChange(e.target.value)} maxLength={2000} placeholder={q.placeholder} className={input} autoComplete="off" />
        )}
      {error ? <p className="mt-1.5 text-xs text-bad">{error}</p> : q.hint ? <p className="mt-1.5 text-xs text-muted">{q.hint}</p> : null}
    </div>
  );
}

function Warning({ text }: { text: string }) {
  return (
    <p className="mt-4 flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-warn">
      <TriangleAlert size={18} className="shrink-0" /> {text}
    </p>
  );
}

function Row({ k, v, edit }: { k: string; v: string; edit: () => void }) {
  return (
    <div className="group flex justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-muted">{k}</dt>
      <dd className="flex min-w-0 items-start gap-2 text-right font-medium">
        <span className="min-w-0 break-words">{v}</span>
        <button onClick={edit} className="shrink-0 text-xs font-semibold text-brand opacity-0 transition-opacity group-hover:opacity-100">Edit</button>
      </dd>
    </div>
  );
}

function Tick({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#8b6a3e]" />
      <span className="leading-relaxed">{children}</span>
    </label>
  );
}
