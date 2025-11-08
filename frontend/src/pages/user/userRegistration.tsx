import React, { useEffect, useMemo, useState } from 'react';
import {
  Event,
  Registration,
  COMPANY_TYPES,
  MASSAGE_TIME_SLOTS,
  MEAL_OPTIONS,
  isEventExpired,
} from '../../types';
import '../../styles/RegistrationModal.css';

interface UserRegistrationProps {
  events: Event[];
  registrations: Registration[];
  user: { id: number; name: string; email: string };
  targetEventId?: number | null;
  onBack: () => void;
  onSave: (regData: Registration) => void;
}

export const UserRegistration: React.FC<UserRegistrationProps> = ({
  events,
  registrations,
  user,
  targetEventId,
  onBack,
  onSave,
}) => {
  const activeEvent = useMemo(() => events.find(e => !isEventExpired(e.date)), [events]);
  const event = useMemo(
    () => (targetEventId ? (events.find(e => e.id === targetEventId) || activeEvent) : activeEvent),
    [events, targetEventId, activeEvent]
  );

  const registration = useMemo(
    () => (event ? registrations.find(r => r.userId === user.id && r.eventId === event.id) || null : null),
    [registrations, user, event]
  );

  const [formData, setFormData] = useState<Partial<Registration>>({
    // Personal Information
    firstName: registration?.firstName || user.name.split(' ')[0] || '',
    lastName: registration?.lastName || user.name.split(' ').slice(1).join(' ') || '',
    badgeName: registration?.badgeName || user.name || '',
    email: registration?.email || user.email || '',
    secondaryEmail: registration?.secondaryEmail || '',
    organization: registration?.organization || '',
    jobTitle: registration?.jobTitle || '',
    address: registration?.address || '',
    mobile: registration?.mobile || '',
    officePhone: registration?.officePhone || '',
    isFirstTimeAttending: registration?.isFirstTimeAttending ?? true,
    companyType: registration?.companyType || '',
    companyTypeOther: registration?.companyTypeOther || '',
    emergencyContactName: registration?.emergencyContactName || '',
    emergencyContactPhone: registration?.emergencyContactPhone || '',

    // Conference Events
    wednesdayActivity: registration?.wednesdayActivity || '',
    golfHandicap: registration?.golfHandicap || '',
    massageTimeSlot: registration?.massageTimeSlot || '8:00 AM- 10:00 AM',

    // Conference Meals
    wednesdayReception: registration?.wednesdayReception || 'I will attend',
    thursdayBreakfast: registration?.thursdayBreakfast || 'I will attend',
    thursdayLuncheon: registration?.thursdayLuncheon || 'I will attend',
    thursdayDinner: registration?.thursdayDinner || 'I will attend',
    fridayBreakfast: registration?.fridayBreakfast || 'I will attend',
    tuesdayEarlyReception: (registration as any)?.tuesdayEarlyReception || 'I will attend',
    dietaryRestrictions: registration?.dietaryRestrictions || '',

    // Spouse/Guest Information
    spouseDinnerTicket: registration?.spouseDinnerTicket || false,
    spouseFirstName: registration?.spouseFirstName || '',
    spouseLastName: registration?.spouseLastName || '',

    // Payment Information
    totalPrice: registration?.totalPrice || 675,
    paymentMethod: registration?.paymentMethod || 'Card',

    // Legacy fields
    name: registration?.name || user.name,
    category: registration?.category || 'Networking',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  // Address fields (split)
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
  const initialAddr = parseAddress(registration?.address);
  const [addrStreet, setAddrStreet] = useState<string>(initialAddr.street);
  const [addrCity, setAddrCity] = useState<string>(initialAddr.city);
  const [addrState, setAddrState] = useState<string>(initialAddr.state);
  const [addrZip, setAddrZip] = useState<string>(initialAddr.zip);
  const [addrCountry, setAddrCountry] = useState<string>(initialAddr.country);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cardInstance, setCardInstance] = useState<any | null>(null);

  const spouseDinnerSelected = !!formData.spouseDinnerTicket;
  const regTiers = useMemo(() => event?.registrationPricing || [], [event?.registrationPricing]);
  const spouseTiers = useMemo(() => event?.spousePricing || [], [event?.spousePricing]);

  useEffect(() => {
    const now = Date.now();
    const withBounds = (arr: any[] = []) =>
      arr
        .map((t: any) => ({
          ...t,
          s: t.startDate ? new Date(t.startDate).getTime() : -Infinity,
          e: t.endDate ? new Date(t.endDate).getTime() : Infinity,
        }))
        .sort((a: any, b: any) => a.s - b.s);
    const pickTier = (tiers: any[]) => {
      if (!tiers || tiers.length === 0) return null;
      const active = tiers.find(t => now >= t.s && now <= t.e);
      if (active) return active;
      if (now < tiers[0].s) return tiers[0];
      if (now > tiers[tiers.length - 1].e) return tiers[tiers.length - 1];
      const upcoming = tiers.find(t => now < t.s);
      return upcoming || tiers[tiers.length - 1];
    };
    const regActive = pickTier(withBounds(regTiers));
    const spouseActive = pickTier(withBounds(spouseTiers));
    let total = regActive?.price ?? 675;
    if (spouseDinnerSelected) total += spouseActive?.price ?? 200;
    setFormData(prev => ({ ...prev, totalPrice: total }));
  }, [spouseDinnerSelected, regTiers, spouseTiers]);

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
    if (!formData.companyType?.trim()) newErrors.companyType = 'Company type is required';
    if (!formData.wednesdayActivity?.trim()) newErrors.wednesdayActivity = 'Wednesday activity is required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (formData.spouseDinnerTicket) {
      if (!formData.spouseFirstName?.trim()) newErrors.spouseFirstName = 'Spouse first name is required';
      if (!formData.spouseLastName?.trim()) newErrors.spouseLastName = 'Spouse last name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    if (!validateForm()) return;
    if ((formData.paymentMethod || 'Card') === 'Card') return; // handled by Pay & Complete button
    setIsSubmitting(true);
    try {
      // Compose address string for persistence
      const composedAddress = [
        addrStreet.trim(),
        `${addrCity.trim()}${addrCity ? ', ' : ''}${addrState.trim()} ${addrZip.trim()}`.trim(),
        addrCountry.trim()
      ].filter(Boolean).join('\n');

      const registrationData: Registration = {
        ...(registration?.id ? { id: registration.id } : {} as any),
        userId: user.id,
        eventId: event.id,
        ...formData,
        address: composedAddress,
        tuesdayEarlyReception: (formData as any).tuesdayEarlyReception || 'I will attend',
        name: `${formData.firstName} ${formData.lastName}`,
        category: formData.wednesdayActivity || 'Networking',
      } as Registration;
      onSave(registrationData);
      // Show success popup to the user
      alert('Thank you. Your Registration has been successfully submitted! A copy will be emailed to you.');
      onBack();
    } catch (error) {
      console.error('Error saving registration:', error);
      alert('An error occurred while saving the registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCardPay = async () => {
    if (!event) return;
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      // ensure card is mounted
      const card = await ensureCardMounted();
      const res = await card.tokenize();
      if (res.status !== 'OK') throw new Error('Card tokenize failed');
      const nonce = res.token;
      const amountCents = Math.round(Number(formData.totalPrice || 0) * 100);
      const payRes = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/payments/charge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents, currency: 'USD', nonce })
      });
      const payload = await payRes.json();
      if (!payload?.success) throw new Error(payload?.error || 'Charge failed');
      // Now save registration including payment markers
      const registrationData: Registration = {
        ...(registration?.id ? { id: registration.id } : {} as any),
        userId: user.id,
        eventId: event.id,
        ...formData,
        paid: true,
        squarePaymentId: payload.paymentId,
        address: [
          addrStreet.trim(),
          `${addrCity.trim()}${addrCity ? ', ' : ''}${addrState.trim()} ${addrZip.trim()}`.trim(),
          addrCountry.trim()
        ].filter(Boolean).join('\n'),
        name: `${formData.firstName} ${formData.lastName}`,
        category: formData.wednesdayActivity || 'Networking',
      } as Registration;
      onSave(registrationData);
      alert('Thank you. Your Registration has been successfully submitted! A copy will be emailed to you.');
      onBack();
    } catch (err:any) {
      alert(err?.message || 'Payment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ensure Square SDK is loaded and card element attached when Card is selected (including by default)
  const ensureSquareLoaded = async () => {
    if ((window as any).Square) {
      return;
    }
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[data-square-sdk]');
      if (existing) {
        existing.addEventListener('load', () => { resolve(); });
        existing.addEventListener('error', () => reject(new Error('Failed to load Square SDK')));
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://sandbox.web.squarecdn.com/v1/square.js';
      s.async = true;
      s.setAttribute('data-square-sdk', 'true');
      s.onload = () => { resolve(); };
      s.onerror = () => reject(new Error('Failed to load Square SDK'));
      document.head.appendChild(s);
    });
  };

  const ensureCardMounted = async () => {
    await ensureSquareLoaded();
    if (cardInstance) return cardInstance;
    const payments = (window as any).Square.payments(
      process.env.REACT_APP_SQUARE_APP_ID,
      process.env.REACT_APP_SQUARE_LOCATION_ID
    );
    const card = await payments.card();
    // make sure container exists and is empty before attach
    const container = document.getElementById('card-container');
    if (container) container.innerHTML = '';
    await card.attach('#card-container');
    setCardInstance(card);
    return card;
  };

  useEffect(() => {
    if ((formData.paymentMethod || 'Card') === 'Card') {
      // Fire and forget; errors are handled on pay
      ensureCardMounted().catch(() => void 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.paymentMethod]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
        <p className="modal-subtitle">{event.name} - {new Date(event.date).toLocaleDateString()}</p>
      </div>

      <div className="card" style={{ padding: '1rem' }}>
        <form id="registration-form" onSubmit={handleSubmit} className="registration-form">
          <div className="form-section">
            <h3 className="section-title">Registration Information</h3>
            <div className="pricing-info">
              <div className="pricing-section">
                <h4 className="pricing-title">Registration Fees</h4>
                {(event.registrationPricing || []).map((t, i) => (
                  <div className="pricing-item" key={i}>
                    <span className="pricing-label">{t.label || `Tier ${i + 1}`}:</span>
                    <span className="pricing-amount">${t.price}{(t.startDate || t.endDate) ? ` ${t.startDate ? 'between ' + new Date(t.startDate).toLocaleDateString() : ''}${t.startDate && t.endDate ? ' to ' : ''}${t.endDate ? new Date(t.endDate).toLocaleDateString() : ''}` : ''}</span>
                  </div>
                ))}
              </div>
              <div className="pricing-section">
                <h4 className="pricing-title">Spouse/Guest Tickets</h4>
                {(event.spousePricing || []).map((t, i) => (
                  <div className="pricing-item" key={i}>
                    <span className="pricing-label">Spouse dinner ticket:</span>
                    <span className="pricing-amount">${t.price}{(t.startDate || t.endDate) ? ` ${t.startDate ? 'between ' + new Date(t.startDate).toLocaleDateString() : ''}${t.startDate && t.endDate ? ' to ' : ''}${t.endDate ? new Date(t.endDate).toLocaleDateString() : ''}` : ''}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="registration-includes">
              <h4 className="includes-title">Registration Form Includes:</h4>
              <ul className="includes-list">
                <li>All Education Sessions</li>
                <li>Wednesday Golf Tournament OR Alternate Activity</li>
                <li>Welcome Reception</li>
                <li>Breakfasts</li>
                <li>Coffee Break</li>
                <li>Lunch</li>
                <li>Reception/Dinner</li>
              </ul>
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">Personal Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName" className="form-label">First Name <span className="required-asterisk">*</span></label>
                <input id="firstName" type="text" className={`form-control ${errors.firstName ? 'error' : ''}`} value={formData.firstName || ''} onChange={e => handleInputChange('firstName', e.target.value)} required />
                {errors.firstName && <div className="error-message">{errors.firstName}</div>}
              </div>
              <div className="form-group">
                <label htmlFor="lastName" className="form-label">Last Name <span className="required-asterisk">*</span></label>
                <input id="lastName" type="text" className={`form-control ${errors.lastName ? 'error' : ''}`} value={formData.lastName || ''} onChange={e => handleInputChange('lastName', e.target.value)} required />
                {errors.lastName && <div className="error-message">{errors.lastName}</div>}
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="badgeName" className="form-label">Your 1st name as you wish it to appear on your badge <span className="required-asterisk">*</span></label>
              <input id="badgeName" type="text" className={`form-control ${errors.badgeName ? 'error' : ''}`} value={formData.badgeName || ''} onChange={e => handleInputChange('badgeName', e.target.value)} required />
              {errors.badgeName && <div className="error-message">{errors.badgeName}</div>}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email" className="form-label">Email <span className="required-asterisk">*</span></label>
                <input id="email" type="email" className={`form-control ${errors.email ? 'error' : ''}`} value={formData.email || ''} onChange={e => handleInputChange('email', e.target.value)} required />
                {errors.email && <div className="error-message">{errors.email}</div>}
              </div>
              <div className="form-group">
                <label htmlFor="secondaryEmail" className="form-label">Secondary Email</label>
                <input id="secondaryEmail" type="email" className="form-control" value={formData.secondaryEmail || ''} onChange={e => handleInputChange('secondaryEmail', e.target.value)} />
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
              <input id="addrStreet" type="text" className={`form-control ${errors.address ? 'error' : ''}`} value={addrStreet} onChange={e=>{ setAddrStreet(e.target.value); if (errors.address) setErrors(prev=>({ ...prev, address:'' })); }} required />
              {errors.address && <div className="error-message">{errors.address}</div>}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="addrCity" className="form-label">City <span className="required-asterisk">*</span></label>
                <input id="addrCity" type="text" className={`form-control ${errors.city ? 'error' : ''}`} value={addrCity} onChange={e=>{ setAddrCity(e.target.value); if (errors.city) setErrors(prev=>({ ...prev, city:'' })); }} required />
                {errors.city && <div className="error-message">{errors.city}</div>}
              </div>
              <div className="form-group">
                <label htmlFor="addrState" className="form-label">State <span className="required-asterisk">*</span></label>
                <input id="addrState" type="text" className={`form-control ${errors.state ? 'error' : ''}`} value={addrState} onChange={e=>{ setAddrState(e.target.value); if (errors.state) setErrors(prev=>({ ...prev, state:'' })); }} required />
                {errors.state && <div className="error-message">{errors.state}</div>}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="addrZip" className="form-label">Zip Code <span className="required-asterisk">*</span></label>
                <input id="addrZip" type="text" className={`form-control ${errors.zip ? 'error' : ''}`} value={addrZip} onChange={e=>{ setAddrZip(e.target.value); if (errors.zip) setErrors(prev=>({ ...prev, zip:'' })); }} required />
                {errors.zip && <div className="error-message">{errors.zip}</div>}
              </div>
              <div className="form-group">
                <label htmlFor="addrCountry" className="form-label">Country <span className="required-asterisk">*</span></label>
                <input id="addrCountry" type="text" className={`form-control ${errors.country ? 'error' : ''}`} value={addrCountry} onChange={e=>{ setAddrCountry(e.target.value); if (errors.country) setErrors(prev=>({ ...prev, country:'' })); }} required />
                {errors.country && <div className="error-message">{errors.country}</div>}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="mobile" className="form-label">Mobile <span className="required-asterisk">*</span></label>
                <input id="mobile" type="tel" className={`form-control ${errors.mobile ? 'error' : ''}`} value={formData.mobile || ''} onChange={e => handleInputChange('mobile', e.target.value)} required />
                {errors.mobile && <div className="error-message">{errors.mobile}</div>}
              </div>
              <div className="form-group">
                <label htmlFor="officePhone" className="form-label">Office Phone</label>
                <input id="officePhone" type="tel" className="form-control" value={formData.officePhone || ''} onChange={e => handleInputChange('officePhone', e.target.value)} />
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
                      <input type="radio" name="clubRentals" checked={!!formData.clubRentals} onChange={() => handleInputChange('clubRentals', true)} />
                      Yes
                    </label>
                    <label className="radio-label">
                      <input type="radio" name="clubRentals" checked={!formData.clubRentals} onChange={() => handleInputChange('clubRentals', false)} />
                      No
                    </label>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="golfHandicap" className="form-label">Your handicap (1-36)</label>
                  <input id="golfHandicap" type="number" min={1} max={36} className="form-control" value={formData.golfHandicap || ''} onChange={e => handleInputChange('golfHandicap', e.target.value)} />
                </div>
              </>
            )}
            {formData.wednesdayActivity === 'Networking' && (
              <div className="form-group">
                <label htmlFor="massageTimeSlot" className="form-label">Select your preferred time slot; We will get back to you confirming your appointment time.</label>
                <select id="massageTimeSlot" className="form-control" value={(formData as any).massageTimeSlot || ''} onChange={e => handleInputChange('massageTimeSlot', e.target.value)}>
                  {MASSAGE_TIME_SLOTS.map(slot => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="form-section">
            <h3 className="section-title">Conference Meals</h3>
            <div className="form-group">
              <label htmlFor="tuesdayEarly" className="form-label">Tuesday Early Arrivals Reception <span className="required-asterisk">*</span></label>
              <select id="tuesdayEarly" className="form-control" value={(formData as any).tuesdayEarlyReception || ''} onChange={e=>handleInputChange('tuesdayEarlyReception', e.target.value)} required>
                {MEAL_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="wednesdayReception" className="form-label">Wednesday Welcome Reception <span className="required-asterisk">*</span></label>
              <select id="wednesdayReception" className="form-control" value={formData.wednesdayReception || ''} onChange={e => handleInputChange('wednesdayReception', e.target.value)} required>
                {MEAL_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="thursdayBreakfast" className="form-label">Thursday Breakfast <span className="required-asterisk">*</span></label>
              <select id="thursdayBreakfast" className="form-control" value={formData.thursdayBreakfast || ''} onChange={e => handleInputChange('thursdayBreakfast', e.target.value)} required>
                {MEAL_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="thursdayLuncheon" className="form-label">Thursday Luncheon <span className="required-asterisk">*</span></label>
              <select id="thursdayLuncheon" className="form-control" value={formData.thursdayLuncheon || ''} onChange={e => handleInputChange('thursdayLuncheon', e.target.value)} required>
                {MEAL_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="thursdayDinner" className="form-label">Thursday Dinner <span className="required-asterisk">*</span></label>
              <select id="thursdayDinner" className="form-control" value={formData.thursdayDinner || ''} onChange={e => handleInputChange('thursdayDinner', e.target.value)} required>
                {MEAL_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="fridayBreakfast" className="form-label">Friday Breakfast <span className="required-asterisk">*</span></label>
              <select id="fridayBreakfast" className="form-control" value={formData.fridayBreakfast || ''} onChange={e => handleInputChange('fridayBreakfast', e.target.value)} required>
                {MEAL_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="dietaryRestrictions" className="form-label">Dietary Restrictions/Special Requests</label>
              <textarea id="dietaryRestrictions" className="form-control" value={formData.dietaryRestrictions || ''} onChange={e => handleInputChange('dietaryRestrictions', e.target.value)} rows={3} placeholder="Please specify any dietary restrictions or special requests..." />
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">Spouse/Guest Information</h3>
            <div className="form-group">
              <label className="checkbox-label">
                <input type="checkbox" checked={formData.spouseDinnerTicket || false} onChange={e => handleInputChange('spouseDinnerTicket', e.target.checked)} />
                <span>Check Box to purchase Spouse/Guest Dinner Ticket.</span>
              </label>
            </div>
            {/* Spouse breakfast removed per requirement */}
            {formData.spouseDinnerTicket && (
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="spouseFirstName" className="form-label">Spouse/Guest's First Name <span className="required-asterisk">*</span></label>
                  <input id="spouseFirstName" type="text" className={`form-control ${errors.spouseFirstName ? 'error' : ''}`} value={formData.spouseFirstName || ''} onChange={e => handleInputChange('spouseFirstName', e.target.value)} />
                  {errors.spouseFirstName && <div className="error-message">{errors.spouseFirstName}</div>}
                </div>
                <div className="form-group">
                  <label htmlFor="spouseLastName" className="form-label">Spouse/Guest's Last Name <span className="required-asterisk">*</span></label>
                  <input id="spouseLastName" type="text" className={`form-control ${errors.spouseLastName ? 'error' : ''}`} value={formData.spouseLastName || ''} onChange={e => handleInputChange('spouseLastName', e.target.value)} />
                  {errors.spouseLastName && <div className="error-message">{errors.spouseLastName}</div>}
                </div>
              </div>
            )}
          </div>

          <div className="form-section">
            <h3 className="section-title">Payment Information</h3>
            <div className="payment-summary">
              <div className="payment-item">
                <span>Conference Registration:</span>
                <span>${(event.registrationPricing && event.registrationPricing.length ? (function () { const now = Date.now(); const tiers = (event.registrationPricing || []).map((t: any) => ({ ...t, s: t.startDate ? new Date(t.startDate).getTime() : -Infinity, e: t.endDate ? new Date(t.endDate).getTime() : Infinity })).sort((a: any, b: any) => a.s - b.s); const active = tiers.find((t: any) => now >= t.s && now <= t.e) || (now < tiers[0].s ? tiers[0] : (now > tiers[tiers.length - 1].e ? tiers[tiers.length - 1] : (tiers.find((t: any) => now < t.s) || tiers[tiers.length - 1]))); return (active?.price ?? 675).toFixed(2); })() : '675.00')}</span>
              </div>
              {formData.spouseDinnerTicket && (
                <div className="payment-item">
                  <span>Spouse Dinner Ticket:</span>
                  <span>${(function () { const now = Date.now(); const tiers = (event.spousePricing || []).map((t: any) => ({ ...t, s: t.startDate ? new Date(t.startDate).getTime() : -Infinity, e: t.endDate ? new Date(t.endDate).getTime() : Infinity })).sort((a: any, b: any) => a.s - b.s); const active = tiers.find((t: any) => now >= t.s && now <= t.e) || (now < tiers[0].s ? tiers[0] : (now > tiers[tiers.length - 1].e ? tiers[tiers.length - 1] : (tiers.find((t: any) => now < t.s) || tiers[tiers.length - 1]))); return (active?.price ?? 0).toFixed(2); })()}</span>
                </div>
              )}
              {/* Spouse breakfast total removed */}
              <div className="payment-total">
                <span>Total Price:</span>
                <span>${(formData.totalPrice || 675).toFixed(2)} USD</span>
              </div>
            </div>
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
          </div>

          <div className="modal-footer-actions" style={{ marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onBack} disabled={isSubmitting}>Cancel</button>
            {(formData.paymentMethod || 'Card') === 'Check' ? (
              <button className="btn btn-primary btn-save" type="submit" form="registration-form" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : (registration ? 'Update Registration' : 'Complete Registration')}
              </button>
            ) : (
              <button type="button" className="btn btn-primary btn-save" onClick={handleCardPay} disabled={isSubmitting}>
                {isSubmitting ? 'Processing...' : 'Pay & Complete Registration'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserRegistration;


