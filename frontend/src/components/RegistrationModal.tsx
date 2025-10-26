import React, { useState, useEffect } from 'react';
import { Registration, Event, COMPANY_TYPES, MASSAGE_TIME_SLOTS, MEAL_OPTIONS, PAYMENT_METHODS } from '../types';
import { Modal } from './Modal';
import '../styles/RegistrationModal.css';

interface RegistrationModalProps {
  event: Event;
  registration?: Registration | null;
  user: { id: number; name: string; email: string };
  onClose: () => void;
  onSave: (regData: Registration) => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({ 
  event, 
  registration, 
  user, 
  onClose, 
  onSave 
}) => {
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
    dietaryRestrictions: registration?.dietaryRestrictions || '',
    
    // Spouse/Guest Information
    spouseDinnerTicket: registration?.spouseDinnerTicket || false,
    spouseFirstName: registration?.spouseFirstName || '',
    spouseLastName: registration?.spouseLastName || '',
    
    // Payment Information
    totalPrice: registration?.totalPrice || 675, // Default price
    paymentMethod: registration?.paymentMethod || 'Card',
    
    // Legacy fields
    name: registration?.name || user.name,
    category: registration?.category || 'Networking',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate total price based on selections
  useEffect(() => {
    let total = 675; // Base price

    // Dynamic spouse tier pricing
    const tiers = (event.spousePricing || []).map(t => ({
      ...t,
      startMs: t.startDate ? new Date(t.startDate).getTime() : -Infinity,
      endMs: t.endDate ? new Date(t.endDate).getTime() : Infinity,
    }));
    const now = Date.now();
    const active = tiers.find(t => now >= t.startMs && now <= t.endMs);

    // Add spouse dinner ticket cost using active tier (fallback $200)
    if (formData.spouseDinnerTicket) {
      total += (active?.price ?? 200);
    }

    setFormData(prev => ({ ...prev, totalPrice: total }));
  }, [formData.spouseDinnerTicket, event.spousePricing]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Required fields validation
    if (!formData.firstName?.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName?.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.badgeName?.trim()) newErrors.badgeName = 'Badge name is required';
    if (!formData.email?.trim()) newErrors.email = 'Email is required';
    if (!formData.organization?.trim()) newErrors.organization = 'Organization is required';
    if (!formData.jobTitle?.trim()) newErrors.jobTitle = 'Job title is required';
    if (!formData.address?.trim()) newErrors.address = 'Address is required';
    if (!formData.mobile?.trim()) newErrors.mobile = 'Mobile number is required';
    if (!formData.companyType?.trim()) newErrors.companyType = 'Company type is required';
    if (!formData.wednesdayActivity?.trim()) newErrors.wednesdayActivity = 'Wednesday activity is required';
    
    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Spouse information validation
    if (formData.spouseDinnerTicket) {
      if (!formData.spouseFirstName?.trim()) newErrors.spouseFirstName = 'Spouse first name is required';
      if (!formData.spouseLastName?.trim()) newErrors.spouseLastName = 'Spouse last name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const registrationData: Registration = {
        id: registration?.id || Date.now(),
        userId: user.id,
        eventId: event.id,
        ...formData,
        name: `${formData.firstName} ${formData.lastName}`,
        category: formData.wednesdayActivity || 'Networking',
      } as Registration;
      
      onSave(registrationData);
    } catch (error) {
      console.error('Error saving registration:', error);
      alert('An error occurred while saving the registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Modal
      size="xl"
      title={
        <div className="modal-title-content">
          <div>
            <h2>{registration ? 'Edit Registration' : 'Register for Event'}</h2>
            <p className="modal-subtitle">
              {event.name} - {new Date(event.date).toLocaleDateString()}
            </p>
          </div>
        </div>
      }
      onClose={onClose}
      footer={
        <div className="modal-footer-actions">
          <button 
            className="btn btn-secondary" 
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            className="btn btn-primary btn-save" 
            type="submit" 
            form="registration-form"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner"></span>
                {registration ? 'Updating...' : 'Registering...'}
              </>
            ) : (
              <>
                {registration ? 'Update Registration' : 'Complete Registration'}
              </>
            )}
          </button>
        </div>
      }
    >
      <form id="registration-form" onSubmit={handleSubmit} className="registration-form">
          
          {/* Registration Information Section */}
          <div className="form-section">
            <h3 className="section-title">Registration Information</h3>
            
            <div className="pricing-info">
              <div className="pricing-section">
                <h4 className="pricing-title">EFBC 2024 Registration Fees</h4>
                <div className="pricing-item">
                  <span className="pricing-label">SUPER Early bird:</span>
                  <span className="pricing-amount">$450 until December 31, 2025</span>
                </div>
                <div className="pricing-item">
                  <span className="pricing-label">Early bird:</span>
                  <span className="pricing-amount">$575 between January 1 to February 29, 2026</span>
                </div>
                <div className="pricing-item">
                  <span className="pricing-label">Regular:</span>
                  <span className="pricing-amount">$675 between March 1 to April 21, 2026</span>
                </div>
              </div>

              <div className="pricing-section">
                <h4 className="pricing-title">Spouse/Guest Tickets</h4>
                <div className="pricing-item">
                  <span className="pricing-label">Spouse dinner ticket:</span>
                  <span className="pricing-amount">$125 until February 29, 2026</span>
                </div>
                <div className="pricing-item">
                  <span className="pricing-label">Spouse dinner ticket:</span>
                  <span className="pricing-amount">$150 between March 1 to April 21, 2026</span>
                </div>
                <div className="pricing-item">
                  <span className="pricing-label">Spouse dinner ticket:</span>
                  <span className="pricing-amount">$200 from April 22, 2026 and on-site</span>
                </div>
                <div className="pricing-item">
                  <span className="pricing-label">Spouse breakfast/lunch:</span>
                  <span className="pricing-amount">$80 prior to April 22, 2026 (upon request)</span>
                </div>
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
          
          {/* Personal Information Section */}
          <div className="form-section">
            <h3 className="section-title">Personal Information</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName" className="form-label">
                  First Name <span className="required-asterisk">*</span>
                </label>
                <input
                  id="firstName"
                  type="text"
                  className={`form-control ${errors.firstName ? 'error' : ''}`}
                  value={formData.firstName || ''}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  required
                />
                {errors.firstName && <div className="error-message">{errors.firstName}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="lastName" className="form-label">
                  Last Name <span className="required-asterisk">*</span>
                </label>
                <input
                  id="lastName"
                  type="text"
                  className={`form-control ${errors.lastName ? 'error' : ''}`}
                  value={formData.lastName || ''}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  required
                />
                {errors.lastName && <div className="error-message">{errors.lastName}</div>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="badgeName" className="form-label">
                Your 1st name as you wish it to appear on your badge <span className="required-asterisk">*</span>
              </label>
              <input
                id="badgeName"
                type="text"
                className={`form-control ${errors.badgeName ? 'error' : ''}`}
                value={formData.badgeName || ''}
                onChange={(e) => handleInputChange('badgeName', e.target.value)}
                required
              />
              {errors.badgeName && <div className="error-message">{errors.badgeName}</div>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email <span className="required-asterisk">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  className={`form-control ${errors.email ? 'error' : ''}`}
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                />
                {errors.email && <div className="error-message">{errors.email}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="secondaryEmail" className="form-label">Secondary Email</label>
                <input
                  id="secondaryEmail"
                  type="email"
                  className="form-control"
                  value={formData.secondaryEmail || ''}
                  onChange={(e) => handleInputChange('secondaryEmail', e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="organization" className="form-label">
                  Organization <span className="required-asterisk">*</span>
                </label>
                <input
                  id="organization"
                  type="text"
                  className={`form-control ${errors.organization ? 'error' : ''}`}
                  value={formData.organization || ''}
                  onChange={(e) => handleInputChange('organization', e.target.value)}
                  required
                />
                {errors.organization && <div className="error-message">{errors.organization}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="jobTitle" className="form-label">
                  Job Title <span className="required-asterisk">*</span>
                </label>
                <input
                  id="jobTitle"
                  type="text"
                  className={`form-control ${errors.jobTitle ? 'error' : ''}`}
                  value={formData.jobTitle || ''}
                  onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                  required
                />
                {errors.jobTitle && <div className="error-message">{errors.jobTitle}</div>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="address" className="form-label">
                Address <span className="required-asterisk">*</span>
              </label>
              <textarea
                id="address"
                className={`form-control ${errors.address ? 'error' : ''}`}
                value={formData.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                rows={3}
                required
              />
              {errors.address && <div className="error-message">{errors.address}</div>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="mobile" className="form-label">
                  Mobile <span className="required-asterisk">*</span>
                </label>
                <input
                  id="mobile"
                  type="tel"
                  className={`form-control ${errors.mobile ? 'error' : ''}`}
                  value={formData.mobile || ''}
                  onChange={(e) => handleInputChange('mobile', e.target.value)}
                  required
                />
                {errors.mobile && <div className="error-message">{errors.mobile}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="officePhone" className="form-label">Office Phone</label>
                <input
                  id="officePhone"
                  type="tel"
                  className="form-control"
                  value={formData.officePhone || ''}
                  onChange={(e) => handleInputChange('officePhone', e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Is this your first time attending the conference? <span className="required-asterisk">*</span>
              </label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="isFirstTimeAttending"
                    checked={formData.isFirstTimeAttending === true}
                    onChange={() => handleInputChange('isFirstTimeAttending', true)}
                  />
                  Yes
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="isFirstTimeAttending"
                    checked={formData.isFirstTimeAttending === false}
                    onChange={() => handleInputChange('isFirstTimeAttending', false)}
                  />
                  No
                </label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="companyType" className="form-label">
                Company Type <span className="required-asterisk">*</span>
              </label>
              <select
                id="companyType"
                className={`form-control ${errors.companyType ? 'error' : ''}`}
                value={formData.companyType || ''}
                onChange={(e) => handleInputChange('companyType', e.target.value)}
                required
              >
                <option value="" disabled>Please Select Company Type</option>
                {COMPANY_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {errors.companyType && <div className="error-message">{errors.companyType}</div>}
            </div>

            {formData.companyType === 'Other' && (
              <div className="form-group">
                <label htmlFor="companyTypeOther" className="form-label">
                  If "other" selected, please specify
                </label>
                <input
                  id="companyTypeOther"
                  type="text"
                  className="form-control"
                  value={formData.companyTypeOther || ''}
                  onChange={(e) => handleInputChange('companyTypeOther', e.target.value)}
                />
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="emergencyContactName" className="form-label">Emergency Contact Name</label>
                <input
                  id="emergencyContactName"
                  type="text"
                  className="form-control"
                  value={formData.emergencyContactName || ''}
                  onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="emergencyContactPhone" className="form-label">Emergency Contact Phone</label>
                <input
                  id="emergencyContactPhone"
                  type="tel"
                  className="form-control"
                  value={formData.emergencyContactPhone || ''}
                  onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Conference Events Section */}
          <div className="form-section">
            <h3 className="section-title">Conference Events</h3>
            
            <div className="form-group">
              <label htmlFor="wednesdayActivity" className="form-label">
                Please indicate which Wednesday activity you will be attending (Select ONE) <span className="required-asterisk">*</span>
              </label>
              <select
                id="wednesdayActivity"
                className={`form-control ${errors.wednesdayActivity ? 'error' : ''}`}
                value={formData.wednesdayActivity || ''}
                onChange={(e) => handleInputChange('wednesdayActivity', e.target.value)}
                required
              >
                <option value="" disabled>Please Select Conference Event</option>
                {(event.activities || []).map(activity => (
                  <option key={activity} value={activity}>{activity}</option>
                ))}
              </select>
              {errors.wednesdayActivity && <div className="error-message">{errors.wednesdayActivity}</div>}
            </div>

            {/**************** Golf-specific fields ****************/}
            {((event.activities || []).some(a => a.toLowerCase().includes('golf')) && (formData.wednesdayActivity || '').toLowerCase().includes('golf')) && (
              <>
                <div className="form-group">
                  <label className="form-label">
                    Club rentals needed?
                  </label>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="clubRentals"
                        checked={!!formData.clubRentals}
                        onChange={() => handleInputChange('clubRentals', true)}
                      />
                      Yes
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="clubRentals"
                        checked={!formData.clubRentals}
                        onChange={() => handleInputChange('clubRentals', false)}
                      />
                      No
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="golfHandicap" className="form-label">Your handicap (1-36)</label>
                  <input
                    id="golfHandicap"
                    type="number"
                    min={1}
                    max={36}
                    className="form-control"
                    value={formData.golfHandicap || ''}
                    onChange={(e) => handleInputChange('golfHandicap', e.target.value)}
                  />
                </div>
              </>
            )}

            {/**************** Networking-specific fields kept for massage time slots if desired ****************/}
            {formData.wednesdayActivity === 'Networking' && (
              <div className="form-group">
                <label htmlFor="massageTimeSlot" className="form-label">
                  Select your preferred time slot; We will get back to you confirming your appointment time.
                </label>
                <select
                  id="massageTimeSlot"
                  className="form-control"
                  value={(formData as any).massageTimeSlot || ''}
                  onChange={(e) => handleInputChange('massageTimeSlot', e.target.value)}
                >
                  {MASSAGE_TIME_SLOTS.map(slot => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Conference Meals Section */}
          <div className="form-section">
            <h3 className="section-title">Conference Meals</h3>
            
            <div className="form-group">
              <label htmlFor="wednesdayReception" className="form-label">
                Wednesday Welcome Reception <span className="required-asterisk">*</span>
              </label>
              <select
                id="wednesdayReception"
                className="form-control"
                value={formData.wednesdayReception || ''}
                onChange={(e) => handleInputChange('wednesdayReception', e.target.value)}
                required
              >
                {MEAL_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="thursdayBreakfast" className="form-label">
                Thursday Breakfast <span className="required-asterisk">*</span>
              </label>
              <select
                id="thursdayBreakfast"
                className="form-control"
                value={formData.thursdayBreakfast || ''}
                onChange={(e) => handleInputChange('thursdayBreakfast', e.target.value)}
                required
              >
                {MEAL_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="thursdayLuncheon" className="form-label">
                Thursday Luncheon <span className="required-asterisk">*</span>
              </label>
              <select
                id="thursdayLuncheon"
                className="form-control"
                value={formData.thursdayLuncheon || ''}
                onChange={(e) => handleInputChange('thursdayLuncheon', e.target.value)}
                required
              >
                {MEAL_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="thursdayDinner" className="form-label">
                Thursday Dinner <span className="required-asterisk">*</span>
              </label>
              <select
                id="thursdayDinner"
                className="form-control"
                value={formData.thursdayDinner || ''}
                onChange={(e) => handleInputChange('thursdayDinner', e.target.value)}
                required
              >
                {MEAL_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="fridayBreakfast" className="form-label">
                Friday Breakfast <span className="required-asterisk">*</span>
              </label>
              <select
                id="fridayBreakfast"
                className="form-control"
                value={formData.fridayBreakfast || ''}
                onChange={(e) => handleInputChange('fridayBreakfast', e.target.value)}
                required
              >
                {MEAL_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="dietaryRestrictions" className="form-label">Dietary Restrictions/Special Requests</label>
              <textarea
                id="dietaryRestrictions"
                className="form-control"
                value={formData.dietaryRestrictions || ''}
                onChange={(e) => handleInputChange('dietaryRestrictions', e.target.value)}
                rows={3}
                placeholder="Please specify any dietary restrictions or special requests..."
              />
            </div>
          </div>

          {/* Spouse/Guest Information Section */}
          <div className="form-section">
            <h3 className="section-title">Spouse/Guest Information</h3>
            
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.spouseDinnerTicket || false}
                  onChange={(e) => handleInputChange('spouseDinnerTicket', e.target.checked)}
                />
                <span>Check Box to purchase Spouse/Guest Dinner Ticket. ($200)</span>
              </label>
            </div>

            {formData.spouseDinnerTicket && (
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="spouseFirstName" className="form-label">
                    Spouse/Guest's First Name <span className="required-asterisk">*</span>
                  </label>
                  <input
                    id="spouseFirstName"
                    type="text"
                    className={`form-control ${errors.spouseFirstName ? 'error' : ''}`}
                    value={formData.spouseFirstName || ''}
                    onChange={(e) => handleInputChange('spouseFirstName', e.target.value)}
                  />
                  {errors.spouseFirstName && <div className="error-message">{errors.spouseFirstName}</div>}
                </div>
                
                <div className="form-group">
                  <label htmlFor="spouseLastName" className="form-label">
                    Spouse/Guest's Last Name <span className="required-asterisk">*</span>
                  </label>
                  <input
                    id="spouseLastName"
                    type="text"
                    className={`form-control ${errors.spouseLastName ? 'error' : ''}`}
                    value={formData.spouseLastName || ''}
                    onChange={(e) => handleInputChange('spouseLastName', e.target.value)}
                  />
                  {errors.spouseLastName && <div className="error-message">{errors.spouseLastName}</div>}
                </div>
              </div>
            )}
          </div>

          {/* Payment Information Section */}
          <div className="form-section">
            <h3 className="section-title">Payment Information</h3>
            
            <div className="payment-summary">
              <div className="payment-item">
                <span>Conference Registration:</span>
                <span>$675.00</span>
              </div>
              {formData.spouseDinnerTicket && (
                <div className="payment-item">
                  <span>Spouse Dinner Ticket:</span>
                  <span>${formData.totalPrice && formData.totalPrice > 675 ? (formData.totalPrice - 675).toFixed(2) : '0.00'}</span>
                </div>
              )}
              <div className="payment-total">
                <span>Total Price:</span>
                <span>${(formData.totalPrice || 675).toFixed(2)} USD</span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="paymentMethod" className="form-label">Payment Method</label>
              <select
                id="paymentMethod"
                className="form-control"
                value={formData.paymentMethod || ''}
                onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
              >
                {PAYMENT_METHODS.map(method => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
              {formData.paymentMethod === 'Check' && (
                <p className="payment-note">
                  If you prefer by check, please contact us at info@eastfuelconf.com
                </p>
              )}
            </div>
          </div>
        </form>
    </Modal>
  );
};
