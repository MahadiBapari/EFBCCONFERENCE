import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Registration, Event, Group } from '../../types';
import { formatDateShort } from '../../utils/dateUtils';
import '../../styles/AdminAttendees.css';
import { RegistrationPreview } from '../../components/RegistrationPreview';
import { apiClient } from '../../services/apiClient';

interface AdminAttendeesProps {
  registrations: Registration[];
  events: Event[];
  groups: Group[];
  handleSaveRegistration: (regData: Registration) => void;
  handleDeleteRegistrations: (regIds: number[]) => void;
  handleBulkAssignGroup: (regIds: number[], targetGroupId: number) => void;
  user: { id: number; name: string; email: string };
  onEditRegistration: (registrationId: number) => void;
  onAddRegistration: (user: { id: number; name: string; email: string }, eventId: number) => void;
}

export const AdminAttendees: React.FC<AdminAttendeesProps> = ({ 
  registrations, 
  events, 
  groups, 
  handleSaveRegistration, 
  handleDeleteRegistrations, 
  handleBulkAssignGroup, 
  user,
  onEditRegistration,
  onAddRegistration,
}) => {
  const [filter, setFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  // Removed unused local edit state to satisfy CI lint rules
  const [selectedRegIds, setSelectedRegIds] = useState<number[]>([]);
  const [previewRegId, setPreviewRegId] = useState<number | null>(null);
  const [showDetailTable, setShowDetailTable] = useState(false);

  // State for Add Attendee (select user) modal
  interface SimpleUser {
    id: number;
    name: string;
    email: string;
    role?: 'admin' | 'user' | 'guest';
    isActive?: boolean;
  }

  const [showAddModal, setShowAddModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [debouncedUserSearchQuery, setDebouncedUserSearchQuery] = useState('');
  const userSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [userList, setUserList] = useState<SimpleUser[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  // Automatically select the most recent event on component mount
  useEffect(() => {
    if (events.length > 0 && selectedEventId === null) {
      const mostRecentEvent = events.reduce((latest, current) => {
        return new Date(current.date) > new Date(latest.date) ? current : latest;
      });
      setSelectedEventId(mostRecentEvent.id);
    }
  }, [events, selectedEventId]);

  const isUserRegisteredForSelectedEvent = useCallback(
    (userId: number): boolean => {
      if (selectedEventId === null) return false;
      return registrations.some((r) => {
        const st = (r as any).status;
        const cancelled = st === 'cancelled' || !!(r as any).cancellationAt || !!(r as any).cancellationReason;
        if (cancelled) return false;
        return r.userId === userId && r.eventId === selectedEventId;
      });
    },
    [registrations, selectedEventId]
  );

  const loadUsersForModal = useCallback(async () => {
    if (!showAddModal) return;
    try {
      setUserLoading(true);
      setUserError(null);
      const params = new URLSearchParams();
      params.append('page', '1');
      params.append('limit', '50');
      if (debouncedUserSearchQuery.trim()) {
        params.append('search', debouncedUserSearchQuery.trim());
      }
      const response = await apiClient.get<SimpleUser[]>(`/users?${params.toString()}`) as any;
      const apiUsers = (response as any).data || response;
      const list: SimpleUser[] = Array.isArray(apiUsers) ? apiUsers : [];
      // Exclude admin roles and users already registered for the selected event
      const filtered = list.filter(u => {
        const role = u.role || 'user';
        if (role === 'admin') return false;
        return !isUserRegisteredForSelectedEvent(u.id);
      });
      setUserList(filtered);
    } catch (err: any) {
      setUserError(err?.response?.data?.error || 'Failed to load users');
    } finally {
      setUserLoading(false);
    }
  }, [debouncedUserSearchQuery, showAddModal, isUserRegisteredForSelectedEvent]);

  useEffect(() => {
    if (!showAddModal) return;
    loadUsersForModal();
  }, [loadUsersForModal, showAddModal]);

  useEffect(() => {
    if (!showAddModal) return;
    if (userSearchTimeoutRef.current) {
      clearTimeout(userSearchTimeoutRef.current);
    }
    userSearchTimeoutRef.current = setTimeout(() => {
      setDebouncedUserSearchQuery(userSearchQuery);
    }, 300);
    return () => {
      if (userSearchTimeoutRef.current) {
        clearTimeout(userSearchTimeoutRef.current);
      }
    };
  }, [userSearchQuery, showAddModal]);

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
    const headers = [
      "Badge Name",
      "First Name",
      "Last Name",
      "Email",
      "Secondary Email",
      "Organization",
      "Job Title",
      "Address",
      "Mobile",
      "Office Phone",
      "First Time?",
      "Company Type",
      "Company Type Other",
      "Emergency Contact Name",
      "Emergency Contact Phone",
      "Activity",
      "Club Rentals",
      "Golf Handicap",
      "Massage Time Slot",
      "Tuesday Early Reception",
      "Wednesday Reception",
      "Thursday Breakfast",
      "Thursday Luncheon",
      "Thursday Dinner",
      "Friday Breakfast",
      "Dietary Restrictions",
      "Special Requests",
      "Spouse First Name",
      "Spouse Last Name",
      "Spouse Dinner Ticket",
      "Payment Method",
      "Paid?",
      "Payment ID",
      "Total Price",
    ];
    const escapeCell = (value: any) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`;

    const rows = filteredRegistrations.map(reg =>
      [
        escapeCell(reg.badgeName),
        escapeCell(reg.firstName),
        escapeCell(reg.lastName),
        escapeCell(reg.email),
        escapeCell(reg.secondaryEmail),
        escapeCell(reg.organization),
        escapeCell(reg.jobTitle),
        escapeCell(reg.address),
        escapeCell(reg.mobile),
        escapeCell(reg.officePhone),
        escapeCell(reg.isFirstTimeAttending ? 'Yes' : 'No'),
        escapeCell(reg.companyType),
        escapeCell(reg.companyTypeOther),
        escapeCell(reg.emergencyContactName),
        escapeCell(reg.emergencyContactPhone),
        escapeCell(reg.wednesdayActivity),
        escapeCell((reg as any).clubRentals),
        escapeCell(reg.golfHandicap),
        escapeCell((reg as any).massageTimeSlot),
        escapeCell((reg as any).tuesdayEarlyReception),
        escapeCell(reg.wednesdayReception),
        escapeCell(reg.thursdayBreakfast),
        escapeCell(reg.thursdayLuncheon),
        escapeCell(reg.thursdayDinner),
        escapeCell(reg.fridayBreakfast),
        escapeCell(reg.dietaryRestrictions),
        escapeCell((reg as any).specialRequests),
        escapeCell(reg.spouseFirstName),
        escapeCell(reg.spouseLastName),
        escapeCell(reg.spouseDinnerTicket ? 'Yes' : 'No'),
        escapeCell(reg.paymentMethod),
        escapeCell((reg as any).paid ? 'Yes' : 'No'),
        escapeCell((reg as any).squarePaymentId || ''),
        escapeCell(reg.totalPrice != null ? Number(reg.totalPrice).toFixed(2) : ''),
      ].join(',')
    );

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      // Excel opens CSV files; using .xlsx extension for convenience
      link.setAttribute("download", "attendees.xlsx");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleOpenAddAttendee = () => {
    if (!selectedEventId) {
      alert('Please select an event first.');
      return;
    }
    setShowAddModal(true);
    setUserSearchQuery('');
    setDebouncedUserSearchQuery('');
    setUserList([]);
    setUserError(null);
  };

  const handleSelectUserForEvent = (userToUse: SimpleUser) => {
    if (!selectedEventId) return;
    onAddRegistration(
      { id: userToUse.id, name: userToUse.name, email: userToUse.email },
      selectedEventId
    );
    setShowAddModal(false);
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
                {event.name} - {formatDateShort(event.date)}
                {selectedEventId === event.id ? ' (Current)' : ''}
              </option>
            ))}
          </select>
        </div>
        
      </div>
      <div>    
        <div className="page-actions">
          <button className="btn btn-primary" onClick={handleOpenAddAttendee}>Add Attendee</button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => setShowDetailTable(prev => !prev)}
          >
            {showDetailTable ? 'Hide Table' : 'Table'}
          </button>
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
                        onClick={() => onEditRegistration(reg.id)}
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

      {/* Detailed table view for selected event, similar to RegistrationPreview */}
      {showDetailTable && filteredRegistrations.length > 0 && (
        <div className="table-wrapper detailed-table-wrapper" style={{ marginTop: '2rem', overflowX: 'auto' }}>
          <table className="table detailed-table">
            <thead>
              <tr>
                <th>Badge Name</th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Email</th>
                <th>Secondary Email</th>
                <th>Organization</th>
                <th>Job Title</th>
                <th>Address</th>
                <th>Mobile</th>
                <th>Office Phone</th>
                <th>First Time?</th>
                <th>Company Type</th>
                <th>Company Type Other</th>
                <th>Emergency Contact Name</th>
                <th>Emergency Contact Phone</th>
                <th>Activity</th>
                <th>Club Rentals</th>
                <th>Golf Handicap</th>
                <th>Massage Time Slot</th>
                <th>Tuesday Early Reception</th>
                <th>Wednesday Reception</th>
                <th>Thursday Breakfast</th>
                <th>Thursday Luncheon</th>
                <th>Thursday Dinner</th>
                <th>Friday Breakfast</th>
                <th>Dietary Restrictions</th>
                <th>Special Requests</th>
                <th>Spouse First Name</th>
                <th>Spouse Last Name</th>
                <th>Spouse Dinner Ticket</th>
                <th>Payment Method</th>
                <th>Paid?</th>
                <th>Payment ID</th>
                <th>Total Price</th>
              </tr>
            </thead>
            <tbody>
              {filteredRegistrations.map(reg => (
                <tr key={`detail-${reg.id}`}>
                  <td>{reg.badgeName}</td>
                  <td>{reg.firstName}</td>
                  <td>{reg.lastName}</td>
                  <td>{reg.email}</td>
                  <td>{reg.secondaryEmail}</td>
                  <td>{reg.organization}</td>
                  <td>{reg.jobTitle}</td>
                  <td>{reg.address}</td>
                  <td>{reg.mobile}</td>
                  <td>{reg.officePhone}</td>
                  <td>{reg.isFirstTimeAttending ? 'Yes' : 'No'}</td>
                  <td>{reg.companyType}</td>
                  <td>{reg.companyTypeOther}</td>
                  <td>{reg.emergencyContactName}</td>
                  <td>{reg.emergencyContactPhone}</td>
                  <td>{reg.wednesdayActivity}</td>
                  <td>{(reg as any).clubRentals}</td>
                  <td>{reg.golfHandicap}</td>
                  <td>{(reg as any).massageTimeSlot}</td>
                  <td>{(reg as any).tuesdayEarlyReception}</td>
                  <td>{reg.wednesdayReception}</td>
                  <td>{reg.thursdayBreakfast}</td>
                  <td>{reg.thursdayLuncheon}</td>
                  <td>{reg.thursdayDinner}</td>
                  <td>{reg.fridayBreakfast}</td>
                  <td>{reg.dietaryRestrictions}</td>
                  <td>{(reg as any).specialRequests}</td>
                  <td>{reg.spouseFirstName}</td>
                  <td>{reg.spouseLastName}</td>
                  <td>{reg.spouseDinnerTicket ? 'Yes' : 'No'}</td>
                  <td>{reg.paymentMethod}</td>
                  <td>{(reg as any).paid ? 'Yes' : 'No'}</td>
                  <td>{(reg as any).squarePaymentId || ''}</td>
                  <td>{reg.totalPrice != null ? Number(reg.totalPrice).toFixed(2) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

      {showAddModal && (
        <div className="attendee-modal-backdrop">
          <div className="attendee-modal">
            <h2>Select User for Registration</h2>
            <p className="attendee-modal-subtitle">
              Choose a user from the list below to register them for this event.
            </p>
            <div className="attendee-modal-search">
              <input
                type="search"
                className="form-control"
                placeholder="Search by name or email..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
              />
            </div>
            {userError && <div className="error-message">{userError}</div>}
            <div className="attendee-modal-list">
              {userLoading ? (
                <div className="attendee-modal-loading">Loading users...</div>
              ) : userList.length === 0 ? (
                <div className="attendee-modal-empty">No users found.</div>
              ) : (
                <table className="attendee-user-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Registration</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {userList.map((u) => {
                      const registered = isUserRegisteredForSelectedEvent(u.id);
                      return (
                        <tr key={u.id}>
                          <td>{u.name}</td>
                          <td>{u.email}</td>
                          <td>{u.role || 'user'}</td>
                          <td>
                            <span className={`user-reg-status ${registered ? 'registered' : 'not-registered'}`}>
                              {registered ? 'Registered' : 'Not registered'}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => handleSelectUserForEvent(u)}
                            >
                              {registered ? 'Open' : 'Register'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className="attendee-modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowAddModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
