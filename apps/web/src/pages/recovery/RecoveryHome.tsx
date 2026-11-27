import { useState } from 'react';
import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight, Banknote, Bitcoin, ChevronDown, ClipboardCheck, Eye, FileSearch, Headset, LineChart, Lock,
  MessageSquare, ReceiptText, ShieldAlert, ShieldCheck, Timer,
} from 'lucide-react';
import { RECOVERY_CATEGORIES } from '@kestrel/shared';
import { api } from '../../lib/api';
import { ServicePhoto } from '../../components/ServicePhoto';
import {
  DISCLAIMER, LegalSheet, NEEDS_CUSTOMER, Panel, StatusBadge, amountText, catName, fmtDate, type CaseSummary,
} from './shared';

export const CATEGORY_ICON: Record<string, typeof Banknote> = {
  BANK_TRANSFER: Banknote,
  PAYMENT_REFUND: ReceiptText,
  INVESTMENT: LineChart,
  CRYPTO: Bitcoin,
  WITHHELD: Timer,
  SCAM: ShieldAlert,
};

const STEPS = [
  { title: 'Submit your recovery application', desc: 'Choose a category, answer a few questions and upload your evidence.' },
  { title: 'Our team reviews your information', desc: 'A case officer checks the details and documents you provided.' },
  { title: 'We explain the available recovery options', desc: 'You get a clear assessment. Nothing happens without your approval.' },
  { title: 'Track your application and receive updates', desc: 'Follow every status change, message your case officer and upload more evidence.' },
];

const WHY = [
  { icon: Eye, title: 'Transparent process', desc: 'Every step and status is explained. You always know what is happening and why.' },
  { icon: ClipboardCheck, title: 'Case tracking', desc: 'Each application gets a reference number and a timeline you can follow at any time.' },
  { icon: MessageSquare, title: 'Direct support', desc: 'Message your case officer from your case, or reach our support team any day.' },
  { icon: Lock, title: 'Your data stays safe', desc: 'Documents are stored securely and only seen by you and authorised staff.' },
];

const FAQ = [
  { q: 'Can you guarantee I will get my money back?', a: 'No. Nobody can honestly guarantee recovery. Every case is assessed individually and the outcome depends on the evidence and on third parties such as banks, merchants, platforms and authorities. We will explain the realistic options for your situation.' },
  { q: 'Does it cost anything to apply?', a: 'No. Submitting an application and the initial assessment are free. If any later step could involve a cost, it is explained in writing before you approve it.' },
  { q: 'What documents should I prepare?', a: 'Anything that shows what happened: statements, receipts, transaction references, screenshots and messages. Each category shows a checklist. You can blank out unrelated transactions and personal details.' },
  { q: 'How long does it take?', a: 'An initial review usually takes a few working days. Cases that depend on a bank, provider or authority can take longer; your case status shows when we are waiting for a third party.' },
  { q: 'Will you ask for my passwords or crypto keys?', a: 'Never. We will never ask for your online banking password, PIN, one-time codes, private keys or seed phrases. Anyone who asks for them is not us.' },
  { q: 'Can I add more evidence later?', a: 'Yes. Open your application at any time and upload more documents, or answer a document request from your case officer in the Document centre.' },
];

export function RecoveryHome() {
  const { data: cases } = useQuery({ queryKey: ['recovery-cases'], queryFn: () => api.get<CaseSummary[]>('/recovery/cases') });
  const [legal, setLegal] = useState<null | 'terms' | 'privacy' | 'disclaimer'>(null);
  const [open, setOpen] = useState<number | null>(0);

  const list = cases ?? [];
  const submitted = list.filter(c => c.status !== 'DRAFT');
  const review = submitted.filter(c => !['RESOLVED', 'UNSUCCESSFUL', 'CLOSED'].includes(c.status));
  const closed = submitted.filter(c => ['RESOLVED', 'UNSUCCESSFUL', 'CLOSED'].includes(c.status));
  const action = list.filter(c => NEEDS_CUSTOMER.includes(c.status));

  return (
    <div className="space-y-6">
      {/* 1. Hero */}
      <section className="relative overflow-hidden rounded-[28px] bg-night text-white">
        <ServicePhoto service="fund" className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-r from-night via-night/90 to-night/40" />
        <div className="relative max-w-2xl p-7 sm:p-10">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-brand-bright">Funds Recovery Assistance</p>
          <h1 className="mt-3 font-display text-[32px] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-[44px]">
            Take the first step towards recovering your funds.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/75">
            Explore legitimate recovery options for disputed, misplaced, withheld and fraudulently obtained funds.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link to="/dashboard/fund-recovery/new" className="pill bg-white text-night" style={{ ['--pill-flood' as string]: '#d4b483' }}>
              <span className="pill-label"><span>Start Recovery Application</span><span aria-hidden>Start Recovery Application</span></span>
              <span className="pill-badge bg-night text-white"><ArrowRight size={18} /></span>
            </Link>
            {submitted.length > 0 && (
              <Link to="/dashboard/fund-recovery/applications" className="rounded-full px-4 py-3 text-sm font-medium text-white/80 hover:text-white">
                View my applications
              </Link>
            )}
          </div>
          <p className="mt-6 flex items-center gap-2 text-xs text-white/55"><ShieldCheck size={14} /> No guaranteed recovery. Every case is assessed individually.</p>
        </div>
      </section>

      {/* Overview for returning customers */}
      {list.length > 0 && (
        <section className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          <div className="grid grid-cols-3 gap-3 self-start">
            {[
              { label: 'Total applications', v: submitted.length },
              { label: 'In progress', v: review.length },
              { label: 'Closed', v: closed.length },
            ].map(s => (
              <div key={s.label} className="rounded-[20px] bg-white p-4">
                <p className="text-xs text-muted">{s.label}</p>
                <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{String(s.v).padStart(2, '0')}</p>
              </div>
            ))}
            {action.length > 0 && (
              <Link to="/dashboard/fund-recovery/applications" className="col-span-3 flex items-center gap-3 rounded-[20px] bg-orange-50 p-4 text-sm">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-orange-500 text-white"><FileSearch size={16} /></span>
                <span className="flex-1"><b>{action.length} application{action.length > 1 ? 's need' : ' needs'} your action</b><br /><span className="text-muted">Documents requested or a proposal to approve.</span></span>
                <ArrowRight size={16} />
              </Link>
            )}
          </div>
          <Panel>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">My applications</h2>
              <Link to="/dashboard/fund-recovery/applications" className="text-sm font-semibold text-brand hover:underline">See all</Link>
            </div>
            <ul className="divide-y divide-line">
              {list.slice(0, 4).map(c => (
                <li key={c.id}>
                  <Link to={c.status === 'DRAFT' ? `/dashboard/fund-recovery/apply/${c.id}` : `/dashboard/fund-recovery/applications/${c.id}`} className="flex items-start gap-3 py-3 hover:opacity-80">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-semibold">
                        {c.reference ?? 'Draft application'} <StatusBadge status={c.status} />
                      </p>
                      <p className="text-sm text-muted">{catName(c.category)} · Amount: {amountText(c.amountMinor, c.currency)}</p>
                      <p className="mt-0.5 truncate text-sm">
                        <span className="text-muted">Latest update: </span>
                        {c.status === 'DRAFT' ? 'Not submitted yet — continue where you left off.' : c.latestUpdate}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted">{fmtDate(c.updatedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </section>
      )}

      {/* 2. Categories */}
      <section>
        <h2 className="font-display text-2xl font-semibold tracking-tight">What kind of funds do you need help recovering?</h2>
        <p className="mt-1 text-sm text-muted">Select the category that best describes your situation.</p>
        <div className="stagger mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {RECOVERY_CATEGORIES.map((c, i) => {
            const Icon = CATEGORY_ICON[c.key];
            return (
              <Link
                key={c.key}
                to={`/dashboard/fund-recovery/new?category=${c.key}`}
                style={{ ['--i' as string]: i }}
                className="group flex flex-col rounded-[22px] bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-soft text-brand transition-colors group-hover:bg-night group-hover:text-white">
                  <Icon size={20} />
                </span>
                <p className="mt-4 font-display text-lg font-semibold">{c.name}</p>
                <p className="text-sm text-muted">{c.short}</p>
                <span className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-brand">
                  Start <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3. How it works */}
      <Panel>
        <h2 className="font-display text-2xl font-semibold tracking-tight">How it works</h2>
        <ol className="mt-5 grid gap-4 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative rounded-2xl bg-paper p-5">
              <span className="font-display text-4xl font-semibold text-night/15">{i + 1}</span>
              <p className="mt-2 font-semibold">{s.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{s.desc}</p>
            </li>
          ))}
        </ol>
      </Panel>

      {/* 4. Why use our platform */}
      <section className="relative overflow-hidden rounded-[28px] bg-night p-7 text-white sm:p-9">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Why use our platform</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass rounded-2xl p-5">
              <Icon size={20} className="text-brand-bright" />
              <p className="mt-3 font-semibold">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-white/65">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. FAQ */}
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

      {/* 6. Support */}
      <section className="flex flex-col items-start justify-between gap-5 rounded-[24px] bg-brand-soft p-6 sm:flex-row sm:items-center sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand text-white"><Headset size={22} /></span>
          <div>
            <h2 className="font-display text-xl font-semibold">Not sure which category fits?</h2>
            <p className="mt-1 max-w-lg text-sm text-night/70">
              Our support team can help you choose the right category and tell you which documents to prepare. You can also visit any of our branches.
            </p>
          </div>
        </div>
        <Link to="/dashboard/support" className="shrink-0 rounded-full bg-night px-5 py-3 text-sm font-semibold text-white">Contact support</Link>
      </section>

      {/* 7. Footer */}
      <footer className="rounded-[24px] bg-white p-6 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-x-5 gap-y-2 font-medium">
            <button onClick={() => setLegal('privacy')} className="hover:underline">Privacy policy</button>
            <button onClick={() => setLegal('terms')} className="hover:underline">Terms and conditions</button>
            <button onClick={() => setLegal('disclaimer')} className="hover:underline">Disclaimer</button>
            <Link to="/dashboard/support" className="hover:underline">Contact us</Link>
          </div>
          <p className="text-muted">Support chat available in your dashboard · Visit any branch</p>
        </div>
        <p className="mt-4 border-t border-line pt-4 text-xs leading-relaxed text-muted">{DISCLAIMER}</p>
      </footer>

      <LegalSheet open={legal !== null} kind={legal ?? 'terms'} onClose={() => setLegal(null)} />
    </div>
  );
}
