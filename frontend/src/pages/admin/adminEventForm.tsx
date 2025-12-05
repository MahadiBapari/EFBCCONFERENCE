import React, { useEffect, useState } from 'react';
import { Event } from '../../types';
import '../../styles/EventFormModal.css';

interface AdminEventFormProps {
  event?: Event | null;
  onCancel: () => void;
  onSave: (eventData: Event) => void;
}

export const AdminEventForm: React.FC<AdminEventFormProps> = ({ event, onCancel, onSave }) => {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState<string[]>([]);
  const [activities, setActivities] = useState<string[]>([]);
  const [newActivity, setNewActivity] = useState('');
  const [registrationPricing, setRegistrationPricing] = useState<Array<{ label: string; price?: number; startDate?: string; endDate?: string }>>([
    { label: 'Priority Registration Fee', price: undefined },
    { label: 'Early Bird Registration Fee', price: undefined },
    { label: 'Advance Registration Fee', price: undefined },
    { label: 'Registration Fee', price: undefined },
  ]);
  const [spousePricing, setSpousePricing] = useState<Array<{ label: string; price?: number; startDate?: string; endDate?: string }>>([
    { label: 'Early Bird Dinner Ticket', price: undefined },
    { label: 'Dinner Ticket', price: undefined },
    { label: 'On-Site Dinner Ticket', price: undefined },
  ]);
  // const [childLunchPrice, setChildLunchPrice] = useState<number | undefined>(undefined);
  const [errors, setErrors] = useState<{ name?: string; startDate?: string; endDate?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // hydrate from incoming event once on mount
  useEffect(() => {
    if (!event) return;
    setName(event.name || '');
    // Ensure date strings are in YYYY-MM-DD for input[type=date]
    const normalizedEndDate = (event.date || event.endDate || '').toString();
    setEndDate(normalizedEndDate.includes('T') ? normalizedEndDate.slice(0, 10) : normalizedEndDate);
    const normalizedStartDate = (event.startDate || '').toString();
    setStartDate(normalizedStartDate.includes('T') ? normalizedStartDate.slice(0, 10) : normalizedStartDate);
    setLocation(event.location || '');
    setDescription(Array.isArray(event.description) ? event.description : (event.description ? [event.description] : []));
    setActivities(event.activities || []);
    setRegistrationPricing(event.registrationPricing || registrationPricing);
    setSpousePricing(event.spousePricing && event.spousePricing.length ? event.spousePricing : spousePricing);
    // setChildLunchPrice(event.childLunchPrice);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (errors.name && name.trim()) setErrors(prev => ({ ...prev, name: undefined })); }, [name, errors.name]);
  useEffect(() => { if (errors.startDate && startDate) setErrors(prev => ({ ...prev, startDate: undefined })); }, [startDate, errors.startDate]);
  useEffect(() => { if (errors.endDate && endDate) setErrors(prev => ({ ...prev, endDate: undefined })); }, [endDate, errors.endDate]);

  const addActivity = () => {
    const a = newActivity.trim();
    if (!a) return;
    if (!activities.includes(a)) setActivities(prev => [...prev, a]);
    setNewActivity('');
  };
  const removeActivity = (a: string) => setActivities(prev => prev.filter(x => x !== a));

  const validate = () => {
    const e: { name?: string; startDate?: string; endDate?: string } = {};
    if (!name.trim()) e.name = 'Event name is required';
    if (!startDate) e.startDate = 'Start date is required';
    if (!endDate) e.endDate = 'End date is required';
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      e.endDate = 'End date must be after start date';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const year = new Date(endDate || startDate).getFullYear();
      // Ensure description is always an array
      const descriptionArray: string[] = Array.isArray(description) 
        ? description.filter(d => d.trim().length > 0)
        : [];
      onSave({
        ...event,
        id: event?.id || Date.now(),
        name: name.trim(),
        date: endDate, // End date
        startDate: startDate,
        endDate: endDate,
        year,
        location: location.trim(),
        description: descriptionArray,
        activities,
        registrationPricing,
        spousePricing,
        // childLunchPrice,
      } as Event);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1>{event ? 'Edit Event' : 'Create New Event'}</h1>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={onCancel} disabled={isSubmitting}>Cancel</button>
          <button className="btn btn-primary" form="admin-event-form" type="submit" disabled={isSubmitting}>{isSubmitting ? (event ? 'Updating...' : 'Creating...') : (event ? 'Update Event' : 'Create Event')}</button>
        </div>
      </div>

      <div className="event-form-container">
        <form id="admin-event-form" className="event-form" onSubmit={submit}>
          <div className="form-section">
            <div className="form-group">
              <label htmlFor="name" className="form-label">Event Name <span className="required-asterisk">*</span></label>
              <input id="name" type="text" className={`form-control ${errors.name ? 'error' : ''}`} value={name} onChange={(e)=>setName(e.target.value)} required disabled={isSubmitting} />
              {errors.name && <div className="error-message">{errors.name}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="startDate" className="form-label">Start Date <span className="required-asterisk">*</span></label>
              <input id="startDate" type="date" className={`form-control ${errors.startDate ? 'error' : ''}`} value={startDate} onChange={(e)=>setStartDate(e.target.value)} required disabled={isSubmitting} />
              {errors.startDate && <div className="error-message">{errors.startDate}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="endDate" className="form-label">End Date <span className="required-asterisk">*</span></label>
              <input id="endDate" type="date" className={`form-control ${errors.endDate ? 'error' : ''}`} value={endDate} onChange={(e)=>setEndDate(e.target.value)} required disabled={isSubmitting} min={startDate} />
              {errors.endDate && <div className="error-message">{errors.endDate}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="location" className="form-label">Event Location</label>
              <input id="location" type="text" className="form-control" value={location} onChange={(e)=>setLocation(e.target.value)} placeholder="e.g., Disney's Yacht & Beach Club Resorts, Orlando, Florida" disabled={isSubmitting} />
            </div>

            <div className="form-group">
              <label className="form-label">Registration Form Includes</label>
              <div className="description-items">
                {description.map((item, idx) => (
                  <div key={idx} className="description-item-row">
                    <input
                      className="form-control description-item-input"
                      type="text"
                      placeholder="e.g., All Education Sessions"
                      aria-label="Description item"
                      value={item}
                      onChange={(e) => {
                        const v = [...description];
                        v[idx] = e.target.value;
                        setDescription(v);
                      }}
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      aria-label="Remove description item"
                      onClick={() => {
                        const v = [...description];
                        v.splice(idx, 1);
                        setDescription(v);
                      }}
                      disabled={isSubmitting}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setDescription([...description, ''])}
                  disabled={isSubmitting}
                >
                  Add Item
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Activities & Sports</label>
              <div className="activity-input-group">
                <input className="form-control" type="text" value={newActivity} onChange={(e)=>setNewActivity(e.target.value)} placeholder="Add an activity (e.g., Tennis, Swimming, Hiking)" disabled={isSubmitting} onKeyPress={(e)=> e.key==='Enter' && (e.preventDefault(), addActivity())} />
                <button type="button" className="btn btn-secondary btn-add-activity" onClick={addActivity} disabled={isSubmitting || !newActivity.trim()}>Add</button>
              </div>
              {activities.length>0 && (
                <div className="activities-list">
                  <h4 className="activities-title">Current Activities:</h4>
                  <div className="activities-tags">
                    {activities.map((a,i)=> (
                      <span key={i} className="activity-tag">{a}<button type="button" className="activity-remove" onClick={()=>removeActivity(a)} disabled={isSubmitting}>×</button></span>
                    ))}
                  </div>
                </div>
              )}
            </div>

 
            <div className="form-group">
              <label className="form-label">Registration Pricing Tiers</label>
              <div className="pricing-tiers">
                {registrationPricing.map((tier, idx) => (
                  <div key={idx} className="tier-row">
                    <input
                      className="form-control tier-label"
                      type="text"
                      placeholder="Label (e.g., SUPER Early bird)"
                      aria-label="Registration Tier Label"
                      value={tier.label}
                      onChange={(e)=>{ const v=[...registrationPricing]; v[idx]={...v[idx], label:e.target.value}; setRegistrationPricing(v); }}
                      disabled={isSubmitting}
                    />
                    <input
                      className="form-control tier-price"
                      type="number"
                      placeholder="Price"
                      aria-label="Registration Tier Price"
                      min={0}
                      value={tier.price ?? ''}
                      onChange={(e)=>{ const raw=e.target.value; const v=[...registrationPricing]; v[idx]={...v[idx], price: raw === '' ? undefined : Number(raw)}; setRegistrationPricing(v); }}
                      disabled={isSubmitting}
                    />
                    <input
                      className="form-control tier-date"
                      type="date"
                      aria-label="Registration Tier Start Date"
                      value={tier.startDate || ''}
                      onChange={(e)=>{ const v=[...registrationPricing]; v[idx]={...v[idx], startDate:e.target.value}; setRegistrationPricing(v); }}
                      disabled={isSubmitting}
                    />
                    <input
                      className="form-control tier-date"
                      type="date"
                      aria-label="Registration Tier End Date"
                      value={tier.endDate || ''}
                      onChange={(e)=>{ const v=[...registrationPricing]; v[idx]={...v[idx], endDate:e.target.value}; setRegistrationPricing(v); }}
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      aria-label="Remove registration tier"
                      onClick={()=>{ const v=[...registrationPricing]; v.splice(idx,1); setRegistrationPricing(v); }}
                      disabled={isSubmitting}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button type="button" className="btn btn-secondary btn-sm" onClick={()=>setRegistrationPricing([...registrationPricing,{label:'',price:undefined}])} disabled={isSubmitting}>Add Tier</button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Spouse Ticket Pricing Tiers</label>
              <div className="pricing-tiers">
                {spousePricing.map((tier, idx) => (
                  <div key={idx} className="tier-row">
                    <input
                      className="form-control tier-label"
                      type="text"
                      placeholder="Label (e.g., Early Bird)"
                      aria-label="Spouse Tier Label"
                      value={tier.label}
                      onChange={(e)=>{ const v=[...spousePricing]; v[idx]={...v[idx], label:e.target.value}; setSpousePricing(v); }}
                      disabled={isSubmitting}
                    />
                    <input
                      className="form-control tier-price"
                      type="number"
                      placeholder="Price"
                      aria-label="Spouse Tier Price"
                      min={0}
                      value={tier.price ?? ''}
                      onChange={(e)=>{ const raw=e.target.value; const v=[...spousePricing]; v[idx]={...v[idx], price: raw === '' ? undefined : Number(raw)}; setSpousePricing(v); }}
                      disabled={isSubmitting}
                    />
                    <input
                      className="form-control tier-date"
                      type="date"
                      aria-label="Spouse Tier Start Date"
                      value={tier.startDate || ''}
                      onChange={(e)=>{ const v=[...spousePricing]; v[idx]={...v[idx], startDate:e.target.value}; setSpousePricing(v); }}
                      disabled={isSubmitting}
                    />
                    <input
                      className="form-control tier-date"
                      type="date"
                      aria-label="Spouse Tier End Date"
                      value={tier.endDate || ''}
                      onChange={(e)=>{ const v=[...spousePricing]; v[idx]={...v[idx], endDate:e.target.value}; setSpousePricing(v); }}
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      aria-label="Remove spouse tier"
                      onClick={()=>{ const v=[...spousePricing]; v.splice(idx,1); setSpousePricing(v); }}
                      disabled={isSubmitting}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button type="button" className="btn btn-secondary btn-sm" onClick={()=>setSpousePricing([...spousePricing,{label:'',price:undefined}])} disabled={isSubmitting}>Add Tier</button>
              </div>
            </div>
            
            {/* <div className="form-group">
              <label className="form-label" htmlFor="childLunchPrice">Child Lunch Price</label>
              <input
                id="childLunchPrice"
                type="number"
                className="form-control"
                placeholder="Enter child lunch price"
                min={0}
                step="0.01"
                value={childLunchPrice ?? ''}
                onChange={(e) => setChildLunchPrice(e.target.value === '' ? undefined : Number(e.target.value))}
                disabled={isSubmitting}
              />
            </div> */}


            {/* Spouse breakfast/lunch fields removed per requirement */}

          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminEventForm;


