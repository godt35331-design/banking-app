import { StaticPageShell, Section } from '../components/StaticPageShell';
import { BANK_NAME } from '@kestrel/shared';
import { Briefcase, Heart, TrendingUp, Globe2 } from 'lucide-react';

const PERKS = [
  { icon: Heart, title: 'Health & Wellbeing', desc: 'Comprehensive health insurance, mental health support, and wellness programmes.' },
  { icon: TrendingUp, title: 'Growth', desc: 'Learning budgets, mentorship programmes, and clear career progression paths.' },
  { icon: Globe2, title: 'Flexibility', desc: 'Hybrid and remote options available. We trust you to do your best work from wherever suits you.' },
  { icon: Briefcase, title: 'Competitive Pay', desc: 'Market-leading salaries, performance bonuses, and equity participation for senior roles.' },
];

export function Careers() {
  return (
    <StaticPageShell
      title={<>Work at <span className="text-brand-bright">{BANK_NAME}</span></>}
      subtitle="Join a team that's shaping the future of banking."
    >
      <Section title="Why Join Us">
        <p>
          We are building a modern financial institution from the ground up — one that combines the trust
          and reliability of traditional banking with the speed and innovation of technology. If you are
          passionate about making financial services better for everyone, we would love to hear from you.
        </p>
      </Section>

      <div className="mb-12 grid gap-4 sm:grid-cols-2">
        {PERKS.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-2xl border border-line bg-white p-6">
            <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand">
              <Icon size={20} />
            </div>
            <h3 className="font-display text-sm font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted">{desc}</p>
          </div>
        ))}
      </div>

      <Section title="Open Positions">
        <p>
          We are always looking for talented individuals across engineering, product, compliance, customer
          support, and operations. Even if you do not see a role that fits, we encourage you to reach out —
          we are growing fast and new positions open regularly.
        </p>
        <p>
          To express interest or submit your CV, please email <strong>careers@sterlingcrestbank.com</strong> with
          the role you are interested in and a brief introduction.
        </p>
      </Section>

      <Section title="Our Culture">
        <p>
          We value clarity over complexity, ownership over hierarchy, and impact over hours. Our teams are
          small, focused, and empowered to make decisions. We celebrate diverse backgrounds and perspectives
          because they make us stronger.
        </p>
      </Section>
    </StaticPageShell>
  );
}
