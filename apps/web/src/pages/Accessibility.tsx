import { StaticPageShell, Section } from '../components/StaticPageShell';
import { BANK_NAME } from '@kestrel/shared';

export function Accessibility() {
  return (
    <StaticPageShell title="Accessibility" subtitle="Our commitment to making banking accessible to everyone.">
      <Section title="Our Commitment">
        <p>{BANK_NAME} is committed to ensuring that our online banking platform is accessible to all users, including those with disabilities. We aim to meet or exceed the Web Content Accessibility Guidelines (WCAG) 2.1 at Level AA.</p>
      </Section>

      <Section title="What We Do">
        <p>Our platform is designed with accessibility in mind. Key measures include:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li>Keyboard navigation support throughout the application</li>
          <li>Screen reader compatibility with ARIA labels and semantic HTML</li>
          <li>Sufficient colour contrast ratios for text and interactive elements</li>
          <li>Responsive design that works across screen sizes and zoom levels</li>
          <li>Clear, consistent page structure and navigation</li>
          <li>Form labels and error messages that are programmatically associated with inputs</li>
        </ul>
      </Section>

      <Section title="Alternative Formats">
        <p>If you need account information, statements, or documents in an alternative format (large print, audio, Braille), please contact our support team and we will do our best to accommodate your request.</p>
      </Section>

      <Section title="Feedback">
        <p>We welcome feedback on the accessibility of our platform. If you encounter a barrier or have a suggestion for improvement, please email accessibility@sterlingcrestbank.com or call us at +1 (800) 555-0199. We take every report seriously and work to resolve issues promptly.</p>
      </Section>
    </StaticPageShell>
  );
}
