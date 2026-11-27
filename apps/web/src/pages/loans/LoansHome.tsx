import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BadgeCheck, ChevronDown, FileSearch, Headset, Landmark, Lock, ShieldCheck } from 'lucide-react';
import { LOAN_APPROVED_STAGE, LOAN_NEEDS_CUSTOMER, LOAN_PRODUCTS } from '@kestrel/shared';
import { api } from '../../lib/api';
import { ServicePhoto } from '../../components/ServicePhoto';
import {
  LOAN_DISCLAIMER, LoanLegalSheet, LoanStatusBadge, PRODUCT_ICON, Panel, amountText, fmtDate, productName,
  type LoanSummary, type ProductInfo,
} from './shared';

const STEPS = [
  { title: 'Choose a loan', desc: 'Compare the loan options and pick the one that fits what you need.' },
  { title: 'Complete your application', desc: 'Tell us how much you need, why, and about your income and outgoings.' },
  { title: 'Submit supporting documents', desc: 'Upload your ID, proof of address, income evidence and bank statements.' },
  { title: 'Receive a lending decision', desc: 'Follow every step here. If approved, review your offer and sign online.' },
];

const FAQ = [
  { q: 'Is approval guaranteed?', a: 'No. Every application is assessed individually for eligibility, affordability and creditworthiness. We will tell you the outcome and, if we can’t lend, the reason given.' },
  { q: 'How much can I borrow and at what rate?', a: 'It depends on the loan and your circumstances. The actual amount, interest rate, term and repayments are set out in your personalised offer after assessment, before you commit to anything.' },
  { q: 'Does applying cost anything?', a: 'No. Applying is free. Any fees that apply to your loan are shown in your offer before you accept it. We never charge a fee to release a loan.' },
  { q: 'What documents do I need?', a: 'Usually ID, proof of address, proof of income and recent bank statements. Some loans need more, such as business registration for a business loan or a quotation for a vehicle loan. Each loan page lists them.' },
  { q: 'Can I save my application and finish later?', a: 'Yes. Your application is saved as a draft at every step. Open “My applications” to continue.' },
  { q: 'How will I receive the money?', a: 'Once you have signed the agreement, the lender pays the loan into your Sterling Crest Bank wallet or the bank account you chose in your application.' },
];

export function LoansHome() {
  const { data: apps } = useQuery({ queryKey: ['loan-apps'], queryFn: () => api.get<LoanSummary[]>('/loans/applications') });
  const { data: products } = useQuery({ queryKey: ['loan-products'], queryFn: () => api.get<ProductInfo[]>('/loans/products') });
  const [legal, setLegal] = useState<null | 'terms' | 'privacy' | 'disclaimer'>(null);
  const [open, setOpen] = useState<number | null>(0);

  const list = apps ?? [];
  const submitted = list.filter(a => a.status !== 'DRAFT');
  const approved = submitted.filter(a => (LOAN_APPROVED_STAGE as string[]).includes(a.status));
  const action = list.filter(a => (LOAN_NEEDS_CUSTOMER as string[]).includes(a.status));
  const available = (k: string) => products?.find(p => p.key === k)?.available !== false;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-[28px] bg-night text-white">
        <ServicePhoto service="loans" className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-r from-night via-night/90 to-night/40" />
        <div className="relative max-w-2xl p-7 sm:p-10">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-brand-bright">Loan Application Portal</p>
          <h1 className="mt-3 font-display text-[32px] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-[44px]">Find the financing you need.</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/75">
            Explore available loan options and submit an application through our secure application process.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link to="/dashboard/loans/apply" className="pill bg-white text-night" style={{ ['--pill-flood' as string]: '#d4b483' }}>
              <span className="pill-label"><span>Apply for a Loan</span><span aria-hidden>Apply for a Loan</span></span>
              <span className="pill-badge bg-night text-white"><ArrowRight size={18} /></span>
            </Link>
            {submitted.length > 0 && (
              <Link to="/dashboard/loans/applications" className="rounded-full px-4 py-3 text-sm font-medium text-white/80 hover:text-white">View my applications</Link>
            )}
          </div>
          <p className="mt-6 flex items-center gap-2 text-xs text-white/55"><ShieldCheck size={14} /> Subject to status and affordability. Approval is not guaranteed.</p>
        </div>
      </section>

      {/* Returning customers */}
      {list.length > 0 && (
        <section className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          <div className="grid grid-cols-2 gap-3 self-start">
            <div className="rounded-[20px] bg-white p-4">
              <p className="text-xs text-muted">Applications</p>
              <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{String(submitted.length).padStart(2, '0')}</p>
            </div>
            <div className="rounded-[20px] bg-white p-4">
              <p className="text-xs text-muted">Approved</p>
              <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-brand">{String(approved.length).padStart(2, '0')}</p>
            </div>
            {action.length > 0 && (
              <Link to="/dashboard/loans/applications" className="col-span-2 flex items-center gap-3 rounded-[20px] bg-orange-50 p-4 text-sm">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-orange-500 text-white"><FileSearch size={16} /></span>
                <span className="flex-1"><b>{action.length} application{action.length > 1 ? 's need' : ' needs'} your action</b><br /><span className="text-muted">Documents requested, an offer to review or an agreement to sign.</span></span>
                <ArrowRight size={16} />
              </Link>
            )}
          </div>
          <Panel>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">My applications</h2>
              <Link to="/dashboard/loans/applications" className="text-sm font-semibold text-brand hover:underline">See all</Link>
            </div>
            <ul className="divide-y divide-line">
              {list.slice(0, 4).map(a => (
                <li key={a.id}>
                  <Link to={a.status === 'DRAFT' ? `/dashboard/loans/apply/${a.id}` : `/dashboard/loans/applications/${a.id}`} className="flex items-start gap-3 py-3 hover:opacity-80">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-semibold">{a.reference ?? 'Draft application'} <LoanStatusBadge status={a.status} /></p>
                      <p className="text-sm text-muted">{productName(a.product)} · {a.offer ? 'Offered' : 'Requested'}: {a.offer ? amountText(a.offer.amountMinor, a.offer.currency) : amountText(a.amountMinor, a.currency)}</p>
                      <p className="mt-0.5 truncate text-sm"><span className="text-muted">Latest update: </span>{a.status === 'DRAFT' ? 'Not submitted yet. Continue where you left off.' : a.latestUpdate}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted">{fmtDate(a.updatedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </section>
      )}

      {/* Loan options */}
      <section>
        <h2 className="font-display text-2xl font-semibold tracking-tight">Explore loan options</h2>
        <p className="mt-1 text-sm text-muted">Open a loan to see what it’s for, who can apply and which documents you’ll need.</p>
        <div className="stagger mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LOAN_PRODUCTS.map((p, i) => {
            const Icon = PRODUCT_ICON[p.key];
            const on = available(p.key);
            return (
              <Link key={p.key} to={`/dashboard/loans/products/${p.key}`} style={{ ['--i' as string]: i }}
                className="group flex flex-col rounded-[22px] bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                <span className="flex items-start justify-between">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-soft text-brand transition-colors group-hover:bg-night group-hover:text-white"><Icon size={20} /></span>
                  {!on && <span className="rounded-full bg-paper px-2.5 py-1 text-[11px] font-semibold text-muted">Not available now</span>}
                </span>
                <p className="mt-4 font-display text-lg font-semibold">{p.name}s</p>
                <p className="text-sm text-muted">{p.short}</p>
                <span className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-brand">
                  Learn more <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* How to get started */}
      <Panel>
        <h2 className="font-display text-2xl font-semibold tracking-tight">How to get started</h2>
        <ol className="mt-5 grid gap-4 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-2xl bg-paper p-5">
              <span className="font-display text-4xl font-semibold text-night/15">{i + 1}</span>
              <p className="mt-2 font-semibold">{s.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{s.desc}</p>
            </li>
          ))}
        </ol>
      </Panel>

      {/* Responsible lending */}
      <section className="rounded-[28px] bg-night p-7 text-white sm:p-9">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Borrowing responsibly</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Landmark, t: 'A clear lender', d: 'Sterling Crest Bank is the lender. If a partner lender is involved, it is named in your offer.' },
            { icon: BadgeCheck, t: 'Real terms, no surprises', d: 'Your offer shows the amount, rate, monthly repayment, total cost and any fees.' },
            { icon: FileSearch, t: 'Affordability first', d: 'We check that repayments fit your income and outgoings before lending.' },
            { icon: Lock, t: 'Your data stays safe', d: 'Documents are stored securely and only seen by you and authorised staff.' },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="glass rounded-2xl p-5">
              <Icon size={20} className="text-brand-bright" />
              <p className="mt-3 font-semibold">{t}</p>
              <p className="mt-1 text-sm leading-relaxed text-white/65">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <Panel>
        <h2 className="font-display text-2xl font-semibold tracking-tight">Frequently asked questions</h2>
        <ul className="mt-4 divide-y divide-line">
          {FAQ.map((f, i) => (
            <li key={f.q}>
              <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-4 py-4 text-left font-medium">
                {f.q}
                <ChevronDown size={18} className={`shrink-0 text-muted transition-transform duration-300 ${open === i ? 'rotate-180' : ''}`} />
              </button>
              <div className={`grid transition-all duration-300 ${open === i ? 'grid-rows-[1fr] pb-4 opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <p className="overflow-hidden text-sm leading-relaxed text-muted">{f.a}</p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      {/* Support */}
      <section className="flex flex-col items-start justify-between gap-5 rounded-[24px] bg-brand-soft p-6 sm:flex-row sm:items-center sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand text-white"><Headset size={22} /></span>
          <div>
            <h2 className="font-display text-xl font-semibold">Not sure which loan fits?</h2>
            <p className="mt-1 max-w-lg text-sm text-night/70">Our team can explain the options and the documents you’ll need. You can also visit any of our branches.</p>
          </div>
        </div>
        <Link to="/dashboard/support" className="shrink-0 rounded-full bg-night px-5 py-3 text-sm font-semibold text-white">Contact support</Link>
      </section>

      <footer className="rounded-[24px] bg-white p-6 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-x-5 gap-y-2 font-medium">
            <button onClick={() => setLegal('privacy')} className="hover:underline">Privacy policy</button>
            <button onClick={() => setLegal('terms')} className="hover:underline">Loan terms</button>
            <button onClick={() => setLegal('disclaimer')} className="hover:underline">Important information</button>
            <Link to="/dashboard/support" className="hover:underline">Contact us</Link>
          </div>
          <p className="text-muted">Support chat in your dashboard · Visit any branch</p>
        </div>
        <p className="mt-4 border-t border-line pt-4 text-xs leading-relaxed text-muted">{LOAN_DISCLAIMER}</p>
      </footer>

      <LoanLegalSheet open={legal !== null} kind={legal ?? 'terms'} onClose={() => setLegal(null)} />
    </div>
  );
}
