export type Option = { value: string; label: string };

// Curated list. We store ISO-3166-1 alpha-2 codes in DB, but display full names in UI.
export const COUNTRY_OPTIONS: Option[] = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'IE', label: 'Ireland' },
  { value: 'FR', label: 'France' },
  { value: 'DE', label: 'Germany' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'ES', label: 'Spain' },
  { value: 'IT', label: 'Italy' },
  { value: 'CH', label: 'Switzerland' },
  { value: 'SE', label: 'Sweden' },
  { value: 'NO', label: 'Norway' },
  { value: 'DK', label: 'Denmark' },
  { value: 'AU', label: 'Australia' },
  { value: 'NZ', label: 'New Zealand' },
  { value: 'MX', label: 'Mexico' },
  { value: 'OTHER', label: 'Other' },
];

export const US_STATE_OPTIONS: Option[] = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'DC', label: 'District of Columbia' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

export const CA_PROVINCE_OPTIONS: Option[] = [
  { value: 'AB', label: 'Alberta' },
  { value: 'BC', label: 'British Columbia' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'NB', label: 'New Brunswick' },
  { value: 'NL', label: 'Newfoundland and Labrador' },
  { value: 'NT', label: 'Northwest Territories' },
  { value: 'NS', label: 'Nova Scotia' },
  { value: 'NU', label: 'Nunavut' },
  { value: 'ON', label: 'Ontario' },
  { value: 'PE', label: 'Prince Edward Island' },
  { value: 'QC', label: 'Quebec' },
  { value: 'SK', label: 'Saskatchewan' },
  { value: 'YT', label: 'Yukon' },
];

export function normalizeCountryCode(input?: string): string {
  if (!input) return '';
  const s = String(input).trim();
  if (!s) return '';

  // If already a 2-letter code, keep it (uppercased)
  if (/^[A-Za-z]{2}$/.test(s)) return s.toUpperCase();

  const lowered = s.toLowerCase();

  // Common names we might have stored previously
  if (lowered === 'united states' || lowered === 'united states of america' || lowered === 'usa') return 'US';
  if (lowered === 'canada') return 'CA';
  if (lowered === 'united kingdom' || lowered === 'uk' || lowered === 'great britain') return 'GB';
  if (lowered === 'ireland') return 'IE';
  if (lowered === 'france') return 'FR';
  if (lowered === 'germany') return 'DE';
  if (lowered === 'netherlands') return 'NL';
  if (lowered === 'spain') return 'ES';
  if (lowered === 'italy') return 'IT';
  if (lowered === 'switzerland') return 'CH';
  if (lowered === 'sweden') return 'SE';
  if (lowered === 'norway') return 'NO';
  if (lowered === 'denmark') return 'DK';
  if (lowered === 'australia') return 'AU';
  if (lowered === 'new zealand') return 'NZ';
  if (lowered === 'mexico') return 'MX';
  if (lowered === 'other') return 'OTHER';

  // Try to match against curated option labels
  const found = COUNTRY_OPTIONS.find(o => o.label.toLowerCase() === lowered);
  return found?.value || '';
}

export function getRegionOptionsForCountry(countryCode: string): Option[] | null {
  const c = (countryCode || '').toUpperCase();
  if (c === 'US') return US_STATE_OPTIONS;
  if (c === 'CA') return CA_PROVINCE_OPTIONS;
  return null;
}


