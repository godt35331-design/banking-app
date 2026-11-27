/**
 * Loan Application Portal: products, form fields, validation, documents and statuses.
 * Shared by the web form (what to ask) and the API (what to accept), so both always agree.
 *
 * No loan amounts or interest rates are invented here. Those come from the lender:
 * either the product information staff enter in the admin area, or the actual offer
 * issued after an application has been assessed.
 */
import { RECOVERY_COUNTRIES, RECOVERY_CURRENCIES } from './recovery';

export const LOAN_PRODUCT_KEYS = ['PERSONAL', 'BUSINESS', 'EDUCATION', 'VEHICLE', 'HOME', 'SHORT_TERM'] as const;
export type LoanProductKey = (typeof LOAN_PRODUCT_KEYS)[number];

export type LoanFieldType = 'text' | 'textarea' | 'select' | 'chips' | 'date' | 'money' | 'email' | 'tel' | 'wallet';

export interface LoanField {
  key: string;
  label: string;
  type: LoanFieldType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  hint?: string;
  /** Take half the row on wide screens. */
  half?: boolean;
  /** Money fields: 0 is allowed (e.g. "existing repayments"). */
  allowZero?: boolean;
  /** Date fields: applicant must be at least 18. */
  adult?: boolean;
  minLength?: number;
  /** Phone fields: show the dialling code of the country chosen in this field (same group). */
  dialCodeFrom?: string;
  /** Only ask when another answer (in this group or the context) is / isn't one of these values. */
  showIf?: { key: string; in?: string[]; notIn?: string[] };
}

export interface LoanProduct {
  key: LoanProductKey;
  name: string;
  short: string;
  description: string;
  whatFor: string[];
  whoCanApply: string[];
  eligibility: string[];
  purposes: string[];
  /** Repayment periods the customer can ask for, in months. The offer sets the real term. */
  terms: number[];
  /** Product-specific documents, in addition to the common ones. */
  documents: { key: string; label: string; required?: boolean }[];
  questions: LoanField[];
}

const YES_NO = ['Yes', 'No'];

export const LOAN_PRODUCTS: LoanProduct[] = [
  {
    key: 'PERSONAL',
    name: 'Personal Loan',
    short: 'Personal expenses and individual needs.',
    description: 'A loan for your own needs, such as a large purchase, home improvements, medical costs or bringing other debts together.',
    whatFor: ['Large purchases', 'Home improvements', 'Medical or family expenses', 'Weddings and life events', 'Consolidating existing debts'],
    whoCanApply: ['Individuals aged 18 or over', 'People with a regular income they can show', 'Residents of a country we serve'],
    eligibility: [
      'A valid government-issued ID',
      'Proof of your current address',
      'Evidence of income you can repay from',
      'An affordability and credit assessment by the lender',
    ],
    purposes: ['Home improvements', 'Medical expenses', 'Wedding or family event', 'Debt consolidation', 'Travel', 'Large purchase', 'Other'],
    terms: [6, 12, 18, 24, 36, 48, 60],
    documents: [],
    questions: [],
  },
  {
    key: 'BUSINESS',
    name: 'Business Loan',
    short: 'Business operations and expansion.',
    description: 'Financing for a registered business or sole trader: working capital, equipment, stock or growing the business.',
    whatFor: ['Working capital', 'Equipment and machinery', 'Stock and inventory', 'Opening new premises', 'Refinancing business debt'],
    whoCanApply: ['Registered businesses and sole traders', 'Business owners or directors aged 18 or over', 'Businesses that can show trading records'],
    eligibility: [
      'Business registration documents',
      'Financial statements or trading records',
      'ID and address proof for the owner or directors',
      'An assessment of the business’s ability to repay',
    ],
    purposes: ['Working capital', 'Equipment purchase', 'Expansion', 'Stock or inventory', 'Refinancing business debt', 'Other'],
    terms: [6, 12, 24, 36, 48, 60, 84],
    documents: [
      { key: 'BUSINESS_REGISTRATION', label: 'Business registration certificate', required: true },
      { key: 'FINANCIAL_STATEMENTS', label: 'Financial statements' },
      { key: 'BUSINESS_PLAN', label: 'Business plan' },
      { key: 'TAX_RETURNS', label: 'Business tax returns' },
    ],
    questions: [
      { key: 'businessName', label: 'Registered business name', type: 'text', required: true, half: true },
      { key: 'registrationNumber', label: 'Registration number', type: 'text', required: true, half: true },
      { key: 'businessType', label: 'Type of business', type: 'chips', required: true, options: ['Sole trader', 'Partnership', 'Limited company', 'Cooperative', 'Other'] },
      { key: 'industry', label: 'Industry or sector', type: 'text', required: true, half: true, placeholder: 'e.g. Retail, Agriculture, Transport' },
      { key: 'yearsTrading', label: 'How long has the business been trading?', type: 'select', required: true, half: true, options: ['Less than 1 year', '1–2 years', '3–5 years', 'More than 5 years'] },
      { key: 'annualRevenue', label: 'Annual revenue (last 12 months)', type: 'money', required: true, half: true },
      { key: 'employees', label: 'Number of employees', type: 'text', half: true },
    ],
  },
  {
    key: 'EDUCATION',
    name: 'Education Loan',
    short: 'Tuition and educational expenses.',
    description: 'Help paying for tuition, school or university fees, accommodation and study costs, for yourself or a dependant.',
    whatFor: ['Tuition and school fees', 'University or college costs', 'Accommodation while studying', 'Books, equipment and exam fees', 'Studying abroad'],
    whoCanApply: ['Students admitted to a recognised institution', 'Parents or guardians paying for a student', 'Applicants aged 18 or over'],
    eligibility: [
      'An admission or enrolment letter',
      'A fee schedule or invoice from the institution',
      'ID and address proof for the applicant',
      'Evidence of how the loan will be repaid',
    ],
    purposes: ['Tuition fees', 'Accommodation', 'Books and equipment', 'Exam or registration fees', 'Study abroad costs', 'Other'],
    terms: [12, 24, 36, 48, 60, 84, 120],
    documents: [
      { key: 'ADMISSION_LETTER', label: 'Admission or enrolment letter', required: true },
      { key: 'FEE_SCHEDULE', label: 'Fee schedule or invoice' },
      { key: 'STUDENT_ID', label: 'Student ID card' },
    ],
    questions: [
      { key: 'student', label: 'Who is the student?', type: 'chips', required: true, options: ['Myself', 'My child or dependant', 'Someone else'] },
      { key: 'studentName', label: 'Student’s full name', type: 'text', required: true, half: true, showIf: { key: 'student', notIn: ['Myself', ''] } },
      { key: 'institution', label: 'School, college or university', type: 'text', required: true, half: true },
      { key: 'course', label: 'Course or programme', type: 'text', required: true, half: true },
      { key: 'studyCountry', label: 'Country of study', type: 'select', required: true, half: true, options: RECOVERY_COUNTRIES },
      { key: 'courseStart', label: 'Course start date', type: 'date', required: true, half: true },
      { key: 'courseLength', label: 'Course length', type: 'select', required: true, half: true, options: ['Less than 1 year', '1 year', '2 years', '3 years', '4 years', '5 years or more'] },
    ],
  },
  {
    key: 'VEHICLE',
    name: 'Vehicle Loan',
    short: 'Vehicle purchase and financing.',
    description: 'Financing to buy a new or used car, motorcycle or commercial vehicle from a dealer or private seller.',
    whatFor: ['New cars', 'Used cars', 'Motorcycles', 'Commercial vehicles', 'Refinancing an existing vehicle loan'],
    whoCanApply: ['Individuals aged 18 or over', 'Businesses buying vehicles for work', 'Applicants with a regular income'],
    eligibility: [
      'A quotation or invoice for the vehicle',
      'A valid driving licence (for personal vehicles)',
      'ID, address and income documents',
      'An affordability and credit assessment by the lender',
    ],
    purposes: ['New vehicle', 'Used vehicle', 'Commercial vehicle', 'Motorcycle', 'Refinance existing vehicle loan', 'Other'],
    terms: [12, 24, 36, 48, 60, 72],
    documents: [
      { key: 'VEHICLE_QUOTE', label: 'Vehicle quotation or invoice', required: true },
      { key: 'SALE_AGREEMENT', label: 'Sale or purchase agreement' },
      { key: 'DRIVING_LICENCE', label: 'Driving licence' },
    ],
    questions: [
      { key: 'vehicleType', label: 'Type of vehicle', type: 'chips', required: true, options: ['Car', 'Motorcycle', 'Van or truck', 'Bus', 'Other'] },
      { key: 'condition', label: 'New or used?', type: 'chips', required: true, options: ['New', 'Used'] },
      { key: 'makeModel', label: 'Make and model', type: 'text', required: true, half: true, placeholder: 'e.g. Toyota Corolla' },
      { key: 'year', label: 'Year of manufacture', type: 'text', half: true },
      { key: 'price', label: 'Vehicle price', type: 'money', required: true, half: true },
      { key: 'deposit', label: 'Deposit you will pay yourself', type: 'money', half: true, allowZero: true },
      { key: 'seller', label: 'Who are you buying from?', type: 'chips', required: true, options: ['Dealer', 'Private seller'] },
      { key: 'sellerName', label: 'Dealer or seller name', type: 'text', half: true },
    ],
  },
  {
    key: 'HOME',
    name: 'Home Loan',
    short: 'Home purchase and housing finance.',
    description: 'Financing to buy, build or renovate a home, or to buy land to build on.',
    whatFor: ['Buying a home', 'Building a home', 'Renovating or extending', 'Buying land', 'Refinancing an existing home loan'],
    whoCanApply: ['Individuals aged 18 or over', 'Joint applicants buying together', 'Applicants who can show a stable income'],
    eligibility: [
      'Property documents (title, plans or purchase agreement)',
      'A deposit or own contribution',
      'ID, address and income documents',
      'A property valuation and affordability assessment by the lender',
    ],
    purposes: ['Buy a home', 'Build a home', 'Renovate or extend', 'Buy land', 'Refinance', 'Other'],
    terms: [60, 120, 180, 240, 300, 360],
    documents: [
      { key: 'PROPERTY_DOCUMENTS', label: 'Property documents (title deed, land certificate)', required: true },
      { key: 'PURCHASE_AGREEMENT', label: 'Purchase or sale agreement' },
      { key: 'BUILDING_ESTIMATE', label: 'Building plans or cost estimate' },
      { key: 'VALUATION', label: 'Property valuation' },
    ],
    questions: [
      { key: 'propertyType', label: 'Type of property', type: 'chips', required: true, options: ['House', 'Apartment', 'Land', 'Mixed use', 'Other'] },
      { key: 'propertyAddress', label: 'Property address or location', type: 'textarea', required: true },
      { key: 'propertyValue', label: 'Property price or estimated value', type: 'money', required: true, half: true },
      { key: 'deposit', label: 'Deposit or own contribution', type: 'money', required: true, half: true, allowZero: true },
      { key: 'firstHome', label: 'Is this your first home?', type: 'chips', required: true, options: YES_NO },
      { key: 'liveIn', label: 'Will you live in the property?', type: 'chips', required: true, options: ['Yes', 'No, it will be rented out', 'No, it is for business'] },
    ],
  },
  {
    key: 'SHORT_TERM',
    name: 'Short-term Loan',
    short: 'Short-term financial needs, where offered.',
    description: 'A smaller loan over a short period, for unexpected costs or bridging until your next income. Only available where the bank offers it.',
    whatFor: ['Unexpected bills', 'Emergency expenses', 'Short-term cash flow', 'Bridging until your next salary'],
    whoCanApply: ['Individuals aged 18 or over', 'People with a regular income', 'Customers who can repay within a short period'],
    eligibility: [
      'A valid government-issued ID',
      'Recent proof of income',
      'Recent bank statements',
      'An affordability check by the lender',
    ],
    purposes: ['Unexpected bill', 'Emergency expense', 'Short-term cash flow', 'Bridging until salary', 'Other'],
    terms: [1, 2, 3, 6, 9, 12],
    documents: [],
    questions: [
      { key: 'repaymentSource', label: 'How will you repay the loan?', type: 'textarea', required: true, placeholder: 'e.g. From my salary paid on the 25th of each month' },
      { key: 'urgency', label: 'When do you need the money?', type: 'chips', required: true, options: ['Within a week', 'Within a month', 'No rush'] },
    ],
  },
];

export const loanProduct = (key: string) => LOAN_PRODUCTS.find(p => p.key === key);

export const LOAN_CURRENCIES = RECOVERY_CURRENCIES;
export const LOAN_COUNTRIES = RECOVERY_COUNTRIES;

/** International dialling codes for the countries in LOAN_COUNTRIES. */
export const DIAL_CODES: Record<string, string> = {
  Australia: '+61', Austria: '+43', Belgium: '+32', Benin: '+229', Botswana: '+267', Brazil: '+55',
  'Burkina Faso': '+226', Cameroon: '+237', Canada: '+1', 'Central African Republic': '+236', Chad: '+235',
  China: '+86', "Côte d'Ivoire": '+225', 'Democratic Republic of the Congo': '+243', Denmark: '+45', Egypt: '+20',
  'Equatorial Guinea': '+240', Ethiopia: '+251', Finland: '+358', France: '+33', Gabon: '+241', Gambia: '+220',
  Germany: '+49', Ghana: '+233', Greece: '+30', Guinea: '+224', India: '+91', Ireland: '+353', Italy: '+39',
  Japan: '+81', Kenya: '+254', Liberia: '+231', Mali: '+223', Mexico: '+52', Morocco: '+212', Netherlands: '+31',
  'New Zealand': '+64', Niger: '+227', Nigeria: '+234', Norway: '+47', Poland: '+48', Portugal: '+351',
  'Republic of the Congo': '+242', Rwanda: '+250', 'Saudi Arabia': '+966', Senegal: '+221', 'Sierra Leone': '+232',
  Singapore: '+65', 'South Africa': '+27', Spain: '+34', Sweden: '+46', Switzerland: '+41', Tanzania: '+255',
  Togo: '+228', Tunisia: '+216', Turkey: '+90', Uganda: '+256', 'United Arab Emirates': '+971',
  'United Kingdom': '+44', 'United States': '+1', Zambia: '+260', Zimbabwe: '+263',
};
export const dialCode = (country?: string) => (country ? DIAL_CODES[country] ?? '' : '');

const KNOWN_CODES = [...new Set(Object.values(DIAL_CODES))].sort((a, b) => b.length - a.length);

/** Splits "+237 6 77 12 34 56" into { code: "+237", rest: "6 77 12 34 56" }. Works without the space too. */
export function splitPhone(v?: string) {
  const s = (v ?? '').trim();
  if (!s.startsWith('+')) return { code: '', rest: s };
  const spaced = /^(\+\d{1,4})\s+(.*)$/.exec(s);
  if (spaced && KNOWN_CODES.includes(spaced[1])) return { code: spaced[1], rest: spaced[2] };
  const code = KNOWN_CODES.find(c => s.startsWith(c));
  return code ? { code, rest: s.slice(code.length).trim() } : { code: '', rest: s };
}

/** Puts a dialling code in front of a phone number, replacing any code already there. */
export function withDialCode(phone: string, code: string) {
  const { rest } = splitPhone(phone);
  if (!rest) return '';
  return code ? `${code} ${rest}` : rest;
}

export const LOAN_EMPLOYMENT = [
  'Employed full-time', 'Employed part-time', 'Self-employed', 'Business owner', 'Contract or temporary',
  'Unemployed', 'Student', 'Retired', 'Other',
];
const NOT_WORKING = ['Unemployed', 'Student', 'Retired', ''];

export const termLabel = (m: number) =>
  m < 12 ? `${m} month${m > 1 ? 's' : ''}` : m % 12 === 0 ? `${m / 12} year${m > 12 ? 's' : ''}` : `${m} months`;

/* ---------- Form groups ---------- */

/** Step 1: what the customer needs. */
export function requirementFields(p: LoanProduct): LoanField[] {
  return [
    { key: 'amount', label: 'How much do you need?', type: 'money', required: true, half: true },
    { key: 'currency', label: 'Currency', type: 'select', required: true, half: true, options: LOAN_CURRENCIES },
    { key: 'termMonths', label: 'Preferred repayment period', type: 'select', required: true, half: true, options: p.terms.map(String), hint: 'The lender confirms the actual term in your offer.' },
    { key: 'employmentStatus', label: 'Employment status', type: 'select', required: true, half: true, options: LOAN_EMPLOYMENT },
    { key: 'purpose', label: 'Loan purpose', type: 'chips', required: true, options: p.purposes },
    { key: 'purposeDetail', label: 'Tell us more about what the money is for', type: 'textarea', required: true, minLength: 10 },
  ];
}

/** Step 2: personal information. */
export const PERSONAL_FIELDS: LoanField[] = [
  { key: 'fullName', label: 'Full legal name', type: 'text', required: true, half: true, hint: 'As shown on your ID' },
  { key: 'dateOfBirth', label: 'Date of birth', type: 'date', required: true, half: true, adult: true },
  { key: 'nationality', label: 'Nationality', type: 'select', required: true, half: true, options: LOAN_COUNTRIES },
  { key: 'country', label: 'Country of residence', type: 'select', required: true, half: true, options: LOAN_COUNTRIES },
  { key: 'address', label: 'Residential address', type: 'textarea', required: true, placeholder: 'Street, house number, area' },
  { key: 'city', label: 'City or town', type: 'text', required: true, half: true },
  { key: 'postcode', label: 'Postcode / PO box', type: 'text', half: true },
  { key: 'phone', label: 'Phone number', type: 'tel', required: true, half: true, placeholder: 'Your phone number', dialCodeFrom: 'country' },
  { key: 'email', label: 'Email address', type: 'email', required: true, half: true },
  { key: 'idType', label: 'Identification type', type: 'select', required: true, half: true, options: ['Passport', 'National ID card', 'Driving licence', 'Residence permit'] },
  { key: 'idNumber', label: 'Identification number', type: 'text', required: true, half: true },
];

/** Step 3: employment and income. `employmentStatus` (from step 1) decides what's asked. */
export const EMPLOYMENT_FIELDS: LoanField[] = [
  { key: 'employerName', label: 'Employer or business name', type: 'text', required: true, half: true, showIf: { key: 'employmentStatus', notIn: NOT_WORKING } },
  { key: 'occupation', label: 'Job title or occupation', type: 'text', required: true, half: true, showIf: { key: 'employmentStatus', notIn: NOT_WORKING } },
  { key: 'employmentLength', label: 'Length of employment or business operation', type: 'select', required: true, half: true, showIf: { key: 'employmentStatus', notIn: NOT_WORKING }, options: ['Less than 6 months', '6–12 months', '1–2 years', '3–5 years', 'More than 5 years'] },
  { key: 'monthlyIncome', label: 'Monthly income (after tax)', type: 'money', required: true, half: true, allowZero: true },
  { key: 'otherIncomeSource', label: 'Other income sources', type: 'text', half: true, placeholder: 'e.g. Rent, pension, family support' },
  { key: 'otherIncome', label: 'Other monthly income', type: 'money', half: true, allowZero: true },
  { key: 'monthlyExpenses', label: 'Monthly living expenses', type: 'money', required: true, half: true, allowZero: true, hint: 'Rent, food, transport, school fees, bills' },
  { key: 'existingRepayments', label: 'Existing loan repayments each month', type: 'money', required: true, half: true, allowZero: true, hint: 'Enter 0 if you have none' },
];

export const PAYOUT_WALLET = 'My Sterling Crest Bank wallet';
export const PAYOUT_EXTERNAL = 'Another bank account';

/** Step 4: where the money should go if approved. Never passwords, PINs or one-time codes. */
export const BANKING_FIELDS: LoanField[] = [
  { key: 'payout', label: 'Where should approved funds be paid?', type: 'chips', required: true, options: [PAYOUT_WALLET, PAYOUT_EXTERNAL] },
  { key: 'walletId', label: 'Sterling Crest Bank wallet', type: 'wallet', required: true, showIf: { key: 'payout', in: [PAYOUT_WALLET] } },
  { key: 'bankName', label: 'Bank or financial institution', type: 'text', required: true, half: true, showIf: { key: 'payout', in: [PAYOUT_EXTERNAL] } },
  { key: 'accountHolder', label: 'Account holder name', type: 'text', required: true, half: true, showIf: { key: 'payout', in: [PAYOUT_EXTERNAL] } },
  { key: 'accountCountry', label: 'Account country', type: 'select', required: true, half: true, options: LOAN_COUNTRIES, showIf: { key: 'payout', in: [PAYOUT_EXTERNAL] } },
  { key: 'accountNumber', label: 'Account number or IBAN', type: 'text', required: true, half: true, showIf: { key: 'payout', in: [PAYOUT_EXTERNAL] } },
  { key: 'swift', label: 'SWIFT / BIC or branch code', type: 'text', half: true, showIf: { key: 'payout', in: [PAYOUT_EXTERNAL] } },
];

export const BANKING_WARNING =
  'We only need these details to verify the account and pay approved funds. We will never ask for your online banking password, PIN or one-time codes. Never share them with anyone.';

/* ---------- Documents ---------- */

export const LOAN_COMMON_DOCUMENTS: { key: string; label: string; hint: string; required?: boolean }[] = [
  { key: 'ID', label: 'Government-issued identification', hint: 'Passport, national ID or other accepted ID', required: true },
  { key: 'PROOF_OF_ADDRESS', label: 'Proof of address', hint: 'Utility bill or other accepted address document', required: true },
  { key: 'PROOF_OF_INCOME', label: 'Proof of income', hint: 'Recent payslips or other income evidence', required: true },
  { key: 'BANK_STATEMENTS', label: 'Bank statements', hint: 'Recent statements showing income and activity', required: true },
  { key: 'EMPLOYMENT', label: 'Employment verification', hint: 'Employment letter or business records' },
];

/**
 * Every document for a product: common ones, the product's own, then "additional".
 * `required` here means "recommended": the customer can submit with any one document,
 * and staff ask for anything else they need.
 */
export function loanDocuments(p: LoanProduct) {
  return [
    ...LOAN_COMMON_DOCUMENTS,
    ...p.documents.map(d => ({ ...d, hint: d.required ? 'Usually needed for this loan' : 'If you have it' })),
    { key: 'ADDITIONAL', label: 'Additional supporting documents', hint: 'Anything else that supports your application' },
  ];
}

export const LOAN_DOC_MIME = ['application/pdf', 'image/jpeg', 'image/png'];
export const LOAN_DOC_MAX_BYTES = 10 * 1024 * 1024;
export const LOAN_MAX_DOCS = 25;

/* ---------- Validation (same rules in the browser and on the server) ---------- */

export type LoanGroup = Record<string, string>;
export interface LoanData {
  requirements: LoanGroup;
  answers: LoanGroup;
  personal: LoanGroup;
  employment: LoanGroup;
  banking: LoanGroup;
}

export const parseAmount = (v?: string) => {
  const n = parseFloat(String(v ?? '').replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? n : NaN;
};

export function fieldVisible(f: LoanField, values: LoanGroup, ctx: LoanGroup = {}) {
  if (!f.showIf) return true;
  const v = values[f.showIf.key] ?? ctx[f.showIf.key] ?? '';
  if (f.showIf.in && !f.showIf.in.includes(v)) return false;
  if (f.showIf.notIn && f.showIf.notIn.includes(v)) return false;
  return true;
}

/** Errors for one group of fields, keyed by field key. */
export function fieldErrors(fields: LoanField[], values: LoanGroup, ctx: LoanGroup = {}) {
  const out: Record<string, string> = {};
  for (const f of fields) {
    if (!fieldVisible(f, values, ctx)) continue;
    const v = (values[f.key] ?? '').trim();
    if (!v) {
      if (f.required) out[f.key] = 'This is required';
      continue;
    }
    if (f.type === 'money') {
      const n = parseAmount(v);
      if (!Number.isFinite(n) || n < 0 || (!f.allowZero && n === 0) || n > 1e11) out[f.key] = 'Enter a valid amount';
    } else if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) out[f.key] = 'Enter a valid email address';
    else if (f.type === 'tel') {
      const { code, rest } = splitPhone(v);
      const digits = rest.replace(/\D/g, '').length;
      if (digits < 6 || digits > 14) out[f.key] = 'Enter a valid phone number';
      else if (f.dialCodeFrom && dialCode(values[f.dialCodeFrom]) && code !== dialCode(values[f.dialCodeFrom])) {
        out[f.key] = `Use a ${values[f.dialCodeFrom]} number (${dialCode(values[f.dialCodeFrom])})`;
      }
    }
    else if (f.type === 'date') {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) out[f.key] = 'Enter a valid date';
      else if (f.adult) {
        const age = (Date.now() - d.getTime()) / (365.25 * 86_400_000);
        if (age < 18) out[f.key] = 'You must be at least 18 to apply';
        else if (age > 110) out[f.key] = 'Check the date';
      }
    } else if ((f.type === 'select' || f.type === 'chips') && f.options && !f.options.includes(v)) out[f.key] = 'Choose an option';
    if (!out[f.key] && f.minLength && v.length < f.minLength) out[f.key] = `At least ${f.minLength} characters`;
  }
  return out;
}

/** Errors per form step (requirements + product questions, personal, employment, banking). */
export function loanStepErrors(productKey: string, d: LoanData) {
  const p = loanProduct(productKey);
  if (!p) return { requirements: { product: 'Unknown loan' }, answers: {}, personal: {}, employment: {}, banking: {} };
  return {
    requirements: fieldErrors(requirementFields(p), d.requirements),
    answers: fieldErrors(p.questions, d.answers),
    personal: fieldErrors(PERSONAL_FIELDS, d.personal),
    employment: fieldErrors(EMPLOYMENT_FIELDS, d.employment, d.requirements),
    banking: fieldErrors(BANKING_FIELDS, d.banking),
  };
}

/** Recommended documents not uploaded yet (shown to staff, who decide whether to ask for them). */
export function missingLoanDocs(productKey: string, kinds: string[]) {
  const p = loanProduct(productKey);
  if (!p) return [];
  return loanDocuments(p).filter(d => d.required && !kinds.includes(d.key)).map(d => d.label);
}

/** To submit, at least one document is needed. Staff review completeness and request the rest. */
export const LOAN_MIN_DOCS = 1;
export const loanDocsReady = (count: number) => count >= LOAN_MIN_DOCS;

/** Everything still missing before submission, as readable labels. */
export function loanMissing(productKey: string, d: LoanData, docKinds: string[]) {
  const p = loanProduct(productKey);
  if (!p) return ['Loan product'];
  const e = loanStepErrors(productKey, d);
  const label = (fields: LoanField[], k: string) => fields.find(f => f.key === k)?.label ?? k;
  return [
    ...Object.keys(e.requirements).map(k => label(requirementFields(p), k)),
    ...Object.keys(e.answers).map(k => label(p.questions, k)),
    ...Object.keys(e.personal).map(k => label(PERSONAL_FIELDS, k)),
    ...Object.keys(e.employment).map(k => label(EMPLOYMENT_FIELDS, k)),
    ...Object.keys(e.banking).map(k => label(BANKING_FIELDS, k)),
    ...(loanDocsReady(docKinds.length) ? [] : ['At least one supporting document']),
  ];
}

/** Monthly income left after expenses and existing repayments (major units), for staff review. */
export function loanAffordability(employment: LoanGroup) {
  const n = (k: string) => (Number.isFinite(parseAmount(employment[k])) ? parseAmount(employment[k]) : 0);
  const income = n('monthlyIncome') + n('otherIncome');
  const outgoings = n('monthlyExpenses') + n('existingRepayments');
  return { income, outgoings, disposable: income - outgoings };
}

/** Standard repayment (annuity) per month, in minor units. 0% → straight division. */
export function loanMonthlyPayment(principalMinor: number, ratePct: number, months: number) {
  if (!principalMinor || !months) return 0;
  const r = ratePct / 100 / 12;
  if (!r) return Math.round(principalMinor / months);
  return Math.round((principalMinor * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1));
}

/* ---------- Statuses ---------- */

export const LOAN_STATUSES = [
  { key: 'DRAFT', label: 'Draft', meaning: 'Application not submitted' },
  { key: 'SUBMITTED', label: 'Submitted', meaning: 'Application received' },
  { key: 'UNDER_REVIEW', label: 'Under Review', meaning: 'Application being examined' },
  { key: 'DOCUMENTS_REQUIRED', label: 'Documents Required', meaning: 'Additional documents needed' },
  { key: 'VERIFICATION', label: 'Verification in Progress', meaning: 'Identity and financial information being verified' },
  { key: 'ASSESSMENT', label: 'Assessment in Progress', meaning: 'Repayment capacity and eligibility being evaluated' },
  { key: 'APPROVED', label: 'Approved', meaning: 'The lender has approved the application' },
  { key: 'CONDITIONALLY_APPROVED', label: 'Conditionally Approved', meaning: 'Approval subject to specified conditions' },
  { key: 'REJECTED', label: 'Rejected', meaning: 'Application declined' },
  { key: 'OFFER_ISSUED', label: 'Offer Issued', meaning: 'Formal loan offer available' },
  { key: 'AWAITING_SIGNATURE', label: 'Awaiting Signature', meaning: 'You need to sign the loan agreement' },
  { key: 'AGREEMENT_COMPLETED', label: 'Agreement Completed', meaning: 'The agreement has been signed' },
  { key: 'DISBURSEMENT_PROCESSING', label: 'Disbursement Processing', meaning: 'The lender is arranging payment' },
  { key: 'DISBURSED', label: 'Disbursed', meaning: 'Funds have been sent and receipt confirmed' },
  { key: 'CLOSED', label: 'Closed', meaning: 'Application process completed' },
] as const;
export type LoanStatus = (typeof LOAN_STATUSES)[number]['key'];
export const loanStatus = (key: string) => LOAN_STATUSES.find(s => s.key === key);

/** No more changes or uploads from the customer. */
export const LOAN_FINAL: LoanStatus[] = ['REJECTED', 'CLOSED'];
/** Something is waiting on the customer. */
export const LOAN_NEEDS_CUSTOMER: LoanStatus[] = ['DOCUMENTS_REQUIRED', 'OFFER_ISSUED', 'AWAITING_SIGNATURE'];
/** Lender has said yes (from approval onwards). */
export const LOAN_APPROVED_STAGE: LoanStatus[] = [
  'APPROVED', 'CONDITIONALLY_APPROVED', 'OFFER_ISSUED', 'AWAITING_SIGNATURE', 'AGREEMENT_COMPLETED', 'DISBURSEMENT_PROCESSING', 'DISBURSED',
];

/** The formal offer issued by the lender. Amounts in minor units. */
export interface LoanOffer {
  amountMinor: number;
  currency: string;
  ratePct: number;
  termMonths: number;
  monthlyMinor: number;
  totalMinor: number;
  fees?: string | null;
  conditions?: string | null;
  expiresAt?: string | null;
  issuedAt: string;
  lender: string;
}

/** Demo agreement wording, built from the offer. The bank's legal team must review it before real use. */
export function loanAgreementText(o: LoanOffer, borrower: string, productName: string, money: (minor: number, cur: string) => string) {
  return [
    `This agreement is between ${o.lender} ("the Lender") and ${borrower} ("the Borrower") for a ${productName}.`,
    `1. Loan amount. The Lender agrees to lend ${money(o.amountMinor, o.currency)} to the Borrower.`,
    `2. Interest. Interest is charged at ${o.ratePct}% a year (APR) on the outstanding balance.`,
    `3. Repayment. The Borrower will repay ${o.termMonths} monthly instalments of ${money(o.monthlyMinor, o.currency)}, a total of ${money(o.totalMinor, o.currency)}.`,
    `4. Fees. ${o.fees?.trim() ? o.fees : 'No fees apply other than those stated in this agreement.'}`,
    `5. Conditions. ${o.conditions?.trim() ? o.conditions : 'None beyond the terms in this agreement.'}`,
    '6. Late or missed payments. The Borrower must contact the Lender as soon as possible if a payment may be missed. Missed payments may lead to extra charges and may affect the Borrower’s credit record.',
    '7. Early repayment. The Borrower may repay all or part of the loan early. Any early-repayment charge is stated in the fees above.',
    '8. Disbursement. Funds are paid to the account chosen in the application once this agreement is signed and any conditions are met.',
    '9. Signature. By typing their full name and confirming below, the Borrower signs this agreement electronically.',
  ];
}
