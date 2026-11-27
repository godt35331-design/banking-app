import { StaticPageShell, Section } from '../components/StaticPageShell';
import { BANK_NAME } from '@kestrel/shared';

export function Privacy() {
  return (
    <StaticPageShell title="Privacy Policy" subtitle={`How ${BANK_NAME} collects, uses, and protects your personal data.`}>
      <p className="mb-8 text-sm text-muted">Last updated: November 2026</p>

      <Section title="Information We Collect">
        <p>We collect information you provide when you open an account, use our services, or contact us. This includes your name, email address, phone number, date of birth, government-issued identification, and financial information such as account balances and transaction history.</p>
        <p>We also collect technical information automatically, including your IP address, browser type, device information, and how you interact with our services.</p>
      </Section>

      <Section title="How We Use Your Information">
        <p>We use your information to provide and improve our banking services, process transactions, verify your identity, comply with legal and regulatory obligations, detect and prevent fraud, and communicate with you about your account.</p>
        <p>We do not sell your personal information to third parties. We do not use your data for targeted advertising.</p>
      </Section>

      <Section title="Information Sharing">
        <p>We share your information only when necessary: with payment networks to process transactions, with identity verification providers, with regulatory bodies as required by law, and with service providers who help us operate (all bound by strict data protection agreements).</p>
      </Section>

      <Section title="Data Security">
        <p>We protect your data with industry-standard encryption, secure infrastructure, access controls, and regular security audits. All data in transit and at rest is encrypted. Access to customer data is limited to authorised personnel on a need-to-know basis.</p>
      </Section>

      <Section title="Your Rights">
        <p>You have the right to access, correct, or delete your personal data. You may also request a copy of the data we hold about you or ask us to restrict processing. To exercise any of these rights, contact us at privacy@sterlingcrestbank.com.</p>
      </Section>

      <Section title="Data Retention">
        <p>We retain your data for as long as your account is active and for a period afterwards as required by financial regulations (typically 5–7 years after account closure). Data no longer needed is securely deleted.</p>
      </Section>

      <Section title="Cookies">
        <p>We use essential cookies to keep you signed in and remember your preferences. We do not use tracking or advertising cookies. For more details, see our <a href="/cookies" className="text-brand underline hover:text-brand/80">Cookie Policy</a>.</p>
      </Section>

      <Section title="Changes to This Policy">
        <p>We may update this policy from time to time. When we make significant changes, we will notify you through your account or by email. The date at the top of this page shows when the policy was last updated.</p>
      </Section>

      <Section title="Contact">
        <p>For questions about this policy or your personal data, email privacy@sterlingcrestbank.com or write to our Data Protection Officer at {BANK_NAME}, Data Protection, PO Box 1234.</p>
      </Section>
    </StaticPageShell>
  );
}
