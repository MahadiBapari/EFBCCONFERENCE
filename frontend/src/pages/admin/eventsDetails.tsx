import React, { useState, useMemo, useEffect } from 'react';
import { Event, Registration, Group } from '../../types';

interface EventDetailsPageProps {
  event: Event;
  registrations: Registration[];
  groups: Group[];
  onBack: () => void;
}

export const EventDetailsPage: React.FC<EventDetailsPageProps> = ({ 
  event, 
  registrations, 
  groups, 
  onBack 
}) => {
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const [searchQuery, setSearchQuery] = useState("");

  const eventRegistrations = useMemo(() => {
    let results = registrations.filter(r => r.eventId === event.id);

    if (searchQuery.trim() !== "") {
      const lowercasedQuery = searchQuery.toLowerCase();
      results = results.filter(r => 
        r.name.toLowerCase().includes(lowercasedQuery) || 
        r.email.toLowerCase().includes(lowercasedQuery)
      );
    }
    return results;
  }, [registrations, event, searchQuery]);

  const findGroupName = (regId: number) => {
    const group = groups.find(g => g.members.includes(regId));
    return group ? group.name : <span className="unassigned-text">Unassigned</span>;
  };

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <button onClick={onBack} className="btn btn-secondary back-button">← Back to Events</button>
          <h1>{event.name}</h1>
        </div>
        <div className="search-bar">
          <input
            type="search"
            placeholder="Search attendees..."
            className="form-control"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Category</th>
              <th>Group</th>
            </tr>
          </thead>
          <tbody>
            {eventRegistrations.length > 0 ? eventRegistrations.map(reg => (
              <tr key={reg.id}>
                <td>{reg.name}</td>
                <td>{reg.email}</td>
                <td>{reg.category}</td>
                <td>{findGroupName(reg.id)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} className="no-results">No attendees found for this event or filter.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
