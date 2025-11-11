import React, { useState, useMemo, useEffect } from 'react';
import { Registration, Event, Group } from '../../types';
import '../../styles/AdminAttendees.css';
import { RegistrationPreview } from '../../components/RegistrationPreview';
import { UserRegistration } from '../user/userRegistration';

interface AdminAttendeesProps {
  registrations: Registration[];
  events: Event[];
  groups: Group[];
  handleSaveRegistration: (regData: Registration) => void;
  handleDeleteRegistrations: (regIds: number[]) => void;
  handleBulkAssignGroup: (regIds: number[], targetGroupId: number) => void;
  user: { id: number; name: string; email: string };
}

export const AdminAttendees: React.FC<AdminAttendeesProps> = ({ 
  registrations, 
  events, 
  groups, 
  handleSaveRegistration, 
  handleDeleteRegistrations, 
  handleBulkAssignGroup,
  user
}) => {
  const [filter, setFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  // Removed unused local edit state to satisfy CI lint rules
  const [selectedRegIds, setSelectedRegIds] = useState<number[]>([]);
  const [previewRegId, setPreviewRegId] = useState<number | null>(null);
  const [editingRegId, setEditingRegId] = useState<number | null>(null);

  // Automatically select the most recent event on component mount
  useEffect(() => {
    if (events.length > 0 && selectedEventId === null) {
      const mostRecentEvent = events.reduce((latest, current) => {
        return new Date(current.date) > new Date(latest.date) ? current : latest;
      });
      setSelectedEventId(mostRecentEvent.id);
    }
  }, [events, selectedEventId]);

  const filteredRegistrations = useMemo(() => {
    let results = registrations;
    // Exclude cancelled registrations from attendee lists
    results = results.filter(r => {
      const st = (r as any).status;
      const cancelled = st === 'cancelled' || !!(r as any).cancellationAt || !!(r as any).cancellationReason;
      return !cancelled;
    });
    
    // Filter by selected event
    if (selectedEventId !== null) {
      results = results.filter(r => r.eventId === selectedEventId);
    }
    
    if (filter !== "All") {
      results = results.filter(r => r.category === filter);
    }

    if (searchQuery.trim() !== "") {
      const lowercasedQuery = searchQuery.toLowerCase();
      results = results.filter(r => 
        r.name.toLowerCase().includes(lowercasedQuery) || 
        r.email.toLowerCase().includes(lowercasedQuery)
      );
    }
    return results;
  }, [filter, registrations, searchQuery, selectedEventId]);

  // const onSave = (regData: Registration) => {
  //   handleSaveRegistration(regData);
  //   setEditingReg(null);
  // };

  const handleSelectOne = (regId: number, isChecked: boolean) => {
    if (isChecked) {
      setSelectedRegIds(prev => [...prev, regId]);
    } else {
      setSelectedRegIds(prev => prev.filter(id => id !== regId));
    }
  };

  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      setSelectedRegIds(filteredRegistrations.map(r => r.id));
    } else {
      setSelectedRegIds([]);
    }
  };
  
  const handleDeleteSelected = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedRegIds.length} selected attendee(s)?`)) {
      handleDeleteRegistrations(selectedRegIds);
      setSelectedRegIds([]);
    }
  };

  const handleBulkAssign = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const targetGroupId = Number(e.target.value);
    if (!targetGroupId) return;
    
    handleBulkAssignGroup(selectedRegIds, targetGroupId);
    setSelectedRegIds([]);
    e.target.value = ""; // Reset dropdown
  };

  const groupsByCategory = useMemo(() => {
    return groups.reduce<Record<string, Group[]>>((acc, group) => {
      if (!acc[group.category]) {
        acc[group.category] = [];
      }
      acc[group.category].push(group);
      return acc;
    }, {});
  }, [groups]);

  const handleExportCSV = () => {
    const headers = ["Name", "Email", "Category"];
    const rows = filteredRegistrations.map(reg =>
      [
        `"${reg.name.replace(/"/g, '""')}"`,
        `"${reg.email.replace(/"/g, '""')}"`,
        `"${reg.category.replace(/"/g, '""')}"`
      ].join(',')
    );

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "attendees.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const isAllSelected = filteredRegistrations.length > 0 && selectedRegIds.length === filteredRegistrations.length;

  return (
    <div className="container">
      <div className="page-header">
        <h1>Attendees</h1>
        <div className="event-selector">
          <label htmlFor="eventSelect" className="filter-label">Select Event:</label>
          <select
            id="eventSelect"
            className="form-control"
            value={selectedEventId || ''}
            onChange={(e) => {
              const eventId = e.target.value ? parseInt(e.target.value) : null;
              setSelectedEventId(eventId);
              setSelectedRegIds([]);
            }}
          >
            <option value="" disabled>All Events</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>
                {event.name} - {new Date(event.date).toLocaleDateString()}
                {selectedEventId === event.id ? ' (Current)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={handleExportCSV}>Export CSV</button>
          <button className="btn btn-secondary" onClick={handlePrint}>Print / PDF</button>
        </div>
      </div>
      <div className="category-tabs">
        {( (() => {
          const activities = events.find(e => e.id === selectedEventId)?.activities || [];
          const tabs = ["All", ...activities];
          return tabs;
        })() ).map(cat => (
          <button 
            key={cat} 
            className={`tab-btn ${filter === cat ? 'tab-btn-active' : ''}`}
            onClick={() => { setFilter(cat); setSelectedRegIds([]); }}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="filter-controls">
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

      {selectedRegIds.length > 0 && (
        <div className="bulk-actions-bar">
          <span>{selectedRegIds.length} selected</span>
          <select className="form-control" onChange={handleBulkAssign} value="" aria-label="Assign selected attendees to group">
            <option value="" disabled>Assign to Group...</option>
            {Object.keys(groupsByCategory).map((category) => (
              <optgroup label={category} key={category}>
                {groupsByCategory[category].map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </optgroup>
            ))}
          </select>
          <button className="btn btn-danger btn-sm" onClick={handleDeleteSelected}>Delete Selected</button>
        </div>
      )}
      
      {filteredRegistrations.length > 0 ? (
        <div className="table-wrapper printable-area">
          <table className="table">
            <thead>
              <tr>
                <th className="th-checkbox no-print">
                  <input 
                    type="checkbox" 
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    aria-label="Select all attendees"
                  />
                </th>
                <th>Name</th><th>Email</th><th>Category</th><th className="no-print">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegistrations.map(reg => (
                <tr key={reg.id}>
                  <td className="td-checkbox no-print">
                    <input 
                      type="checkbox" 
                      checked={selectedRegIds.includes(reg.id)}
                      onChange={(e) => handleSelectOne(reg.id, e.target.checked)}
                      aria-label={`Select ${reg.name}`}
                    />
                  </td>
                  <td>{reg.name}</td>
                  <td>{reg.email}</td>
                  <td>{reg.category}</td>
                  <td className="no-print">
                    <div className="action-buttons">
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => setPreviewRegId(reg.id)}
                        title="Details"
                      >
                        🔍 Details
                      </button>
                      <button 
                        className="btn btn-primary btn-sm" 
                        onClick={() => setEditingRegId(reg.id)}
                        title="Edit"
                      >
                        ✏️ Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No attendees found for this filter.</p>
      )}

      {previewRegId && (() => {
        const reg = filteredRegistrations.find(r => r.id === previewRegId) || registrations.find(r => r.id === previewRegId);
        const event = reg ? events.find(e => e.id === reg.eventId) : undefined;
        return (
          <RegistrationPreview
            event={event}
            registrationId={previewRegId}
            onClose={() => setPreviewRegId(null)}
          />
        );
      })()}
      
      {editingRegId && (() => {
        const reg = filteredRegistrations.find(r => r.id === editingRegId) || registrations.find(r => r.id === editingRegId);
        if (!reg) return null;
        // Use the registration's user ID for admin editing
        const regUser = { id: reg.userId, name: reg.name, email: reg.email };
        return (
          <UserRegistration
            events={events}
            registrations={registrations}
            user={regUser}
            targetEventId={reg.eventId}
            onBack={() => setEditingRegId(null)}
            onSave={(regData) => {
              handleSaveRegistration(regData);
              setEditingRegId(null);
            }}
          />
        );
      })()}
    </div>
  );
};
