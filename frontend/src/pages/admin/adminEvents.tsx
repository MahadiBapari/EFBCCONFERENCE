import React, { useState } from 'react';
import { Event } from '../../types';
import { isEventExpired } from '../../types';
import { formatDateShort } from '../../utils/dateUtils';
// Event form moved to a dedicated page; we navigate via onOpenEventForm
import { apiClient } from '../../services/apiClient';
import '../../styles/AdminEvents.css';

interface AdminEventsProps {
  events: Event[];
  onViewEvent: (eventId: number) => void;
  onRefreshEvents?: () => Promise<void> | void;
  onOpenEventForm?: (ev?: Event | null) => void;
}

export const AdminEvents: React.FC<AdminEventsProps> = ({ 
  events,
  onViewEvent,
  onRefreshEvents,
  onOpenEventForm
}) => {
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Saving is handled in AdminEventForm page

  const handleDeleteEvent = async (eventId: number) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        setDeletingId(eventId);
        const response = await apiClient.delete(`/events/${eventId}`);
        if (response.success) {
          if (onRefreshEvents) await onRefreshEvents();
          alert('Event deleted successfully!');
        } else {
          alert('Failed to delete event');
        }
      } catch (error) {
        console.error('Error deleting event:', error);
        alert('Failed to delete event');
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1>Event Management</h1>
        <button className="btn btn-primary" onClick={() => onOpenEventForm && onOpenEventForm(null)}>
          Create New Event
        </button>
      </div>
      {events.length > 0 ? (
        <div className="event-grid">
          {[...events].sort((a,b) => b.year - a.year).map(event => {
            const startDateStr = event.startDate ? formatDateShort(event.startDate) : null;
            const endDateStr = formatDateShort(event.date || event.endDate || '');
            const dateDisplay = startDateStr ? `${startDateStr} - ${endDateStr}` : endDateStr;
            return (
            <div className="card event-card-new" key={event.id}>
              <div className="card event-card-header">
                <div className="event-card-header-text">
                  <h2>{event.name}</h2>
                  <p>{dateDisplay}</p>
                </div>
                <span className={`event-status ${isEventExpired(event.date || event.endDate || '') ? 'status-expired' : 'status-active'}`}>
                  {isEventExpired(event.date || event.endDate || '') ? 'Expired' : 'Active'}
                </span>
              </div>
              <div className="event-card-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => onViewEvent(event.id)}>Details</button>
                <button className="btn btn-secondary btn-sm" onClick={() => onOpenEventForm && onOpenEventForm(event)}>Edit</button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDeleteEvent(event.id)}
                  disabled={deletingId === event.id}
                >
                  {deletingId === event.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
            );
          })}
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
