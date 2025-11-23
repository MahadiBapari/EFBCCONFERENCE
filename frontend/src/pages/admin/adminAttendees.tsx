import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Registration, Event, Group } from '../../types';
import { formatDateShort } from '../../utils/dateUtils';
import '../../styles/AdminAttendees.css';
import { RegistrationPreview } from '../../components/RegistrationPreview';
import { Modal } from '../../components/Modal';
import { apiClient, cancelApi } from '../../services/apiClient';
import * as XLSX from 'xlsx';

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

  // State for confirmation modals
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState<{ title: string; message: string; type: 'success' | 'error' } | null>(null);

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
    if (selectedRegIds.length === 0) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    handleDeleteRegistrations(selectedRegIds);
    setSelectedRegIds([]);
    setShowDeleteConfirm(false);
  };

  const [cancelling, setCancelling] = useState(false);

  const handleCancelSelected = () => {
    if (selectedRegIds.length === 0) return;
    setShowCancelConfirm(true);
  };

  const confirmCancel = async () => {
    setShowCancelConfirm(false);
    setCancelling(true);
    let successCount = 0;
    let failCount = 0;

    try {
      // Create cancellation requests and immediately approve them for admin-initiated cancellations
      const reason = 'Admin-initiated bulk cancellation';
      
      for (const regId of selectedRegIds) {
        try {
          // Check if already cancelled
          const reg = registrations.find(r => r.id === regId);
          if (reg && (reg as any).status === 'cancelled') {
            continue; // Skip already cancelled registrations
          }

          // Create cancellation request
          const requestResponse = await cancelApi.request(regId, reason);
          if (!requestResponse.success) {
            throw new Error(requestResponse.error || 'Failed to create cancellation request');
          }
          
          // Wait a bit longer and retry fetching the request if needed
          let newRequest = null;
          let retries = 3;
          while (retries > 0 && !newRequest) {
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Find the cancellation request ID and approve it immediately
            const pendingRequests: any = await cancelApi.list('pending');
            const requestData = (pendingRequests as any).data || pendingRequests?.data || [];
            newRequest = Array.isArray(requestData)
              ? requestData.find((r: any) => r.registration_id === regId && r.status === 'pending')
              : null;
            
            retries--;
          }
          
          if (newRequest && newRequest.id) {
            // Immediately approve the cancellation request
            const approveResponse = await cancelApi.approve(newRequest.id, 'Admin bulk cancellation');
            if (approveResponse.success) {
              successCount++;
            } else {
              throw new Error(approveResponse.error || 'Failed to approve cancellation');
            }
          } else {
            throw new Error('Cancellation request not found after creation');
          }
        } catch (err: any) {
          console.error(`Failed to cancel registration ${regId}:`, err);
          const errorMsg = err?.response?.data?.error || err?.message || 'Unknown error';
          console.error(`Error details for registration ${regId}:`, errorMsg);
          failCount++;
          // Continue with other registrations even if one fails
        }
      }

      if (successCount > 0) {
        setMessageModalContent({
          title: 'Success',
          message: `Successfully cancelled ${successCount} registration(s).${failCount > 0 ? ` ${failCount} failed.` : ''}`,
          type: 'success'
        });
        setShowMessageModal(true);
        setSelectedRegIds([]);
        // Refresh the page to show updated status
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setMessageModalContent({
          title: 'Error',
          message: 'Failed to cancel registrations. Please try again.',
          type: 'error'
        });
        setShowMessageModal(true);
      }
    } catch (error: any) {
      console.error('Error cancelling registrations:', error);
      setMessageModalContent({
        title: 'Error',
        message: `Failed to cancel registrations: ${error?.message || 'Unknown error'}`,
        type: 'error'
      });
      setShowMessageModal(true);
    } finally {
      setCancelling(false);
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

  // Helper function to find which group a registration belongs to
  const getGroupForRegistration = useCallback((regId: number): string => {
    const group = groups.find(g => g.members.includes(regId));
    return group ? group.name : '-';
  }, [groups]);

  // Helper function to display N/A for empty values
  const displayValue = (value: any): string => {
    if (value === null || value === undefined || value === '') {
      return 'N/A';
    }
    return String(value);
  };

  const handleExportXlsx = () => {
    // Build row objects matching the detailed table
    const rows = filteredRegistrations.map((reg) => ({
      'Badge Name': reg.badgeName,
      'First Name': reg.firstName,
      'Last Name': reg.lastName,
      'Email': reg.email,
      'Secondary Email': reg.secondaryEmail,
      'Organization': reg.organization,
      'Job Title': reg.jobTitle,
      'Address': reg.address,
      'Mobile': reg.mobile,
      'Office Phone': reg.officePhone,
      'First Time?': reg.isFirstTimeAttending ? 'Yes' : 'No',
      'Company Type': reg.companyType,
      'Company Type Other': reg.companyTypeOther,
      'Emergency Contact Name': reg.emergencyContactName,
      'Emergency Contact Phone': reg.emergencyContactPhone,
      'Activity': reg.wednesdayActivity,
      'Group Assigned': getGroupForRegistration(reg.id),
      'Club Rentals': (reg as any).clubRentals,
      'Golf Handicap': reg.golfHandicap,
      'Massage Time Slot': (reg as any).massageTimeSlot,
      'Tuesday Early Reception': (reg as any).tuesdayEarlyReception,
      'Wednesday Reception': reg.wednesdayReception,
      'Thursday Breakfast': reg.thursdayBreakfast,
      'Thursday Luncheon': reg.thursdayLuncheon,
      'Thursday Dinner': reg.thursdayDinner,
      'Friday Breakfast': reg.fridayBreakfast,
      'Dietary Restrictions': reg.dietaryRestrictions,
      'Special Requests': (reg as any).specialRequests,
      'Spouse First Name': reg.spouseFirstName,
      'Spouse Last Name': reg.spouseLastName,
      'Spouse Dinner Ticket': reg.spouseDinnerTicket ? 'Yes' : 'No',
      'Payment Method': reg.paymentMethod,
      'Paid?': (reg as any).paid ? 'Yes' : 'No',
      'Payment ID': (reg as any).squarePaymentId || '',
      'Total Price': reg.totalPrice != null ? Number(reg.totalPrice).toFixed(2) : '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendees');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = 'attendees.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // const handlePrint = () => {
  //   window.print();
  // };

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
          <button className="btn btn-secondary" onClick={handleExportXlsx}>Export XLSX</button>
          {/* <button className="btn btn-secondary" onClick={handlePrint}>Print / PDF</button> */}
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
          <button 
            className="btn btn-warning btn-sm" 
            onClick={handleCancelSelected}
            disabled={cancelling}
          >
            {cancelling ? 'Cancelling...' : 'Cancel Selected'}
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleDeleteSelected}>Delete Selected</button>
        </div>
      )}
      
      {filteredRegistrations.length > 0 ? (
        showDetailTable ? (
          // Full-page detailed table, based on selected event
          <div className="table-wrapper detailed-table-wrapper detailed-table-container">
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
                  <th>Group Assigned</th>
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
                    <td>{displayValue(reg.badgeName)}</td>
                    <td>{displayValue(reg.firstName)}</td>
                    <td>{displayValue(reg.lastName)}</td>
                    <td>{displayValue(reg.email)}</td>
                    <td>{displayValue(reg.secondaryEmail)}</td>
                    <td>{displayValue(reg.organization)}</td>
                    <td>{displayValue(reg.jobTitle)}</td>
                    <td>{displayValue(reg.address)}</td>
                    <td>{displayValue(reg.mobile)}</td>
                    <td>{displayValue(reg.officePhone)}</td>
                    <td>{reg.isFirstTimeAttending ? 'Yes' : 'No'}</td>
                    <td>{displayValue(reg.companyType)}</td>
                    <td>{displayValue(reg.companyTypeOther)}</td>
                    <td>{displayValue(reg.emergencyContactName)}</td>
                    <td>{displayValue(reg.emergencyContactPhone)}</td>
                    <td>{displayValue(reg.wednesdayActivity)}</td>
                    <td>{getGroupForRegistration(reg.id) === '-' ? 'N/A' : getGroupForRegistration(reg.id)}</td>
                    <td>{displayValue((reg as any).clubRentals)}</td>
                    <td>{displayValue(reg.golfHandicap)}</td>
                    <td>{displayValue((reg as any).massageTimeSlot)}</td>
                    <td>{displayValue((reg as any).tuesdayEarlyReception)}</td>
                    <td>{displayValue(reg.wednesdayReception)}</td>
                    <td>{displayValue(reg.thursdayBreakfast)}</td>
                    <td>{displayValue(reg.thursdayLuncheon)}</td>
                    <td>{displayValue(reg.thursdayDinner)}</td>
                    <td>{displayValue(reg.fridayBreakfast)}</td>
                    <td>{displayValue(reg.dietaryRestrictions)}</td>
                    <td>{displayValue((reg as any).specialRequests)}</td>
                    <td>{displayValue(reg.spouseFirstName)}</td>
                    <td>{displayValue(reg.spouseLastName)}</td>
                    <td>{reg.spouseDinnerTicket ? 'Yes' : 'No'}</td>
                    <td>{displayValue(reg.paymentMethod)}</td>
                    <td>{(reg as any).paid ? 'Yes' : 'No'}</td>
                    <td>{displayValue((reg as any).squarePaymentId)}</td>
                    <td>{reg.totalPrice != null ? Number(reg.totalPrice).toFixed(2) : 'N/A'}</td>
                    
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
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
        )
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <Modal
          title="Confirm Deletion"
          onClose={() => setShowDeleteConfirm(false)}
          footer={
            <div className="modal-footer-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          }
        >
          <p>Are you sure you want to delete {selectedRegIds.length} selected attendee(s)?</p>
          <p className="modal-helper-text">
            This action cannot be undone.
          </p>
        </Modal>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <Modal
          title="Confirm Cancellation"
          onClose={() => !cancelling && setShowCancelConfirm(false)}
          footer={
            <div className="modal-footer-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowCancelConfirm(false)}
                disabled={cancelling}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-warning"
                onClick={confirmCancel}
                disabled={cancelling}
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          }
        >
          <p>Are you sure you want to cancel {selectedRegIds.length} selected registration(s)?</p>
          <p className="modal-helper-text">
            This will cancel these registrations and they will appear in the cancellation list.
          </p>
        </Modal>
      )}

      {/* Success/Error Message Modal */}
      {showMessageModal && messageModalContent && (
        <Modal
          title={messageModalContent.title}
          onClose={() => {
            setShowMessageModal(false);
            setMessageModalContent(null);
          }}
          footer={
            <div className="modal-footer-actions">
              <button
                type="button"
                className={`btn ${messageModalContent.type === 'success' ? 'btn-primary' : 'btn-danger'}`}
                onClick={() => {
                  setShowMessageModal(false);
                  setMessageModalContent(null);
                }}
              >
                OK
              </button>
            </div>
          }
        >
          <p>{messageModalContent.message}</p>
        </Modal>
      )}
    </div>
  );
};
