/**
 * Funds Recovery Assistance: categories, questions, evidence checklists and statuses.
 * Shared by the web form (what to ask) and the API (what to accept), so both always agree.
 */

export type RecoveryQuestionType = 'text' | 'textarea' | 'select' | 'yesno' | 'date';

export interface RecoveryQuestion {
  key: string;
  label: string;
  type: RecoveryQuestionType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  hint?: string;
  /** Only ask this when another answer has a given value. */
  showIf?: { key: string; equals: string };
}

export interface RecoveryCategory {
  key: RecoveryCategoryKey;
  name: string;
  short: string;
  description: string;
  covers: string[];
  evidence: { key: string; label: string }[];
  questions: RecoveryQuestion[];
  /** Extra safety notice shown in the form (e.g. never share private keys). */
  warning?: string;
}

export const RECOVERY_CATEGORY_KEYS = ['BANK_TRANSFER', 'PAYMENT_REFUND', 'INVESTMENT', 'CRYPTO', 'WITHHELD', 'SCAM'] as const;
export type RecoveryCategoryKey = (typeof RECOVERY_CATEGORY_KEYS)[number];

const YES_NO = ['Yes', 'No'];

export const RECOVERY_CATEGORIES: RecoveryCategory[] = [
  {
    key: 'BANK_TRANSFER',
    name: 'Bank Transfer Recovery',
    short: 'Mistaken or disputed transfers',
    description: 'Help exploring recovery options when a bank transfer went to the wrong place, failed, was duplicated or is disputed.',
    covers: ['Money transferred to the wrong account', 'Failed or delayed bank transfers', 'Disputed bank transactions', 'Duplicate bank transfers'],
    evidence: [
      { key: 'BANK_STATEMENT', label: 'Bank statement' },
      { key: 'TRANSFER_RECEIPT', label: 'Transfer receipt' },
      { key: 'TRANSACTION_REFERENCE', label: 'Transaction reference (screenshot)' },
      { key: 'BANK_COMMUNICATION', label: 'Communication with the bank' },
    ],
    questions: [
      { key: 'situation', label: 'What best describes your situation?', type: 'select', required: true, options: ['Sent to the wrong account', 'Transfer failed or delayed', 'Disputed transaction', 'Duplicate transfer', 'Other'] },
      { key: 'bank', label: 'Which bank did you use?', type: 'text', required: true, placeholder: 'e.g. Sterling Crest Bank' },
      { key: 'transferSuccessful', label: 'Was the transfer successful?', type: 'select', required: true, options: ['Yes, the money left my account', 'No, it failed', 'It is still pending', 'Not sure'] },
      { key: 'wrongAccount', label: 'Did you send the money to the wrong account?', type: 'yesno', required: true },
      { key: 'contactedBank', label: 'Have you contacted your bank?', type: 'yesno', required: true },
      { key: 'reference', label: 'What is the transaction reference?', type: 'text', placeholder: 'As shown on your receipt or statement', hint: 'Leave empty if you don\'t have it' },
    ],
  },
  {
    key: 'PAYMENT_REFUND',
    name: 'Payment Refunds',
    short: 'Failed, duplicate or cancelled payments',
    description: 'Help with payments that should be refunded: duplicates, goods never received, cancelled services or failed purchases.',
    covers: ['Duplicate payments', 'Payments for goods never received', 'Cancelled services', 'Failed purchases where payment was deducted', 'Eligible card payment disputes'],
    evidence: [
      { key: 'INVOICE', label: 'Invoice' },
      { key: 'RECEIPT', label: 'Receipt' },
      { key: 'ORDER_NUMBER', label: 'Order confirmation / number' },
      { key: 'CANCELLATION', label: 'Cancellation confirmation' },
      { key: 'MERCHANT_COMMUNICATION', label: 'Communication with the merchant' },
    ],
    questions: [
      { key: 'situation', label: 'What best describes your situation?', type: 'select', required: true, options: ['Duplicate payment', 'Goods or service never received', 'Cancelled service not refunded', 'Failed purchase but money was taken', 'Card payment dispute', 'Other'] },
      { key: 'merchant', label: 'Which merchant received the payment?', type: 'text', required: true },
      { key: 'purchase', label: 'What did you purchase?', type: 'text', required: true },
      { key: 'received', label: 'Did you receive the product or service?', type: 'select', required: true, options: ['Yes', 'No', 'Partly', 'Not as described'] },
      { key: 'refundRequested', label: 'Did you request a refund?', type: 'yesno', required: true },
      { key: 'merchantResponse', label: 'What response did the merchant provide?', type: 'textarea', showIf: { key: 'refundRequested', equals: 'Yes' }, required: true },
    ],
  },
  {
    key: 'INVESTMENT',
    name: 'Investment Recovery',
    short: 'Investment and trading disputes',
    description: 'Help assessing disputes with trading platforms and investment providers, including blocked withdrawals and unauthorised transactions.',
    covers: ['Trading platform withdrawal problems', 'Disputed investment payments', 'Unauthorised investment transactions', 'Investment providers that withhold funds'],
    evidence: [
      { key: 'INVESTMENT_STATEMENT', label: 'Investment statements' },
      { key: 'DEPOSIT_RECORDS', label: 'Deposit records' },
      { key: 'WITHDRAWAL_REQUESTS', label: 'Withdrawal requests' },
      { key: 'ACCOUNT_CORRESPONDENCE', label: 'Account correspondence' },
      { key: 'PLATFORM_DETAILS', label: 'Platform details (screenshots, website)' },
    ],
    questions: [
      { key: 'situation', label: 'What best describes your situation?', type: 'select', required: true, options: ['Cannot withdraw my funds', 'Disputed investment payment', 'Unauthorised transaction', 'Provider is holding my funds', 'Other'] },
      { key: 'platform', label: 'What investment platform did you use?', type: 'text', required: true, placeholder: 'Name and website' },
      { key: 'deposited', label: 'How much did you deposit in total?', type: 'text', required: true, placeholder: 'e.g. 5,000 USD over 3 payments' },
      { key: 'withdrawalRequested', label: 'Have you requested a withdrawal?', type: 'yesno', required: true },
      { key: 'withdrawalOutcome', label: 'Was the withdrawal rejected or delayed?', type: 'select', options: ['Rejected', 'Delayed', 'No response', 'Asked to pay more fees first'], showIf: { key: 'withdrawalRequested', equals: 'Yes' }, required: true },
      { key: 'platformAccessible', label: 'Is the platform still accessible?', type: 'select', required: true, options: ['Yes', 'No', 'Not sure'] },
    ],
  },
  {
    key: 'CRYPTO',
    name: 'Cryptocurrency Recovery',
    short: 'Digital asset disputes and losses',
    description: 'Help assessing cryptocurrency fraud, mistaken transfers, exchange disputes and unauthorised wallet transactions.',
    covers: ['Cryptocurrency-related fraud', 'Mistaken digital asset transfers', 'Disputes involving exchanges', 'Unauthorised wallet transactions'],
    evidence: [
      { key: 'TXID', label: 'Transaction hash (TXID) screenshot' },
      { key: 'WALLET_ADDRESSES', label: 'Wallet addresses involved' },
      { key: 'EXCHANGE_RECORDS', label: 'Exchange records' },
      { key: 'CRYPTO_COMMUNICATION', label: 'Relevant communication' },
    ],
    warning:
      'Never share your private keys, recovery (seed) phrase or wallet password with anyone, including us. We will never ask for them. Do not include them in this form or in any document.',
    questions: [
      { key: 'situation', label: 'What best describes your situation?', type: 'select', required: true, options: ['Fraud or scam', 'Sent to the wrong address', 'Dispute with an exchange', 'Unauthorised wallet transaction', 'Other'] },
      { key: 'coin', label: 'Which cryptocurrency was involved?', type: 'text', required: true, placeholder: 'e.g. Bitcoin (BTC), USDT' },
      { key: 'network', label: 'Which network was used?', type: 'text', required: true, placeholder: 'e.g. Bitcoin, Ethereum (ERC-20), Tron (TRC-20)' },
      { key: 'txHash', label: 'What is the transaction hash (TXID)?', type: 'text', placeholder: 'Starts with 0x… or a long string of letters and numbers', hint: 'A transaction hash is public and safe to share. Never paste a private key or seed phrase.' },
      { key: 'exchange', label: 'Which exchange or wallet was involved?', type: 'text', required: true },
      { key: 'contactedExchange', label: 'Have you contacted the exchange?', type: 'yesno', required: true },
    ],
  },
  {
    key: 'WITHHELD',
    name: 'Withheld Funds',
    short: 'Funds held or unpaid by providers',
    description: 'Help assessing money owed to you that a company or platform has not paid or released.',
    covers: ['Unpaid service payments', 'Disputed business payments', 'Withheld platform balances', 'Unreleased funds from service providers'],
    evidence: [
      { key: 'CONTRACT', label: 'Contract or agreement' },
      { key: 'INVOICES', label: 'Invoices' },
      { key: 'PAYMENT_RECORDS', label: 'Payment records' },
      { key: 'CORRESPONDENCE', label: 'Correspondence' },
    ],
    questions: [
      { key: 'situation', label: 'What best describes your situation?', type: 'select', required: true, options: ['Unpaid service payment', 'Disputed business payment', 'Withheld platform balance', 'Funds not released by provider', 'Other'] },
      { key: 'holder', label: 'Which company or provider holds the money?', type: 'text', required: true },
      { key: 'withheldReason', label: 'Why are the funds being withheld?', type: 'textarea', required: true, placeholder: 'What reason have they given, if any?' },
      { key: 'outstanding', label: 'How much is outstanding?', type: 'text', required: true, placeholder: 'e.g. 2,400 EUR' },
      { key: 'dueDate', label: 'When were the funds supposed to be released?', type: 'date', required: true },
      { key: 'explanationReceived', label: 'Have you received an explanation?', type: 'yesno', required: true },
    ],
  },
  {
    key: 'SCAM',
    name: 'Scam and Fraud Recovery',
    short: 'Fraudulent transactions and scams',
    description: 'Help assessing recovery options after a scam or fraudulent transaction.',
    covers: ['Online shopping scams', 'Fake investment schemes', 'Romance scams', 'Impersonation fraud', 'Unauthorised payments resulting from fraud'],
    evidence: [
      { key: 'MESSAGES', label: 'Messages with the scammer' },
      { key: 'PAYMENT_RECEIPTS', label: 'Payment receipts' },
      { key: 'BANK_RECORDS', label: 'Bank records' },
      { key: 'WEBSITE_LINKS', label: 'Website links / screenshots' },
      { key: 'REPORTS', label: 'Police or fraud reports' },
    ],
    questions: [
      { key: 'scamType', label: 'What type of scam occurred?', type: 'select', required: true, options: ['Online shopping scam', 'Fake investment scheme', 'Romance scam', 'Impersonation (bank, police, company, family)', 'Unauthorised payment from fraud', 'Other'] },
      { key: 'firstContact', label: 'How did you first encounter the person or company?', type: 'select', required: true, options: ['Social media', 'Dating site or app', 'Phone call', 'Text message or WhatsApp', 'Email', 'Website or advert', 'In person', 'Other'] },
      { key: 'paidHow', label: 'How did you make the payment?', type: 'select', required: true, options: ['Bank transfer', 'Card', 'Cryptocurrency', 'Mobile money', 'Gift cards', 'Cash', 'Other'] },
      { key: 'reported', label: 'Have you reported the incident?', type: 'select', required: true, options: ['Yes, to the police', 'Yes, to my bank', 'Yes, to a fraud reporting agency', 'Not yet'] },
      { key: 'hasEvidence', label: 'Do you have communication or transaction evidence?', type: 'yesno', required: true },
    ],
  },
];

export const recoveryCategory = (key: string) => RECOVERY_CATEGORIES.find(c => c.key === key);

/** Questions that apply given the answers so far (respects showIf). */
export function activeQuestions(cat: RecoveryCategory, answers: Record<string, string>) {
  return cat.questions.filter(q => !q.showIf || answers[q.showIf.key] === q.showIf.equals);
}

export const RECOVERY_CURRENCIES = ['USD', 'EUR', 'GBP', 'XAF', 'XOF', 'NGN', 'GHS', 'KES', 'ZAR', 'CAD', 'AUD', 'CHF', 'AED', 'INR', 'CNY', 'JPY'];
export const RECOVERY_PAYMENT_METHODS = ['Bank transfer', 'Card', 'Cryptocurrency', 'Mobile money', 'PayPal or e-wallet', 'Cash', 'Cheque', 'Gift cards', 'Other'];
export const RECOVERY_YES_NO = YES_NO;

export const RECOVERY_COUNTRIES = [
  'Australia', 'Austria', 'Belgium', 'Benin', 'Botswana', 'Brazil', 'Burkina Faso', 'Cameroon', 'Canada',
  'Central African Republic', 'Chad', 'China', "Côte d'Ivoire", 'Democratic Republic of the Congo', 'Denmark', 'Egypt',
  'Equatorial Guinea', 'Ethiopia', 'Finland', 'France', 'Gabon', 'Gambia', 'Germany', 'Ghana', 'Greece', 'Guinea',
  'India', 'Ireland', 'Italy', 'Japan', 'Kenya', 'Liberia', 'Mali', 'Mexico', 'Morocco', 'Netherlands', 'New Zealand',
  'Niger', 'Nigeria', 'Norway', 'Poland', 'Portugal', 'Republic of the Congo', 'Rwanda', 'Saudi Arabia', 'Senegal',
  'Sierra Leone', 'Singapore', 'South Africa', 'Spain', 'Sweden', 'Switzerland', 'Tanzania', 'Togo', 'Tunisia',
  'Turkey', 'Uganda', 'United Arab Emirates', 'United Kingdom', 'United States', 'Zambia', 'Zimbabwe', 'Other',
];

/** One consistent status set used everywhere (customer portal, admin, notifications). */
export const RECOVERY_STATUSES = [
  { key: 'DRAFT', label: 'Draft', meaning: 'Application not submitted' },
  { key: 'SUBMITTED', label: 'Submitted', meaning: 'Application received' },
  { key: 'UNDER_REVIEW', label: 'Under Review', meaning: 'Staff are reviewing the application' },
  { key: 'DOCUMENTS_REQUIRED', label: 'Documents Required', meaning: 'More evidence is needed' },
  { key: 'ASSESSMENT_COMPLETE', label: 'Assessment Complete', meaning: 'Initial assessment completed' },
  { key: 'AWAITING_CUSTOMER_APPROVAL', label: 'Awaiting Customer Approval', meaning: 'You need to approve the proposed assistance' },
  { key: 'RECOVERY_ACTIVE', label: 'Recovery Process Active', meaning: 'Authorised recovery action is underway' },
  { key: 'AWAITING_THIRD_PARTY', label: 'Awaiting Third Party', meaning: 'Waiting for the bank, provider or authority' },
  { key: 'RESOLVED', label: 'Resolved', meaning: 'The case has reached a recorded outcome' },
  { key: 'UNSUCCESSFUL', label: 'Unsuccessful', meaning: 'No viable recovery route, or the attempt was unsuccessful' },
  { key: 'CLOSED', label: 'Closed', meaning: 'Case formally closed' },
] as const;
export type RecoveryStatus = (typeof RECOVERY_STATUSES)[number]['key'];
export const recoveryStatus = (key: string) => RECOVERY_STATUSES.find(s => s.key === key);

/** Statuses where the case is finished (no more uploads or changes from the customer). */
export const RECOVERY_FINAL: RecoveryStatus[] = ['RESOLVED', 'UNSUCCESSFUL', 'CLOSED'];

/** Formats an amount in any currency (minor units = amount × 100). */
export function formatAnyMoney(minor: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency, maximumFractionDigits: 2 }).format(minor / 100);
  } catch {
    return `${(minor / 100).toLocaleString('en-GB', { maximumFractionDigits: 2 })} ${currency}`;
  }
}

/** Accepted uploads for recovery evidence. */
export const RECOVERY_DOC_MIME = ['application/pdf', 'image/jpeg', 'image/png'];
export const RECOVERY_DOC_MAX_BYTES = 10 * 1024 * 1024;
export const RECOVERY_MAX_DOCS = 20;
