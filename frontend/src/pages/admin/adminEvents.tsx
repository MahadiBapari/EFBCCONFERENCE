import React, { useState, useEffect } from 'react';
import { Event } from '../../types';
import { isEventExpired } from '../../types';
import { EventFormModal } from '../../components/EventFormModal';
import { apiClient } from '../../services/apiClient';
import '../../styles/AdminEvents.css';

interface AdminEventsProps {
  onViewEvent: (eventId: number) => void;
  onRefreshEvents?: () => Promise<void> | void;
}

export const AdminEvents: React.FC<AdminEventsProps> = ({ 
  onViewEvent,
  onRefreshEvents
}) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  // Load events from API
  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<Event[]>('/events');
      if (response.success && response.data) {
        // Transform API data to match frontend Event interface
        const transformedEvents = response.data.map(event => ({
          ...event,
          year: new Date(event.date).getFullYear()
        }));
        setEvents(transformedEvents);
      }
    } catch (error) {
      console.error('Error loading events:', error);
      alert('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  // Debug log to see current events
  console.log('AdminEvents - Current events:', events);

  const handleSaveEvent = async (eventData: Event) => {
    try {
      console.log('Saving event:', eventData);
      
      const existingEventForYear = events.find(e => e.year === eventData.year && e.id !== eventData.id);
      if (existingEventForYear) {
        alert(`An event for ${eventData.year} already exists.`);
        return;
      }
      
      if (editingEvent) {
        // Update existing event
        const { createdAt, updatedAt, ...updatePayload } = eventData;
        const response = await apiClient.put(`/events/${eventData.id}`, updatePayload);
        if (response.success) {
          await loadEvents(); // Reload events from API
          if (onRefreshEvents) await onRefreshEvents();
          alert('Event updated successfully!');
        } else {
          alert('Failed to update event');
        }
      } else {
        // Create new event
        const { id, createdAt, updatedAt, ...createPayload } = eventData;
        const response = await apiClient.post('/events', createPayload);
        if (response.success) {
          await loadEvents(); // Reload events from API
          if (onRefreshEvents) await onRefreshEvents();
          alert('Event created successfully!');
        } else {
          alert('Failed to create event');
        }
      }
      
      setShowEventModal(false);
      setEditingEvent(null);
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Failed to save event');
    }
  };

  const handleDeleteEvent = async (eventId: number) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        const response = await apiClient.delete(`/events/${eventId}`);
        if (response.success) {
          await loadEvents(); // Reload events from API
          if (onRefreshEvents) await onRefreshEvents();
          alert('Event deleted successfully!');
        } else {
          alert('Failed to delete event');
        }
      } catch (error) {
        console.error('Error deleting event:', error);
        alert('Failed to delete event');
      }
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>Loading events...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {showEventModal && (
        <EventFormModal
          event={editingEvent}
          onClose={() => { setShowEventModal(false); setEditingEvent(null); }}
          onSave={handleSaveEvent}
        />
      )}
      <div className="page-header">
        <h1>Event Management</h1>
        <button className="btn btn-primary" onClick={() => { setEditingEvent(null); setShowEventModal(true); }}>
          Create New Event
        </button>
      </div>
      {events.length > 0 ? (
        <div className="event-grid">
          {[...events].sort((a,b) => b.year - a.year).map(event => (
            <div className="card event-card-new" key={event.id}>
              <div className="card event-card-header">
                <div className="event-card-header-text">
                  <h2>{event.name}</h2>
                  <p>{new Date(event.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <span className={`event-status ${isEventExpired(event.date) ? 'status-expired' : 'status-active'}`}>
                  {isEventExpired(event.date) ? 'Expired' : 'Active'}
                </span>
              </div>
              <div className="event-card-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => onViewEvent(event.id)}>Details</button>
                <button className="btn btn-secondary btn-sm" onClick={() => { setEditingEvent(event); setShowEventModal(true); }}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteEvent(event.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="no-content">
          <h2>No Events Found</h2>
          <p>Click "Create New Event" to get started.</p>
        </div>
      )}
    </div>
  );
};
