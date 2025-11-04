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
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [activities, setActivities] = useState<string[]>([]);
  const [newActivity, setNewActivity] = useState('');
  const [registrationPricing, setRegistrationPricing] = useState<Array<{ label: string; price: number; startDate?: string; endDate?: string }>>([
    { label: 'Priority Registration Fee', price: 0 },
    { label: 'Early Bird Registration Fee', price: 0 },
    { label: 'Advance Registration Fee', price: 0 },
    { label: 'Registration Fee', price: 0 },
  ]);
  const [spousePricing, setSpousePricing] = useState<Array<{ label: string; price: number; startDate?: string; endDate?: string }>>([
    { label: 'Early Bird Dinner Ticket', price: 0 },
    { label: 'Dinner Ticket', price: 0 },
    { label: 'On-Site Dinner Ticket', price: 0 },
  ]);
  const [breakfastPrice, setBreakfastPrice] = useState<number | undefined>(undefined);
  const [breakfastEndDate, setBreakfastEndDate] = useState<string | undefined>(undefined);
  const [errors, setErrors] = useState<{ name?: string; date?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // hydrate from incoming event once on mount
  useEffect(() => {
    if (!event) return;
    setName(event.name || '');
    // Ensure date string is in YYYY-MM-DD for input[type=date]
    const normalizedDate = (event.date || '').toString();
    setDate(normalizedDate.includes('T') ? normalizedDate.slice(0, 10) : normalizedDate);
    setLocation(event.location || '');
    setDescription(event.description || '');
    setActivities(event.activities || []);
    setRegistrationPricing(event.registrationPricing || registrationPricing);
    setSpousePricing(event.spousePricing && event.spousePricing.length ? event.spousePricing : spousePricing);
    setBreakfastPrice(event.breakfastPrice);
    const be = (event.breakfastEndDate || '') as string;
    setBreakfastEndDate(be ? (be.includes('T') ? be.slice(0, 10) : be) : undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (errors.name && name.trim()) setErrors(prev => ({ ...prev, name: undefined })); }, [name, errors.name]);
  useEffect(() => { if (errors.date && date) setErrors(prev => ({ ...prev, date: undefined })); }, [date, errors.date]);

  const addActivity = () => {
    const a = newActivity.trim();
    if (!a) return;
    if (!activities.includes(a)) setActivities(prev => [...prev, a]);
    setNewActivity('');
  };
  const removeActivity = (a: string) => setActivities(prev => prev.filter(x => x !== a));

  const validate = () => {
    const e: { name?: string; date?: string } = {};
    if (!name.trim()) e.name = 'Event name is required';
    if (!date) e.date = 'Event date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const year = new Date(date).getFullYear();
      onSave({
        ...event,
        id: event?.id || Date.now(),
        name: name.trim(),
        date,
        year,
        location: location.trim(),
        description: description.trim(),
        activities,
        registrationPricing,
        spousePricing,
        breakfastPrice,
        breakfastEndDate,
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
              <label htmlFor="date" className="form-label">Event Date <span className="required-asterisk">*</span></label>
              <input id="date" type="date" className={`form-control ${errors.date ? 'error' : ''}`} value={date} onChange={(e)=>setDate(e.target.value)} required disabled={isSubmitting} />
              {errors.date && <div className="error-message">{errors.date}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="location" className="form-label">Event Location</label>
              <input id="location" type="text" className="form-control" value={location} onChange={(e)=>setLocation(e.target.value)} placeholder="e.g., Disney's Yacht & Beach Club Resorts, Orlando, Florida" disabled={isSubmitting} />
            </div>

            <div className="form-group">
              <label htmlFor="description" className="form-label">Event Description</label>
              <textarea id="description" className="form-control" rows={3} value={description} onChange={(e)=>setDescription(e.target.value)} disabled={isSubmitting} />
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
                      value={tier.price}
                      onChange={(e)=>{ const v=[...registrationPricing]; v[idx]={...v[idx], price:Number(e.target.value)||0}; setRegistrationPricing(v); }}
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
                <button type="button" className="btn btn-secondary btn-sm" onClick={()=>setRegistrationPricing([...registrationPricing,{label:'',price:0}])} disabled={isSubmitting}>Add Tier</button>
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
                      value={tier.price}
                      onChange={(e)=>{ const v=[...spousePricing]; v[idx]={...v[idx], price:Number(e.target.value)||0}; setSpousePricing(v); }}
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
                <button type="button" className="btn btn-secondary btn-sm" onClick={()=>setSpousePricing([...spousePricing,{label:'',price:0}])} disabled={isSubmitting}>Add Tier</button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Spouse Breakfast/Lunch Price</label>
              <input className="form-control" type="number" placeholder="e.g., 80" min={0} value={breakfastPrice ?? ''} onChange={(e)=> setBreakfastPrice(e.target.value === '' ? undefined : Number(e.target.value))} disabled={isSubmitting} />
              <div className="mt-half">
                <label className="form-label" htmlFor="breakfastEnd">Spouse Breakfast/Lunch End Date (optional)</label>
                <input id="breakfastEnd" className="form-control" type="date" value={breakfastEndDate || ''} onChange={(e)=> setBreakfastEndDate(e.target.value || undefined)} disabled={isSubmitting} />
              </div>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminEventForm;


