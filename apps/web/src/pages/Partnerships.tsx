import { Link } from 'react-router';
import { BrandMark } from '../components/AuthShell';
import { BANK_NAME } from '@kestrel/shared';
import {
  Landmark, Globe2, Cloud, ArrowLeftRight,
  ShieldCheck, Building2, ArrowRight, Handshake,
} from 'lucide-react';

const CATEGORIES = [
  {
    icon: Landmark,
    title: 'Banking & Financial Institutions',
    desc: 'Supporting secure transactions, banking services, and financial connectivity.',
    partners: ['SWIFT', 'Citibank', 'JPMorgan', 'Deutsche Bank'],
  },
  {
    icon: Globe2,
    title: 'Global Payment Networks',
    desc: 'Enabling convenient and reliable payment solutions for customers.',
    partners: ['Visa', 'Mastercard', 'PayPal', 'Stripe'],
  },
  {
    icon: Cloud,
    title: 'Technology & Cloud Infrastructure',
    desc: 'Supporting secure, efficient, and scalable banking operations.',
    partners: ['AWS', 'Microsoft Azure', 'Google Cloud', 'Cloudflare'],
  },
  {
    icon: ArrowLeftRight,
    title: 'International Money Transfer',
    desc: 'Facilitating cross-border money transfers and international financial connectivity.',
    partners: ['Western Union', 'Wise', 'MoneyGram', 'Remitly'],
  },
  {
    icon: ShieldCheck,
    title: 'Cybersecurity & Compliance',
    desc: 'Strengthening fraud prevention, data protection, and regulatory compliance.',
    partners: ['CrowdStrike', 'Palo Alto Networks', 'Chainalysis', 'Jumio'],
  },
  {
    icon: Building2,
    title: 'Corporate & Institutional Partners',
    desc: 'Building relationships that support businesses, organisations, and individuals.',
    partners: ['Bloomberg', 'Reuters', 'Deloitte', 'PwC'],
  },
];

const ALL_PARTNERS = CATEGORIES.flatMap(c => c.partners);

function Glow({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute rounded-full blur-3xl ${className}`}
      style={{ background: 'radial-gradient(circle, rgba(212,180,131,0.45) 0%, rgba(139,106,62,0.25) 40%, transparent 70%)' }}
    />
  );
}

function PartnerLogo({ name }: { name: string }) {
  return (
    <div className="grid h-16 place-items-center rounded-xl border border-line bg-white px-6 font-display text-sm font-semibold tracking-tight text-night/70 transition-colors hover:border-brand/30 hover:text-night">
      {name}
    </div>
  );
}

export function Partnerships() {
  return (
    <div className="min-h-screen bg-paper font-body text-night antialiased">
      {/* Header */}
      <div className="relative overflow-hidden bg-night px-5 pb-20 pt-5 sm:px-10 sm:pb-28">
        <Glow className="-right-40 -top-40 h-[620px] w-[620px]" />
        <Glow className="-bottom-60 -left-40 h-[480px] w-[480px] opacity-60" />

        <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between py-4 sm:py-5">
          <Link to="/"><BrandMark /></Link>
          <div className="flex items-center gap-2">
            <Link to="/login" className="btn-glass rounded-full px-5 py-2.5 font-display text-sm font-medium text-white/90 transition-colors hover:text-white">
              Sign in
            </Link>
            <Link
              to="/register"
              className="btn-glass-light hidden rounded-full bg-white px-5 py-2.5 font-display text-sm font-medium text-night transition-colors hover:bg-brand-bright sm:inline-block"
            >
              Open account
            </Link>
          </div>
        </header>

        <div className="relative z-10 mx-auto mt-16 max-w-3xl text-center sm:mt-20">
          <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-white/10 backdrop-blur-sm">
            <Handshake size={28} className="text-brand-bright" />
          </div>
          <h1 className="font-display text-[34px] font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-[56px]">
            Our Strategic<br /><span className="text-brand-bright">Partnerships</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/65 sm:text-lg">
            Connecting financial services through trusted collaboration
          </p>
        </div>
      </div>

      {/* Intro */}
      <section className="mx-auto max-w-4xl px-5 py-16 text-center sm:px-10 sm:py-24">
        <p className="text-lg leading-relaxed text-muted">
          We believe that strong partnerships are essential to delivering reliable, secure, and innovative
          financial services. Through strategic collaborations with financial institutions, technology providers,
          payment networks, and international service providers, we aim to strengthen our banking infrastructure
          and expand the services available to our customers.
        </p>
      </section>

      {/* Scrolling partner logos */}
      <section className="mb-16 overflow-hidden sm:mb-24">
        <div className="marquee-mask">
          <div className="marquee-track" style={{ ['--marquee-duration' as string]: '35s' }}>
            <div className="flex shrink-0 items-center gap-5 px-2.5">
              {ALL_PARTNERS.map(p => <PartnerLogo key={p} name={p} />)}
            </div>
            <div className="flex shrink-0 items-center gap-5 px-2.5" aria-hidden="true">
              {ALL_PARTNERS.map(p => <PartnerLogo key={p} name={p} />)}
            </div>
          </div>
        </div>
      </section>

      {/* Category grid */}
      <section className="mx-auto max-w-6xl px-5 pb-16 sm:px-10 sm:pb-24">
        <h2 className="mb-4 text-center font-display text-[22px] font-semibold tracking-[-0.02em] sm:text-[32px]">
          Our Collaboration Network
        </h2>
        <p className="mx-auto mb-12 max-w-xl text-center text-muted">
          Each category of partnership plays a vital role in the services we offer.
        </p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map(({ icon: Icon, title, desc, partners }) => (
            <div
              key={title}
              className="group relative overflow-hidden rounded-2xl border border-line bg-white p-7 transition-shadow hover:shadow-lg"
            >
              <div className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-brand-soft text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                <Icon size={22} />
              </div>
              <h3 className="font-display text-[15px] font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{desc}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {partners.map(p => (
                  <span key={p} className="rounded-full bg-paper px-3 py-1 text-xs font-medium text-night/60">{p}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Vision */}
      <section className="relative overflow-hidden bg-night px-5 py-16 text-white sm:px-10 sm:py-24">
        <Glow className="left-1/2 top-0 h-[520px] w-[820px] -translate-x-1/2 -translate-y-1/2 opacity-80" />
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <h2 className="font-display text-[24px] font-semibold leading-tight tracking-[-0.03em] sm:text-[40px]">
            Building Stronger Financial Connections
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/65 sm:text-lg">
            Our commitment to collaboration reflects our vision of creating a modern banking experience
            built on trust, innovation, accessibility, and operational excellence.
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/65 sm:text-lg">
            We continuously seek opportunities to establish meaningful partnerships that create value
            for our customers and contribute to the future of financial services.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-5">
            <Link
              to="/register"
              className="btn-glass-light inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-display text-sm font-medium text-night transition-colors hover:bg-brand-bright"
            >
              Open an account <ArrowRight size={16} />
            </Link>
            <Link to="/contact" className="btn-glass rounded-full px-5 py-2.5 font-display text-sm font-medium text-white/90 hover:text-white">
              Contact us
            </Link>
          </div>
        </div>
      </section>

      {/* Footer bar */}
      <footer className="mx-auto max-w-6xl px-5 py-8 text-center text-xs text-muted sm:px-10">
        <Link to="/" className="hover:text-night">&larr; Back to home</Link>
        <span className="mx-3">&middot;</span>
        <span>&copy; {new Date().getFullYear()} {BANK_NAME}. All rights reserved.</span>
      </footer>
    </div>
  );
}
