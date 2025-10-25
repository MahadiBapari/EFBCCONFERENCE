import React, { useState, useMemo } from 'react';
import { Event, Registration, User } from '../../types';
import { isEventExpired } from '../../types';
import { RegistrationModal } from '../../components/RegistrationModal';
import '../../styles/UserEvents.css';

interface UserEventsProps {
  events: Event[];
  registrations: Registration[];
  handleSaveRegistration: (regData: Registration) => void;
  handleCancelRegistration: (regId: number) => void;
  user: User;
}

export const UserEvents: React.FC<UserEventsProps> = ({ 
  events, 
  registrations, 
  handleSaveRegistration, 
  handleCancelRegistration, 
  user 
}) => {
  const [showRegModal, setShowRegModal] = useState(false);
  const [editingReg, setEditingReg] = useState<Registration | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Debug log to see current events
  console.log('UserEvents - Current events:', events);

  const userRegistrations = useMemo(() => 
    registrations.filter(r => r.userId === user.id), 
    [registrations, user]
  );

  const onSave = (regData: Registration) => {
    handleSaveRegistration(regData);
    setShowRegModal(false);
    setEditingReg(null);
    setSelectedEvent(null);
  };

  const handleRegister = (event: Event) => {
    const existingReg = userRegistrations.find(r => r.eventId === event.id);
    if (existingReg) {
      setEditingReg(existingReg);
    }
    setSelectedEvent(event);
    setShowRegModal(true);
  };

  const handleCancel = (regId: number) => {
    if (window.confirm("Are you sure you want to cancel your registration for this event?")) {
      handleCancelRegistration(regId);
    }
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1>All Events</h1>
      </div>

      {events.length > 0 ? (
        <div className="events-grid">
          {events.map(event => {
            const userReg = userRegistrations.find(r => r.eventId === event.id);
            const isExpired = isEventExpired(event.date);
            
            return (
              <div key={event.id} className="card event-item">
                <div className="event-item-header">
                  <h3>{event.name}</h3>
                  <span className="event-year">{event.year}</span>
                </div>
                <div className="event-date">
                  {new Date(event.date).toLocaleDateString(undefined, { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
                
                {userReg ? (
                  <div className="registration-info">
                    <h4>Your Registration</h4>
                    <div className="registration-details">
                      <div><strong>Name:</strong> {userReg.name}</div>
                      <div><strong>Category:</strong> {userReg.category}</div>
                    </div>
                    <div className="event-actions">
                      {!isExpired && (
                        <>
                          <button
                            className="btn btn-primary"
                            onClick={() => handleRegister(event)}
                          >
                            Edit Registration
                          </button>
                          <button
                            className="btn btn-danger"
                            onClick={() => handleCancel(userReg.id)}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="event-actions">
                    {!isExpired ? (
                      <button
                        className="btn btn-primary"
                        onClick={() => handleRegister(event)}
                      >
                        Register
                      </button>
                    ) : (
                      <span className="event-status status-expired">Event Expired</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card no-events">
          <h3>No Events Available</h3>
          <p>There are currently no events available.</p>
        </div>
      )}

      {showRegModal && selectedEvent && (
        <RegistrationModal
          event={selectedEvent}
          registration={editingReg}
          user={user}
          onClose={() => { setShowRegModal(false); setEditingReg(null); setSelectedEvent(null); }}
          onSave={onSave}
        />
      )}
    </div>
  );
};
