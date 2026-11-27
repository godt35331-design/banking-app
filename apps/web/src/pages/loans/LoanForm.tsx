import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Eye, Loader2, Lock, Save, Trash2, X } from 'lucide-react';
import {
  BANKING_FIELDS, BANKING_WARNING, EMPLOYMENT_FIELDS, PERSONAL_FIELDS, dialCode, fieldVisible, withDialCode, loanAffordability, loanDocuments,
  loanDocsReady, loanProduct, loanStepErrors, missingLoanDocs, requirementFields, type LoanData, type LoanField,
} from '@kestrel/shared';
import { api } from '../../lib/api';
import {
  DropZone, FieldInput, GroupList, LoanLegalSheet, PRODUCT_ICON, Panel, anyMoney, fmtSize,
  type Group, type LoanDoc, type WalletLite,
} from './shared';

type Draft = {
  id: string;
  reference: string | null;
  product: string;
  status: string;
  requirements: Group | null;
  answers: Group | null;
  personal: Group | null;
  employment: Group | null;
  banking: Group | null;
  documents: LoanDoc[];
};

const STEPS = ['Loan requirements', 'Personal information', 'Employment & income', 'Banking information', 'Documents', 'Review & submit'];

const toData = (d: Draft): LoanData => {
  const personal = { ...(d.personal ?? {}) };
  const code = dialCode(personal.country);
  if (personal.phone && code) personal.phone = withDialCode(personal.phone, code);
  return {
    requirements: d.requirements ?? {}, answers: d.answers ?? {}, personal,
    employment: d.employment ?? {}, banking: d.banking ?? {},
  };
};

export function LoanForm() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: draft, isLoading, error } = useQuery({ queryKey: ['loan-app', id], queryFn: () => api.get<Draft>(`/loans/applications/${id}`) });
  const { data: wallets } = useQuery({ queryKey: ['wallets'], queryFn: () => api.get<WalletLite[]>('/wallets') });

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<LoanData | null>(null);
  const [touched, setTouched] = useState(false);
  const [accept, setAccept] = useState({ accurate: false, checks: false, terms: false });
  const [legal, setLegal] = useState<null | 'terms' | 'privacy'>(null);
  const [submitted, setSubmitted] = useState<string | null>(null);
  useEffect(() => { if (draft && !form) setForm(toData(draft)); }, [draft, form]);

  const save = useMutation({
    mutationFn: (f: LoanData) => api.patch(`/loans/applications/${id}`, f),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loan-apps'] }),
  });
  const upload = useMutation({
    mutationFn: ({ file, kind }: { file: File; kind: string }) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('kind', kind);
      return api.upload(`/loans/applications/${id}/documents`, fd);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loan-app', id] }),
  });
  const removeDoc = useMutation({
    mutationFn: (docId: string) => api.del(`/loans/applications/${id}/documents/${docId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['loan-app', id] }),
  });
  const submit = useMutation({
    mutationFn: async () => {
      await api.patch(`/loans/applications/${id}`, form!);
      return api.post<{ reference: string }>(`/loans/applications/${id}/submit`, accept);
    },
    onSuccess: a => {
      setSubmitted(a.reference);
      qc.invalidateQueries({ queryKey: ['loan-apps'] });
      qc.invalidateQueries({ queryKey: ['loan-app', id] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
  const discard = useMutation({
    mutationFn: () => api.del(`/loans/applications/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['loan-apps'] }); navigate('/dashboard/loans'); },
  });

  const p = draft ? loanProduct(draft.product) : undefined;
  if (isLoading || (!form && draft)) return <div className="skeleton h-96" />;
  if (error || !draft || !p || !form) return <p className="text-sm text-bad">{(error as Error)?.message ?? 'Application not found'}</p>;
  if (submitted) return <Submitted reference={submitted} id={id} product={p.name} />;
  if (draft.status !== 'DRAFT') return <Navigate to={`/dashboard/loans/applications/${id}`} replace />;

  const Icon = PRODUCT_ICON[p.key];
  const cur = form.requirements.currency || undefined;
  const w = wallets ?? [];
  const setField = (g: keyof LoanData, k: string, v: string) =>
    setForm(f => {
      const next = { ...f![g], [k]: v };
      // Changing the country of residence swaps the phone number's dialling code.
      if (g === 'personal' && k === 'country' && next.phone) next.phone = withDialCode(next.phone, dialCode(v));
      return { ...f!, [g]: next };
    });

  const errs = loanStepErrors(p.key, form);
  const docs = draft.documents;
  const docsReady = loanDocsReady(docs.length);
  const recommendedLeft = missingLoanDocs(p.key, docs.map(d => d.kind));
  const stepValid = [
    !Object.keys(errs.requirements).length && !Object.keys(errs.answers).length,
    !Object.keys(errs.personal).length,
    !Object.keys(errs.employment).length,
    !Object.keys(errs.banking).length,
    docsReady,
    true,
  ];
  const valid = stepValid[step];

  const go = (to: number) => {
    if (to > step && !valid) { setTouched(true); return; }
    setTouched(false);
    save.mutate(form);
    setStep(to);
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fields = (g: keyof LoanData, list: LoanField[], ctx: Group = {}) => (
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      {list.filter(f => fieldVisible(f, form[g], ctx)).map(f => (
        <FieldInput key={f.key} f={f} value={form[g][f.key] ?? ''} onChange={v => setField(g, f.key, v)}
          error={touched ? (errs[g] as Record<string, string>)[f.key] : undefined} wallets={w} currency={cur}
          dial={f.dialCodeFrom ? dialCode(form[g][f.dialCodeFrom]) : undefined} />
      ))}
    </div>
  );
  const aff = loanAffordability(form.employment);

  return (
    <div className="space-y-5">
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-soft text-brand"><Icon size={20} /></span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Loan application · Draft</p>
              <h1 className="font-display text-xl font-semibold">{p.name}</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { save.mutate(form); navigate('/dashboard/loans/applications'); }}
              className="flex items-center gap-1.5 rounded-full bg-paper px-4 py-2 text-xs font-semibold hover:bg-black/10">
              <Save size={14} /> Save & finish later
            </button>
            <button onClick={() => confirm('Delete this draft and its documents?') && discard.mutate()}
              className="grid h-9 w-9 place-items-center rounded-full bg-paper text-muted hover:text-bad" aria-label="Delete draft">
              <Trash2 size={15} />
            </button>
          </div>
        </div>
        <ol className="mt-5 grid grid-cols-6 gap-2">
          {STEPS.map((s, i) => (
            <li key={s}>
              <button onClick={() => i < step && go(i)} disabled={i > step} className="w-full text-left">
                <div className={`h-1.5 rounded-full transition-colors duration-300 ${i <= step ? 'bg-night' : 'bg-paper'}`} />
                <p className={`mt-2 hidden truncate text-xs font-medium md:block ${i === step ? 'text-night' : 'text-muted'}`}>{i + 1}. {s}</p>
              </button>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs font-medium md:hidden">Step {step + 1} of 6 · {STEPS[step]}</p>
        {save.isError && <p className="mt-3 text-xs text-bad">Couldn't save your progress: {(save.error as Error).message}</p>}
      </Panel>

      <div key={step} style={{ animation: 'rise-in .35s cubic-bezier(.2,.8,.2,1) both' }}>
        {step === 0 && (
          <div className="space-y-5">
            <Panel>
              <h2 className="font-display text-lg font-semibold">Loan requirements</h2>
              <p className="text-sm text-muted">How much you need, what for, and how long you’d like to repay.</p>
              {fields('requirements', requirementFields(p))}
            </Panel>
            {p.questions.length > 0 && (
              <Panel>
                <h2 className="font-display text-lg font-semibold">About your {p.name.toLowerCase()}</h2>
                <p className="text-sm text-muted">Details the lender needs for this type of loan.</p>
                {fields('answers', p.questions)}
              </Panel>
            )}
          </div>
        )}

        {step === 1 && (
          <Panel>
            <h2 className="font-display text-lg font-semibold">Personal information</h2>
            <p className="text-sm text-muted">Enter your details exactly as they appear on your identification.</p>
            {fields('personal', PERSONAL_FIELDS)}
          </Panel>
        )}

        {step === 2 && (
          <Panel>
            <h2 className="font-display text-lg font-semibold">Employment and income</h2>
            <p className="text-sm text-muted">This helps the lender assess your ability to repay. Use monthly amounts{cur ? ` in ${cur}` : ''}.</p>
            <p className="mt-3 text-sm"><span className="text-muted">Employment status: </span><b>{form.requirements.employmentStatus || '—'}</b>
              <button onClick={() => go(0)} className="ml-2 text-xs font-semibold text-brand">Change</button></p>
            {fields('employment', EMPLOYMENT_FIELDS, form.requirements)}
            {aff.income > 0 && cur && (
              <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-paper p-3 text-sm">
                <div><p className="text-xs text-muted">Monthly income</p><p className="font-semibold tabular-nums">{anyMoney(Math.round(aff.income * 100), cur)}</p></div>
                <div><p className="text-xs text-muted">Outgoings</p><p className="font-semibold tabular-nums">{anyMoney(Math.round(aff.outgoings * 100), cur)}</p></div>
                <div><p className="text-xs text-muted">Left each month</p><p className={`font-semibold tabular-nums ${aff.disposable < 0 ? 'text-bad' : ''}`}>{anyMoney(Math.round(aff.disposable * 100), cur)}</p></div>
              </div>
            )}
          </Panel>
        )}

        {step === 3 && (
          <Panel>
            <h2 className="font-display text-lg font-semibold">Banking information</h2>
            <p className="text-sm text-muted">Where the money should be paid if your loan is approved.</p>
            <p className="mt-4 flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-warn">
              <Lock size={17} className="mt-0.5 shrink-0" /> {BANKING_WARNING}
            </p>
            {fields('banking', BANKING_FIELDS)}
          </Panel>
        )}

        {step === 4 && (
          <Panel>
            <h2 className="font-display text-lg font-semibold">Upload supporting documents</h2>
            <p className="text-sm text-muted">
              PDF, JPG or PNG, up to 10 MB each. Upload what you have now; <b className="text-night">one document is enough to continue</b>.
              Your loan officer will tell you if anything else is needed.
            </p>
            <div className="mt-5 grid gap-2.5 md:grid-cols-2">
              {loanDocuments(p).map(d => {
                const mine = docs.filter(x => x.kind === d.key);
                return (
                  <div key={d.key}>
                    <DropZone
                      label={d.label}
                      hint={mine.length ? `${mine.length} uploaded` : `${d.required ? 'Recommended' : 'Optional'} · ${d.hint}`}
                      done={mine.length > 0}
                      busy={upload.isPending && upload.variables?.kind === d.key}
                      onFile={file => upload.mutate({ file, kind: d.key })}
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
                        <span className="block text-xs text-muted">{loanDocuments(p).find(x => x.key === d.kind)?.label ?? 'Additional'} · {fmtSize(d.size)}</span>
                      </span>
                      <a href={`/api/loans/applications/${id}/documents/${d.id}`} target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center rounded-full hover:bg-paper" aria-label="View"><Eye size={15} /></a>
                      <button onClick={() => removeDoc.mutate(d.id)} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-red-50 hover:text-bad" aria-label="Remove"><X size={15} /></button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {touched && !docsReady && <p className="mt-3 text-sm text-bad">Upload at least one document to continue.</p>}
            {docsReady && recommendedLeft.length > 0 && (
              <p className="mt-3 rounded-xl bg-paper px-3 py-2.5 text-xs leading-relaxed text-muted">
                You can continue now. Adding these too can speed up your review: {recommendedLeft.join(', ')}.
              </p>
            )}
          </Panel>
        )}

        {step === 5 && (
          <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
            <div className="space-y-5">
              <ReviewBlock title="Selected loan" onEdit={() => go(0)}>
                <dl className="divide-y divide-line text-sm">
                  <div className="flex justify-between py-2.5"><dt className="text-muted">Loan</dt><dd className="font-medium">{p.name}</dd></div>
                </dl>
                <GroupList fields={requirementFields(p)} values={form.requirements} currency={cur} />
                {p.questions.length > 0 && <div className="mt-2"><GroupList fields={p.questions} values={form.answers} currency={cur} /></div>}
              </ReviewBlock>
              <ReviewBlock title="Applicant details" onEdit={() => go(1)}><GroupList fields={PERSONAL_FIELDS} values={form.personal} /></ReviewBlock>
              <ReviewBlock title="Income information" onEdit={() => go(2)}><GroupList fields={EMPLOYMENT_FIELDS} values={form.employment} currency={cur} /></ReviewBlock>
              <ReviewBlock title="Payout account" onEdit={() => go(3)}><GroupList fields={BANKING_FIELDS} values={form.banking} wallets={w} /></ReviewBlock>
            </div>
            <div className="space-y-5">
              <ReviewBlock title={`Uploaded documents (${docs.length})`} onEdit={() => go(4)}>
                <ul className="space-y-1.5 text-sm">
                  {docs.map(d => <li key={d.id} className="flex items-center gap-2 truncate"><Check size={14} className="shrink-0 text-brand" />{d.name}</li>)}
                </ul>
              </ReviewBlock>
              <Panel>
                <h2 className="font-display text-lg font-semibold">Consent and declarations</h2>
                <div className="mt-3 space-y-3 text-sm">
                  <Tick checked={accept.accurate} onChange={v => setAccept(a => ({ ...a, accurate: v }))}>
                    The information and documents I have provided are true, complete and my own.
                  </Tick>
                  <Tick checked={accept.checks} onChange={v => setAccept(a => ({ ...a, checks: v }))}>
                    I authorise the lender to verify my identity, address, income and bank account, and to carry out a credit check.
                  </Tick>
                  <Tick checked={accept.terms} onChange={v => setAccept(a => ({ ...a, terms: v }))}>
                    I accept the <button type="button" onClick={() => setLegal('terms')} className="font-semibold text-brand underline">loan terms</button> and the{' '}
                    <button type="button" onClick={() => setLegal('privacy')} className="font-semibold text-brand underline">privacy policy</button>, and understand that approval is not guaranteed.
                  </Tick>
                </div>
                {submit.isError && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-bad">{(submit.error as Error).message}</p>}
                <button onClick={() => submit.mutate()} disabled={!accept.accurate || !accept.checks || !accept.terms || submit.isPending}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3.5 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-40">
                  {submit.isPending ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : 'Submit Loan Application'}
                </button>
              </Panel>
            </div>
          </div>
        )}
      </div>

      {step < 5 ? (
        <div className="flex items-center justify-between">
          <button onClick={() => (step === 0 ? navigate('/dashboard/loans/apply') : go(step - 1))}
            className="flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-muted hover:text-night">
            <ArrowLeft size={16} /> {step === 0 ? 'Change loan' : 'Back'}
          </button>
          <button onClick={() => go(step + 1)}
            className={`flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] ${valid ? 'bg-night' : 'bg-night/40'}`}>
            Continue <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <button onClick={() => go(4)} className="flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-muted hover:text-night">
          <ArrowLeft size={16} /> Back
        </button>
      )}

      <LoanLegalSheet open={legal !== null} kind={legal ?? 'terms'} onClose={() => setLegal(null)} />
    </div>
  );
}

function ReviewBlock({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <Panel>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <button onClick={onEdit} className="text-sm font-semibold text-brand hover:underline">Edit</button>
      </div>
      {children}
    </Panel>
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

function Submitted({ reference, id, product }: { reference: string; id: string; product: string }) {
  return (
    <section className="mx-auto max-w-xl rounded-[28px] bg-white p-8 text-center" style={{ animation: 'rise-in .45s cubic-bezier(.2,.8,.2,1) both' }}>
      <span className="pill-grow mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand text-white"><Check size={30} /></span>
      <h1 className="mt-5 font-display text-2xl font-semibold">Application submitted</h1>
      <p className="mt-2 text-sm text-muted">Your {product} application has been received.</p>
      <p className="mx-auto mt-5 w-fit rounded-2xl bg-night px-6 py-3 font-display text-2xl font-semibold tracking-wider text-white">{reference}</p>
      <p className="mt-2 text-xs text-muted">Keep this reference for your records. A confirmation has been added to your notifications.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link to={`/dashboard/loans/applications/${id}`} className="rounded-full bg-night px-5 py-3 text-sm font-semibold text-white">Track this application</Link>
        <Link to="/dashboard/loans" className="rounded-full bg-paper px-5 py-3 text-sm font-semibold">Back to overview</Link>
      </div>
    </section>
  );
}
