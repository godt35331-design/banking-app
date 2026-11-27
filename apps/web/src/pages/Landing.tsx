import { Link } from 'react-router';
import { BrandMark } from '../components/AuthShell';
import type { ReactNode } from 'react';
import {
  Globe2, Clock, Lock, Snowflake, Eye, Trash2,
  ArrowRight, ArrowDownUp, UserCheck, Wallet,
  KeyRound, Timer, Headphones, CheckCircle2, Send,
} from 'lucide-react';
import { BANK_NAME } from '@kestrel/shared';
import { CountUp, Eyebrow, Marquee, PillLink, Reveal } from '../components/landing/motion';
import { CardStack, KestrelCard, PhoneHome, ReceivedToast, StatusSteps } from '../components/landing/mocks';
import { SERVICE_PHOTOS, ServicePhoto, type ServiceKey } from '../components/ServicePhoto';
import { Flag } from '../components/Flag';

/* Figures below mirror DEFAULT_SETTINGS in @kestrel/shared so the page matches the app. */

const NAV = [
  { href: '#why', label: 'Why us' },
  { href: '#move-money', label: 'Payments' },
  { href: '#services', label: 'Services' },
  { href: '#security', label: 'Security' },
];

export function Landing() {
  return (
    <div className="min-h-screen bg-paper font-body text-night antialiased">
      <div className="flex flex-col">
        <Hero />
        <TrustStrip />
        <WhyUs />
        <MoveMoney />
        <TextMarquee />
        <VirtualCards />
        <Services />
        <Tracking />
        <Security />
        <PartnerLogos />
        <HowItWorks />
        <Footer />
      </div>
    </div>
  );
}

/* ---------- Shared bits ---------- */

function Logo({ dark = true }: { dark?: boolean }) {
  return <BrandMark dark={dark} />;
}

function Glow({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute rounded-full blur-3xl ${className}`}
      style={{ background: 'radial-gradient(circle, rgba(212,180,131,0.45) 0%, rgba(139,106,62,0.25) 40%, transparent 70%)' }}
    />
  );
}

function SectionHead({
  eyebrow, title, desc, dark = false, center = true,
}: { eyebrow: string; title: ReactNode; desc?: string; dark?: boolean; center?: boolean }) {
  return (
    <div className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-xl'}>
      <Reveal><Eyebrow dark={dark}>{eyebrow}</Eyebrow></Reveal>
      <Reveal delay={80}>
        <h2 className={`mt-5 font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[44px] ${dark ? 'text-white' : 'text-night'}`}>
          {title}
        </h2>
      </Reveal>
      {desc && (
        <Reveal delay={160}>
          <p className={`mt-4 text-base leading-relaxed ${dark ? 'text-white/65' : 'text-muted'}`}>{desc}</p>
        </Reveal>
      )}
    </div>
  );
}

function IconTile({ icon: Icon, dark = false }: { icon: typeof Lock; dark?: boolean }) {
  return (
    <span className={`grid h-14 w-14 place-items-center rounded-2xl ${dark ? 'bg-white/10 text-brand-bright' : 'bg-brand-soft text-brand'}`}>
      <Icon size={24} />
    </span>
  );
}

function Panel({ children, id, className = '' }: { children: ReactNode; id?: string; className?: string }) {
  return (
    <section id={id} className={`relative scroll-mt-5 overflow-hidden px-5 py-16 sm:px-10 sm:py-24 ${className}`}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

/* ---------- 1. Hero ---------- */

function Hero() {
  return (
    <section className="relative overflow-hidden bg-night px-5 pb-14 pt-5 sm:px-10 sm:pb-20">
      <Glow className="-right-40 -top-40 h-[620px] w-[620px]" />
      <Glow className="-bottom-60 -left-40 h-[480px] w-[480px] opacity-60" />

      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between py-4 sm:py-5">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map(n => (
            <a key={n.href} href={n.href} className="font-display text-sm text-white/70 transition-colors hover:text-white">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
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

      <div className="relative z-10 mx-auto mt-14 grid max-w-6xl items-center gap-10 sm:mt-20 lg:grid-cols-2 lg:gap-6">
        <div>
          <Reveal delay={80}>
            <h1 className="font-display text-[40px] font-bold leading-[1.02] tracking-[-0.04em] text-white sm:text-[68px]">
              The bank you trust,<br />
              <span className="text-brand-bright">now wherever you are.</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-6 max-w-lg text-lg font-medium leading-relaxed text-white/60 sm:text-xl">
              Open an account in minutes. Manage USD, EUR and GBP from any device.
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-9 flex flex-wrap items-center gap-5">
              <PillLink to="/register">Open an account</PillLink>
              <Link to="/login" className="btn-glass group inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-display text-sm font-medium text-white/90 hover:text-white">
                I already bank here
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>
          <Reveal delay={320}>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/55">
              <span className="inline-flex items-center gap-2"><KeyRound size={15} className="text-brand-bright" /> PIN-protected sign in</span>
            </div>
          </Reveal>
        </div>

        <Reveal variant="scale" delay={200} className="relative">
          <CardStack />
          <ReceivedToast glass className="absolute -bottom-2 right-0 z-10 sm:bottom-4 sm:right-4" />
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- 2. Trust strip ---------- */

function TrustStrip() {
  const items = [
    { icon: Lock, text: 'AES-256 encryption' },
    { icon: Globe2, text: 'USD · EUR · GBP wallets' },
    { icon: KeyRound, text: 'PIN-protected login' },
    { icon: Send, text: 'Free local transfers' },
    { icon: UserCheck, text: 'Large transfers reviewed by our team' },
    { icon: Headphones, text: 'Support from real people' },
    { icon: Timer, text: 'Auto sign-out when idle' },
  ];
  return (
    <section className="bg-white py-6">
      <Marquee duration={35}>
        {items.map(({ icon: Icon, text }) => (
          <span key={text} className="mx-8 inline-flex items-center gap-3 font-display text-base font-medium text-night/70 sm:text-lg">
            <Icon size={20} className="text-brand" />
            {text}
          </span>
        ))}
      </Marquee>
    </section>
  );
}

/* ---------- 3. Why us ---------- */

function WhyUs() {
  const stats = [
    { value: 3, suffix: '', label: 'currencies in one account' },
    { value: 5, suffix: ' min', label: 'to open an account' },
    { value: 24, suffix: '/7', label: 'access to your money' },
    { value: 0, prefix: '$', suffix: '', label: 'fee on local transfers' },
  ];
  return (
    <Panel id="why" className="bg-white">
      <div className="grid items-center gap-14 lg:grid-cols-2">
        <Reveal variant="scale">
          <div className="relative overflow-hidden rounded-[28px] bg-brand-soft px-6 py-12">
            <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-brand-bright/30 blur-2xl drift" />
            <div className="relative"><PhoneHome /></div>
          </div>
        </Reveal>
        <div>
          <SectionHead
            center={false}
            eyebrow="Why bank online"
            title="Same bank. Same people. No queue."
            desc="You've trusted us at the counter. Now you can check balances, move money and apply for services from home — and still talk to our team whenever you need to."
          />
          <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8">
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={i * 80}>
                <div className="border-t border-night/10 pt-5">
                  <div className="font-display text-[40px] font-semibold leading-none tracking-[-0.04em] sm:text-[52px]">
                    <CountUp value={s.value} prefix={s.prefix} suffix={s.suffix} />
                  </div>
                  <div className="mt-2 text-sm text-muted">{s.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* ---------- 4. Move money ---------- */

function BentoCard({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <Reveal delay={delay} className={className}>
      <div className="relative h-full overflow-hidden rounded-[24px] bg-white p-6 shadow-[0_20px_50px_-30px_rgba(8,19,15,0.25)] sm:p-8">
        {children}
      </div>
    </Reveal>
  );
}

function CardTitle({ title, desc }: { title: string; desc: string }) {
  return (
    <>
      <h3 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{desc}</p>
    </>
  );
}

function Row({ k, v, strong = false }: { k: string; v: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-muted">{k}</span>
      <span className={strong ? 'font-display font-semibold text-night' : 'text-night'}>{v}</span>
    </div>
  );
}

function MoveMoney() {
  return (
    <Panel id="move-money" className="bg-paper !py-14 sm:!py-20">
      <SectionHead
        eyebrow="Payments"
        title={<>Send, receive and swap —<br className="hidden sm:block" /> without visiting a branch.</>}
        desc="Every payment you used to make at the counter, now from your phone, with the fee shown before you confirm."
      />

      <div className="mt-14 grid gap-4 sm:gap-5 lg:grid-cols-3">
        <BentoCard className="lg:col-span-2">
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <CardTitle title="Local transfers" desc="Send to any local account for free. The money leaves your wallet straight away and you get a receipt." />
              <ReceivedToast className="mt-8 hidden w-fit sm:flex" />
            </div>
            <div>
              <div className="rounded-2xl bg-paper p-4">
                <Row k="To" v="Ama Mensah · •••• 2290" />
                <Row k="Amount" v="$250.00" strong />
                <Row k="Fee" v={<span className="text-brand">Free</span>} />
                <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-night py-2.5 font-display text-sm text-white">
                  <CheckCircle2 size={16} className="text-brand-bright" /> Sent
                </div>
              </div>
            </div>
          </div>
        </BentoCard>

        <BentoCard delay={80}>
          <CardTitle title="International" desc="Send abroad for 1.5% (minimum $5). The total is shown before you confirm." />
          <div className="mt-6 rounded-2xl bg-paper p-4">
            <Row k="You send" v="$500.00" strong />
            <Row k="Fee (1.5%)" v="$7.50" />
            <div className="my-1 border-t border-dashed border-night/15" />
            <Row k="Total" v="$507.50" strong />
          </div>
        </BentoCard>

        <BentoCard delay={0}>
          <CardTitle title="Receive money" desc="Get paid from anywhere in the world." />
          <div className="mt-6 space-y-2.5">
            {([
              { photo: 'bank', name: 'Bank transfer', desc: 'Receive from any bank account', note: 'Instant' },
              { photo: 'fund', name: 'Wire transfer', desc: 'International incoming wires', note: '1–2 days' },
              { photo: 'tax', name: 'Internal transfer', desc: 'Between your own wallets', note: 'Instant' },
            ] as const).map(({ photo, name, desc, note }) => (
              <div key={name} className="group flex items-center gap-3 rounded-2xl bg-paper p-2 pr-4">
                <span className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl">
                  <ServicePhoto service={photo} className="h-full w-full transition-transform duration-500 group-hover:scale-110" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{name}</span>
                  <span className="block truncate text-xs text-muted">{desc}</span>
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${note === 'Instant' ? 'bg-brand-soft text-brand' : 'bg-amber-50 text-warn'}`}>
                  {note}
                </span>
              </div>
            ))}
          </div>
        </BentoCard>

        <BentoCard className="lg:col-span-2" delay={80}>
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              <CardTitle title="Currency swap" desc="Move money between your USD, EUR and GBP wallets in seconds. You see the rate before you swap." />
              <div className="mt-6 flex -space-x-2">
                {['USD', 'EUR', 'GBP'].map(c => <Flag key={c} code={c} size={36} className="ring-2 ring-white" />)}
              </div>
            </div>
            <div className="rounded-2xl bg-paper p-4">
              <div className="rounded-xl bg-white p-4">
                <div className="text-xs text-muted">From</div>
                <div className="mt-1 flex items-center justify-between font-display text-2xl font-semibold">
                  1,000.00 <span className="inline-flex items-center gap-1.5 rounded-full bg-paper py-1 pl-1 pr-3 text-sm"><Flag code="USD" /> USD</span>
                </div>
              </div>
              <div className="relative z-10 mx-auto -my-3 grid h-9 w-9 place-items-center rounded-full bg-brand text-white ring-4 ring-paper">
                <ArrowDownUp size={16} />
              </div>
              <div className="rounded-xl bg-white p-4">
                <div className="text-xs text-muted">To</div>
                <div className="mt-1 flex items-center justify-between font-display text-2xl font-semibold">
                  915.40 <span className="inline-flex items-center gap-1.5 rounded-full bg-paper py-1 pl-1 pr-3 text-sm"><Flag code="EUR" /> EUR</span>
                </div>
              </div>
              <div className="mt-3 text-center text-xs text-muted">1 USD = 0.9154 EUR · includes 0.5% margin</div>
            </div>
          </div>
        </BentoCard>
      </div>
    </Panel>
  );
}

/* ---------- 5. Text marquee ---------- */

function TextMarquee() {
  const words = ['Bank smarter', 'Save faster', 'Send anywhere', 'Skip the queue'];
  return (
    <section className="py-4 sm:py-8">
      <Marquee duration={40}>
        {words.map(w => (
          <span key={w} className="flex items-center font-display text-[56px] font-semibold tracking-[-0.04em] text-night sm:text-[120px]">
            <span className="px-6 sm:px-10">{w}</span>
            <span className="text-brand">✦</span>
          </span>
        ))}
      </Marquee>
    </section>
  );
}

/* ---------- 6. Virtual cards ---------- */

function Toggle({ on }: { on: boolean }) {
  return (
    <span className={`relative inline-block h-6 w-11 rounded-full transition-colors ${on ? 'bg-brand' : 'bg-white/25'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </span>
  );
}

function VirtualCards() {
  const points = [
    { icon: CheckCircle2, text: 'Create a card in seconds and use it straight away' },
    { icon: Snowflake, text: 'Freeze and unfreeze it whenever you like' },
    { icon: Wallet, text: 'Up to 5 cards — one for bills, one for shopping, one for travel' },
    { icon: Lock, text: 'Card numbers and CVVs are stored encrypted' },
  ];
  return (
    <Panel id="cards" className="bg-white">
      <div className="grid items-center gap-14 lg:grid-cols-2">
        <div>
          <SectionHead
            center={false}
            eyebrow="Virtual cards"
            title="A card for every purpose. Ready in seconds."
            desc="No waiting for a card in the post. Create a virtual card from your dashboard and control it yourself."
          />
          <ul className="mt-8 space-y-4">
            {points.map(({ icon: Icon, text }, i) => (
              <Reveal key={text} delay={i * 80}>
                <li className="flex items-start gap-3">
                  <Icon size={20} className="mt-0.5 shrink-0 text-brand" />
                  <span className="text-night/80">{text}</span>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>

        <Reveal variant="scale">
          <div className="relative overflow-hidden rounded-[28px] bg-night px-5 pb-8 pt-12 sm:px-10 sm:pb-10 sm:pt-16">
            <Glow className="-right-24 -top-24 h-[420px] w-[420px]" />
            <Glow className="-bottom-32 -left-24 h-[360px] w-[360px] opacity-60" />
            <div className="relative mx-auto max-w-[440px]">
              {/* second card peeking behind */}
              <div className="absolute inset-x-0 top-0 translate-x-[8%] -translate-y-[10%] rotate-[6deg] opacity-90">
                <KestrelCard skin={2} />
              </div>
              <div className="relative -rotate-[3deg] transition-transform duration-500 hover:rotate-0 hover:scale-[1.02]">
                <KestrelCard skin={0} />
              </div>

              {/* frosted controls panel overlapping the card */}
              <div className="glass-strong relative z-10 -mt-10 ml-auto w-[92%] rounded-2xl px-4 text-white sm:-mt-14">
                <div className="flex items-center justify-between border-b border-white/10 py-3.5 text-sm">
                  <span className="flex items-center gap-3"><Snowflake size={17} className="text-brand-bright" /> Freeze card</span>
                  <Toggle on={false} />
                </div>
                <div className="flex items-center justify-between border-b border-white/10 py-3.5 text-sm">
                  <span className="flex items-center gap-3"><Eye size={17} className="text-brand-bright" /> Show card details</span>
                  <ArrowRight size={16} className="text-white/50" />
                </div>
                <div className="flex items-center justify-between py-3.5 text-sm">
                  <span className="flex items-center gap-3"><Trash2 size={17} className="text-red-300" /> Remove card</span>
                  <ArrowRight size={16} className="text-white/50" />
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </Panel>
  );
}

/* ---------- 7. Services (dark) ---------- */

/** Photo across the top of a service card. */
function PhotoHeader({ service }: { service: ServiceKey }) {
  return (
    <div className="relative -mx-6 -mt-6 sm:-mx-8 sm:-mt-8">
      <div className="relative h-52 overflow-hidden">
        <ServicePhoto service={service} className="h-full w-full transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-night via-night/20 to-transparent" />
      </div>
    </div>
  );
}

function Services() {
  return (
    <Panel id="services" className="bg-night">
      <Glow className="-left-40 top-20 h-[520px] w-[520px] opacity-70" />
      <Glow className="-right-32 bottom-0 h-[420px] w-[420px] opacity-50" />
      {[...Array(14)].map((_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="drift absolute h-1 w-1 rounded-full bg-brand-bright/50"
          style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%`, animationDelay: `${i * -0.7}s` }}
        />
      ))}

      <div className="relative">
        <SectionHead
          dark
          eyebrow="Services"
          title="Services that used to need an appointment."
          desc="Apply for a loan, claim back overpaid tax, or report a payment that went wrong — then follow every step online."
        />

        <div className="mt-14 grid gap-4 sm:gap-5 lg:grid-cols-3">
          <Reveal>
            <div className="glass group h-full overflow-hidden rounded-[24px] p-6 sm:p-8">
              <PhotoHeader service="loans" />
              <h3 className="mt-6 font-display text-2xl font-semibold tracking-tight text-white">Loans</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">Personal, business, education, vehicle, home and short-term loans. Apply online and follow every step.</p>
              <div className="mt-6 rounded-2xl bg-white/5 p-4">
                <div className="flex justify-between text-sm text-white/60"><span>$10,000 · 24 months</span><span>8.5% APR</span></div>
                <div className="mt-3 font-display text-3xl font-semibold tracking-tight text-white">
                  $454.56<span className="text-base font-normal text-white/50"> /month</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {['Personal 8.5%', 'Business 6%', 'Mortgage 4.5%', 'Auto 5.5%'].map(p => (
                    <span key={p} className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/75">{p}</span>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="glass group h-full overflow-hidden rounded-[24px] p-6 sm:p-8">
              <PhotoHeader service="tax" />
              <h3 className="mt-6 font-display text-2xl font-semibold tracking-tight text-white">Tax Recovery</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">Paid too much tax? Send us your claim and documents, and we'll handle it with the authorities.</p>
              <div className="mt-6 rounded-2xl bg-white/5 p-4">
                <div className="mb-4 flex justify-between text-sm">
                  <span className="text-white/60">Tax year 2025</span>
                  <span className="font-display font-semibold text-white">$1,840.00</span>
                </div>
                <StatusSteps dark steps={['Submitted', 'Under review', 'Approved', 'Paid to your wallet']} current={1} />
              </div>
            </div>
          </Reveal>

          <Reveal delay={160}>
            <div className="glass group h-full overflow-hidden rounded-[24px] p-6 sm:p-8">
              <PhotoHeader service="fund" />
              <h3 className="mt-6 font-display text-2xl font-semibold tracking-tight text-white">Fund Recovery</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">Report fraud, a payment you didn't make, or a failed transfer. Our team investigates and gets your money back.</p>
              <div className="mt-6 rounded-2xl bg-white/5 p-4">
                <div className="mb-4 flex justify-between text-sm">
                  <span className="text-white/60">Unauthorized payment</span>
                  <span className="font-display font-semibold text-white">$320.00</span>
                </div>
                <StatusSteps dark steps={['Reported', 'Investigating', 'Refunded']} current={1} />
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={200}>
          <div className="mt-12 flex justify-center">
            <PillLink to="/register" tone="light">Explore our services</PillLink>
          </div>
        </Reveal>
      </div>
    </Panel>
  );
}

/* ---------- 8. Transaction tracking ---------- */

function Tracking() {
  return (
    <Panel className="bg-paper">
      <div className="grid items-center gap-14 lg:grid-cols-2">
        <Reveal variant="scale" className="order-2 lg:order-1">
          <div className="relative mx-auto max-w-[400px]">
            <div className="absolute -inset-6 -z-0 rounded-[36px] bg-brand-soft" />
            <div className="relative rounded-[24px] bg-white p-6 shadow-[0_30px_60px_-30px_rgba(8,19,15,0.35)] sm:p-8">
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-semibold">Transfer receipt</span>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-warn">Awaiting approval</span>
              </div>
              <div className="mt-6 font-display text-[40px] font-semibold leading-none tracking-[-0.04em]">$3,500.00</div>
              <div className="mt-2 text-sm text-muted">to Kwame Asante Ltd · local transfer</div>

              {/* ticket notches */}
              <div className="relative -mx-6 my-6 sm:-mx-8">
                <span className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-brand-soft" />
                <span className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-brand-soft" />
                <div className="mx-6 border-t-2 border-dashed border-night/10" />
              </div>

              <StatusSteps steps={['Submitted', 'Reviewed by our team', 'Completed']} current={1} />
              <div className="mt-6 flex justify-between text-xs text-muted">
                <span>Ref. KST-24F9-8812</span>
                <span>Today, 10:42</span>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="order-1 lg:order-2">
          <SectionHead
            center={false}
            eyebrow="Tracking"
            title="Know where every payment is."
            desc="Every transfer and claim has a live status and a receipt. Transfers of $3,000 or more are checked by a member of our team before they're released — the same care you get at the branch."
          />
          <Reveal delay={240}>
            <div className="mt-8 flex flex-wrap gap-3">
              {['Pending', 'Awaiting approval', 'Completed'].map((s, i) => (
                <span key={s} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm">
                  <span className={`h-2 w-2 rounded-full ${['bg-night/30', 'bg-amber-400', 'bg-brand'][i]}`} />
                  {s}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </Panel>
  );
}

/* ---------- 9. Security & control ---------- */

function Security() {
  const small = [
    { icon: Globe2, title: 'Multi-currency wallets', desc: 'Hold USD, EUR and GBP side by side. Your total is always shown in one currency.',
      extra: (
        <div className="mt-5 flex gap-2">
          {['USD', 'EUR', 'GBP'].map(c => (
            <span key={c} className="inline-flex items-center gap-1.5 rounded-full bg-white py-1 pl-1 pr-3 text-xs font-medium"><Flag code={c} size={22} /> {c}</span>
          ))}
        </div>
      ) },
    { icon: Snowflake, title: 'Card controls', desc: 'Lost your phone or saw something odd? Freeze a card in one tap and unfreeze it later.' },
    { icon: UserCheck, title: 'Human approvals', desc: 'Large transfers are reviewed by our staff before the money moves.' },
    { icon: Clock, title: 'Auto sign-out', desc: "Walk away and we'll sign you out after 10 minutes of inactivity." },
  ];
  return (
    <Panel id="security" className="bg-white">
      <SectionHead
        eyebrow="Security & control"
        title="Your money stays protected."
        desc="The same safeguards as the counter, plus a few that only work online."
      />
      <div className="mt-14 grid gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
        <Reveal className="md:col-span-2 lg:col-span-1 lg:row-span-2">
          <div className="relative h-full overflow-hidden rounded-[24px] bg-night p-6 text-white sm:p-8">
            <Glow className="-bottom-32 -right-32 h-80 w-80" />
            <div className="relative">
              <IconTile icon={KeyRound} dark />
              <h3 className="mt-6 font-display text-2xl font-semibold tracking-tight">Password + secret PIN</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                Signing in needs your password and a PIN only you know. After 5 wrong PIN attempts, the account locks.
              </p>
              <div className="mt-8 rounded-2xl bg-white/5 p-5">
                <div className="text-center text-sm text-white/60">Enter your PIN</div>
                <div className="mt-4 flex justify-center gap-3">
                  {[1, 1, 1, 0].map((f, i) => (
                    <span key={i} className={`h-4 w-4 rounded-full ${f ? 'bg-brand-bright' : 'border-2 border-white/30'}`} />
                  ))}
                </div>
                <div className="mt-6 grid grid-cols-3 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(k => (
                    <span key={k} className="rounded-xl bg-white/5 py-2.5 text-center font-display text-white/80">{k}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
        {small.map(({ icon, title, desc, extra }, i) => (
          <Reveal key={title} delay={(i % 2) * 80}>
            <div className="h-full rounded-[24px] bg-paper p-6 sm:p-8">
              <IconTile icon={icon} />
              <h3 className="mt-6 font-display text-xl font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{desc}</p>
              {extra}
            </div>
          </Reveal>
        ))}
      </div>
    </Panel>
  );
}

/* ---------- 10. Partner logos ---------- */

const PARTNERS = [
  'SWIFT', 'Visa', 'Mastercard', 'PayPal', 'Stripe',
  'Western Union', 'Wise', 'MoneyGram',
  'AWS', 'Microsoft Azure', 'Cloudflare',
  'CrowdStrike', 'Deloitte', 'PwC',
];

function PartnerLogos() {
  return (
    <Panel id="partners" className="overflow-hidden py-16 sm:py-20">
      <SectionHead
        eyebrow="Partnerships"
        title={<>Trusted by leading<br className="hidden sm:block" /> financial partners.</>}
        desc="We collaborate with world-class institutions to deliver secure, reliable banking."
      />
      <div className="mt-14 space-y-5">
        {/* Row 1 — scrolls left */}
        <div className="marquee-mask">
          <div className="marquee-track" style={{ ['--marquee-duration' as string]: '40s' }}>
            {[0, 1].map(i => (
              <div key={i} className="flex shrink-0 items-center gap-5 px-2.5" aria-hidden={i === 1 || undefined}>
                {PARTNERS.map(p => (
                  <div key={p} className="grid h-14 place-items-center rounded-xl border border-line bg-white px-7 font-display text-sm font-semibold tracking-tight text-night/60 transition-colors hover:border-brand/30 hover:text-night">
                    {p}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        {/* Row 2 — scrolls right (reverse) */}
        <div className="marquee-mask">
          <div className="marquee-track-reverse" style={{ ['--marquee-duration' as string]: '45s' }}>
            {[0, 1].map(i => (
              <div key={i} className="flex shrink-0 items-center gap-5 px-2.5" aria-hidden={i === 1 || undefined}>
                {[...PARTNERS].reverse().map(p => (
                  <div key={p} className="grid h-14 place-items-center rounded-xl border border-line bg-white px-7 font-display text-sm font-semibold tracking-tight text-night/60 transition-colors hover:border-brand/30 hover:text-night">
                    {p}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <Reveal delay={200}>
        <div className="mt-10 text-center">
          <Link to="/partnerships" className="inline-flex items-center gap-2 font-display text-sm font-medium text-brand hover:underline">
            View all partnerships <ArrowRight size={15} />
          </Link>
        </div>
      </Reveal>
    </Panel>
  );
}

/* ---------- 11. How it works ---------- */

function HowItWorks() {
  const steps = [
    { n: '01', title: 'Open your account', desc: 'Enter your name, email, a password and a secret PIN. It takes about five minutes, and your first wallet is ready straight away.' },
    { n: '02', title: 'Add money', desc: 'Fund your account by bank transfer or move funds across from your existing branch account.' },
    { n: '03', title: 'Bank from anywhere', desc: 'Send, swap, create cards and apply for services from any device. Our support team is a message away.' },
  ];
  return (
    <Panel className="bg-paper">
      <SectionHead eyebrow="How it works" title="Up and running in three steps." />
      <div className="mt-14 grid gap-4 sm:gap-5 md:grid-cols-3">
        {steps.map((s, i) => (
          <Reveal key={s.n} delay={i * 80}>
            <div className="group h-full rounded-[24px] bg-white p-6 transition-shadow hover:shadow-[0_30px_60px_-30px_rgba(8,19,15,0.3)] sm:p-8">
              <div className="font-display text-[56px] font-semibold leading-none tracking-[-0.05em] text-brand/20 transition-colors group-hover:text-brand">
                {s.n}
              </div>
              <h3 className="mt-6 font-display text-xl font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.desc}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Panel>
  );
}

/* ---------- 11. Footer ---------- */

function Footer() {
  const cols = [
    { title: 'Banking', links: [['Payments', '#move-money'], ['Virtual cards', '#cards'], ['Currency swap', '#move-money'], ['Security', '#security']] },
    { title: 'Services', links: [['Loans', '#services'], ['Tax recovery', '#services'], ['Fund recovery', '#services']] },
    { title: 'Company', links: [['About us', '/about'], ['Partnerships', '/partnerships'], ['Careers', '/careers'], ['Contact', '/contact']] },
    { title: 'Account', links: [['Open an account', '/register'], ['Sign in', '/login']] },
  ];
  return (
    <footer className="relative overflow-hidden bg-night px-5 pb-8 pt-16 text-white sm:px-10 sm:pt-24">
      <Glow className="left-1/2 top-0 h-[520px] w-[820px] -translate-x-1/2 -translate-y-1/2 opacity-80" />
      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <h2 className="font-display text-[34px] font-semibold leading-[1.05] tracking-[-0.04em] sm:text-[60px]">
              Your branch,<br /><span className="text-brand-bright">now in your pocket.</span>
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <p className="mt-5 text-white/60">Open an account online in minutes. Your nearest branch is still here when you want it.</p>
          </Reveal>
          <Reveal delay={160}>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-5">
              <PillLink to="/register" tone="light">Open an account</PillLink>
              <Link to="/login" className="btn-glass rounded-full px-5 py-2.5 font-display text-sm font-medium text-white/90 hover:text-white">Sign in</Link>
            </div>
          </Reveal>
        </div>

        <div className="mt-20 grid gap-10 border-t border-white/10 pt-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/50">
              Everyday banking, payments and financial services — at the branch and online.
            </p>
          </div>
          {cols.map(c => (
            <div key={c.title}>
              <div className="font-display text-sm font-semibold">{c.title}</div>
              <ul className="mt-4 space-y-3">
                {c.links.map(([label, href]) => (
                  <li key={label}>
                    {href.startsWith('/')
                      ? <Link to={href} className="text-sm text-white/55 hover:text-white">{label}</Link>
                      : <a href={href} className="text-sm text-white/55 hover:text-white">{label}</a>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-white/40">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <a href="/privacy" className="hover:text-white">Privacy Policy</a>
            <span className="hidden sm:inline text-white/20">·</span>
            <a href="/terms" className="hover:text-white">Terms of Service</a>
            <span className="hidden sm:inline text-white/20">·</span>
            <a href="/cookies" className="hover:text-white">Cookie Policy</a>
            <span className="hidden sm:inline text-white/20">·</span>
            <a href="/accessibility" className="hover:text-white">Accessibility</a>
            <span className="hidden sm:inline text-white/20">·</span>
            <a href="/complaints" className="hover:text-white">Complaints</a>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>&copy; {new Date().getFullYear()} {BANK_NAME}. All rights reserved.</span>
            <span className="inline-flex items-center gap-2 text-emerald-300/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
              Secure environment — your funds and cards are protected.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
