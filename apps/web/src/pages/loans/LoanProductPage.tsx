import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, FileText, Info, Loader2 } from 'lucide-react';
import { LOAN_PRODUCTS, loanDocuments, loanProduct, termLabel, type LoanProduct } from '@kestrel/shared';
import { api } from '../../lib/api';
import { LOAN_DISCLAIMER, PRODUCT_ICON, Panel, type ProductInfo } from './shared';

/** Starts a draft for a product and opens the application form. */
export function useStartLoan() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: (product: string) => api.post<{ id: string }>('/loans/applications', { product }),
    onSuccess: a => {
      qc.invalidateQueries({ queryKey: ['loan-apps'] });
      navigate(`/dashboard/loans/apply/${a.id}`);
    },
  });
}

/** One loan product: what it's for, who can apply, eligibility, amounts/rates (from the lender), documents. */
export function LoanProductPage() {
  const { key = '' } = useParams();
  const p = loanProduct(key);
  const { data: products } = useQuery({ queryKey: ['loan-products'], queryFn: () => api.get<ProductInfo[]>('/loans/products') });
  const start = useStartLoan();
  if (!p) return <Navigate to="/dashboard/loans" replace />;
  const info = products?.find(x => x.key === p.key);
  const available = info?.available !== false;
  const Icon = PRODUCT_ICON[p.key];

  return (
    <div className="space-y-5">
      <Link to="/dashboard/loans" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-night">
        <ArrowLeft size={15} /> All loans
      </Link>

      <section className="rounded-[28px] bg-night p-7 text-white sm:p-9">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-brand-bright"><Icon size={22} /></span>
        <h1 className="mt-4 font-display text-[32px] font-semibold leading-tight tracking-[-0.03em]">{p.name}</h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-white/70">{p.description}</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button onClick={() => start.mutate(p.key)} disabled={!available || start.isPending}
            className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-night transition-transform active:scale-[0.98] disabled:opacity-50">
            {start.isPending ? <Loader2 size={16} className="animate-spin" /> : null} Apply for a {p.name.toLowerCase()} <ArrowRight size={16} />
          </button>
          {!available && <span className="text-sm text-white/70">This loan is not available at the moment.</span>}
        </div>
        {start.isError && <p className="mt-3 text-sm text-red-300">{(start.error as Error).message}</p>}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <h2 className="font-display text-lg font-semibold">What the loan is for</h2>
          <List items={p.whatFor} />
        </Panel>
        <Panel>
          <h2 className="font-display text-lg font-semibold">Who can apply</h2>
          <List items={p.whoCanApply} />
        </Panel>
        <Panel>
          <h2 className="font-display text-lg font-semibold">Eligibility requirements</h2>
          <List items={p.eligibility} />
        </Panel>
        <Panel>
          <h2 className="font-display text-lg font-semibold">Amounts, rates and repayment</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <Info2 k="Loan amounts" v={info?.amountInfo} />
            <Info2 k="Interest rates" v={info?.rateInfo} />
            <Info2 k="Repayment periods" v={info?.termInfo} fallback={`You can ask for ${termLabel(p.terms[0])} to ${termLabel(p.terms[p.terms.length - 1])}. The lender confirms the term in your offer.`} />
          </dl>
        </Panel>
      </div>

      <Panel>
        <h2 className="font-display text-lg font-semibold">Required documents</h2>
        <p className="text-sm text-muted">PDF, JPG or PNG, up to 10 MB each. You can apply with one document; the more you upload, the faster the review. We’ll ask if anything else is needed.</p>
        <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {loanDocuments(p).map(d => (
            <li key={d.key} className="flex gap-3 rounded-2xl bg-paper px-4 py-3 text-sm">
              <FileText size={16} className="mt-0.5 shrink-0 text-muted" />
              <span>
                <span className="font-semibold">{d.label}</span>
                <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${d.required ? 'bg-night text-white' : 'bg-white text-muted'}`}>
                  {d.required ? 'Recommended' : 'Optional'}
                </span>
                <span className="block text-xs text-muted">{d.hint}</span>
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="flex flex-col items-start justify-between gap-4 rounded-[24px] bg-white p-6 sm:flex-row sm:items-center">
        <p className="max-w-2xl text-xs leading-relaxed text-muted">{LOAN_DISCLAIMER}</p>
        <button onClick={() => start.mutate(p.key)} disabled={!available || start.isPending}
          className="shrink-0 rounded-full bg-night px-6 py-3 text-sm font-semibold text-white disabled:opacity-50">Apply now</button>
      </div>
    </div>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-2 text-sm">
      {items.map(x => <li key={x} className="flex gap-2"><Check size={15} className="mt-0.5 shrink-0 text-brand" />{x}</li>)}
    </ul>
  );
}

function Info2({ k, v, fallback }: { k: string; v?: string | null; fallback?: string }) {
  return (
    <div className="rounded-2xl bg-paper px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{k}</dt>
      <dd className="mt-1">
        {v || (
          <span className="flex gap-2 text-muted"><Info size={15} className="mt-0.5 shrink-0" />{fallback ?? 'Set by the lender after assessing your application, and shown in your personalised offer.'}</span>
        )}
      </dd>
    </div>
  );
}

/** "Apply" tab: pick a loan product. */
export function LoanApply() {
  const { data: products } = useQuery({ queryKey: ['loan-products'], queryFn: () => api.get<ProductInfo[]>('/loans/products') });
  const start = useStartLoan();
  return (
    <div>
      <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.03em]">Choose a loan</h1>
      <p className="mt-1 text-sm text-muted">Select the loan you want to apply for. You can save your application and finish it later.</p>
      {start.isError && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-bad">{(start.error as Error).message}</p>}
      <div className="stagger mt-6 grid gap-4 lg:grid-cols-2">
        {LOAN_PRODUCTS.map((p, i) => <ProductCard key={p.key} p={p} i={i} available={products?.find(x => x.key === p.key)?.available !== false}
          busy={start.isPending && start.variables === p.key} disabled={start.isPending} onStart={() => start.mutate(p.key)} />)}
      </div>
    </div>
  );
}

function ProductCard({ p, i, available, busy, disabled, onStart }: { p: LoanProduct; i: number; available: boolean; busy: boolean; disabled: boolean; onStart: () => void }) {
  const Icon = PRODUCT_ICON[p.key];
  return (
    <article style={{ ['--i' as string]: i }} className="flex flex-col rounded-[24px] bg-white p-6">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-soft text-brand"><Icon size={22} /></span>
        <div>
          <h2 className="font-display text-xl font-semibold">{p.name}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">{p.description}</p>
        </div>
      </div>
      <ul className="mt-4 flex flex-wrap gap-1.5">
        {p.whatFor.slice(0, 4).map(x => <li key={x} className="rounded-full bg-paper px-3 py-1 text-xs font-medium">{x}</li>)}
      </ul>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button onClick={onStart} disabled={!available || disabled}
          className="flex items-center gap-2 rounded-full bg-night px-5 py-2.5 text-sm font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-50">
          {busy && <Loader2 size={15} className="animate-spin" />} Start application <ArrowRight size={15} />
        </button>
        <Link to={`/dashboard/loans/products/${p.key}`} className="rounded-full px-4 py-2.5 text-sm font-semibold text-muted hover:text-night">Details & documents</Link>
        {!available && <span className="text-xs text-muted">Not available at the moment</span>}
      </div>
    </article>
  );
}
