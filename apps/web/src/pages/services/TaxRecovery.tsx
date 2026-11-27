import { useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, FileText, FileUp, Globe2, Loader2, Paperclip,
  RefreshCw, User, Wallet, X, XCircle, Eye,
} from 'lucide-react';
import {
  EMPLOYMENT_STATUSES, TAX_COUNTRIES, TAX_DOCUMENTS, TAX_DOC_MAX_BYTES, TAX_DOC_MIME,
  formatMoney, formatTaxId, taxCountry, taxYearLabel, validateTaxId, type TaxDocumentType,
} from '@kestrel/shared';
import { api } from '../../lib/api';
import { ServiceBanner } from '../../components/ServicePhoto';

type Claim = {
  id: string;
  country: string | null;
  legalName: string | null;
  taxIdNumber: string;
  employmentStatus: string | null;
  taxYear: number;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PAID';
  reviewNote: string | null;
  documents: { type: TaxDocumentType; name: string; size: number }[] | null;
  amountMinor: number | null;
  refundMinor: number | null;
  currency: 'USD' | 'EUR' | 'GBP';
  createdAt: string;
  reviewedAt: string | null;
  decidedAt: string | null;
  paidAt: string | null;
};

const STEPS = ['Country', 'Personal information', 'Documents', 'Review & submit'];

const EMPTY = {
  country: '',
  legalName: '',
  dateOfBirth: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  postcode: '',
  taxIdNumber: '',
  employmentStatus: '',
  taxYear: '',
};

const input =
  'w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-night';
const fmtSize = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);
const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export function TaxRecovery() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  // Poll so status changes made by the admin show up without a refresh.
  const { data: claims, isLoading } = useQuery({
    queryKey: ['tax-recovery'],
    queryFn: () => api.get<Claim[]>('/services/tax-recovery'),
    refetchInterval: 10_000,
  });

  return (
    <div className="space-y-6">
      <ServiceBanner
        service="tax"
        title="Tax Refund"
        desc="Paid too much tax? Tell us about yourself, upload your documents, and we'll handle the claim and pay the refund into your wallet."
        action={
          !open && (
            <button
              onClick={() => setOpen(true)}
              className="shrink-0 rounded-full bg-white px-5 py-2.5 font-display text-sm font-medium text-night transition-colors hover:bg-brand-bright"
            >
              Start a claim
            </button>
          )
        }
      />

      {open ? (
        <ClaimWizard
          onCancel={() => setOpen(false)}
          onDone={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: ['tax-recovery'] });
          }}
        />
      ) : (
        <HowItWorks />
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Your claims</h2>
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <RefreshCw size={12} /> Updates automatically
          </span>
        </div>
        {isLoading ? (
          <div className="skeleton h-40" />
        ) : !claims?.length ? (
          <div className="rounded-[24px] bg-white p-10 text-center">
            <FileText className="mx-auto text-muted" size={36} />
            <p className="mt-3 font-medium">No claims yet</p>
            <p className="text-sm text-muted">Start a claim to get back tax you overpaid.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {claims.map(c => <ClaimCard key={c.id} claim={c} />)}
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------- How it works ---------- */

function HowItWorks() {
  const steps = [
    { icon: Globe2, title: 'Choose your country', desc: 'So we check your tax number in the right format.' },
    { icon: User, title: 'Personal information', desc: 'Legal name, date of birth, address, tax number, employment and tax year.' },
    { icon: FileUp, title: 'Upload documents', desc: 'P60, P45, payslip, P800, proof of identity and bank evidence.' },
    { icon: Wallet, title: 'Review & refund', desc: 'Our team reviews your claim, then pays the refund into your wallet.' },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map(({ icon: Icon, title, desc }, i) => (
        <div key={title} className="rounded-[20px] bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-soft text-brand"><Icon size={18} /></span>
            <span className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-muted">Step {i + 1}</span>
          </div>
          <p className="mt-3 font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">{desc}</p>
        </div>
      ))}
    </div>
  );
}

/* ---------- Claim wizard ---------- */

function ClaimWizard({ onCancel, onDone }: { onCancel: () => void; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [files, setFiles] = useState<Partial<Record<TaxDocumentType, File>>>({});
  const [touched, setTouched] = useState(false);

  const country = taxCountry(form.country);
  const taxIdValid = form.country ? validateTaxId(form.country, form.taxIdNumber) : null;
  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const thisYear = new Date().getFullYear();
  // Last 4 tax years. For April tax years the current one isn't finished until 5 April.
  const years = useMemo(() => {
    const latest = country?.aprilTaxYear ? (new Date().getMonth() >= 3 ? thisYear - 1 : thisYear - 2) : thisYear - 1;
    return [0, 1, 2, 3].map(i => latest - i);
  }, [country, thisYear]);

  const age = form.dateOfBirth ? (Date.now() - new Date(form.dateOfBirth).getTime()) / (365.25 * 86_400_000) : 0;

  const personalErrors: Partial<Record<keyof typeof EMPTY, string>> = {};
  if (form.legalName.trim().length < 2) personalErrors.legalName = 'Enter your full legal name';
  if (!form.dateOfBirth || age < 16 || age > 120) personalErrors.dateOfBirth = 'Enter a valid date of birth (16 or older)';
  if (form.addressLine1.trim().length < 2) personalErrors.addressLine1 = 'Enter your address';
  if (!form.city.trim()) personalErrors.city = 'Enter your town or city';
  if (form.postcode.trim().length < 2) personalErrors.postcode = 'Enter your postcode';
  if (!taxIdValid) personalErrors.taxIdNumber = country ? `Doesn't match the ${country.name} format: ${country.hint}` : '';
  if (!form.employmentStatus) personalErrors.employmentStatus = 'Choose your employment status';
  if (!form.taxYear) personalErrors.taxYear = 'Choose the tax year';

  const missingDocs = TAX_DOCUMENTS.filter(d => !files[d.type]);
  const canNext =
    step === 0 ? !!form.country : step === 1 ? Object.keys(personalErrors).length === 0 : step === 2 ? missingDocs.length === 0 : true;

  const submit = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });
      fd.set('taxIdNumber', taxIdValid ?? form.taxIdNumber);
      TAX_DOCUMENTS.forEach(d => { const f = files[d.type]; if (f) fd.append(d.type, f); });
      return api.upload('/services/tax-recovery', fd);
    },
    onSuccess: onDone,
  });

  const next = () => {
    if (!canNext) { setTouched(true); return; }
    setTouched(false);
    setStep(s => s + 1);
  };

  const err = (k: keyof typeof EMPTY) => (touched && personalErrors[k] ? personalErrors[k] : '');

  return (
    <section className="overflow-hidden rounded-[28px] bg-white">
      {/* Stepper */}
      <div className="border-b border-line px-5 py-5 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-xl font-semibold tracking-tight">New tax refund claim</h2>
          <button onClick={onCancel} className="grid h-9 w-9 place-items-center rounded-full bg-paper text-muted hover:text-night" aria-label="Cancel">
            <X size={16} />
          </button>
        </div>
        <ol className="mt-5 grid grid-cols-4 gap-2">
          {STEPS.map((label, i) => (
            <li key={label} className="min-w-0">
              <div className={`h-1.5 rounded-full transition-colors duration-300 ${i <= step ? 'bg-night' : 'bg-paper'}`} />
              <p className={`mt-2 truncate text-xs font-medium ${i === step ? 'text-night' : 'text-muted'}`}>
                <span className="hidden sm:inline">{i + 1}. </span>{label}
              </p>
            </li>
          ))}
        </ol>
      </div>

      <div key={step} className="px-5 py-6 sm:px-8" style={{ animation: 'rise-in .35s cubic-bezier(.2,.8,.2,1) both' }}>
        {/* Step 1: country */}
        {step === 0 && (
          <>
            <h3 className="font-semibold">Where do you pay tax?</h3>
            <p className="text-sm text-muted">We use this to check your tax number is in the right format.</p>
            <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {TAX_COUNTRIES.map(c => {
                const active = form.country === c.code;
                return (
                  <button
                    key={c.code}
                    onClick={() => setForm(f => ({ ...f, country: c.code, taxIdNumber: '', taxYear: '' }))}
                    className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                      active ? 'border-night bg-night text-white' : 'border-line hover:border-night'
                    }`}
                  >
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-display text-xs font-bold ${active ? 'bg-white text-night' : 'bg-paper'}`}>
                      {c.code}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium">{c.name}</span>
                      <span className={`block truncate text-xs ${active ? 'text-white/60' : 'text-muted'}`}>{c.idName}</span>
                    </span>
                    {active && <Check size={18} className="ml-auto shrink-0" />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Step 2: personal information */}
        {step === 1 && country && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full legal name" hint="As shown on your passport or ID" error={err('legalName')} className="sm:col-span-2">
              <input value={form.legalName} onChange={set('legalName')} autoComplete="name" className={input} placeholder="e.g. Ama Serwaa Mensah" />
            </Field>
            <Field label="Date of birth" error={err('dateOfBirth')}>
              <input type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} max={new Date().toISOString().slice(0, 10)} className={input} />
            </Field>
            <Field
              label={country.idName}
              hint={`${country.name} format: ${country.hint}`}
              error={touched || form.taxIdNumber.length > 5 ? (taxIdValid ? '' : personalErrors.taxIdNumber ?? '') : ''}
            >
              <div className="relative">
                <input
                  value={form.taxIdNumber}
                  onChange={set('taxIdNumber')}
                  onBlur={() => taxIdValid && setForm(f => ({ ...f, taxIdNumber: formatTaxId(f.country, taxIdValid) }))}
                  placeholder={country.placeholder}
                  className={`${input} pr-10 uppercase tracking-wider`}
                  autoComplete="off"
                />
                {form.taxIdNumber && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {taxIdValid ? <CheckCircle2 size={18} className="text-ok" /> : <XCircle size={18} className="text-bad/70" />}
                  </span>
                )}
              </div>
            </Field>

            <p className="mt-2 text-sm font-semibold sm:col-span-2">Residential address</p>
            <Field label="Address line 1" error={err('addressLine1')} className="sm:col-span-2">
              <input value={form.addressLine1} onChange={set('addressLine1')} autoComplete="address-line1" className={input} />
            </Field>
            <Field label="Address line 2 (optional)" className="sm:col-span-2">
              <input value={form.addressLine2} onChange={set('addressLine2')} autoComplete="address-line2" className={input} />
            </Field>
            <Field label="Town / city" error={err('city')}>
              <input value={form.city} onChange={set('city')} autoComplete="address-level2" className={input} />
            </Field>
            <Field label="Postcode" error={err('postcode')}>
              <input value={form.postcode} onChange={set('postcode')} autoComplete="postal-code" className={`${input} uppercase`} />
            </Field>

            <Field label="Employment status" error={err('employmentStatus')} className="sm:col-span-2">
              <div className="flex flex-wrap gap-2">
                {EMPLOYMENT_STATUSES.map(s => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, employmentStatus: s.value }))}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      form.employmentStatus === s.value ? 'bg-night text-white' : 'bg-paper hover:bg-black/10'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field
              label="Tax year being claimed"
              hint={country.aprilTaxYear ? 'UK tax years run from 6 April to 5 April' : undefined}
              error={err('taxYear')}
              className="sm:col-span-2"
            >
              <div className="flex flex-wrap gap-2">
                {years.map(y => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, taxYear: String(y) }))}
                    className={`rounded-full px-4 py-2 text-sm font-medium tabular-nums transition-colors ${
                      form.taxYear === String(y) ? 'bg-night text-white' : 'bg-paper hover:bg-black/10'
                    }`}
                  >
                    {taxYearLabel(form.country, y)}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        )}

        {/* Step 3: documents */}
        {step === 2 && (
          <>
            <h3 className="font-semibold">Upload your documents</h3>
            <p className="text-sm text-muted">All six are required. PDF, JPG or PNG, up to 10 MB each.</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {TAX_DOCUMENTS.map(d => (
                <DocUpload
                  key={d.type}
                  label={d.label}
                  desc={d.desc}
                  file={files[d.type]}
                  missing={touched && !files[d.type]}
                  onFile={f => setFiles(m => ({ ...m, [d.type]: f }))}
                  onRemove={() => setFiles(m => { const n = { ...m }; delete n[d.type]; return n; })}
                />
              ))}
            </div>
            <p className="mt-4 text-sm text-muted">
              {TAX_DOCUMENTS.length - missingDocs.length} of {TAX_DOCUMENTS.length} uploaded
            </p>
          </>
        )}

        {/* Step 4: review */}
        {step === 3 && country && (
          <div className="grid gap-5 lg:grid-cols-2">
            <ReviewBlock title="Personal information" onEdit={() => setStep(1)}>
              <Row k="Country" v={country.name} />
              <Row k="Full legal name" v={form.legalName} />
              <Row k="Date of birth" v={fmtDate(form.dateOfBirth)} />
              <Row k="Address" v={[form.addressLine1, form.addressLine2, form.city, form.postcode.toUpperCase()].filter(Boolean).join(', ')} />
              <Row k={country.idName} v={formatTaxId(form.country, taxIdValid ?? '')} />
              <Row k="Employment" v={EMPLOYMENT_STATUSES.find(s => s.value === form.employmentStatus)?.label ?? ''} />
              <Row k="Tax year" v={taxYearLabel(form.country, Number(form.taxYear))} />
            </ReviewBlock>
            <ReviewBlock title="Documents" onEdit={() => setStep(2)}>
              {TAX_DOCUMENTS.map(d => (
                <Row key={d.type} k={d.label} v={files[d.type] ? `${files[d.type]!.name} · ${fmtSize(files[d.type]!.size)}` : '—'} />
              ))}
            </ReviewBlock>
            <p className="rounded-2xl bg-paper px-4 py-3 text-sm text-muted lg:col-span-2">
              By submitting, you confirm the information is correct. Our team will review your claim and documents. You'll see
              every status change here, and the refund will be paid into your wallet once approved.
            </p>
          </div>
        )}

        {submit.isError && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-bad">{(submit.error as Error).message}</p>}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            onClick={() => (step === 0 ? onCancel() : setStep(s => s - 1))}
            className="flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-muted hover:text-night"
          >
            <ArrowLeft size={16} /> {step === 0 ? 'Cancel' : 'Back'}
          </button>
          {step < 3 ? (
            <button
              onClick={next}
              className={`flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] ${canNext ? 'bg-night' : 'bg-night/40'}`}
            >
              Continue <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={() => submit.mutate()}
              disabled={submit.isPending}
              className="flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {submit.isPending ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : <>Submit claim <Check size={16} /></>}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function Field({
  label, hint, error, className = '', children,
}: { label: string; hint?: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
      {error ? <p className="mt-1.5 text-xs text-bad">{error}</p> : hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function DocUpload({
  label, desc, file, missing, onFile, onRemove,
}: {
  label: string;
  desc: string;
  file?: File;
  missing: boolean;
  onFile: (f: File) => void;
  onRemove: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState('');

  const accept = (f?: File | null) => {
    if (!f) return;
    if (!TAX_DOC_MIME.includes(f.type)) return setError('Use a PDF, JPG or PNG file');
    if (f.size > TAX_DOC_MAX_BYTES) return setError('File is larger than 10 MB');
    setError('');
    onFile(f);
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); accept(e.dataTransfer.files?.[0]); }}
      className={`rounded-2xl border-2 p-4 transition-colors ${
        file ? 'border-solid border-brand/40 bg-brand-soft/40' : over ? 'border-dashed border-night bg-paper' : missing ? 'border-dashed border-bad/50' : 'border-dashed border-line'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${file ? 'bg-brand text-white' : 'bg-paper text-muted'}`}>
          {file ? <Check size={18} /> : <Paperclip size={17} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{label}</p>
          {file ? (
            <p className="truncate text-sm text-muted">{file.name} · {fmtSize(file.size)}</p>
          ) : (
            <p className="text-xs leading-relaxed text-muted">{desc}</p>
          )}
          {(error || (missing && !file)) && <p className="mt-1 text-xs text-bad">{error || 'Required'}</p>}
        </div>
      </div>
      <div className="mt-3 flex gap-2 pl-[52px]">
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="rounded-full bg-night px-3.5 py-1.5 text-xs font-semibold text-white"
        >
          {file ? 'Replace' : 'Choose file'}
        </button>
        {file && (
          <button type="button" onClick={onRemove} className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted hover:text-bad">
            Remove
          </button>
        )}
        {!file && <span className="self-center text-xs text-muted">or drop it here</span>}
      </div>
      <input
        ref={ref}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        className="hidden"
        onChange={e => { accept(e.target.files?.[0]); e.target.value = ''; }}
      />
    </div>
  );
}

function ReviewBlock({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line p-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <button onClick={onEdit} className="text-sm font-semibold text-brand hover:underline">Edit</button>
      </div>
      <dl className="divide-y divide-line">{children}</dl>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 text-sm">
      <dt className="shrink-0 text-muted">{k}</dt>
      <dd className="min-w-0 truncate text-right font-medium">{v}</dd>
    </div>
  );
}

/* ---------- Claim card with status tracker ---------- */

const TRACK = [
  { key: 'SUBMITTED', label: 'Submitted' },
  { key: 'UNDER_REVIEW', label: 'Under review' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'PAID', label: 'Refund paid' },
] as const;

const BADGE: Record<Claim['status'], string> = {
  SUBMITTED: 'bg-blue-50 text-blue-700',
  UNDER_REVIEW: 'bg-amber-50 text-warn',
  APPROVED: 'bg-brand-soft text-brand',
  PAID: 'bg-emerald-600 text-white',
  REJECTED: 'bg-red-50 text-bad',
};
const STATUS_LABEL: Record<Claim['status'], string> = {
  SUBMITTED: 'Submitted', UNDER_REVIEW: 'Under review', APPROVED: 'Approved', PAID: 'Refund paid', REJECTED: 'Not approved',
};

function ClaimCard({ claim }: { claim: Claim }) {
  const c = claim.country ? taxCountry(claim.country) : undefined;
  const rejected = claim.status === 'REJECTED';
  const reached = rejected
    ? (claim.reviewedAt ? 1 : 0)
    : TRACK.findIndex(t => t.key === claim.status);
  const dates = [claim.createdAt, claim.reviewedAt, claim.decidedAt, claim.paidAt];

  return (
    <article className="rounded-[24px] bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold">
            Tax year {claim.country ? taxYearLabel(claim.country, claim.taxYear) : claim.taxYear}
          </p>
          <p className="text-sm text-muted">
            {c ? `${c.name} · ` : ''}Filed {fmtDate(claim.createdAt)}
            {claim.taxIdNumber && c ? ` · ${c.idName} ${formatTaxId(claim.country!, claim.taxIdNumber)}` : ''}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${BADGE[claim.status]}`}>{STATUS_LABEL[claim.status]}</span>
      </div>

      {/* Tracker */}
      <ol className="mt-6 grid grid-cols-4">
        {TRACK.map((t, i) => {
          const done = i <= reached;
          const failedHere = rejected && i === reached + 1;
          return (
            <li key={t.key} className="relative">
              {i > 0 && (
                <span className={`absolute right-1/2 top-[13px] h-0.5 w-full -translate-y-1/2 ${done ? 'bg-night' : 'bg-paper'}`} />
              )}
              <span
                className={`relative mx-auto grid h-[26px] w-[26px] place-items-center rounded-full text-white ${
                  failedHere ? 'bg-bad' : done ? 'bg-night' : 'bg-paper'
                } ${i === reached && !rejected && claim.status !== 'PAID' ? 'ring-4 ring-night/10' : ''}`}
              >
                {failedHere ? <X size={14} /> : done ? <Check size={14} /> : null}
              </span>
              <p className={`mt-2 text-center text-xs font-medium ${done || failedHere ? 'text-night' : 'text-muted'}`}>
                {failedHere ? 'Not approved' : t.label}
              </p>
              <p className="text-center text-[11px] text-muted">{done ? fmtDate(dates[i]) : failedHere ? fmtDate(claim.decidedAt) : ''}</p>
            </li>
          );
        })}
      </ol>

      {claim.status === 'PAID' && claim.refundMinor != null && (
        <div className="pill-grow mt-5 flex items-center justify-between rounded-2xl bg-night px-5 py-4 text-white">
          <span className="flex items-center gap-2 text-sm"><Wallet size={16} /> Refund paid to your {claim.currency} wallet</span>
          <span className="font-display text-xl font-semibold tabular-nums">{formatMoney(claim.refundMinor, claim.currency)}</span>
        </div>
      )}

      {claim.reviewNote && (
        <p className={`mt-4 rounded-2xl px-4 py-3 text-sm ${rejected ? 'bg-red-50 text-bad' : 'bg-paper text-night/80'}`}>
          <span className="font-semibold">Note from our team:</span> {claim.reviewNote}
        </p>
      )}

      {!!claim.documents?.length && (
        <div className="mt-4 flex flex-wrap gap-2">
          {claim.documents.map(d => (
            <a
              key={d.type}
              href={`/api/services/tax-recovery/${claim.id}/documents/${d.type}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-full bg-paper px-3 py-1.5 text-xs font-medium hover:bg-black/10"
            >
              <Eye size={12} /> {TAX_DOCUMENTS.find(t => t.type === d.type)?.label ?? d.type}
            </a>
          ))}
        </div>
      )}
    </article>
  );
}
