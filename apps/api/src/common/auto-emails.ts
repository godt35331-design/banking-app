import { BANK_NAME } from '@kestrel/shared';

/**
 * Every automatic email the bank sends. Staff can switch each one on or off (and edit the wording)
 * on the admin Mail page. "Dear {name}," is always added as the first line.
 *
 * Placeholders like {amount} are filled in with the customer's details. A paragraph that uses a
 * placeholder with no value (e.g. {reason} when no reason was given) is left out automatically.
 */

export type AutoEmailGroup = 'SECURITY' | 'MONEY' | 'WELCOME' | 'SERVICES';

export interface AutoEmailDef {
  key: string;
  group: AutoEmailGroup;
  label: string;
  when: string; // shown to staff: when it is sent
  subject: string;
  body: string;
  fields: Record<string, string>; // placeholder → label (besides {name})
}

export const AUTO_EMAIL_GROUPS: { key: AutoEmailGroup; label: string }[] = [
  { key: 'SECURITY', label: 'Security' },
  { key: 'MONEY', label: 'Money' },
  { key: 'WELCOME', label: 'Welcome & identity' },
  { key: 'SERVICES', label: 'Loans, refunds & support' },
];

const SUPPORT = 'If you have any questions, please contact our support team from your dashboard.';
const NEVER_ASK = 'We will never ask for your password, PIN or card details by email, phone or message.';

export const AUTO_EMAILS: AutoEmailDef[] = [
  // ───────────── Security ─────────────
  {
    key: 'pin_lockout', group: 'SECURITY', label: 'Account locked (wrong PIN)',
    when: 'The wrong PIN is entered too many times at sign-in',
    subject: 'Your account has been locked for your security',
    body:
      'We locked your account on {date} because the wrong PIN was entered too many times while signing in.\n\n' +
      'If this was you, please contact our support team and we will help you unlock your account after a quick identity check.\n\n' +
      "If it wasn't you, someone may know your password. Please contact us straight away, and once your account is unlocked, change your password and PIN.\n\n" +
      NEVER_ASK,
    fields: { '{date}': 'Date and time' },
  },
  {
    key: 'password_changed', group: 'SECURITY', label: 'Password changed',
    when: 'The customer changes their password, or staff reset it',
    subject: 'Your password was changed',
    body:
      'The password for your online banking was changed {by} on {date}.\n\n' +
      "If you made this change, you don't need to do anything.\n\n" +
      "If you didn't, please contact us immediately so we can secure your account.",
    fields: { '{by}': 'By you / by staff', '{date}': 'Date and time' },
  },
  {
    key: 'pin_changed', group: 'SECURITY', label: 'PIN changed',
    when: 'The customer changes their PIN, or staff reset it',
    subject: 'Your PIN was changed',
    body:
      'The PIN for your online banking was changed {by} on {date}.\n\n' +
      "If you made this change, you don't need to do anything.\n\n" +
      "If you didn't, please contact us immediately so we can secure your account.",
    fields: { '{by}': 'By you / by staff', '{date}': 'Date and time' },
  },
  {
    key: 'email_changed', group: 'SECURITY', label: 'Email address changed',
    when: 'Staff change the email address (sent to the old and the new address)',
    subject: 'Your email address was changed',
    body:
      'The email address on your account was changed from {oldEmail} to {newEmail} on {date}.\n\n' +
      "From now on, we'll send all emails to {newEmail}.\n\n" +
      "If you didn't ask for this change, please contact us immediately.",
    fields: { '{oldEmail}': 'Old email', '{newEmail}': 'New email', '{date}': 'Date and time' },
  },
  {
    key: 'account_frozen', group: 'SECURITY', label: 'Account frozen',
    when: 'Staff freeze the account',
    subject: 'Your account has been frozen',
    body:
      'Your account has been frozen. You can still sign in, view your account and contact support, but payments, transfers and withdrawals are paused.\n\n' +
      'Reason: {reason}\n\n' + SUPPORT,
    fields: { '{reason}': 'Reason' },
  },
  {
    key: 'account_locked', group: 'SECURITY', label: 'Account locked by staff',
    when: 'Staff lock the account',
    subject: 'Your account has been locked',
    body:
      "Your account has been locked by the bank, and you won't be able to sign in until it is unlocked.\n\n" +
      'Reason: {reason}\n\n' +
      'Please contact our support team to resolve this.',
    fields: { '{reason}': 'Reason' },
  },
  {
    key: 'account_reactivated', group: 'SECURITY', label: 'Account active again',
    when: 'Staff unfreeze or unlock the account',
    subject: 'Your account is active again',
    body:
      'Good news: your account is active again. You can sign in and use all our services as normal.\n\n' +
      'Note from the bank: {reason}\n\n' + SUPPORT,
    fields: { '{reason}': 'Note' },
  },
  {
    key: 'card_status', group: 'SECURITY', label: 'Card frozen, blocked or reactivated',
    when: 'Staff freeze, block or reactivate a card',
    subject: 'Update on your card ending {last4}',
    body:
      'Your card ending {last4} has been {action} by the bank.\n\n' + SUPPORT,
    fields: { '{last4}': 'Card last 4 digits', '{action}': 'frozen / blocked / reactivated' },
  },

  // ───────────── Money ─────────────
  {
    key: 'withdrawal_sent', group: 'MONEY', label: 'Withdrawal sent',
    when: 'Staff approve a withdrawal as sent',
    subject: 'Your withdrawal has been sent',
    body:
      'Your withdrawal of {amount} to {destination} has been sent.\n\n' +
      'Withdrawal reference: {reference}\nPayment reference: {payoutReference}\n\n' +
      "Depending on your bank or network, it can take a little while to arrive. If it hasn't arrived within 3 working days, please contact our support team.",
    fields: { '{amount}': 'Amount', '{destination}': 'Sent to', '{reference}': 'Reference', '{payoutReference}': 'Payment reference' },
  },
  {
    key: 'withdrawal_returned', group: 'MONEY', label: 'Withdrawal returned',
    when: 'Staff reject a withdrawal (the money goes back to the wallet)',
    subject: 'Your withdrawal could not be sent',
    body:
      'Your withdrawal of {amount} to {destination} (reference {reference}) could not be sent, and the full amount has been returned to your wallet.\n\n' +
      'Reason: {reason}\n\n' +
      'You can make a new withdrawal at any time. ' + SUPPORT,
    fields: { '{amount}': 'Amount', '{destination}': 'Sent to', '{reference}': 'Reference', '{reason}': 'Reason' },
  },
  {
    key: 'transfer_approved', group: 'MONEY', label: 'Large transfer approved',
    when: 'Staff approve a transfer that was waiting for approval',
    subject: 'Your transfer has been sent',
    body:
      'Your transfer of {amount} to {recipient} has been approved and sent.\n\n' +
      'Reference: {reference}',
    fields: { '{amount}': 'Amount', '{recipient}': 'Recipient', '{reference}': 'Reference' },
  },
  {
    key: 'transfer_rejected', group: 'MONEY', label: 'Large transfer rejected',
    when: 'Staff reject a transfer that was waiting for approval',
    subject: 'Your transfer was not approved',
    body:
      'Your transfer to {recipient} (reference {reference}) was not approved, and {amount} has been returned to your wallet.\n\n' +
      'Reason: {reason}\n\n' + SUPPORT,
    fields: { '{amount}': 'Amount returned', '{recipient}': 'Recipient', '{reference}': 'Reference', '{reason}': 'Reason' },
  },
  {
    key: 'check_cleared', group: 'MONEY', label: 'Check deposit cleared',
    when: 'Staff clear a check deposit',
    subject: 'Your check deposit has cleared',
    body:
      'Your check deposit of {amount} has cleared and the money is now in your wallet.\n\n' +
      'Reference: {reference}',
    fields: { '{amount}': 'Amount', '{reference}': 'Reference' },
  },
  {
    key: 'check_bounced', group: 'MONEY', label: 'Check deposit bounced',
    when: 'Staff mark a check deposit as bounced',
    subject: 'Your check deposit could not be cleared',
    body:
      'Your check deposit of {amount} (reference {reference}) could not be cleared, so no money was added to your wallet.\n\n' +
      'Reason: {reason}\n\n' + SUPPORT,
    fields: { '{amount}': 'Amount', '{reference}': 'Reference', '{reason}': 'Reason' },
  },
  {
    key: 'wallet_credited', group: 'MONEY', label: 'Money added by staff',
    when: 'Staff credit the customer’s wallet',
    subject: 'Money has been added to your account',
    body:
      '{amount} has been added to your {currency} wallet.\n\n' +
      'Description: {reason}\nReference: {reference}',
    fields: { '{amount}': 'Amount', '{currency}': 'Wallet currency', '{reason}': 'Description', '{reference}': 'Reference' },
  },
  {
    key: 'wallet_debited', group: 'MONEY', label: 'Money taken by staff',
    when: 'Staff debit the customer’s wallet',
    subject: 'Money has been taken from your account',
    body:
      '{amount} has been taken from your {currency} wallet.\n\n' +
      'Description: {reason}\nReference: {reference}\n\n' + SUPPORT,
    fields: { '{amount}': 'Amount', '{currency}': 'Wallet currency', '{reason}': 'Description', '{reference}': 'Reference' },
  },
  {
    key: 'transaction_reversed', group: 'MONEY', label: 'Transaction reversed',
    when: 'Staff reverse a transaction',
    subject: 'A transaction on your account was reversed',
    body:
      'Your transaction {reference} has been reversed by the bank. {amount} has been {direction} your wallet.\n\n' +
      'Reason: {reason}\n\n' + SUPPORT,
    fields: { '{reference}': 'Reference', '{amount}': 'Amount', '{direction}': 'returned to / taken from', '{reason}': 'Reason' },
  },

  // ───────────── Welcome & identity ─────────────
  {
    key: 'welcome', group: 'WELCOME', label: 'Welcome',
    when: 'A customer opens an account',
    subject: `Welcome to ${BANK_NAME}`,
    body:
      'Welcome, and thank you for opening an account with us. Your account is ready to use.\n\n' +
      'To get started:\n' +
      '• Verify your identity in Settings, so all our services are available to you\n' +
      '• Add money to your wallet\n' +
      '• Create a virtual card whenever you need one\n\n' +
      'For your security, never share your password or PIN with anyone. Our staff will never ask for them.',
    fields: {},
  },
  {
    key: 'kyc_approved', group: 'WELCOME', label: 'Identity verified',
    when: 'Staff approve the identity check',
    subject: 'Your identity has been verified',
    body:
      'Thank you for sending your documents. Your identity has been verified, and all our services are now available to you.',
    fields: {},
  },
  {
    key: 'kyc_rejected', group: 'WELCOME', label: 'Identity check rejected',
    when: 'Staff reject the identity documents',
    subject: "We couldn't verify your identity",
    body:
      "Unfortunately, we couldn't verify your identity with the documents you sent.\n\n" +
      'Reason: {reason}\n\n' +
      'Please upload new documents in Settings → Identity verification on your dashboard. It only takes a few minutes.',
    fields: { '{reason}': 'Reason' },
  },

  // ───────────── Loans, refunds & support ─────────────
  {
    key: 'loan_received', group: 'SERVICES', label: 'Loan application received',
    when: 'A customer submits a loan application',
    subject: 'We have received your loan application',
    body:
      'Thank you for applying for a {product}. Your application reference is {reference}.\n\n' +
      "A loan officer will review your application and documents. We'll email you at every step, and you can follow its progress in the Loans section of your dashboard.",
    fields: { '{product}': 'Loan type', '{reference}': 'Reference' },
  },
  {
    key: 'loan_update', group: 'SERVICES', label: 'Loan application update',
    when: 'Staff change the status of a loan application',
    subject: 'Update on your loan application {reference}',
    body:
      'There is an update on your {product} application {reference}.\n\n' +
      'Status: {status}\n\n' +
      '{update}\n\n' +
      '{details}\n\n' +
      'You can see the full details and any next steps in the Loans section of your dashboard.',
    fields: { '{product}': 'Loan type', '{reference}': 'Reference', '{status}': 'New status', '{update}': 'Update text', '{details}': 'Extra details' },
  },
  {
    key: 'loan_message', group: 'SERVICES', label: 'New message from loan officer',
    when: 'A loan officer sends the customer a message',
    subject: 'New message about your loan application {reference}',
    body:
      'Your loan officer has sent you a message about application {reference}.\n\n' +
      'Please sign in and open the Loans section of your dashboard to read it and reply.',
    fields: { '{reference}': 'Reference' },
  },
  {
    key: 'loan_repayment_due', group: 'SERVICES', label: 'Loan repayment reminder',
    when: '3 days before a loan repayment is due',
    subject: 'Your loan repayment is due on {dueDate}',
    body:
      'This is a reminder that repayment {instalment} of {amount} for your loan {reference} is due on {dueDate}.\n\n' +
      'You can pay it from your wallet in the Loans section of your dashboard. Please make sure you have enough money in your wallet.\n\n' +
      'If you have already paid, please ignore this email.',
    fields: { '{amount}': 'Amount', '{dueDate}': 'Due date', '{instalment}': 'Instalment number', '{reference}': 'Loan reference' },
  },
  {
    key: 'loan_repayment_overdue', group: 'SERVICES', label: 'Loan repayment missed',
    when: 'The day after a loan repayment was due and not paid',
    subject: 'Your loan repayment is overdue',
    body:
      'We have not received repayment {instalment} of {amount} for your loan {reference}, which was due on {dueDate}.\n\n' +
      'Please pay it as soon as possible from the Loans section of your dashboard.\n\n' +
      "If you're having difficulty paying, please contact our support team. We're here to help.",
    fields: { '{amount}': 'Amount', '{dueDate}': 'Due date', '{instalment}': 'Instalment number', '{reference}': 'Loan reference' },
  },
  {
    key: 'loan_repayment_received', group: 'SERVICES', label: 'Loan repayment received',
    when: 'Staff record a loan repayment made at a branch or by bank transfer',
    subject: 'We have received your loan repayment',
    body:
      'Thank you. We have received your repayment of {amount} (instalment {instalment}) for your loan {reference}.',
    fields: { '{amount}': 'Amount', '{instalment}': 'Instalment number', '{reference}': 'Loan reference' },
  },
  {
    key: 'loan_repaid', group: 'SERVICES', label: 'Loan fully repaid',
    when: 'The last loan repayment is paid',
    subject: 'Your loan is fully repaid',
    body:
      'Congratulations! Your loan {reference} is now fully repaid, and the loan has been closed.\n\n' +
      'Thank you for banking with us.',
    fields: { '{reference}': 'Loan reference' },
  },
  {
    key: 'recovery_received', group: 'SERVICES', label: 'Fund recovery application received',
    when: 'A customer submits a fund recovery application',
    subject: 'We have received your application',
    body:
      'Thank you for your {category} application. Your reference is {reference}.\n\n' +
      "A case officer will review your information and documents. We'll email you as your case progresses, and you can follow it in the Fund Recovery section of your dashboard.",
    fields: { '{category}': 'Application type', '{reference}': 'Reference' },
  },
  {
    key: 'recovery_update', group: 'SERVICES', label: 'Fund recovery update',
    when: 'Staff change the status of a fund recovery case',
    subject: 'Update on your application {reference}',
    body:
      'There is an update on your application {reference}.\n\n' +
      'Status: {status}\n\n' +
      '{update}\n\n' +
      '{details}\n\n' +
      'You can see the full details and any next steps in the Fund Recovery section of your dashboard.',
    fields: { '{reference}': 'Reference', '{status}': 'New status', '{update}': 'Update text', '{details}': 'Extra details' },
  },
  {
    key: 'recovery_message', group: 'SERVICES', label: 'New message from case officer',
    when: 'A case officer sends the customer a message',
    subject: 'New message about your application {reference}',
    body:
      'Your case officer has sent you a message about application {reference}.\n\n' +
      'Please sign in and open the Fund Recovery section of your dashboard to read it and reply.',
    fields: { '{reference}': 'Reference' },
  },
  {
    key: 'tax_received', group: 'SERVICES', label: 'Tax refund claim received',
    when: 'A customer submits a tax refund claim',
    subject: 'We have received your tax refund claim',
    body:
      "Thank you. We have received your tax refund claim for {year}. We'll review it and email you as soon as there is an update.",
    fields: { '{year}': 'Tax year' },
  },
  {
    key: 'tax_update', group: 'SERVICES', label: 'Tax refund claim update',
    when: 'Staff review, approve or reject a tax refund claim',
    subject: 'Update on your tax refund claim',
    body:
      'Your tax refund claim for {year} {status}.\n\n' +
      'Note from the bank: {note}\n\n' +
      'You can see the details in the Tax Recovery section of your dashboard.',
    fields: { '{year}': 'Tax year', '{status}': 'Status text', '{note}': 'Note' },
  },
  {
    key: 'tax_paid', group: 'SERVICES', label: 'Tax refund paid',
    when: 'Staff pay a tax refund into the wallet',
    subject: 'Your tax refund has been paid',
    body:
      'Good news: your tax refund of {amount} for {year} has been paid into your {currency} wallet.',
    fields: { '{amount}': 'Amount', '{year}': 'Tax year', '{currency}': 'Wallet currency' },
  },
  {
    key: 'support_reply', group: 'SERVICES', label: 'Support replied',
    when: 'Staff reply in the support chat (at most one email every 30 minutes)',
    subject: 'You have a new reply from our support team',
    body:
      'Our support team has replied to your message:\n\n' +
      '"{message}"\n\n' +
      'Please sign in and open Support on your dashboard to see the full conversation and reply.',
    fields: { '{message}': 'Their reply' },
  },
];

export const autoEmailDef = (key: string) => AUTO_EMAILS.find(e => e.key === key);

/** Dates in emails, e.g. "27 November 2026 at 14:05 (UTC)". */
export const emailDate = (d = new Date(), withTime = true) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) +
  (withTime ? ` at ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} (UTC)` : '');

/** Fills placeholders. Paragraphs that use a placeholder with no value are dropped. */
export function fillTemplate(text: string, data: Record<string, string | null | undefined>) {
  const value = (k: string) => {
    const v = data[k];
    return v === null || v === undefined ? '' : String(v).trim();
  };
  return text
    .split(/\n{2,}/)
    .filter(p => {
      const used = p.match(/\{[a-zA-Z][a-zA-Z0-9]*\}/g) ?? [];
      return used.every(t => t === '{name}' || value(t.slice(1, -1)) !== '');
    })
    .map(p => p.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (m, k) => (k in data || k === 'name' ? value(k) : m)))
    .join('\n\n')
    .trim();
}
