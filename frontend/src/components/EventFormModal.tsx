import React, { useState, useEffect } from 'react';
import { Event } from '../types';
import { Modal } from './Modal';
import '../styles/EventFormModal.css';

interface EventFormModalProps {
  event?: Event | null;
  onClose: () => void;
  onSave: (eventData: Event) => void;
}

export const EventFormModal: React.FC<EventFormModalProps> = ({ event, onClose, onSave }) => {
  const [name, setName] = useState(event?.name || "");
  const [date, setDate] = useState(event?.date || "");
  const [location, setLocation] = useState(event?.location || "");
  const [description, setDescription] = useState(event?.description || "");
  const [activities, setActivities] = useState<string[]>(event?.activities || []);
  const [newActivity, setNewActivity] = useState('');
  const [spousePricing, setSpousePricing] = useState<Array<{ label: string; price: number; startDate?: string; endDate?: string }>>(event?.spousePricing || []);
  const [errors, setErrors] = useState<{name?: string; date?: string; location?: string; description?: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clear errors when inputs change
  useEffect(() => {
    if (errors.name && name.trim()) {
      setErrors(prev => ({ ...prev, name: undefined }));
    }
  }, [name, errors.name]);

  useEffect(() => {
    if (errors.date && date) {
      setErrors(prev => ({ ...prev, date: undefined }));
    }
  }, [date, errors.date]);

  const addActivity = () => {
    if (newActivity.trim() && !activities.includes(newActivity.trim())) {
      setActivities(prev => [...prev, newActivity.trim()]);
      setNewActivity('');
    }
  };

  const removeActivity = (activityToRemove: string) => {
    setActivities(prev => prev.filter(activity => activity !== activityToRemove));
  };

  const validateForm = () => {
    const newErrors: {name?: string; date?: string} = {};
    
    if (!name.trim()) {
      newErrors.name = "Event name is required";
    } else if (name.trim().length < 3) {
      newErrors.name = "Event name must be at least 3 characters";
    }
    
    if (!date) {
      newErrors.date = "Event date is required";
    } else {
      const eventDate = new Date(date);
      if (isNaN(eventDate.getTime())) {
        newErrors.date = "Please enter a valid date";
      } else if (eventDate < new Date()) {
        newErrors.date = "Event date cannot be in the past";
      }
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
      // Simulate a small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const eventDate = new Date(date);
      const year = eventDate.getFullYear();
      
      onSave({ 
        ...event, 
        id: event?.id || Date.now(),
        name: name.trim(), 
        date, 
        year,
        location: location.trim(),
        description: description.trim(),
        activities: activities,
        spousePricing
      });
    } catch (error) {
      console.error('Error saving event:', error);
      alert('An error occurred while saving the event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <Modal
      title={
        <div className="modal-title-content">
          <div>
            <h2>{event ? "Edit Event" : "Create New Event"}</h2>
            <p className="modal-subtitle">
              {event ? "Update event details" : "Add a new event to the conference"}
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
            form="event-form"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner"></span>
                {event ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              <>
                {event ? 'Update Event' : 'Create Event'}
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="event-form-container">
        <form id="event-form" onSubmit={handleSubmit} className="event-form">
          <div className="form-section">
            <div className="form-group">
              <label htmlFor="name" className="form-label">
                Event Name
                <span className="required-asterisk">*</span>
              </label>
              <input 
                id="name" 
                type="text" 
                className={`form-control ${errors.name ? 'error' : ''}`}
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="e.g., EFBC Annual Conference 2024"
                required 
                disabled={isSubmitting}
              />
              {errors.name && <div className="error-message">{errors.name}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="date" className="form-label">
                Event Date
                <span className="required-asterisk">*</span>
              </label>
              <input 
                id="date" 
                type="date" 
                className={`form-control ${errors.date ? 'error' : ''}`}
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                required 
                disabled={isSubmitting}
                min={new Date().toISOString().split('T')[0]}
              />
              {errors.date && <div className="error-message">{errors.date}</div>}
              {date && !errors.date && (
                <div className="date-preview">
                  {formatDateForDisplay(date)}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="location" className="form-label">
                Event Location
              </label>
              <input 
                id="location" 
                type="text" 
                className={`form-control ${errors.location ? 'error' : ''}`}
                value={location} 
                onChange={(e) => setLocation(e.target.value)} 
                placeholder="e.g., Disney's Yacht & Beach Club Resorts, Orlando, Florida"
                disabled={isSubmitting}
              />
              {errors.location && <div className="error-message">{errors.location}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="description" className="form-label">
                Event Description
              </label>
              <textarea 
                id="description" 
                className={`form-control ${errors.description ? 'error' : ''}`}
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Brief description of the event..."
                rows={3}
                disabled={isSubmitting}
              />
              {errors.description && <div className="error-message">{errors.description}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">
                Activities & Sports
              </label>
              <div className="activity-input-group">
                <input 
                  type="text" 
                  className="form-control"
                  value={newActivity} 
                  onChange={(e) => setNewActivity(e.target.value)} 
                  placeholder="Add an activity (e.g., Tennis, Swimming, Hiking)"
                  disabled={isSubmitting}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addActivity())}
                />
                <button 
                  type="button"
                  className="btn btn-secondary btn-add-activity"
                  onClick={addActivity}
                  disabled={isSubmitting || !newActivity.trim()}
                >
                  Add
                </button>
              </div>
              
              {activities.length > 0 && (
                <div className="activities-list">
                  <h4 className="activities-title">Current Activities:</h4>
                  <div className="activities-tags">
                    {activities.map((activity, index) => (
                      <span key={index} className="activity-tag">
                        {activity}
                        <button 
                          type="button"
                          className="activity-remove"
                          onClick={() => removeActivity(activity)}
                          disabled={isSubmitting}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Spouse Ticket Pricing Tiers</label>
              <div className="pricing-tiers">
                {spousePricing.map((tier, idx) => (
                  <div key={idx} className="tier-row">
                    <input
                      type="text"
                      className="form-control tier-label"
                      placeholder="Label (e.g., Early Bird)"
                      value={tier.label}
                      onChange={(e)=>{
                        const v=[...spousePricing]; v[idx]={...v[idx], label:e.target.value}; setSpousePricing(v);
                      }}
                      disabled={isSubmitting}
                    />
                    <input
                      type="number"
                      className="form-control tier-price"
                      placeholder="Price"
                      min={0}
                      value={tier.price}
                      onChange={(e)=>{
                        const v=[...spousePricing]; v[idx]={...v[idx], price: Number(e.target.value)}; setSpousePricing(v);
                      }}
                      disabled={isSubmitting}
                    />
                    <input
                      type="date"
                      className="form-control tier-date"
                      value={tier.startDate || ''}
                      onChange={(e)=>{
                        const v=[...spousePricing]; v[idx]={...v[idx], startDate:e.target.value}; setSpousePricing(v);
                      }}
                      disabled={isSubmitting}
                      aria-label="Spouse tier start date"
                      title="Spouse tier start date"
                    />
                    <input
                      type="date"
                      className="form-control tier-date"
                      value={tier.endDate || ''}
                      onChange={(e)=>{
                        const v=[...spousePricing]; v[idx]={...v[idx], endDate:e.target.value}; setSpousePricing(v);
                      }}
                      disabled={isSubmitting}
                      aria-label="Spouse tier end date"
                      title="Spouse tier end date"
                    />
                    <button type="button" className="btn btn-danger btn-sm" onClick={()=>{
                      const v=[...spousePricing]; v.splice(idx,1); setSpousePricing(v);
                    }} disabled={isSubmitting}>Remove</button>
                  </div>
                ))}
                <button type="button" className="btn btn-secondary btn-sm" onClick={()=>setSpousePricing([...spousePricing,{label:'',price:0}])} disabled={isSubmitting}>Add Tier</button>
              </div>
            </div>
          </div>

          {event && (
            <div className="form-info">
              <div className="info-item">
                <span className="info-label">Event ID:</span>
                <span className="info-value">{event.id}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Year:</span>
                <span className="info-value">{event.year}</span>
              </div>
            </div>
          )}
        </form>
      </div>
    </Modal>
  );
};
