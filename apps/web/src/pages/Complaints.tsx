import { StaticPageShell, Section } from '../components/StaticPageShell';
import { BANK_NAME } from '@kestrel/shared';

export function Complaints() {
  return (
    <StaticPageShell title="Complaints" subtitle="How to raise a complaint and what to expect.">
      <Section title="We Take Complaints Seriously">
        <p>If something has gone wrong or you are unhappy with any aspect of our service, we want to know about it. Complaints help us improve, and we are committed to resolving every issue fairly and promptly.</p>
      </Section>

      <Section title="How to Complain">
        <p>You can raise a complaint through any of the following channels:</p>
        <ul className="ml-5 list-disc space-y-1">
          <li><strong>Email:</strong> complaints@sterlingcrestbank.com</li>
          <li><strong>Phone:</strong> +1 (800) 555-0199 (ask for the complaints team)</li>
          <li><strong>In person:</strong> Visit any of our branches and speak to a manager</li>
          <li><strong>Post:</strong> {BANK_NAME}, Complaints Department, PO Box 1234</li>
        </ul>
        <p className="mt-2">Please include your full name, account number (if applicable), a description of the issue, and what outcome you would like.</p>
      </Section>

      <Section title="Our Process">
        <p><strong>Acknowledgement:</strong> We will acknowledge your complaint within 2 business days.</p>
        <p><strong>Investigation:</strong> We aim to investigate and resolve your complaint within 15 business days. If the matter is complex and requires more time, we will let you know and provide an update.</p>
        <p><strong>Resolution:</strong> We will contact you with our findings and any actions we have taken. If you are not satisfied with our response, you may escalate the matter.</p>
      </Section>

      <Section title="Escalation">
        <p>If you feel your complaint has not been resolved satisfactorily, you have the right to refer it to the relevant financial ombudsman or regulatory authority in your jurisdiction. We will provide the details of the appropriate body when we issue our final response.</p>
      </Section>
    </StaticPageShell>
  );
}
