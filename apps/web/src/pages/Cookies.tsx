import { StaticPageShell, Section } from '../components/StaticPageShell';
import { BANK_NAME } from '@kestrel/shared';

export function Cookies() {
  return (
    <StaticPageShell title="Cookie Policy" subtitle="How we use cookies and similar technologies.">
      <p className="mb-8 text-sm text-muted">Last updated: November 2026</p>

      <Section title="What Are Cookies">
        <p>Cookies are small text files stored on your device when you visit a website. They help the site remember your preferences and understand how you use it.</p>
      </Section>

      <Section title="Cookies We Use">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="pb-3 pr-4 font-display font-semibold text-night">Cookie</th>
                <th className="pb-3 pr-4 font-display font-semibold text-night">Purpose</th>
                <th className="pb-3 font-display font-semibold text-night">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/50">
              <tr><td className="py-3 pr-4">Session</td><td className="py-3 pr-4">Keeps you signed in while you use the app</td><td className="py-3">Session</td></tr>
              <tr><td className="py-3 pr-4">Preferences</td><td className="py-3 pr-4">Remembers your settings (theme, sidebar state)</td><td className="py-3">1 year</td></tr>
              <tr><td className="py-3 pr-4">Security</td><td className="py-3 pr-4">Helps detect and prevent fraud</td><td className="py-3">30 days</td></tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="What We Don't Use">
        <p>We do not use advertising cookies, tracking pixels, or any third-party analytics that share your data with advertisers. Your browsing on our platform stays between you and {BANK_NAME}.</p>
      </Section>

      <Section title="Managing Cookies">
        <p>You can clear or block cookies through your browser settings. Note that blocking essential cookies may prevent you from signing in or using certain features. Our platform will continue to function without preference cookies, but your settings will not be remembered.</p>
      </Section>

      <Section title="Changes">
        <p>We will update this page if our cookie usage changes. The date at the top shows the last revision.</p>
      </Section>
    </StaticPageShell>
  );
}
