import React, { useEffect, useMemo, useState } from 'react';
import {
  Event,
  Registration,
  COMPANY_TYPES,
  MASSAGE_TIME_SLOTS,
  MEAL_OPTIONS,
  GOLF_CLUB_PREFERENCES,
  isEventExpired,
} from '../../types';
import { formatDateShort } from '../../utils/dateUtils';
import '../../styles/RegistrationModal.css';

/**
 * Helper function to convert a date string (YYYY-MM-DD) to Eastern Time midnight
 * Florida uses Eastern Time (America/New_York timezone)
 * Returns the UTC timestamp that represents midnight Eastern Time on the given date
 * 
 * This function handles DST automatically by using Intl.DateTimeFormat
 */
function getEasternTimeMidnight(dateString: string): number {
  if (!dateString) return -Infinity;
  
  try {
    // Parse the date string
    const [year, month, day] = dateString.split('-').map(Number);
    if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) {
      // Fallback to UTC parsing
      return new Date(dateString + 'T00:00:00Z').getTime();
    }
    
    // Strategy: Find the UTC timestamp that, when converted to Eastern Time, equals midnight
    // Start with UTC midnight on that date
    let guessUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    
    // Check what Eastern time this UTC time represents
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    let easternTime = formatter.format(guessUtc);
    let [easternHour, easternMinute] = easternTime.split(':').map(Number);
    
    // Adjust until we get midnight Eastern (00:00)
    let iterations = 0;
    while ((easternHour !== 0 || easternMinute !== 0) && iterations < 10) {
      // Calculate adjustment needed
      const hoursToSubtract = easternHour;
      const minutesToSubtract = easternMinute;
      const adjustmentMs = (hoursToSubtract * 60 + minutesToSubtract) * 60 * 1000;
      
      guessUtc = new Date(guessUtc.getTime() - adjustmentMs);
      
      easternTime = formatter.format(guessUtc);
      [easternHour, easternMinute] = easternTime.split(':').map(Number);
      iterations++;
    }
    
    return guessUtc.getTime();
  } catch (error) {
    // Fallback to UTC parsing if Eastern Time conversion fails
    console.warn(`Failed to parse date ${dateString} as Eastern Time, using UTC:`, error);
    return new Date(dateString + 'T00:00:00Z').getTime();
  }
}

/**
 * Get Eastern Time end of day for a date string
 * Returns the start of the next day (exclusive) to ensure the full end date is included
 * Example: For Dec 11, returns Dec 12 00:00:00 Eastern Time
 * This way, any time on Dec 11 will be < Dec 12 00:00:00, so it's included
 */
function getEasternTimeEndOfDay(dateString: string): number {
  if (!dateString) return Infinity;
  
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) {
      // Fallback: add 1 day and get midnight
      const fallbackDate = new Date(dateString + 'T00:00:00Z');
      fallbackDate.setUTCDate(fallbackDate.getUTCDate() + 1);
      return getEasternTimeMidnight(`${fallbackDate.getUTCFullYear()}-${String(fallbackDate.getUTCMonth() + 1).padStart(2, '0')}-${String(fallbackDate.getUTCDate()).padStart(2, '0')}`);
    }
    
    // Get midnight of next day in Eastern Time
    // This makes the end date exclusive, so Dec 11 includes all of Dec 11 up to (but not including) Dec 12
    const nextDay = new Date(year, month - 1, day + 1);
    const nextDayStr = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`;
    return getEasternTimeMidnight(nextDayStr);
  } catch (error) {
    console.warn(`Failed to parse end date ${dateString} as Eastern Time, using UTC:`, error);
    const fallbackDate = new Date(dateString + 'T00:00:00Z');
    fallbackDate.setUTCDate(fallbackDate.getUTCDate() + 1);
    return fallbackDate.getTime();
  }
}

/**
 * Get current time converted to Eastern Time for comparison
 * Returns a UTC timestamp that represents the current Eastern Time
 * This can be directly compared with Eastern Time midnight timestamps
 */
function getCurrentEasternTime(): number {
  const now = new Date();
  
  // Get current date/time components in Eastern Time
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1;
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
  const second = parseInt(parts.find(p => p.type === 'second')?.value || '0');
  
  // Get the Eastern Time midnight for today's date
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const easternMidnight = getEasternTimeMidnight(dateStr);
  
  // Add the hours, minutes, seconds to get the current time in Eastern Time
  // This gives us a UTC timestamp that represents the current Eastern Time
  const hoursMs = hour * 60 * 60 * 1000;
  const minutesMs = minute * 60 * 1000;
  const secondsMs = second * 1000;
  
  return easternMidnight + hoursMs + minutesMs + secondsMs;
}

interface UserRegistrationProps {
  events: Event[];
  registrations: Registration[];
  user: { id: number; name: string; email: string };
  targetEventId?: number | null;
  onBack: () => void;
  onSave: (regData: Registration) => void;
  isAdminEdit?: boolean; // True when admin is editing/creating registration
}

export const UserRegistration: React.FC<UserRegistrationProps> = ({
  events,
  registrations,
  user,
  targetEventId,
  onBack,
  onSave,
  isAdminEdit = false,
}) => {
  const toBooleanYesNo = (v: any): boolean => v === true || v === 'Yes' || v === 'yes' || v === 1;
  const activeEvent = useMemo(() => events.find(e => !isEventExpired(e.date)), [events]);
  const event = useMemo(
    () => (targetEventId ? (events.find(e => e.id === targetEventId) || activeEvent) : activeEvent),
    [events, targetEventId, activeEvent]
  );

  const registration = useMemo(
    () => (event ? registrations.find(r => r.userId === user.id && r.eventId === event.id) || null : null),
    [registrations, user, event]
  );

  const isEditing = !!registration;
  const isAlreadyPaid = !!(registration as any)?.paid;
  const hadSpouseTicket = toBooleanYesNo((registration as any)?.spouseDinnerTicket);
  const hadSpousePayment = !!(registration as any)?.spousePaymentId;

  const [formData, setFormData] = useState<Partial<Registration>>({
    // Personal Information
    firstName: registration?.firstName || user.name.split(' ')[0] || '',
    lastName: registration?.lastName || user.name.split(' ').slice(1).join(' ') || '',
    badgeName: registration?.badgeName || '',
    email: registration?.email || user.email || '',
    secondaryEmail: registration?.secondaryEmail || '',
    organization: registration?.organization || '',
    jobTitle: registration?.jobTitle || '',
    address: registration?.address || '',
    mobile: registration?.mobile || '',
    officePhone: registration?.officePhone || '',
    isFirstTimeAttending: registration?.isFirstTimeAttending !== undefined ? registration.isFirstTimeAttending : undefined,
    companyType: registration?.companyType || '',
    companyTypeOther: registration?.companyTypeOther || '',
    emergencyContactName: registration?.emergencyContactName || '',
    emergencyContactPhone: registration?.emergencyContactPhone || '',

    // Conference Events
    wednesdayActivity: registration?.wednesdayActivity || '',
    golfHandicap: registration?.golfHandicap || '',
    massageTimeSlot: registration?.massageTimeSlot || '8:00 AM- 10:00 AM',
    pickleballEquipment: (registration as any)?.pickleballEquipment !== undefined ? (registration as any).pickleballEquipment : undefined,

    // Conference Meals
    wednesdayReception: (registration?.wednesdayReception || '') as any,
    thursdayBreakfast: (registration?.thursdayBreakfast || '') as any,
    thursdayLuncheon: (registration?.thursdayLuncheon || '') as any,
    thursdayDinner: (registration?.thursdayDinner || '') as any,
    fridayBreakfast: (registration?.fridayBreakfast || '') as any,
    tuesdayEarlyReception: (registration as any)?.tuesdayEarlyReception || '',
    dietaryRestrictions: registration?.dietaryRestrictions || '',
    specialRequests: (registration as any)?.specialRequests || '',

    // Spouse/Guest Information
    spouseDinnerTicket: toBooleanYesNo((registration as any)?.spouseDinnerTicket) || false,
    spouseFirstName: registration?.spouseFirstName || '',
    spouseLastName: registration?.spouseLastName || '',
    // Child Information
    // childLunchTicket: (registration as any)?.childLunchTicket || false,
    // childFirstName: (registration as any)?.childFirstName || '',
    // childLastName: (registration as any)?.childLastName || '',

    // Payment Information
    totalPrice: registration?.totalPrice || 675,
    paymentMethod: registration?.paymentMethod || 'Card',
    paid: registration?.paid ?? false,

    // Legacy fields
    name: registration?.name || user.name,
    category: registration?.category || 'Networking',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [squareSdkLoading, setSquareSdkLoading] = useState(false);
  // Address fields (split) - prefer new separate fields, fallback to parsing legacy address field
  const parseAddress = (addr?: string) => {
    const res = { street:'', city:'', state:'', zip:'', country:'' };
    if (!addr) return res;
    const lines = String(addr).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    if (lines[0]) res.street = lines[0];
    if (lines[1]) {
      const m = lines[1].match(/^(.*?)[,]\s*(\w{2,})\s*(\w+)?$/);
      if (m) { res.city = m[1] || ''; res.state = m[2] || ''; res.zip = (m[3]||''); }
      else { res.city = lines[1]; }
    }
    if (lines[2]) res.country = lines[2];
    return res;
  };
  // Use new separate fields if available, otherwise parse legacy address field
  // Since these are separate database fields, always prefer them if the registration object exists
  // The fields may be null/undefined, but we should still use the structure
  const initialAddr = registration && (
    registration.addressStreet !== undefined || 
    registration.city !== undefined || 
    registration.state !== undefined || 
    registration.zipCode !== undefined || 
    registration.country !== undefined
  )
    ? {
        street: registration.addressStreet ?? '',
        city: registration.city ?? '',
        state: registration.state ?? '',
        zip: registration.zipCode ?? '',
        country: registration.country ?? ''
      }
    : parseAddress(registration?.address);
  const [addrStreet, setAddrStreet] = useState<string>(initialAddr.street);
  const [addrCity, setAddrCity] = useState<string>(initialAddr.city);
  const [addrState, setAddrState] = useState<string>(initialAddr.state);
  const [addrZip, setAddrZip] = useState<string>(initialAddr.zip);
  const [addrCountry, setAddrCountry] = useState<string>(initialAddr.country);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cardInstance, setCardInstance] = useState<any | null>(null);
  
  // Club rentals state: track if user needs rentals (Yes/No) and their preference
  const initialNeedsRentals = useMemo(() => {
    const cr = registration?.clubRentals;
    // If clubRentals is a string and not 'I will bring my own', they need rentals
    return !!(cr && cr !== 'I will bring my own' && cr !== '');
  }, [registration?.clubRentals]);
  
  const [needsClubRentals, setNeedsClubRentals] = useState<boolean>(initialNeedsRentals);
  const [golfClubPreference, setGolfClubPreference] = useState<string>(
    initialNeedsRentals && registration?.clubRentals ? registration.clubRentals : ''
  );
  
  // Update needsClubRentals when registration changes
  useEffect(() => {
    const cr = registration?.clubRentals;
    const needs = !!(cr && cr !== 'I will bring my own' && cr !== '');
    setNeedsClubRentals(needs);
    if (needs && cr) {
      setGolfClubPreference(cr);
    } else {
      setGolfClubPreference('');
    }
  }, [registration?.clubRentals]);

  const spouseDinnerSelected = !!formData.spouseDinnerTicket;
  // const childLunchSelected = !!(formData as any).childLunchTicket;
  const regTiers = useMemo(() => event?.registrationPricing || [], [event?.registrationPricing]);
  const spouseTiers = useMemo(() => event?.spousePricing || [], [event?.spousePricing]);
  // const childLunchPrice = useMemo(() => event?.childLunchPrice || 0, [event?.childLunchPrice]);

  // Ensure spouse ticket stays checked if payment was made
  useEffect(() => {
    if (hadSpousePayment && !formData.spouseDinnerTicket) {
      setFormData(prev => ({ ...prev, spouseDinnerTicket: true }));
    }
  }, [hadSpousePayment, formData.spouseDinnerTicket]);

  useEffect(() => {
    // If registration is already paid and spouse status hasn't changed, preserve the original totalPrice
    // Only recalculate for new registrations, unpaid registrations, or when adding spouse to paid registration
    if (isAlreadyPaid && formData.spouseDinnerTicket === hadSpouseTicket) {
      // Registration is paid and spouse status unchanged - preserve original price
      const originalPrice = registration?.totalPrice || 675;
      setFormData(prev => {
        if (prev.totalPrice !== originalPrice) {
          return { ...prev, totalPrice: originalPrice };
        }
        return prev;
      });
      return;
    }

    // For paid registrations where spouse is being added, preserve original registration price
    // and only calculate spouse tier price
    if (isAlreadyPaid && formData.spouseDinnerTicket && !hadSpouseTicket) {
      // Adding spouse to paid registration - preserve original reg price, calculate spouse price
      const originalRegPrice = registration?.totalPrice || 675;
      const now = getCurrentEasternTime();
      const withBounds = (arr: any[] = []) =>
        arr
          .map((t: any) => ({
            ...t,
            s: t.startDate ? getEasternTimeMidnight(t.startDate) : -Infinity,
            e: t.endDate ? getEasternTimeEndOfDay(t.endDate) : Infinity,
          }))
          .sort((a: any, b: any) => a.s - b.s);
      const pickTier = (tiers: any[]) => {
        if (!tiers || tiers.length === 0) return null;
        const active = tiers.find(t => now >= t.s && now < t.e);
        if (active) return active;
        if (now < tiers[0].s) return tiers[0];
        if (now >= tiers[tiers.length - 1].e) return tiers[tiers.length - 1];
        const upcoming = tiers.find(t => now < t.s);
        return upcoming || tiers[tiers.length - 1];
      };
      const spouseActive = pickTier(withBounds(spouseTiers));
      const spousePrice = spouseActive?.price ?? 200;
      const total = originalRegPrice + spousePrice;
      setFormData(prev => ({ ...prev, totalPrice: total }));
      return;
    }

    // For new registrations or unpaid registrations, calculate price based on current tier
    // Use Eastern Time (Florida timezone) for tier date comparisons to match backend
    const now = getCurrentEasternTime();
    
    const withBounds = (arr: any[] = []) =>
      arr
        .map((t: any) => ({
          ...t,
          // Convert tier dates to Eastern Time midnight/end-of-day to match backend
          s: t.startDate ? getEasternTimeMidnight(t.startDate) : -Infinity,
          e: t.endDate ? getEasternTimeEndOfDay(t.endDate) : Infinity,
        }))
        .sort((a: any, b: any) => a.s - b.s);
    const pickTier = (tiers: any[]) => {
      if (!tiers || tiers.length === 0) return null;
      // Find active tier: now >= startDate AND now < endDate (end date is exclusive - start of next day)
      const active = tiers.find(t => now >= t.s && now < t.e);
      if (active) return active;
      // If before first tier, return first tier
      if (now < tiers[0].s) return tiers[0];
      // If after last tier, return last tier
      if (now >= tiers[tiers.length - 1].e) return tiers[tiers.length - 1];
      // Find next upcoming tier
      const upcoming = tiers.find(t => now < t.s);
      return upcoming || tiers[tiers.length - 1];
    };
    const regActive = pickTier(withBounds(regTiers));
    const spouseActive = pickTier(withBounds(spouseTiers));
    let total = regActive?.price ?? 675;
    if (spouseDinnerSelected) total += spouseActive?.price ?? 200;
    // if (childLunchSelected) total += childLunchPrice;
    setFormData(prev => ({ ...prev, totalPrice: total }));
  }, [isEditing, isAlreadyPaid, hadSpouseTicket, formData.spouseDinnerTicket, spouseDinnerSelected, registration?.totalPrice, /* childLunchSelected, childLunchPrice, */ regTiers, spouseTiers]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName?.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName?.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.badgeName?.trim()) newErrors.badgeName = 'Badge name is required';
    if (!formData.email?.trim()) newErrors.email = 'Email is required';
    if (!formData.organization?.trim()) newErrors.organization = 'Organization is required';
    if (!formData.jobTitle?.trim()) newErrors.jobTitle = 'Job title is required';
    if (!addrStreet.trim()) newErrors.address = 'Address is required';
    if (!addrCity.trim()) newErrors.city = 'City is required';
    if (!addrState.trim()) newErrors.state = 'State is required';
    if (!addrZip.trim()) newErrors.zip = 'Zip code is required';
    if (!addrCountry.trim()) newErrors.country = 'Country is required';
    if (!formData.mobile?.trim()) newErrors.mobile = 'Mobile number is required';
    if (!formData.companyType?.trim()) newErrors.companyType = 'Please choose an option';
    if (!formData.wednesdayActivity?.trim()) newErrors.wednesdayActivity = 'Please choose an option';
    // Validate first time attending
    if (formData.isFirstTimeAttending === undefined || formData.isFirstTimeAttending === null) {
      (newErrors as any).isFirstTimeAttending = 'Please choose an option';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    // Validate golf club preference if rentals are needed
    if (needsClubRentals && !golfClubPreference?.trim()) {
      newErrors.golfClubPreference = 'Please choose an option';
    }
    // Validate massage time slot if Massage is selected
    if ((formData.wednesdayActivity || '').toLowerCase().includes('massage') && !(formData as any).massageTimeSlot?.trim()) {
      newErrors.massageTimeSlot = 'Please choose an option';
    }
    // Validate pickleball equipment if Pickleball is selected
    if ((formData.wednesdayActivity || '').toLowerCase().includes('pickleball') && (formData as any).pickleballEquipment === undefined) {
      (newErrors as any).pickleballEquipment = 'Please choose an option';
    }
    if (formData.spouseDinnerTicket) {
      if (!formData.spouseFirstName?.trim()) newErrors.spouseFirstName = 'Spouse first name is required';
      if (!formData.spouseLastName?.trim()) newErrors.spouseLastName = 'Spouse last name is required';
    }
    // if ((formData as any).childLunchTicket) {
    //   if (!(formData as any).childFirstName?.trim()) (newErrors as any).childFirstName = 'Child first name is required';
    //   if (!(formData as any).childLastName?.trim()) (newErrors as any).childLastName = 'Child last name is required';
    // }
    // Validate conference meals (mandatory - must select an option, not "Choose")
    const mealFields = [
      { field: 'tuesdayEarlyReception', label: 'Tuesday Early Arrivals Reception' },
      { field: 'wednesdayReception', label: 'Wednesday Welcome Reception' },
      { field: 'thursdayBreakfast', label: 'Thursday Breakfast' },
      { field: 'thursdayLuncheon', label: 'Thursday Luncheon' },
      { field: 'thursdayDinner', label: 'Thursday Dinner' },
      { field: 'fridayBreakfast', label: 'Friday Breakfast' }
    ];
    mealFields.forEach(({ field, label }) => {
      const value = (formData as any)[field];
      if (!value || !value.trim() || value === '') {
        (newErrors as any)[field] = 'Please choose an option';
      }
    });
    setErrors(newErrors);
    
    // If there are errors, scroll to the first error field
    if (Object.keys(newErrors).length > 0) {
      // Map error field names to their HTML element IDs
      const fieldIdMap: Record<string, string> = {
        firstName: 'firstName',
        lastName: 'lastName',
        badgeName: 'badgeName',
        email: 'email',
        organization: 'organization',
        jobTitle: 'jobTitle',
        address: 'addrStreet', // address error maps to addrStreet ID
        city: 'addrCity',
        state: 'addrState',
        zip: 'addrZip',
        country: 'addrCountry',
        mobile: 'mobile',
        companyType: 'companyType',
        wednesdayActivity: 'wednesdayActivity',
        golfClubPreference: 'golfClubPreference',
        massageTimeSlot: 'massageTimeSlot',
        pickleballEquipment: 'pickleballEquipment', // Will need special handling for radio buttons
        isFirstTimeAttending: 'isFirstTimeAttending', // Will need special handling for radio buttons
        spouseFirstName: 'spouseFirstName',
        spouseLastName: 'spouseLastName',
        tuesdayEarlyReception: 'tuesdayEarly',
        wednesdayReception: 'wednesdayReception',
        thursdayBreakfast: 'thursdayBreakfast',
        thursdayLuncheon: 'thursdayLuncheon',
        thursdayDinner: 'thursdayDinner',
        fridayBreakfast: 'fridayBreakfast'
      };
      
      // Find the first error field
      const firstErrorField = Object.keys(newErrors)[0];
      const fieldId = fieldIdMap[firstErrorField];
      
      if (fieldId) {
        // Function to scroll to error field
        const scrollToError = () => {
          let element: HTMLElement | null = null;
          let focusableElement: HTMLElement | null = null;
          let errorMessageElement: HTMLElement | null = null;
          
          // Special handling for radio button fields (pickleballEquipment, isFirstTimeAttending)
          if (firstErrorField === 'pickleballEquipment' || firstErrorField === 'isFirstTimeAttending') {
            // Find the first radio button or the parent form-group
            const radioButtons = document.querySelectorAll(`input[name="${firstErrorField}"]`);
            if (radioButtons.length > 0) {
              const formGroup = radioButtons[0].closest('.form-group') as HTMLElement;
              element = formGroup;
              focusableElement = radioButtons[0] as HTMLElement;
              // Find the error message element
              errorMessageElement = formGroup?.querySelector('.error-message') as HTMLElement;
            }
          } else {
            // Try to find the element by ID
            const fieldElement = document.getElementById(fieldId);
            if (fieldElement) {
              // Find the parent form-group to scroll to (includes label and error message)
              const formGroup = fieldElement.closest('.form-group') as HTMLElement;
              element = formGroup || fieldElement;
              focusableElement = fieldElement;
              // Find the error message element within the form-group
              errorMessageElement = formGroup?.querySelector('.error-message') as HTMLElement;
            }
          }
          
          // Scroll to the error message if it exists, otherwise scroll to the form-group
          const scrollTarget = errorMessageElement || element;
          
          if (scrollTarget) {
            // Get the element's position relative to the viewport
            const rect = scrollTarget.getBoundingClientRect();
            const scrollY = window.scrollY || window.pageYOffset || 0;
            const absoluteElementTop = rect.top + scrollY;
            // Add some offset to ensure the error message is fully visible
            const offset = 100;
            const scrollPosition = absoluteElementTop - offset;
            
            // Scroll the window to show the error message
            window.scrollTo({
              top: Math.max(0, scrollPosition),
              behavior: 'smooth'
            });
            
            // Focus the input/select/textarea after scroll animation
            if (focusableElement) {
              setTimeout(() => {
                if (focusableElement instanceof HTMLInputElement || 
                    focusableElement instanceof HTMLSelectElement || 
                    focusableElement instanceof HTMLTextAreaElement) {
                  focusableElement.focus();
                }
              }, 600);
            }
            return true;
          }
          return false;
        };
        
        // Try to scroll immediately, then retry after React has updated the DOM
        requestAnimationFrame(() => {
          // First attempt after a short delay
          setTimeout(() => {
            if (!scrollToError()) {
              // If first attempt failed, retry after a longer delay to ensure React has rendered
              setTimeout(() => {
                scrollToError();
              }, 300);
            }
          }, 100);
        });
      }
    }
    
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    
    // Prevent unchecking spouse ticket if payment was made
    if (hadSpousePayment && !formData.spouseDinnerTicket) {
      alert('Cannot remove spouse ticket that has already been paid for. You can only edit the spouse information.');
      return;
    }
    
    if (!validateForm()) return;
    
    // For card payments, ensure payment is completed before allowing submission
    const paymentMethod = formData.paymentMethod || 'Card';
    if (!isAdminEdit && paymentMethod === 'Card' && !isAlreadyPaid) {
      alert('Please complete the payment using the "Pay & Complete Registration" button.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Compose address string for backward compatibility (legacy field)
      const composedAddress = [
        addrStreet.trim(),
        `${addrCity.trim()}${addrCity ? ', ' : ''}${addrState.trim()} ${addrZip.trim()}`.trim(),
        addrCountry.trim()
      ].filter(Boolean).join('\n');

      // Determine clubRentals value based on user selection
      const isGolf = (formData.wednesdayActivity || '').toLowerCase().includes('golf');
      const isMassage = (formData.wednesdayActivity || '').toLowerCase().includes('massage');
      const isPickleball = (formData.wednesdayActivity || '').toLowerCase().includes('pickleball');
      
      const clubRentalsValue = isGolf 
        ? (needsClubRentals && golfClubPreference 
            ? golfClubPreference 
            : (!needsClubRentals ? 'I will bring my own' : undefined))
        : undefined; // Clear if not golf
      
      const golfHandicapValue = isGolf ? formData.golfHandicap : undefined; // Clear if not golf
      const massageTimeSlotValue = isMassage ? (formData as any).massageTimeSlot : undefined; // Clear if not massage
      // Only set pickleballEquipment if pickleball is selected, otherwise explicitly set to null
      const pickleballEquipmentValue = isPickleball ? ((formData as any).pickleballEquipment !== undefined ? (formData as any).pickleballEquipment : null) : null;

      const registrationData: Registration = {
        ...(registration?.id ? { id: registration.id } : {} as any),
        userId: user.id,
        eventId: event.id,
        ...formData,
        // Force spouse ticket to true if payment was made
        spouseDinnerTicket: hadSpousePayment ? true : formData.spouseDinnerTicket,
        specialRequests: (formData as any).specialRequests || '',
        clubRentals: clubRentalsValue,
        golfHandicap: golfHandicapValue,
        massageTimeSlot: massageTimeSlotValue,
        pickleballEquipment: pickleballEquipmentValue,
        badgeName: (formData.badgeName || '').toUpperCase(), // Ensure badge name is saved in uppercase
        address: composedAddress, // Legacy field for backward compatibility
        addressStreet: addrStreet.trim(),
        city: addrCity.trim(),
        state: addrState.trim(),
        zipCode: addrZip.trim(),
        country: addrCountry.trim(),
        tuesdayEarlyReception: (formData as any).tuesdayEarlyReception || '',
        // childFirstName: (formData as any).childFirstName || '',
        // childLastName: (formData as any).childLastName || '',
        // childLunchTicket: !!(formData as any).childLunchTicket,
        name: `${formData.firstName} ${formData.lastName}`,
        category: formData.wednesdayActivity || 'Networking',
        // Preserve payment information from existing registration if already paid
        ...(isAlreadyPaid ? {
          paid: (registration as any)?.paid,
          squarePaymentId: (registration as any)?.squarePaymentId,
          spousePaymentId: (registration as any)?.spousePaymentId,
        } : {}),
      } as Registration;
      
      // For card payments, ensure payment was completed (has payment ID) - only check for new registrations
      if (!isAdminEdit && (formData.paymentMethod || 'Card') === 'Card' && !isAlreadyPaid && !(registrationData as any).squarePaymentId) {
        alert('Payment must be completed before registration can be submitted. Please use the "Pay & Complete Registration" button.');
        setIsSubmitting(false);
        return;
      }
      
      onSave(registrationData);
      // Show success popup to the user
      alert('Registration updated successfully');
      onBack();
    } catch (error) {
      console.error('Error saving registration:', error);
      alert('An error occurred while saving the registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSpousePayment = async () => {
    if (!event) return;
    if (!formData.spouseDinnerTicket) {
      alert('Please select spouse dinner ticket first.');
      return;
    }
    if (!formData.spouseFirstName || !formData.spouseLastName) {
      alert('Please enter spouse first and last name.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Ensure card is mounted with proper error handling
      let card;
      try {
        card = await ensureCardMounted();
      } catch (error: any) {
        const errorMsg = error?.message || 'Failed to initialize payment form';
        alert(`Payment Error: ${errorMsg}`);
        setIsSubmitting(false);
        return;
      }
      
      // Attempt tokenization with improved error handling
      let res;
      try {
        res = await card.tokenize();
      } catch (tokenizeError: any) {
        console.error('Tokenization exception (spouse):', tokenizeError);
        throw new Error('Failed to process card information. Please check your card details and try again.');
      }
      
      if (res.status !== 'OK') {
        const userFriendlyMessage = getTokenizationErrorMessage(res);
        throw new Error(userFriendlyMessage);
      }
      const nonce = res.token;
      
      // Calculate spouse-only price using Eastern Time to match backend
      const now = getCurrentEasternTime();
      const tiers = (event.spousePricing || []).map((t: any) => ({
        ...t,
        s: t.startDate ? getEasternTimeMidnight(t.startDate) : -Infinity,
        e: t.endDate ? getEasternTimeEndOfDay(t.endDate) : Infinity
      })).sort((a: any, b: any) => a.s - b.s);
      // Find active tier: now >= startDate AND now < endDate (end date is exclusive - start of next day)
      const active = tiers.find((t: any) => now >= t.s && now < t.e) ||
        (now < tiers[0]?.s ? tiers[0] : (now >= tiers[tiers.length - 1]?.e ? tiers[tiers.length - 1] : (tiers.find((t: any) => now < t.s) || tiers[tiers.length - 1])));
      const spousePrice = active?.price ?? 0;
      const baseAmountCents = Math.round(spousePrice * 100);
      // Backend will calculate the final amount with fee when applyCardFee is true
      const payRes = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/payments/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents: baseAmountCents, // Backend will add fee
          baseAmountCents,
          applyCardFee: true, // Backend will apply 3.5% fee
          currency: 'USD',
          eventName: `${event?.name || 'EFBC Conference'} - Spouse Ticket`,
          nonce,
          buyerEmail: formData.email || undefined,
          buyerPhone: formData.mobile || formData.officePhone || undefined,
          billingAddress: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            addressLine1: addrStreet,
            locality: addrCity,
            administrativeDistrictLevel1: addrState,
            postalCode: addrZip,
            country: (addrCountry && addrCountry.length === 2 ? addrCountry.toUpperCase() : 'US')
          }
        })
      });
      
      if (!payRes.ok) {
        const errorData = await payRes.json().catch(() => ({ error: 'Network error or invalid response' }));
        const errorMessage = errorData?.error || errorData?.message || `Payment failed with status ${payRes.status}`;
        throw new Error(errorMessage);
      }
      
      const payload = await payRes.json();
      if (!payload?.success) {
        const errorMessage = payload?.error || payload?.message || 'Payment charge failed';
        throw new Error(errorMessage);
      }
      
      if (!payload?.paymentId) {
        throw new Error('Payment was processed but no payment ID was returned. Please contact support.');
      }
      
      if (payload?.status && payload.status !== 'COMPLETED') {
        throw new Error(`Payment status is ${payload.status}. Payment may not have been completed successfully.`);
      }
      
      // Update registration with spouse payment ID
      const composedAddress = [
        addrStreet.trim(),
        `${addrCity.trim()}${addrCity ? ', ' : ''}${addrState.trim()} ${addrZip.trim()}`.trim(),
        addrCountry.trim()
      ].filter(Boolean).join('\n');
      
      const isGolf = (formData.wednesdayActivity || '').toLowerCase().includes('golf');
      const isMassage = (formData.wednesdayActivity || '').toLowerCase().includes('massage');
      const isPickleball = (formData.wednesdayActivity || '').toLowerCase().includes('pickleball');
      
      const clubRentalsValue = isGolf 
        ? (needsClubRentals && golfClubPreference 
            ? golfClubPreference 
            : (!needsClubRentals ? 'I will bring my own' : undefined))
        : undefined;
      
      const golfHandicapValue = isGolf ? formData.golfHandicap : undefined;
      const massageTimeSlotValue = isMassage ? (formData as any).massageTimeSlot : undefined;
      const pickleballEquipmentValue = isPickleball ? ((formData as any).pickleballEquipment !== undefined ? (formData as any).pickleballEquipment : null) : null;
      
      const registrationData: Registration = {
        ...(registration?.id ? { id: registration.id } : {} as any),
        userId: user.id,
        eventId: event.id,
        ...formData,
        totalPrice: (Number(registration?.totalPrice || 0) + spousePrice).toString(),
        badgeName: (formData.badgeName || '').toUpperCase(),
        specialRequests: (formData as any).specialRequests || '',
        clubRentals: clubRentalsValue,
        golfHandicap: golfHandicapValue,
        massageTimeSlot: massageTimeSlotValue,
        pickleballEquipment: pickleballEquipmentValue,
        address: composedAddress,
        addressStreet: addrStreet.trim(),
        city: addrCity.trim(),
        state: addrState.trim(),
        zipCode: addrZip.trim(),
        country: addrCountry.trim(),
        tuesdayEarlyReception: (formData as any).tuesdayEarlyReception || '',
        name: `${formData.firstName} ${formData.lastName}`,
        category: formData.wednesdayActivity || 'Networking',
        // Preserve existing payment info
        paid: (registration as any)?.paid,
        squarePaymentId: (registration as any)?.squarePaymentId,
        // Add spouse payment ID
        spousePaymentId: payload.paymentId,
      } as Registration;
      
      onSave(registrationData);
      alert('Spouse ticket payment successful! Registration updated.');
      onBack();
    } catch (err: any) {
      console.error('Spouse payment error:', {
        message: err?.message,
        error: err,
        response: err?.response,
        stack: err?.stack
      });
      
      // Extract error message with priority: user-friendly message > Square error > generic message
      let errorMessage = err?.message || err?.response?.data?.error || 'Payment failed. Please check your card details and try again.';
      
      // If it's a tokenization error, it should already have a user-friendly message
      // Otherwise, provide a generic helpful message
      if (!errorMessage.includes('tokenization') && !errorMessage.includes('card') && !errorMessage.includes('declined')) {
        errorMessage = 'Payment failed. Please check your card details and try again, or contact support if the problem persists.';
      }
      
      alert(`Payment Error: ${errorMessage}`);
      setIsSubmitting(false);
    }
  };

  // Helper function to parse Square tokenization errors and provide user-friendly messages
  const getTokenizationErrorMessage = (tokenizeResult: any): string => {
    if (!tokenizeResult || !tokenizeResult.errors || tokenizeResult.errors.length === 0) {
      return 'Card tokenization failed. Please check your card details and try again.';
    }

    const error = tokenizeResult.errors[0];
    const errorCode = error?.code || '';
    const errorDetail = error?.detail || '';
    
    // Log full error for debugging
    console.error('Square tokenization error:', {
      status: tokenizeResult.status,
      errors: tokenizeResult.errors,
      code: errorCode,
      detail: errorDetail
    });

    // Map Square error codes to user-friendly messages
    const errorMessages: Record<string, string> = {
      'INVALID_EXPIRATION': 'The card expiration date is invalid. Please check and try again.',
      'INVALID_EXPIRATION_YEAR': 'The card expiration year is invalid. Please check and try again.',
      'INVALID_EXPIRATION_DATE': 'The card expiration date is invalid. Please check and try again.',
      'INVALID_POSTAL_CODE': 'The postal code is invalid. Please enter a valid postal code.',
      'INVALID_CARD': 'The card number is invalid. Please check and try again.',
      'CARD_DECLINED': 'Your card was declined. Please try a different card or contact your bank.',
      'INSUFFICIENT_FUNDS': 'Insufficient funds. Please use a different payment method.',
      'CVV_FAILURE': 'The CVV (security code) is incorrect. Please check and try again.',
      'ADDRESS_VERIFICATION_FAILURE': 'The billing address could not be verified. Please check your address and try again.',
      'INVALID_CARD_DATA': 'Invalid card information. Please check all card details and try again.',
      'CARD_NOT_SUPPORTED': 'This card type is not supported. Please use a different payment method.',
      'PAYMENT_METHOD_ERROR': 'There was an error processing your card. Please try again or use a different payment method.',
    };

    // Check for specific error codes first
    if (errorCode && errorMessages[errorCode]) {
      return errorMessages[errorCode];
    }

    // Check error detail for common patterns
    const detailLower = errorDetail.toLowerCase();
    if (detailLower.includes('expiration') || detailLower.includes('expiry')) {
      return 'The card expiration date is invalid. Please check and try again.';
    }
    if (detailLower.includes('cvv') || detailLower.includes('security code') || detailLower.includes('cvc')) {
      return 'The CVV (security code) is incorrect. Please check and try again.';
    }
    if (detailLower.includes('card number') || detailLower.includes('invalid card')) {
      return 'The card number is invalid. Please check and try again.';
    }
    if (detailLower.includes('postal code') || detailLower.includes('zip code')) {
      return 'The postal code is invalid. Please enter a valid postal code.';
    }
    if (detailLower.includes('declined')) {
      return 'Your card was declined. Please try a different card or contact your bank.';
    }
    if (detailLower.includes('insufficient') || detailLower.includes('funds')) {
      return 'Insufficient funds. Please use a different payment method.';
    }

    // Return the Square error detail if available, otherwise generic message
    return errorDetail || 'Card tokenization failed. Please check your card details and try again.';
  };

  const handleCardPay = async () => {
    if (isAlreadyPaid) return; // prevent double charge on edit
    if (!event) return;
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      // Ensure card is mounted with proper error handling
      let card;
      try {
        card = await ensureCardMounted();
      } catch (error: any) {
        const errorMsg = error?.message || 'Failed to initialize payment form';
        console.error('Card mount error:', error);
        alert(`Payment Error: ${errorMsg}`);
        setIsSubmitting(false);
        return;
      }
      
      // Attempt tokenization with improved error handling
      let res;
      try {
        res = await card.tokenize();
      } catch (tokenizeError: any) {
        console.error('Tokenization exception:', tokenizeError);
        throw new Error('Failed to process card information. Please check your card details and try again.');
      }
      
      if (res.status !== 'OK') {
        const userFriendlyMessage = getTokenizationErrorMessage(res);
        throw new Error(userFriendlyMessage);
      }
      const nonce = res.token;
      const baseTotal = Number(formData.totalPrice || 0);
      const baseAmountCents = Math.round(baseTotal * 100);
      // Backend will calculate the final amount with fee when applyCardFee is true
      const payRes = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/payments/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents: baseAmountCents, // Backend will add fee
          baseAmountCents,
          applyCardFee: true, // Backend will apply 3.5% fee
          currency: 'USD',
          eventName: event?.name || 'EFBC Conference Registration',
          nonce,
          buyerEmail: formData.email || undefined,
          buyerPhone: formData.mobile || formData.officePhone || undefined,
          billingAddress: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            addressLine1: addrStreet,
            locality: addrCity,
            administrativeDistrictLevel1: addrState,
            postalCode: addrZip,
            country: (addrCountry && addrCountry.length === 2 ? addrCountry.toUpperCase() : 'US')
          }
        })
      });
      
      if (!payRes.ok) {
        const errorData = await payRes.json().catch(() => ({ error: 'Network error or invalid response' }));
        const errorMessage = errorData?.error || errorData?.message || `Payment failed with status ${payRes.status}`;
        throw new Error(errorMessage);
      }
      
      const payload = await payRes.json();
      if (!payload?.success) {
        const errorMessage = payload?.error || payload?.message || 'Payment charge failed';
        throw new Error(errorMessage);
      }
      
      if (!payload?.paymentId) {
        throw new Error('Payment was processed but no payment ID was returned. Please contact support.');
      }
      
      // Verify payment status is COMPLETED
      if (payload?.status && payload.status !== 'COMPLETED') {
        throw new Error(`Payment status is ${payload.status}. Payment may not have been completed successfully.`);
      }
      
      // Determine clubRentals value based on user selection
      const isGolf = (formData.wednesdayActivity || '').toLowerCase().includes('golf');
      const isMassage = (formData.wednesdayActivity || '').toLowerCase().includes('massage');
      const isPickleball = (formData.wednesdayActivity || '').toLowerCase().includes('pickleball');
      
      const clubRentalsValue = isGolf 
        ? (needsClubRentals && golfClubPreference 
            ? golfClubPreference 
            : (!needsClubRentals ? 'I will bring my own' : undefined))
        : undefined; // Clear if not golf
      
      const golfHandicapValue = isGolf ? formData.golfHandicap : undefined; // Clear if not golf
      const massageTimeSlotValue = isMassage ? (formData as any).massageTimeSlot : undefined; // Clear if not massage
      // Only set pickleballEquipment if pickleball is selected, otherwise explicitly set to null
      const pickleballEquipmentValue = isPickleball ? ((formData as any).pickleballEquipment !== undefined ? (formData as any).pickleballEquipment : null) : null;

      // Compose address string for backward compatibility (legacy field)
      const composedAddress = [
        addrStreet.trim(),
        `${addrCity.trim()}${addrCity ? ', ' : ''}${addrState.trim()} ${addrZip.trim()}`.trim(),
        addrCountry.trim()
      ].filter(Boolean).join('\n');

      // Now save registration including payment markers
      const registrationData: Registration = {
        ...(registration?.id ? { id: registration.id } : {} as any),
        userId: user.id,
        eventId: event.id,
        ...formData,
        totalPrice: baseTotal.toString(), // Save the base total (no processing fee)
        badgeName: (formData.badgeName || '').toUpperCase(), // Ensure badge name is saved in uppercase
        specialRequests: (formData as any).specialRequests || '',
        clubRentals: clubRentalsValue,
        golfHandicap: golfHandicapValue,
        massageTimeSlot: massageTimeSlotValue,
        pickleballEquipment: pickleballEquipmentValue,
        paid: true,
        squarePaymentId: payload.paymentId,
        address: composedAddress, // Legacy field for backward compatibility
        addressStreet: addrStreet.trim(),
        city: addrCity.trim(),
        state: addrState.trim(),
        zipCode: addrZip.trim(),
        country: addrCountry.trim(),
        tuesdayEarlyReception: (formData as any).tuesdayEarlyReception || '',
        // childFirstName: (formData as any).childFirstName || '',
        // childLastName: (formData as any).childLastName || '',
        // childLunchTicket: !!(formData as any).childLunchTicket,
        name: `${formData.firstName} ${formData.lastName}`,
        category: formData.wednesdayActivity || 'Networking',
      } as Registration;
      
      // Payment has been verified above, now save the registration
      onSave(registrationData);
      alert('Thank you. Your Registration has been successfully submitted! A copy will be emailed to you.');
      onBack();
    } catch (err: any) {
      console.error('Payment error:', {
        message: err?.message,
        error: err,
        response: err?.response,
        stack: err?.stack
      });
      
      // Extract error message with priority: user-friendly message > Square error > generic message
      let errorMessage = err?.message || err?.response?.data?.error || 'Payment failed. Please check your card details and try again.';
      
      // If it's a tokenization error, it should already have a user-friendly message
      // Otherwise, provide a generic helpful message
      if (!errorMessage.includes('tokenization') && !errorMessage.includes('card') && !errorMessage.includes('declined')) {
        errorMessage = 'Payment failed. Please check your card details and try again, or contact support if the problem persists.';
      }
      
      alert(`Payment Error: ${errorMessage}`);
      setIsSubmitting(false);
    }
  };

  // Ensure Square SDK is loaded and card element attached when Card is selected (including by default)
  const ensureSquareLoaded = async (timeoutMs: number = 10000): Promise<void> => {
    // Check if Square is already available
    if ((window as any).Square && (window as any).Square.payments) {
      return;
    }

    // Check if script is already loading
    const existing = document.querySelector('script[data-square-sdk]');
    if (existing) {
      // Wait for existing script to load
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Square SDK script load timeout'));
        }, timeoutMs);

        const checkSquare = () => {
          if ((window as any).Square && (window as any).Square.payments) {
            clearTimeout(timeout);
            resolve();
          } else {
            setTimeout(checkSquare, 100);
          }
        };

        if ((window as any).Square && (window as any).Square.payments) {
          clearTimeout(timeout);
          resolve();
        } else {
          existing.addEventListener('load', () => {
            // Wait for Square.payments to be available
            const checkInterval = setInterval(() => {
              if ((window as any).Square && (window as any).Square.payments) {
                clearInterval(checkInterval);
                clearTimeout(timeout);
                resolve();
              }
            }, 50);
            setTimeout(() => {
              clearInterval(checkInterval);
              if (!((window as any).Square && (window as any).Square.payments)) {
                clearTimeout(timeout);
                reject(new Error('Square SDK loaded but payments API not available'));
              }
            }, timeoutMs);
          });
          existing.addEventListener('error', () => {
            clearTimeout(timeout);
            reject(new Error('Failed to load Square SDK script'));
          });
          // Start checking immediately in case it's already loaded
          checkSquare();
        }
      });
    }

    // Load script if not already present
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Square SDK script load timeout'));
      }, timeoutMs);

      const s = document.createElement('script');
      const squareSdkUrl =
        process.env.NODE_ENV === 'production'
          ? 'https://web.squarecdn.com/v1/square.js'          // PRODUCTION
          : 'https://sandbox.web.squarecdn.com/v1/square.js'; // SANDBOX

      s.src = squareSdkUrl;
      s.async = true;
      s.setAttribute('data-square-sdk', 'true');
      
      s.onload = () => {
        // Wait for Square.payments to be available after script loads
        const checkInterval = setInterval(() => {
          if ((window as any).Square && (window as any).Square.payments) {
            clearInterval(checkInterval);
            clearTimeout(timeout);
            resolve();
          }
        }, 50);
        
        // Timeout if Square.payments doesn't become available
        setTimeout(() => {
          clearInterval(checkInterval);
          if (!((window as any).Square && (window as any).Square.payments)) {
            clearTimeout(timeout);
            reject(new Error('Square SDK loaded but payments API not available'));
          }
        }, timeoutMs);
      };
      
      s.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load Square SDK script'));
      };
      
      document.head.appendChild(s);
    });
  };

  const ensureCardMounted = async (retries: number = 3): Promise<any> => {
    // Validate environment variables
    const appId = process.env.REACT_APP_SQUARE_APP_ID;
    const locationId = process.env.REACT_APP_SQUARE_LOCATION_ID;
    
    if (!appId || !locationId) {
      throw new Error('Square payment configuration is missing. Please contact support.');
    }

    // Return existing instance if available
    if (cardInstance) {
      return cardInstance;
    }

    // Ensure SDK is loaded with retries
    let lastError: Error | null = null;
    for (let i = 0; i < retries; i++) {
      try {
        await ensureSquareLoaded(15000); // 15 second timeout
        
        // Verify Square.payments is available
        if (!(window as any).Square || !(window as any).Square.payments) {
          throw new Error('Square.payments API is not available');
        }

        // Initialize payments
        const payments = (window as any).Square.payments(appId, locationId);
        
        // Wait a bit for payments to be ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const card = await payments.card();
        
        // Make sure container exists and is empty before attach
        const container = document.getElementById('card-container');
        if (!container) {
          throw new Error('Card container element not found');
        }
        container.innerHTML = '';
        
        await card.attach('#card-container');
        setCardInstance(card);
        return card;
      } catch (error: any) {
        lastError = error;
        if (i < retries - 1) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }

    // All retries failed
    throw new Error(
      lastError?.message || 
      'Web Payments SDK was unable to be initialized in time. Please refresh the page and try again.'
    );
  };

  useEffect(() => {
    if ((formData.paymentMethod || 'Card') === 'Card') {
      // Pre-load card element, but don't block on errors (they'll be handled on pay)
      setSquareSdkLoading(true);
      ensureCardMounted()
        .then(() => setSquareSdkLoading(false))
        .catch((error) => {
          setSquareSdkLoading(false);
          console.warn('Square SDK pre-load failed (will retry on payment):', error?.message || error);
        });
    } else {
      setSquareSdkLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.paymentMethod]);

  // Clear activity-specific fields when activity doesn't match
  useEffect(() => {
    const activity = formData.wednesdayActivity || '';
    const isGolf = activity.toLowerCase().includes('golf');
    const isMassage = activity.toLowerCase().includes('massage');
    const isPickleball = activity.toLowerCase().includes('pickleball');
    
    setFormData(prev => {
      const updated = { ...prev };
      let changed = false;
      
      if (!isGolf && (prev.clubRentals !== undefined || prev.golfHandicap)) {
        updated.clubRentals = undefined;
        updated.golfHandicap = '';
        setNeedsClubRentals(false);
        setGolfClubPreference('');
        changed = true;
      }
      
      if (!isMassage && (prev as any).massageTimeSlot) {
        (updated as any).massageTimeSlot = '';
        changed = true;
      }
      
      if (!isPickleball && (prev as any).pickleballEquipment !== undefined) {
        (updated as any).pickleballEquipment = undefined;
        changed = true;
      }
      
      return changed ? updated : prev;
    });
  }, [formData.wednesdayActivity]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      // Convert badgeName to uppercase
      if (field === 'badgeName' && typeof value === 'string') {
        value = value.toUpperCase();
      }
      const updated = { ...prev, [field]: value };
      
      // Clear golf-related fields if activity is not golf
      if (field === 'wednesdayActivity') {
        const isGolf = (value || '').toLowerCase().includes('golf');
        const isMassage = (value || '').toLowerCase().includes('massage');
        
        if (!isGolf) {
          // Clear golf fields when not golf
          updated.clubRentals = undefined;
          updated.golfHandicap = '';
          setNeedsClubRentals(false);
          setGolfClubPreference('');
        }
        
        if (!isMassage) {
          // Clear massage field when not massage
          (updated as any).massageTimeSlot = '';
        }
        
        const isPickleball = (updated.wednesdayActivity || '').toLowerCase().includes('pickleball');
        if (!isPickleball) {
          // Clear pickleball field when not pickleball
          (updated as any).pickleballEquipment = undefined;
        }
      }
      
      return updated;
    });
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  if (!event) {
    return (
      <div className="container">
        <div className="page-header">
          <h1>Registration</h1>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <p>No active event available for registration.</p>
          <div className="modal-footer-actions">
            <button className="btn btn-secondary" onClick={onBack}>Back</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1>{registration ? 'Edit' : 'Register'}</h1>
        <p className="modal-subtitle">
          {event.name} - {
            event.startDate 
              ? `${formatDateShort(event.startDate)} - ${formatDateShort(event.date || event.endDate || '')}`
              : formatDateShort(event.date || event.endDate || '')
          }
        </p>
      </div>

      <div className="card" style={{ padding: '1rem' }}>
        <form id="registration-form" onSubmit={handleSubmit} className="registration-form" noValidate>
          <div className="form-section">
            <h3 className="section-title">Registration Information</h3>
            <div className="pricing-info">
              <div className="pricing-section">
                <h4 className="pricing-title">Registration Fees</h4>
                {(event.registrationPricing || []).map((t, i) => (
                  <div className="pricing-item" key={i}>
                    <span className="pricing-label">{t.label || `Tier ${i + 1}`}:</span>
                    <span className="pricing-amount">${t.price}{(t.startDate || t.endDate) ? ` ${t.startDate ? 'between ' + formatDateShort(t.startDate) : ''}${t.startDate && t.endDate ? ' to ' : ''}${t.endDate ? formatDateShort(t.endDate) : ''}` : ''}</span>
                  </div>
                ))}
              </div>
              <div className="pricing-section">
                <h4 className="pricing-title">Spouse/Guest Tickets</h4>
                {(event.spousePricing || []).map((t, i) => (
                  <div className="pricing-item" key={i}>
                    <span className="pricing-label">{t.label || `Spouse dinner ticket ${i + 1}`}:</span>
                    <span className="pricing-amount">${t.price}{(t.startDate || t.endDate) ? ` ${t.startDate ? 'between ' + formatDateShort(t.startDate) : ''}${t.startDate && t.endDate ? ' to ' : ''}${t.endDate ? formatDateShort(t.endDate) : ''}` : ''}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="registration-includes">
              <h4 className="includes-title">Registration Form Includes:</h4>
              {event.description && Array.isArray(event.description) && event.description.length > 0 ? (
                <ul className="includes-list">
                  {event.description.map((item, idx) => (
                    <li key={idx} className="includes-item">
                      
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="includes-list">
                  <li>All Education Sessions</li>
                  <li>Wednesday Golf Tournament OR Alternate Activity</li>
                  <li>Welcome Reception</li>
                  <li>Breakfasts</li>
                  <li>Coffee Break</li>
                  <li>Lunch</li>
                  <li>Reception/Dinner</li>
                </ul>
              )}
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">Personal Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName" className="form-label">First Name <span className="required-asterisk">*</span></label>
                <input id="firstName" type="text" className={`form-control ${errors.firstName ? 'error' : ''}`} value={formData.firstName || ''} onChange={e => handleInputChange('firstName', e.target.value)} placeholder="John" required />
                {errors.firstName && <div className="error-message">{errors.firstName}</div>}
              </div>
              <div className="form-group">
                <label htmlFor="lastName" className="form-label">Last Name <span className="required-asterisk">*</span></label>
                <input id="lastName" type="text" className={`form-control ${errors.lastName ? 'error' : ''}`} value={formData.lastName || ''} onChange={e => handleInputChange('lastName', e.target.value)} placeholder="Doe" required />
                {errors.lastName && <div className="error-message">{errors.lastName}</div>}
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="badgeName" className="form-label">YOUR 1ST NAME AS YOU WISH IT TO APPEAR ON YOUR BADGE <span className="required-asterisk">*</span></label>
              <input 
                id="badgeName" 
                type="text" 
                className={`form-control badge-name-uppercase ${errors.badgeName ? 'error' : ''}`} 
                value={formData.badgeName || ''} 
                onChange={e => handleInputChange('badgeName', e.target.value)} 
                required 
              />
              {errors.badgeName && <div className="error-message">{errors.badgeName}</div>}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email" className="form-label">Email <span className="required-asterisk">*</span></label>
                <input id="email" type="email" className={`form-control ${errors.email ? 'error' : ''}`} value={formData.email || ''} onChange={e => handleInputChange('email', e.target.value)} placeholder="john.doe@example.com" required />
                {errors.email && <div className="error-message">{errors.email}</div>}
              </div>
              <div className="form-group">
                <label htmlFor="secondaryEmail" className="form-label">Secondary Email</label>
                <input id="secondaryEmail" type="email" className="form-control" value={formData.secondaryEmail || ''} onChange={e => handleInputChange('secondaryEmail', e.target.value)} placeholder="optional@example.com" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="organization" className="form-label">Organization <span className="required-asterisk">*</span></label>
                <input id="organization" type="text" className={`form-control ${errors.organization ? 'error' : ''}`} value={formData.organization || ''} onChange={e => handleInputChange('organization', e.target.value)} required />
                {errors.organization && <div className="error-message">{errors.organization}</div>}
              </div>
              <div className="form-group">
                <label htmlFor="jobTitle" className="form-label">Job Title <span className="required-asterisk">*</span></label>
                <input id="jobTitle" type="text" className={`form-control ${errors.jobTitle ? 'error' : ''}`} value={formData.jobTitle || ''} onChange={e => handleInputChange('jobTitle', e.target.value)} required />
                {errors.jobTitle && <div className="error-message">{errors.jobTitle}</div>}
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="addrStreet" className="form-label">Address <span className="required-asterisk">*</span></label>
              <input id="addrStreet" type="text" className={`form-control ${errors.address ? 'error' : ''}`} value={addrStreet} onChange={e=>{ setAddrStreet(e.target.value); if (errors.address) setErrors(prev=>({ ...prev, address:'' })); }} placeholder="123 Main Street" required />
              {errors.address && <div className="error-message">{errors.address}</div>}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="addrCity" className="form-label">City <span className="required-asterisk">*</span></label>
                <input id="addrCity" type="text" className={`form-control ${errors.city ? 'error' : ''}`} value={addrCity} onChange={e=>{ setAddrCity(e.target.value); if (errors.city) setErrors(prev=>({ ...prev, city:'' })); }} placeholder="New York" required />
                {errors.city && <div className="error-message">{errors.city}</div>}
              </div>
              <div className="form-group">
                <label htmlFor="addrState" className="form-label">State <span className="required-asterisk">*</span></label>
                <input id="addrState" type="text" className={`form-control ${errors.state ? 'error' : ''}`} value={addrState} onChange={e=>{ setAddrState(e.target.value); if (errors.state) setErrors(prev=>({ ...prev, state:'' })); }} placeholder="NY" required />
                {errors.state && <div className="error-message">{errors.state}</div>}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="addrZip" className="form-label">Zip Code <span className="required-asterisk">*</span></label>
                <input id="addrZip" type="text" className={`form-control ${errors.zip ? 'error' : ''}`} value={addrZip} onChange={e=>{ setAddrZip(e.target.value); if (errors.zip) setErrors(prev=>({ ...prev, zip:'' })); }} placeholder="10001" required />
                {errors.zip && <div className="error-message">{errors.zip}</div>}
              </div>
              <div className="form-group">
                <label htmlFor="addrCountry" className="form-label">Country <span className="required-asterisk">*</span></label>
                <input id="addrCountry" type="text" className={`form-control ${errors.country ? 'error' : ''}`} value={addrCountry} onChange={e=>{ setAddrCountry(e.target.value); if (errors.country) setErrors(prev=>({ ...prev, country:'' })); }} placeholder="US" required />
                {errors.country && <div className="error-message">{errors.country}</div>}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="mobile" className="form-label">Mobile <span className="required-asterisk">*</span></label>
                <input id="mobile" type="tel" className={`form-control ${errors.mobile ? 'error' : ''}`} value={formData.mobile || ''} onChange={e => handleInputChange('mobile', e.target.value)} placeholder="(123) 456-7890" required />
                {errors.mobile && <div className="error-message">{errors.mobile}</div>}
              </div>
              <div className="form-group">
                <label htmlFor="officePhone" className="form-label">Office Phone</label>
                <input id="officePhone" type="tel" className="form-control" value={formData.officePhone || ''} onChange={e => handleInputChange('officePhone', e.target.value)} placeholder="(123) 456-7890" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Is this your first time attending the conference? <span className="required-asterisk">*</span></label>
              <div className="radio-group">
                <label className="radio-label">
                  <input type="radio" name="isFirstTimeAttending" checked={formData.isFirstTimeAttending === true} onChange={() => handleInputChange('isFirstTimeAttending', true)} />
                  Yes
                </label>
                <label className="radio-label">
                  <input type="radio" name="isFirstTimeAttending" checked={formData.isFirstTimeAttending === false} onChange={() => handleInputChange('isFirstTimeAttending', false)} />
                  No
                </label>
              </div>
              {(errors as any).isFirstTimeAttending && <div className="error-message">{(errors as any).isFirstTimeAttending}</div>}
            </div>
            <div className="form-group">
              <label htmlFor="companyType" className="form-label">Company Type <span className="required-asterisk">*</span></label>
              <select id="companyType" className={`form-control ${errors.companyType ? 'error' : ''}`} value={formData.companyType || ''} onChange={e => handleInputChange('companyType', e.target.value)} required>
                <option value="" disabled>Please Select Company Type</option>
                {COMPANY_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {errors.companyType && <div className="error-message">{errors.companyType}</div>}
            </div>
            {formData.companyType === 'Other' && (
              <div className="form-group">
                <label htmlFor="companyTypeOther" className="form-label">If "other" selected, please specify</label>
                <input id="companyTypeOther" type="text" className="form-control" value={formData.companyTypeOther || ''} onChange={e => handleInputChange('companyTypeOther', e.target.value)} />
              </div>
            )}
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="emergencyContactName" className="form-label">Emergency Contact Name</label>
                <input id="emergencyContactName" type="text" className="form-control" value={formData.emergencyContactName || ''} onChange={e => handleInputChange('emergencyContactName', e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="emergencyContactPhone" className="form-label">Emergency Contact Phone</label>
                <input id="emergencyContactPhone" type="tel" className="form-control" value={formData.emergencyContactPhone || ''} onChange={e => handleInputChange('emergencyContactPhone', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">Conference Events</h3>
            <div className="form-group">
              <label htmlFor="wednesdayActivity" className="form-label">Please indicate which Wednesday activity you will be attending (Select ONE) <span className="required-asterisk">*</span></label>
              <select id="wednesdayActivity" className={`form-control ${errors.wednesdayActivity ? 'error' : ''}`} value={formData.wednesdayActivity || ''} onChange={e => handleInputChange('wednesdayActivity', e.target.value)} required>
                <option value="" disabled>Please Select Conference Event</option>
                {(event.activities || []).map(activity => (
                  <option key={activity} value={activity}>{activity}</option>
                ))}
              </select>
              {errors.wednesdayActivity && <div className="error-message">{errors.wednesdayActivity}</div>}
            </div>
            {((event.activities || []).some(a => a.toLowerCase().includes('golf')) && (formData.wednesdayActivity || '').toLowerCase().includes('golf')) && (
              <>
                <div className="form-group">
                  <label className="form-label">Club rentals needed?</label>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input 
                        type="radio" 
                        name="clubRentals" 
                        checked={needsClubRentals} 
                        onChange={() => {
                          setNeedsClubRentals(true);
                          setGolfClubPreference('');
                        }} 
                      />
                      Yes
                    </label>
                    <label className="radio-label">
                      <input 
                        type="radio" 
                        name="clubRentals" 
                        checked={!needsClubRentals} 
                        onChange={() => {
                          setNeedsClubRentals(false);
                          setGolfClubPreference('');
                        }} 
                      />
                      No
                    </label>
                  </div>
                </div>
                {needsClubRentals && (
                  <div className="form-group">
                    <label htmlFor="golfClubPreference" className="form-label">Rental clubs are available for a fee, must be reserved in advance to ensure availability. Let us know your club preference. <span className="required-asterisk">*</span></label>
                    <select 
                      id="golfClubPreference" 
                      className={`form-control ${errors.golfClubPreference ? 'error' : ''}`}
                      value={golfClubPreference} 
                      onChange={e => {
                        setGolfClubPreference(e.target.value);
                        if (errors.golfClubPreference) {
                          setErrors(prev => {
                            const newErr = { ...prev };
                            delete newErr.golfClubPreference;
                            return newErr;
                          });
                        }
                      }}
                      required
                    >
                      <option value="" disabled>Please select a preference</option>
                      {GOLF_CLUB_PREFERENCES.map(pref => (
                        <option key={pref} value={pref}>{pref}</option>
                      ))}
                    </select>
                    {errors.golfClubPreference && <div className="error-message">{errors.golfClubPreference}</div>}
                  </div>
                )}
                <div className="form-group">
                  <label htmlFor="golfHandicap" className="form-label">Your handicap (1-36)</label>
                  <input id="golfHandicap" type="number" min={1} max={36} className="form-control" value={formData.golfHandicap || ''} onChange={e => handleInputChange('golfHandicap', e.target.value)} />
                </div>
              </>
            )}
            {((event.activities || []).some(a => a.toLowerCase().includes('massage')) && (formData.wednesdayActivity || '').toLowerCase().includes('massage')) && (
              <div className="form-group">
                <label htmlFor="massageTimeSlot" className="form-label">If you Chose Massage: <span className="required-asterisk">*</span></label>
                <label htmlFor="massageTimeSlot" className="form-label" style={{ fontWeight: 'normal', fontSize: '0.9rem', marginTop: '0.25rem', display: 'block' }}>
                  Select your preferred time slot; We will get back to you confirming your appointment time.
                </label>
                <select 
                  id="massageTimeSlot" 
                  className={`form-control ${errors.massageTimeSlot ? 'error' : ''}`}
                  value={(formData as any).massageTimeSlot || ''} 
                  onChange={e => {
                    handleInputChange('massageTimeSlot', e.target.value);
                    if (errors.massageTimeSlot) {
                      setErrors(prev => {
                        const newErr = { ...prev };
                        delete newErr.massageTimeSlot;
                        return newErr;
                      });
                    }
                  }}
                  required
                >
                  <option value="" disabled>Select an option</option>
                  {MASSAGE_TIME_SLOTS.map(slot => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
                {errors.massageTimeSlot && <div className="error-message">{errors.massageTimeSlot}</div>}
              </div>
            )}
            {((event.activities || []).some(a => a.toLowerCase().includes('pickleball')) && (formData.wednesdayActivity || '').toLowerCase().includes('pickleball')) && (
              <div className="form-group">
                <label className="form-label">Will you bring your own equipment? <span className="required-asterisk">*</span></label>
                <div className="radio-group">
                  <label className="radio-label">
                    <input 
                      type="radio" 
                      name="pickleballEquipment" 
                      checked={(formData as any).pickleballEquipment === true} 
                      onChange={() => handleInputChange('pickleballEquipment', true)} 
                    />
                    Yes
                  </label>
                  <label className="radio-label">
                    <input 
                      type="radio" 
                      name="pickleballEquipment" 
                      checked={(formData as any).pickleballEquipment === false} 
                      onChange={() => handleInputChange('pickleballEquipment', false)} 
                    />
                    No
                  </label>
                </div>
                {(errors as any).pickleballEquipment && (
                  <div className="error-message">{(errors as any).pickleballEquipment}</div>
                )}
              </div>
            )}
          </div>

          <div className="form-section">
            <h3 className="section-title">Conference Meals</h3>
            <div className="form-group">
              <label htmlFor="tuesdayEarly" className="form-label">Tuesday Early Arrivals Reception <span className="required-asterisk">*</span></label>
              <select id="tuesdayEarly" className={`form-control ${(errors as any).tuesdayEarlyReception ? 'error' : ''}`} value={(formData as any).tuesdayEarlyReception || ''} onChange={e=>handleInputChange('tuesdayEarlyReception', e.target.value)} required>
                <option value="" disabled>Choose</option>
                {MEAL_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {(errors as any).tuesdayEarlyReception && <div className="error-message">{(errors as any).tuesdayEarlyReception}</div>}
            </div>
            <div className="form-group">
              <label htmlFor="wednesdayReception" className="form-label">Wednesday Welcome Reception <span className="required-asterisk">*</span></label>
              <select id="wednesdayReception" className={`form-control ${errors.wednesdayReception ? 'error' : ''}`} value={formData.wednesdayReception || ''} onChange={e => handleInputChange('wednesdayReception', e.target.value)} required>
                <option value="" disabled>Choose</option>
                {MEAL_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {errors.wednesdayReception && <div className="error-message">{errors.wednesdayReception}</div>}
            </div>
            <div className="form-group">
              <label htmlFor="thursdayBreakfast" className="form-label">Thursday Breakfast <span className="required-asterisk">*</span></label>
              <select id="thursdayBreakfast" className={`form-control ${errors.thursdayBreakfast ? 'error' : ''}`} value={formData.thursdayBreakfast || ''} onChange={e => handleInputChange('thursdayBreakfast', e.target.value)} required>
                <option value="" disabled>Choose</option>
                {MEAL_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {errors.thursdayBreakfast && <div className="error-message">{errors.thursdayBreakfast}</div>}
            </div>
            <div className="form-group">
              <label htmlFor="thursdayLuncheon" className="form-label">Thursday Luncheon <span className="required-asterisk">*</span></label>
              <select id="thursdayLuncheon" className={`form-control ${errors.thursdayLuncheon ? 'error' : ''}`} value={formData.thursdayLuncheon || ''} onChange={e => handleInputChange('thursdayLuncheon', e.target.value)} required>
                <option value="" disabled>Choose</option>
                {MEAL_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {errors.thursdayLuncheon && <div className="error-message">{errors.thursdayLuncheon}</div>}
            </div>
            <div className="form-group">
              <label htmlFor="thursdayDinner" className="form-label">Thursday Dinner <span className="required-asterisk">*</span></label>
              <select id="thursdayDinner" className={`form-control ${errors.thursdayDinner ? 'error' : ''}`} value={formData.thursdayDinner || ''} onChange={e => handleInputChange('thursdayDinner', e.target.value)} required>
                <option value="" disabled>Choose</option>
                {MEAL_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {errors.thursdayDinner && <div className="error-message">{errors.thursdayDinner}</div>}
            </div>
            <div className="form-group">
              <label htmlFor="fridayBreakfast" className="form-label">Friday Breakfast <span className="required-asterisk">*</span></label>
              <select id="fridayBreakfast" className={`form-control ${errors.fridayBreakfast ? 'error' : ''}`} value={formData.fridayBreakfast || ''} onChange={e => handleInputChange('fridayBreakfast', e.target.value)} required>
                <option value="" disabled>Choose</option>
                {MEAL_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {errors.fridayBreakfast && <div className="error-message">{errors.fridayBreakfast}</div>}
            </div>
            <div className="form-group">
              <label htmlFor="dietaryRestrictions" className="form-label">Dietary Restrictions</label>
              <textarea id="dietaryRestrictions" className="form-control" value={formData.dietaryRestrictions || ''} onChange={e => handleInputChange('dietaryRestrictions', e.target.value)} rows={3} placeholder="Please specify any dietary restrictions..." />
            </div>
            <div className="form-group">
              <label htmlFor="specialRequests" className="form-label">Special Requests</label>
              <textarea id="specialRequests" className="form-control" value={(formData as any).specialRequests || ''} onChange={e => handleInputChange('specialRequests', e.target.value)} rows={3} placeholder="Please specify any special requests..." />
            </div>
          </div>

          {/* Spouse section: Always show to allow adding spouse later */}
          <div className="form-section">
            <h3 className="section-title">Spouse/Guest Information</h3>
              <div className="form-group">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={!!formData.spouseDinnerTicket} 
                    onChange={e => {
                      // Prevent unchecking if spouse payment was made
                      if (hadSpousePayment && !e.target.checked) {
                        alert('Cannot remove spouse ticket that has already been paid for. You can only edit the spouse information.');
                        return;
                      }
                      handleInputChange('spouseDinnerTicket', e.target.checked);
                    }}
                    disabled={hadSpousePayment} // Disable checkbox if payment was made
                  />
                  <span>Check Box to purchase Spouse/Guest Dinner Ticket.</span>
                  {hadSpousePayment && (
                    <span style={{ marginLeft: '8px', color: '#6b7280', fontSize: '0.875rem' }}>
                      (Already paid - cannot be removed)
                    </span>
                  )}
                </label>
              </div>
              {/* Show spouse name fields when checkbox is selected */}
              {formData.spouseDinnerTicket && (
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="spouseFirstName" className="form-label">Spouse/Guest's First Name <span className="required-asterisk">*</span></label>
                    <input 
                      id="spouseFirstName" 
                      type="text" 
                      className={`form-control ${errors.spouseFirstName ? 'error' : ''}`} 
                      value={formData.spouseFirstName || ''} 
                      onChange={e => handleInputChange('spouseFirstName', e.target.value)}
                    />
                    {errors.spouseFirstName && <div className="error-message">{errors.spouseFirstName}</div>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="spouseLastName" className="form-label">Spouse/Guest's Last Name <span className="required-asterisk">*</span></label>
                    <input 
                      id="spouseLastName" 
                      type="text" 
                      className={`form-control ${errors.spouseLastName ? 'error' : ''}`} 
                      value={formData.spouseLastName || ''} 
                      onChange={e => handleInputChange('spouseLastName', e.target.value)}
                    />
                    {errors.spouseLastName && <div className="error-message">{errors.spouseLastName}</div>}
                  </div>
                </div>
              )}
          </div>

          {/* Child section - only visible to admins */}
          {/* {isAdminEdit && (
            <div className="form-section">
              <h3 className="section-title">Child Information</h3>
              <div className="form-group">
                <label className="checkbox-label">
                  <input 
                    type="checkbox" 
                    checked={!!(formData as any).childLunchTicket} 
                    onChange={e => handleInputChange('childLunchTicket', e.target.checked)}
                  />
                  <span>Check Box to purchase Child Lunch Ticket{childLunchPrice > 0 ? ` ($${childLunchPrice.toFixed(2)})` : ''}.</span>
                </label>
              </div>
              {(formData as any).childLunchTicket && (
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="childFirstName" className="form-label">Child's First Name <span className="required-asterisk">*</span></label>
                    <input 
                      id="childFirstName" 
                      type="text" 
                      className={`form-control ${(errors as any).childFirstName ? 'error' : ''}`} 
                      value={(formData as any).childFirstName || ''} 
                      onChange={e => handleInputChange('childFirstName', e.target.value)}
                      required
                    />
                    {(errors as any).childFirstName && <div className="error-message">{(errors as any).childFirstName}</div>}
                  </div>
                  <div className="form-group">
                    <label htmlFor="childLastName" className="form-label">Child's Last Name <span className="required-asterisk">*</span></label>
                    <input 
                      id="childLastName" 
                      type="text" 
                      className={`form-control ${(errors as any).childLastName ? 'error' : ''}`} 
                      value={(formData as any).childLastName || ''} 
                      onChange={e => handleInputChange('childLastName', e.target.value)}
                      required
                    />
                    {(errors as any).childLastName && <div className="error-message">{(errors as any).childLastName}</div>}
                  </div>
                </div>
              )}
            </div>
          )} */}

          {/* Payment section for admins */}
          {isAdminEdit && (
            <div className="form-section">
              <h3 className="section-title">Payment Information</h3>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <div className="segmented-group">
                  <label className="segmented-label">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={(formData.paymentMethod || 'Card') === 'Card'}
                      onChange={() => handleInputChange('paymentMethod', 'Card')}
                    />
                    <span>Card</span>
                  </label>
                  <label className="segmented-label">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={formData.paymentMethod === 'Check'}
                      onChange={() => handleInputChange('paymentMethod', 'Check')}
                    />
                    <span>Check</span>
                  </label>
                </div>
              </div>
              {formData.paymentMethod === 'Check' && (
                <div className="form-group">
                  <label className="form-label">Paid</label>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="paid"
                        checked={formData.paid === true}
                        onChange={() => handleInputChange('paid', true)}
                      />
                      Yes
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="paid"
                        checked={formData.paid === false || formData.paid === undefined}
                        onChange={() => handleInputChange('paid', false)}
                      />
                      No
                    </label>
                  </div>
                  <p className="form-hint" style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                    Mark as "Yes" when the check has been received and processed.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Payment section: Hide in admin edit mode, show in user mode */}
          {!isAdminEdit && (
            <div className="form-section">
              <h3 className="section-title">Payment Information</h3>
              {(() => {
                // Check if spouse is being added (wasn't there before, but now is)
                const isAddingSpouse = isEditing && !hadSpouseTicket && formData.spouseDinnerTicket && !hadSpousePayment;
                const spousePrice = (() => {
                  if (!formData.spouseDinnerTicket) return 0;
                  // Use Eastern Time to match backend
                  const now = getCurrentEasternTime();
                  const tiers = (event?.spousePricing || []).map((t: any) => ({
                    ...t,
                    s: t.startDate ? getEasternTimeMidnight(t.startDate) : -Infinity,
                    e: t.endDate ? getEasternTimeEndOfDay(t.endDate) : Infinity
                  })).sort((a: any, b: any) => a.s - b.s);
                  const active = tiers.find((t: any) => now >= t.s && now < t.e) ||
                    (now < tiers[0]?.s ? tiers[0] : (now >= tiers[tiers.length - 1]?.e ? tiers[tiers.length - 1] : (tiers.find((t: any) => now < t.s) || tiers[tiers.length - 1])));
                  return active?.price ?? 0;
                })();

                if (isAlreadyPaid && !isAddingSpouse) {
                  return (
                    <div className="payment-summary">
                      <div className="payment-item">
                        <span>Paid:</span>
                        <span>Yes</span>
                      </div>
                      {(registration as any)?.squarePaymentId && (
                        <div className="payment-item">
                          <span>Square Payment ID:</span>
                          <span>{(registration as any).squarePaymentId}</span>
                        </div>
                      )}
                      {hadSpouseTicket && (registration as any)?.spousePaymentId && (
                        <div className="payment-item">
                          <span>Spouse Payment ID:</span>
                          <span>{(registration as any).spousePaymentId}</span>
                        </div>
                      )}
                      {isAddingSpouse && (
                        <div className="payment-item" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                          <span>Spouse Ticket (New):</span>
                          <span>${spousePrice.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  );
                }
                return (
              <>
                {(() => {
                  const baseTotal = Number(formData.totalPrice || 0);
                  const isCard = (formData.paymentMethod || 'Card') === 'Card';
                  // Calculate 3.5% convenience fee for card payments
                  const convenienceFee = isCard ? baseTotal * 0.035 : 0;
                  const totalWithFee = baseTotal + convenienceFee;
                  return (
                <div className="payment-summary">
                  <div className="payment-item">
                    <span>Conference Registration:</span>
                    <span>${(event.registrationPricing && event.registrationPricing.length ? (function () { const now = getCurrentEasternTime(); const tiers = (event.registrationPricing || []).map((t: any) => ({ ...t, s: t.startDate ? getEasternTimeMidnight(t.startDate) : -Infinity, e: t.endDate ? getEasternTimeEndOfDay(t.endDate) : Infinity })).sort((a: any, b: any) => a.s - b.s); const active = tiers.find((t: any) => now >= t.s && now < t.e) || (now < tiers[0].s ? tiers[0] : (now >= tiers[tiers.length - 1].e ? tiers[tiers.length - 1] : (tiers.find((t: any) => now < t.s) || tiers[tiers.length - 1]))); return (active?.price ?? 675).toFixed(2); })() : '675.00')}</span>
                  </div>
                  {formData.spouseDinnerTicket && (
                    <div className="payment-item">
                      <span>Spouse Dinner Ticket:</span>
                      <span>${(function () { const now = getCurrentEasternTime(); const tiers = (event.spousePricing || []).map((t: any) => ({ ...t, s: t.startDate ? getEasternTimeMidnight(t.startDate) : -Infinity, e: t.endDate ? getEasternTimeEndOfDay(t.endDate) : Infinity })).sort((a: any, b: any) => a.s - b.s); const active = tiers.find((t: any) => now >= t.s && now < t.e) || (now < tiers[0].s ? tiers[0] : (now >= tiers[tiers.length - 1].e ? tiers[tiers.length - 1] : (tiers.find((t: any) => now < t.s) || tiers[tiers.length - 1]))); return (active?.price ?? 0).toFixed(2); })()}</span>
                    </div>
                  )}
                  {isCard && convenienceFee > 0 && (
                    <div className="payment-item" style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                      <span>Convenience Fee (3.5%):</span>
                      <span>${convenienceFee.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="payment-total">
                    <span>Total {isCard ? 'Charged' : 'Due'}:</span>
                    <span>${totalWithFee.toFixed(2)} USD</span>
                  </div>
                  {isCard && (
                    <div className="payment-fee-note" style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                      Base amount: ${baseTotal.toFixed(2)} + ${convenienceFee.toFixed(2)} fee = ${totalWithFee.toFixed(2)} total
                    </div>
                  )}
                </div>
                  );
                })()}
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <div className="segmented-group">
                    <label className="segmented-label">
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={(formData.paymentMethod || 'Card') === 'Card'}
                        onChange={() => handleInputChange('paymentMethod', 'Card')}
                      />
                      <span>Card</span>
                    </label>
                    <label className="segmented-label">
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={formData.paymentMethod === 'Check'}
                        onChange={() => handleInputChange('paymentMethod', 'Check')}
                      />
                      <span>Check</span>
                    </label>
                  </div>
                  <div className={`mt-half ${((formData.paymentMethod || 'Card') === 'Card') ? '' : 'card-fields-hidden'}`}>
                    {squareSdkLoading && (
                      <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>
                        Loading payment form...
                      </div>
                    )}
                    <div id="card-container" />
                  </div>
                  {formData.paymentMethod === 'Check' && (
                    <p className="payment-note">If you prefer by check, 
                    <br/>Please mail check prior to deadline to: 
                    <br/>EFBC Conference Inc 
                    <br/>127 Low Country Lane 
                    <br/>The Woodlands, TX 77380, USA </p>
                  )}
                </div>
              </>
                );
              })()}
            </div>
          )}

          <div className="modal-footer-actions" style={{ marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onBack} disabled={isSubmitting}>Cancel</button>
            {(() => {
              const paymentMethod = formData.paymentMethod || 'Card';
              const isAddingSpouse = isEditing && !hadSpouseTicket && formData.spouseDinnerTicket && !hadSpousePayment;
              const showSubmitButton = isAdminEdit || (isAlreadyPaid && !isAddingSpouse) || paymentMethod === 'Check';
              const showPayButton = !isAdminEdit && !isAlreadyPaid && paymentMethod === 'Card' && !isAddingSpouse;
              const showSpousePayButton = !isAdminEdit && isAlreadyPaid && isAddingSpouse && paymentMethod === 'Card';
              
              if (showSpousePayButton) {
                return (
                  <button type="button" className="btn btn-primary btn-save" onClick={handleSpousePayment} disabled={isSubmitting}>
                    {isSubmitting ? 'Processing...' : 'Pay for Spouse Ticket'}
                  </button>
                );
              } else if (showSubmitButton) {
                return (
                  <button className="btn btn-primary btn-save" type="submit" form="registration-form" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : (registration ? 'Update Registration' : 'Complete Registration')}
                  </button>
                );
              } else if (showPayButton) {
                return (
                  <button type="button" className="btn btn-primary btn-save" onClick={handleCardPay} disabled={isSubmitting}>
                    {isSubmitting ? 'Processing...' : 'Pay & Complete Registration'}
                  </button>
                );
              }
              return null;
            })()}
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserRegistration;


