import { StaticPageShell, Section } from '../components/StaticPageShell';
import { BANK_NAME } from '@kestrel/shared';
import { Mail, Phone, MapPin, Clock, MessageSquare } from 'lucide-react';
import { Link } from 'react-router';

const CHANNELS = [
  { icon: MessageSquare, title: 'Live Chat', desc: 'Sign in to your account and use the chat support button for instant help.', action: 'Sign in', href: '/login' },
  { icon: Mail, title: 'Email', desc: 'support@sterlingcrestbank.com — we respond within 24 hours on business days.', action: null, href: null },
  { icon: Phone, title: 'Phone', desc: '+1 (800) 555-0199 — available Monday to Friday, 8 AM – 6 PM EST.', action: null, href: null },
  { icon: MapPin, title: 'Visit a Branch', desc: 'Walk into any of our branches for in-person assistance with your banking needs.', action: null, href: null },
];

export function Contact() {
  return (
    <StaticPageShell
      title="Contact Us"
      subtitle="We're here to help. Reach out through any of the channels below."
    >
      <div className="mb-14 grid gap-4 sm:grid-cols-2">
        {CHANNELS.map(({ icon: Icon, title, desc, action, href }) => (
          <div key={title} className="rounded-2xl border border-line bg-white p-6">
            <div className="mb-3 grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand">
              <Icon size={20} />
            </div>
            <h3 className="font-display text-sm font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted">{desc}</p>
            {action && href && (
              <Link to={href} className="mt-3 inline-block text-sm font-medium text-brand hover:underline">{action} &rarr;</Link>
            )}
          </div>
        ))}
      </div>

      <Section title="Business Hours">
        <div className="flex items-start gap-3">
          <Clock size={18} className="mt-0.5 shrink-0 text-brand" />
          <div>
            <p><strong>Monday – Friday:</strong> 8:00 AM – 6:00 PM EST</p>
            <p><strong>Saturday:</strong> 9:00 AM – 1:00 PM EST</p>
            <p><strong>Sunday & Public Holidays:</strong> Closed</p>
            <p className="mt-2">Online banking and chat support are available 24/7 for account holders.</p>
          </div>
        </div>
      </Section>

      <Section title="Complaints">
        <p>
          If you are unhappy with our service, we want to hear about it. Please email
          complaints@sterlingcrestbank.com or visit our <Link to="/complaints" className="text-brand underline hover:text-brand/80">complaints page</Link> for
          details on our resolution process.
        </p>
      </Section>
    </StaticPageShell>
  );
}
