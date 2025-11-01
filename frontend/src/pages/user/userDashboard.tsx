import React, { useState, useMemo } from 'react';
import { Event, Registration, User } from '../../types';
import { isEventExpired } from '../../types';
import { RegistrationModal } from '../../components/RegistrationModal';
import '../../styles/UserDashboard.css';

interface UserDashboardProps {
  events: Event[];
  registrations: Registration[];
  handleSaveRegistration: (regData: Registration) => void;
  handleCancelRegistration: (regId: number) => void;
  user: User;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ 
  events, 
  registrations, 
  handleSaveRegistration, 
  handleCancelRegistration, 
  user 
}) => {
  const [showRegModal, setShowRegModal] = useState(false);
  const [editingReg, setEditingReg] = useState<Registration | null>(null);

  // Debug log to see current events
  console.log('UserDashboard - Current events:', events);

  const activeEvent = useMemo(() => events.find(e => !isEventExpired(e.date)), [events]);
  const userRegistration = useMemo(() => 
    registrations.find(r => r.userId === user.id && r.eventId === activeEvent?.id), 
    [registrations, user, activeEvent]
  );

  // NOTE: Per requirements, dashboard cards show global event counts now

  // Aggregate event stats (global, not user-specific)
  const totalEvents = useMemo(() => events.length, [events]);
  const activeEventsCount = useMemo(
    () => events.filter(e => !isEventExpired(e.date)).length,
    [events]
  );

  const onSave = (regData: Registration) => {
    handleSaveRegistration(regData);
    setShowRegModal(false);
    setEditingReg(null);
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{totalEvents}</div>
          <div className="stat-label">Total Events</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{activeEventsCount}</div>
          <div className="stat-label">Active Events</div>
        </div>
      </div>

      {activeEvent ? (
        <div className="card event-card">
          <div className="event-header">
            <h2>{activeEvent.name}</h2>
            <span className="event-status status-active">Active</span>
          </div>
          <ul className="event-details">
            <li>Date: {new Date(activeEvent.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</li>
          </ul>
          {userRegistration ? (
            <div>
              <h3>Your Registration:</h3>
              <p><strong>Name:</strong> {userRegistration.name}</p>
              <p><strong>Category:</strong> {userRegistration.category}</p>
              <div className="event-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => { setEditingReg(userRegistration); setShowRegModal(true); }}
                >
                  Edit Registration
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleCancelRegistration(userRegistration.id)}
                >
                  Cancel Registration
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p>You are not registered for this event.</p>
              <div className="event-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => setShowRegModal(true)}
                >
                  Register Now
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card no-active-event">
          <h3>No Active Events</h3>
          <p>There are currently no active events available for registration.</p>
        </div>
      )}

      {showRegModal && activeEvent && (
        <RegistrationModal
          event={activeEvent}
          registration={editingReg}
          user={user}
          onClose={() => { setShowRegModal(false); setEditingReg(null); }}
          onSave={onSave}
        />
      )}
    </div>
  );
};
