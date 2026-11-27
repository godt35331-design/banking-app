import { StaticPageShell, Section } from '../components/StaticPageShell';
import { BANK_NAME } from '@kestrel/shared';

export function Terms() {
  return (
    <StaticPageShell title="Terms of Service" subtitle={`The terms that govern your use of ${BANK_NAME}'s services.`}>
      <p className="mb-8 text-sm text-muted">Last updated: November 2026</p>

      <Section title="Acceptance of Terms">
        <p>By opening an account or using any of our services, you agree to these Terms of Service. If you do not agree, please do not use our services. We may update these terms from time to time, and continued use constitutes acceptance of any changes.</p>
      </Section>

      <Section title="Eligibility">
        <p>To open an account, you must be at least 18 years old, provide accurate identification, and not be prohibited from using financial services under applicable law. We reserve the right to refuse service at our discretion.</p>
      </Section>

      <Section title="Account Responsibilities">
        <p>You are responsible for keeping your login credentials, PIN, and account details secure. You must notify us immediately if you suspect unauthorised access. You agree to provide accurate, current information and to keep it up to date.</p>
      </Section>

      <Section title="Transactions">
        <p>We process transactions in accordance with the instructions you provide through our platform. Transfers of $3,000 or more may be subject to manual review before they are released. We are not liable for delays caused by security checks, compliance reviews, or third-party payment networks.</p>
      </Section>

      <Section title="Fees">
        <p>Fees applicable to your account and transactions are disclosed before you confirm any action. We do not charge hidden fees. A full fee schedule is available in your account settings.</p>
      </Section>

      <Section title="Prohibited Activities">
        <p>You may not use our services for illegal activity, money laundering, terrorist financing, fraud, or any purpose that violates applicable laws or regulations. We reserve the right to suspend or close accounts involved in prohibited activities.</p>
      </Section>

      <Section title="Intellectual Property">
        <p>All content, branding, software, and materials on our platform are the property of {BANK_NAME} or its licensors. You may not copy, modify, or distribute any part of our platform without written permission.</p>
      </Section>

      <Section title="Limitation of Liability">
        <p>{BANK_NAME} is not liable for losses arising from circumstances beyond our reasonable control, including system outages, third-party failures, or force majeure events. Our total liability in any case is limited to the fees you have paid in the preceding 12 months.</p>
      </Section>

      <Section title="Termination">
        <p>Either party may close your account at any time. We may suspend or terminate your access if we reasonably believe you have violated these terms. Upon closure, any remaining balance will be returned to you in accordance with our withdrawal procedures.</p>
      </Section>

      <Section title="Governing Law">
        <p>These terms are governed by and construed in accordance with applicable financial regulations. Any disputes will be resolved through the appropriate regulatory and legal channels.</p>
      </Section>

      <Section title="Contact">
        <p>For questions about these terms, contact legal@sterlingcrestbank.com.</p>
      </Section>
    </StaticPageShell>
  );
}
