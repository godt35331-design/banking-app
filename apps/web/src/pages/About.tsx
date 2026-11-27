import { Link } from 'react-router';
import { StaticPageShell, Section } from '../components/StaticPageShell';
import { BANK_NAME } from '@kestrel/shared';
import { Users, Target, Eye, Award } from 'lucide-react';

const VALUES = [
  { icon: Users, title: 'People First', desc: 'Every decision starts with what matters most to our customers.' },
  { icon: Target, title: 'Precision', desc: 'We handle your money with the care and accuracy it deserves.' },
  { icon: Eye, title: 'Transparency', desc: 'No hidden fees, no fine print. What you see is what you get.' },
  { icon: Award, title: 'Excellence', desc: 'We hold ourselves to the highest standards in everything we do.' },
];

export function About() {
  return (
    <StaticPageShell
      title={<>About <span className="text-brand-bright">{BANK_NAME}</span></>}
      subtitle="Modern banking built on decades of trust."
    >
      <Section title="Who We Are">
        <p>
          {BANK_NAME} is a forward-thinking financial institution committed to making banking accessible,
          secure, and straightforward. We combine the reliability of traditional banking with modern
          technology to deliver an experience that fits your life.
        </p>
        <p>
          From everyday transactions to complex financial services, we provide the tools and support
          you need to manage your money with confidence — whether you visit us at a branch or bank
          entirely online.
        </p>
      </Section>

      <Section title="Our Mission">
        <p>
          To empower individuals and businesses with reliable, innovative financial services that are
          transparent, accessible, and built on trust. We exist to make banking work for you, not the
          other way around.
        </p>
      </Section>

      <div className="mb-12 grid gap-4 sm:grid-cols-2">
        {VALUES.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-2xl border border-line bg-white p-6">
            <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand">
              <Icon size={20} />
            </div>
            <h3 className="font-display text-sm font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted">{desc}</p>
          </div>
        ))}
      </div>

      <Section title="What We Offer">
        <p>
          Multi-currency wallets in USD, EUR and GBP. Virtual and physical cards. Domestic and
          international transfers. Currency exchange at competitive rates. Personal and business loans.
          Tax recovery assistance. Fund recovery services. And a dedicated support team that is always
          a message away.
        </p>
      </Section>

      <Section title="Our Commitment">
        <p>
          Security is not an afterthought — it is the foundation of everything we build. Your funds are
          protected, your data is encrypted, and every transaction above $3,000 is manually reviewed by
          our team before it clears.
        </p>
        <p>
          We are proud of our <Link to="/partnerships" className="text-brand underline hover:text-brand/80">strategic partnerships</Link> with
          leading institutions in banking, payments, technology, and cybersecurity, all working together
          to deliver the best possible experience for you.
        </p>
      </Section>
    </StaticPageShell>
  );
}
