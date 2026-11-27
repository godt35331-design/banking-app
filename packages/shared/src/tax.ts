/**
 * Tax refund claims: countries, national tax ID formats, employment statuses and required documents.
 * Used by the web form (live checking) and the API (final validation), so both always agree.
 */

export interface TaxCountry {
  code: string;
  name: string;
  /** What the national tax / insurance number is called in that country. */
  idName: string;
  placeholder: string;
  hint: string;
  /** Tax year runs 6 April → 5 April (UK) instead of the calendar year. */
  aprilTaxYear?: boolean;
}

export const TAX_COUNTRIES: TaxCountry[] = [
  { code: 'GB', name: 'United Kingdom', idName: 'National Insurance number', placeholder: 'QQ 12 34 56 C', hint: '2 letters, 6 numbers, then A, B, C or D', aprilTaxYear: true },
  { code: 'IE', name: 'Ireland', idName: 'PPS number', placeholder: '1234567TW', hint: '7 numbers followed by 1 or 2 letters' },
  { code: 'US', name: 'United States', idName: 'Social Security number', placeholder: '123-45-6789', hint: '9 numbers, written as 3-2-4' },
  { code: 'CA', name: 'Canada', idName: 'Social Insurance number', placeholder: '130 692 544', hint: '9 numbers' },
  { code: 'AU', name: 'Australia', idName: 'Tax File number', placeholder: '123 456 782', hint: '8 or 9 numbers' },
  { code: 'DE', name: 'Germany', idName: 'Tax ID (Steuer-ID)', placeholder: '12 345 678 901', hint: '11 numbers, not starting with 0' },
  { code: 'FR', name: 'France', idName: 'Social security number (NIR)', placeholder: '1 85 05 78 006 084 36', hint: '15 numbers, starting with 1 or 2' },
  { code: 'NL', name: 'Netherlands', idName: 'BSN', placeholder: '111 222 333', hint: '9 numbers' },
  { code: 'GH', name: 'Ghana', idName: 'Ghana Card PIN', placeholder: 'GHA-123456789-0', hint: 'GHA, then 9 numbers and 1 check number' },
  { code: 'NG', name: 'Nigeria', idName: 'National Identification Number (NIN)', placeholder: '12345678901', hint: '11 numbers' },
];

export const taxCountry = (code: string) => TAX_COUNTRIES.find(c => c.code === code);

const luhnOk = (digits: string) => {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
};

/** Dutch BSN "11-proof" check. */
const elevenProofOk = (d: string) => {
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += Number(d[i]) * (9 - i);
  sum -= Number(d[8]);
  return sum % 11 === 0;
};

/**
 * Checks a tax ID against the country's format.
 * Returns the cleaned-up value (spaces/dashes removed, upper-case) or null if it doesn't match.
 */
export function validateTaxId(country: string, raw: string): string | null {
  const v = raw.toUpperCase().replace(/[\s-]/g, '');
  switch (country) {
    case 'GB':
      return /^(?!BG|GB|KN|NK|NT|TN|ZZ)[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$/.test(v) ? v : null;
    case 'IE':
      return /^\d{7}[A-W][A-IW]?$/.test(v) ? v : null;
    case 'US':
      return /^(?!000|666|9\d\d)\d{3}(?!00)\d{2}(?!0000)\d{4}$/.test(v) ? v : null;
    case 'CA':
      return /^[1-9]\d{8}$/.test(v) && luhnOk(v) ? v : null;
    case 'AU':
      return /^\d{8,9}$/.test(v) ? v : null;
    case 'DE':
      return /^[1-9]\d{10}$/.test(v) ? v : null;
    case 'FR':
      return /^[12]\d{14}$/.test(v) ? v : null;
    case 'NL':
      return /^\d{9}$/.test(v) && elevenProofOk(v) ? v : null;
    case 'GH':
      return /^GHA\d{10}$/.test(v) ? v : null;
    case 'NG':
      return /^\d{11}$/.test(v) ? v : null;
    default:
      return null;
  }
}

/** Formats a cleaned tax ID the way it's usually written in that country. */
export function formatTaxId(country: string, v: string): string {
  switch (country) {
    case 'GB':
      return v.replace(/^(..)(..)(..)(..)(.)$/, '$1 $2 $3 $4 $5');
    case 'US':
      return v.replace(/^(\d{3})(\d{2})(\d{4})$/, '$1-$2-$3');
    case 'CA':
    case 'NL':
      return v.replace(/^(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3');
    case 'GH':
      return v.replace(/^(GHA)(\d{9})(\d)$/, '$1-$2-$3');
    default:
      return v;
  }
}

/** "2024/25" for April tax years, otherwise "2024". */
export function taxYearLabel(country: string, startYear: number): string {
  return taxCountry(country)?.aprilTaxYear ? `${startYear}/${String(startYear + 1).slice(-2)}` : String(startYear);
}

export const EMPLOYMENT_STATUSES = [
  { value: 'EMPLOYED', label: 'Employed' },
  { value: 'SELF_EMPLOYED', label: 'Self-employed' },
  { value: 'EMPLOYED_AND_SELF_EMPLOYED', label: 'Employed and self-employed' },
  { value: 'UNEMPLOYED', label: 'Unemployed' },
  { value: 'RETIRED', label: 'Retired' },
  { value: 'STUDENT', label: 'Student' },
] as const;

export const TAX_DOCUMENTS = [
  { type: 'P60', label: 'P60', desc: 'End-of-year certificate from your employer showing pay and tax for the year' },
  { type: 'P45', label: 'P45', desc: 'Given by your employer when you leave a job' },
  { type: 'PAYSLIP', label: 'Payslip', desc: 'A recent payslip from the tax year you are claiming for' },
  { type: 'P800', label: 'P800 tax calculation', desc: 'The letter from the tax office showing you paid too much or too little' },
  { type: 'PROOF_OF_ID', label: 'Proof of identity', desc: 'Passport, driving licence or national ID card' },
  { type: 'BANK_EVIDENCE', label: 'Bank account evidence', desc: 'A bank statement showing your name and account details' },
] as const;
export type TaxDocumentType = (typeof TAX_DOCUMENTS)[number]['type'];

/** Accepted upload types and size. */
export const TAX_DOC_MIME = ['application/pdf', 'image/jpeg', 'image/png'];
export const TAX_DOC_MAX_BYTES = 10 * 1024 * 1024;
