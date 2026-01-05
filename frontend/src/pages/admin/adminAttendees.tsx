import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Registration, Event, Group } from '../../types';
import { formatDateShort } from '../../utils/dateUtils';
import '../../styles/AdminAttendees.css';
import '../../styles/AdminUsers.css'; // Import pagination styles
import { RegistrationPreview } from '../../components/RegistrationPreview';
import { Modal } from '../../components/Modal';
import { apiClient, cancelApi, registrationsApi } from '../../services/apiClient';
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
  // const [resendingEmailId, setResendingEmailId] = useState<number | null>(null);
  // const [emailMessage, setEmailMessage] = useState<{ regId: number; type: 'success' | 'error'; text: string } | null>(null);
  
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const attendeesPerPage = 30;
  
  // Sorting state
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Column widths state for resizable columns
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    id: 80,
    badgeName: 120,
    firstName: 100,
    lastName: 100,
    email: 180,
    secondaryEmail: 180,
    organization: 150,
    jobTitle: 120,
    address: 200,
    mobile: 120,
    officePhone: 120,
    companyType: 120,
    city: 100,
    state: 80,
    zipCode: 80,
    country: 100,
    firstTime: 100,
    companyTypeOther: 150,
    emergencyContactName: 150,
    emergencyContactPhone: 150,
    activity: 120,
    groupAssigned: 150,
    clubRentals: 120,
    golfHandicap: 120,
    massageTimeSlot: 150,
    tuesdayEarlyReception: 150,
    wednesdayReception: 150,
    thursdayBreakfast: 150,
    thursdayLuncheon: 150,
    thursdayDinner: 150,
    fridayBreakfast: 150,
    dietaryRestrictions: 200,
    specialRequests: 200,
    spouseFirstName: 120,
    spouseLastName: 120,
    spouseDinnerTicket: 150,
    paymentMethod: 120,
    paid: 80,
    paymentId: 200,
    totalPrice: 100,
  });
  
  const [, setResizingColumn] = useState<string | null>(null);

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
  const [singleDeleteTarget, setSingleDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [deletingSingle, setDeletingSingle] = useState(false);

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
      // Increase limit to fetch all users (1500 should be enough for most cases)
      // If search is active, use smaller limit since results are filtered
      const limit = debouncedUserSearchQuery.trim() ? '50' : '1500';
      params.append('limit', limit);
      if (debouncedUserSearchQuery.trim()) {
        params.append('search', debouncedUserSearchQuery.trim());
      }
      const response = await apiClient.get<SimpleUser[]>(`/users?${params.toString()}`) as any;
      // Handle API response structure: { success: true, data: [...], pagination: {...} }
      const apiUsers = (response?.data && Array.isArray(response.data)) 
        ? response.data 
        : (Array.isArray(response) ? response : []);
      const list: SimpleUser[] = apiUsers;
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
        r.email.toLowerCase().includes(lowercasedQuery) ||
        (r.organization && r.organization.toLowerCase().includes(lowercasedQuery))
      );
    }
    return results;
  }, [filter, registrations, searchQuery, selectedEventId]);

  // Sort registrations
  const sortedRegistrations = useMemo(() => {
    const sorted = [...filteredRegistrations].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortField) {
        case 'id':
          aValue = a.id || 0;
          bValue = b.id || 0;
          break;
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'email':
          aValue = a.email?.toLowerCase() || '';
          bValue = b.email?.toLowerCase() || '';
          break;
        case 'organization':
          aValue = a.organization?.toLowerCase() || '';
          bValue = b.organization?.toLowerCase() || '';
          break;
        case 'city':
          aValue = (a as any).city?.toLowerCase() || '';
          bValue = (b as any).city?.toLowerCase() || '';
          break;
        case 'state':
          aValue = (a as any).state?.toLowerCase() || '';
          bValue = (b as any).state?.toLowerCase() || '';
          break;
        case 'country':
          aValue = (a as any).country?.toLowerCase() || '';
          bValue = (b as any).country?.toLowerCase() || '';
          break;
        case 'category':
          aValue = a.category?.toLowerCase() || '';
          bValue = b.category?.toLowerCase() || '';
          break;
        case 'paymentMethod':
          // Sort by payment method: Card, Check, or empty
          const aMethod = a.paymentMethod === 'Card' ? 'card' : a.paymentMethod === 'Check' ? 'check' : '';
          const bMethod = b.paymentMethod === 'Card' ? 'card' : b.paymentMethod === 'Check' ? 'check' : '';
          aValue = aMethod;
          bValue = bMethod;
          break;
        default:
          return 0;
      }
      
      // For numeric fields (id), compare directly
      if (sortField === 'id') {
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      }
      // For string fields, compare as strings
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [filteredRegistrations, sortField, sortDirection]);

  // Paginated registrations (use sortedRegistrations)
  const totalPages = Math.max(1, Math.ceil(sortedRegistrations.length / attendeesPerPage));
  const startIndex = (currentPage - 1) * attendeesPerPage;
  const endIndex = startIndex + attendeesPerPage;
  const paginatedRegistrations = sortedRegistrations.slice(startIndex, endIndex);

  // Reset to page 1 when filters or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery, selectedEventId, sortField, sortDirection]);

  // Sorting handler
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Column resizing handlers
  const handleResizeStart = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent triggering sort handler on parent th
    setResizingColumn(columnKey);
    const startX = e.clientX; // Use clientX instead of pageX for more accurate positioning
    const startWidth = columnWidths[columnKey] || 120;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const diff = e.clientX - startX;
      const newWidth = Math.max(50, startWidth + diff); // Minimum width 50px
      setColumnWidths(prev => ({
        ...prev,
        [columnKey]: newWidth
      }));
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setResizingColumn(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp, { passive: false });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of table
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
      // Select all on current page
      const pageIds = paginatedRegistrations.map(r => r.id);
      setSelectedRegIds(prev => {
        const combined = [...prev, ...pageIds];
        return Array.from(new Set(combined));
      });
    } else {
      // Deselect all on current page
      const pageIds = paginatedRegistrations.map(r => r.id);
      setSelectedRegIds(prev => prev.filter(id => !pageIds.includes(id)));
    }
  };
  
  const handleDeleteSelected = () => {
    if (selectedRegIds.length === 0) return;
    setShowDeleteConfirm(true);
  };

  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (selectedRegIds.length === 0) return;
    
    setDeleting(true);
    setShowDeleteConfirm(false);
    
    try {
      // Call API to delete from database
      const response = await registrationsApi.bulkDelete(selectedRegIds);
      
      if (response.success) {
        // Update local state after successful deletion
      handleDeleteRegistrations(selectedRegIds);
      setSelectedRegIds([]);
        
        // Show success message
        setMessageModalContent({
          title: 'Success',
          message: `Successfully deleted ${selectedRegIds.length} registration(s).`,
          type: 'success'
        });
        setShowMessageModal(true);
      } else {
        throw new Error(response.error || 'Failed to delete registrations');
      }
    } catch (error: any) {
      console.error('Error deleting registrations:', error);
      setMessageModalContent({
        title: 'Error',
        message: `Failed to delete registrations: ${error?.message || 'Unknown error'}`,
        type: 'error'
      });
      setShowMessageModal(true);
    } finally {
      setDeleting(false);
    }
  };

const handleOpenSingleDelete = (reg: Registration) => {
  setSingleDeleteTarget({ id: reg.id, name: reg.name });
};

const confirmSingleDelete = async () => {
  if (!singleDeleteTarget) return;

  setDeletingSingle(true);

  try {
    const response = await registrationsApi.delete(singleDeleteTarget.id);
    if (response.success) {
      handleDeleteRegistrations([singleDeleteTarget.id]);
      setMessageModalContent({
        title: 'Deleted',
        message: `${singleDeleteTarget.name} has been removed.`,
        type: 'success',
      });
      setShowMessageModal(true);
    } else {
      throw new Error(response.error || 'Failed to delete registration');
    }
  } catch (error: any) {
    console.error('Error deleting registration:', error);
    setMessageModalContent({
      title: 'Error',
      message: `Failed to delete registration: ${error?.message || 'Unknown error'}`,
      type: 'error',
    });
    setShowMessageModal(true);
  } finally {
    setDeletingSingle(false);
    setSingleDeleteTarget(null);
  }
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

  // const handleResendConfirmation = async (regId: number) => {
  //   setResendingEmailId(regId);
  //   setEmailMessage(null);
    
  //   try {
  //     const response = await registrationsApi.resendConfirmation(regId);
  //     if (response.success) {
  //       setEmailMessage({ regId, type: 'success', text: 'Confirmation email sent successfully!' });
  //     } else {
  //       setEmailMessage({ regId, type: 'error', text: response.error || 'Failed to send email' });
  //     }
  //   } catch (error: any) {
  //     setEmailMessage({ regId, type: 'error', text: error?.response?.data?.error || 'Failed to send email' });
  //   } finally {
  //     setResendingEmailId(null);
  //     // Clear message after 5 seconds
  //     setTimeout(() => setEmailMessage(null), 5000);
  //   }
  // };

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
  const getGroupForRegistration = useCallback((reg: Registration): string => {
    // First check if registration has groupAssigned field (new approach)
    if (reg.groupAssigned) {
      const group = groups.find(g => g.id === reg.groupAssigned);
      return group ? group.name : '-';
    }
    // Fallback to old approach (checking members array)
    const group = groups.find(g => g.members.includes(reg.id));
    return group ? group.name : '-';
  }, [groups]);

  // Helper function to display empty string for empty values
  const displayValue = (value: any): string => {
    if (value === null || value === undefined || value === '') {
      return '';
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
      'Address Street': (reg as any).addressStreet || '',
      'City': (reg as any).city || '',
      'State': (reg as any).state || '',
      'Zip Code': (reg as any).zipCode || '',
      'Country': (reg as any).country || '',
      'Mobile': reg.mobile,
      'Office Phone': reg.officePhone,
      'First Time?': reg.isFirstTimeAttending ? 'Yes' : 'No',
      'Company Type': reg.companyType,
      'Company Type Other': reg.companyTypeOther,
      'Emergency Contact Name': reg.emergencyContactName,
      'Emergency Contact Phone': reg.emergencyContactPhone,
      'Activity': reg.wednesdayActivity,
      'Group Assigned': getGroupForRegistration(reg),
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
    
    // Generate filename with timestamp (format: attendees_YYYY-MM-DD_HH-MM-SS.xlsx)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
    link.download = `attendees_${timestamp}.xlsx`;
    
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

  // Check if all items on current page are selected
  const isAllSelected = paginatedRegistrations.length > 0 && 
    paginatedRegistrations.every(reg => selectedRegIds.includes(reg.id));

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
          <div className="detailed-table-wrapper">
            <table className="table detailed-table">
              <thead>
                <tr>
                  <th 
                    style={{ width: `${columnWidths.id}px`, minWidth: `${columnWidths.id}px`, position: 'relative' }}
                    className="sortable-header"
                    onClick={() => handleSort('id')}
                  >
                    ID
                    {sortField === 'id' && (
                      <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                    )}
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'id')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.badgeName}px`, minWidth: `${columnWidths.badgeName}px`, position: 'relative' }}
                    className="sortable-header"
                    onClick={() => handleSort('name')}
                  >
                    Badge Name
                    {sortField === 'name' && (
                      <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                    )}
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'badgeName')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.firstName}px`, minWidth: `${columnWidths.firstName}px`, position: 'relative' }}
                    className="sortable-header"
                    onClick={() => handleSort('name')}
                  >
                    First Name
                    {sortField === 'name' && (
                      <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                    )}
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'firstName')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.lastName}px`, minWidth: `${columnWidths.lastName}px`, position: 'relative' }}
                    className="sortable-header"
                    onClick={() => handleSort('name')}
                  >
                    Last Name
                    {sortField === 'name' && (
                      <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                    )}
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'lastName')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.email}px`, minWidth: `${columnWidths.email}px`, position: 'relative' }}
                    className="sortable-header"
                    onClick={() => handleSort('email')}
                  >
                    Email
                    {sortField === 'email' && (
                      <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                    )}
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'email')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.secondaryEmail}px`, minWidth: `${columnWidths.secondaryEmail}px`, position: 'relative' }}
                  >
                    Secondary Email
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'secondaryEmail')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.organization}px`, minWidth: `${columnWidths.organization}px`, position: 'relative' }}
                    className="sortable-header"
                    onClick={() => handleSort('organization')}
                  >
                    Organization
                    {sortField === 'organization' && (
                      <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                    )}
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'organization')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.jobTitle}px`, minWidth: `${columnWidths.jobTitle}px`, position: 'relative' }}
                  >
                    Job Title
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'jobTitle')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.address}px`, minWidth: `${columnWidths.address}px`, position: 'relative' }}
                  >
                    Address Street
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'address')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.city}px`, minWidth: `${columnWidths.city}px`, position: 'relative' }}
                    className="sortable-header"
                    onClick={() => handleSort('city')}
                  >
                    City
                    {sortField === 'city' && (
                      <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                    )}
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'city')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.state}px`, minWidth: `${columnWidths.state}px`, position: 'relative' }}
                    className="sortable-header"
                    onClick={() => handleSort('state')}
                  >
                    State
                    {sortField === 'state' && (
                      <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                    )}
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'state')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.zipCode}px`, minWidth: `${columnWidths.zipCode}px`, position: 'relative' }}
                  >
                    Zip Code
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'zipCode')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.country}px`, minWidth: `${columnWidths.country}px`, position: 'relative' }}
                  >
                    Country
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'country')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.mobile}px`, minWidth: `${columnWidths.mobile}px`, position: 'relative' }}
                  >
                    Mobile
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'mobile')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.officePhone}px`, minWidth: `${columnWidths.officePhone}px`, position: 'relative' }}
                  >
                    Office Phone
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'officePhone')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.firstTime}px`, minWidth: `${columnWidths.firstTime}px`, position: 'relative' }}
                  >
                    First Time?
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'firstTime')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.companyType}px`, minWidth: `${columnWidths.companyType}px`, position: 'relative' }}
                  >
                    Company Type
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'companyType')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.companyTypeOther}px`, minWidth: `${columnWidths.companyTypeOther}px`, position: 'relative' }}
                  >
                    Company Type Other
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'companyTypeOther')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.emergencyContactName}px`, minWidth: `${columnWidths.emergencyContactName}px`, position: 'relative' }}
                  >
                    Emergency Contact Name
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'emergencyContactName')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.emergencyContactPhone}px`, minWidth: `${columnWidths.emergencyContactPhone}px`, position: 'relative' }}
                  >
                    Emergency Contact Phone
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'emergencyContactPhone')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.activity}px`, minWidth: `${columnWidths.activity}px`, position: 'relative' }}
                  >
                    Activity
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'activity')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.groupAssigned}px`, minWidth: `${columnWidths.groupAssigned}px`, position: 'relative' }}
                  >
                    Group Assigned
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'groupAssigned')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.clubRentals}px`, minWidth: `${columnWidths.clubRentals}px`, position: 'relative' }}
                  >
                    Club Rentals
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'clubRentals')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.golfHandicap}px`, minWidth: `${columnWidths.golfHandicap}px`, position: 'relative' }}
                  >
                    Golf Handicap
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'golfHandicap')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.massageTimeSlot}px`, minWidth: `${columnWidths.massageTimeSlot}px`, position: 'relative' }}
                  >
                    Massage Time Slot
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'massageTimeSlot')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.tuesdayEarlyReception}px`, minWidth: `${columnWidths.tuesdayEarlyReception}px`, position: 'relative' }}
                  >
                    Tuesday Early Reception
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'tuesdayEarlyReception')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.wednesdayReception}px`, minWidth: `${columnWidths.wednesdayReception}px`, position: 'relative' }}
                  >
                    Wednesday Reception
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'wednesdayReception')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.thursdayBreakfast}px`, minWidth: `${columnWidths.thursdayBreakfast}px`, position: 'relative' }}
                  >
                    Thursday Breakfast
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'thursdayBreakfast')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.thursdayLuncheon}px`, minWidth: `${columnWidths.thursdayLuncheon}px`, position: 'relative' }}
                  >
                    Thursday Luncheon
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'thursdayLuncheon')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.thursdayDinner}px`, minWidth: `${columnWidths.thursdayDinner}px`, position: 'relative' }}
                  >
                    Thursday Dinner
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'thursdayDinner')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.fridayBreakfast}px`, minWidth: `${columnWidths.fridayBreakfast}px`, position: 'relative' }}
                  >
                    Friday Breakfast
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'fridayBreakfast')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.dietaryRestrictions}px`, minWidth: `${columnWidths.dietaryRestrictions}px`, position: 'relative' }}
                  >
                    Dietary Restrictions
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'dietaryRestrictions')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.specialRequests}px`, minWidth: `${columnWidths.specialRequests}px`, position: 'relative' }}
                  >
                    Special Requests
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'specialRequests')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.spouseFirstName}px`, minWidth: `${columnWidths.spouseFirstName}px`, position: 'relative' }}
                  >
                    Spouse First Name
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'spouseFirstName')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.spouseLastName}px`, minWidth: `${columnWidths.spouseLastName}px`, position: 'relative' }}
                  >
                    Spouse Last Name
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'spouseLastName')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.spouseDinnerTicket}px`, minWidth: `${columnWidths.spouseDinnerTicket}px`, position: 'relative' }}
                  >
                    Spouse Dinner Ticket
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'spouseDinnerTicket')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.paymentMethod}px`, minWidth: `${columnWidths.paymentMethod}px`, position: 'relative' }}
                  >
                    Payment Method
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'paymentMethod')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.paid}px`, minWidth: `${columnWidths.paid}px`, position: 'relative' }}
                  >
                    Paid?
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'paid')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.paymentId}px`, minWidth: `${columnWidths.paymentId}px`, position: 'relative' }}
                  >
                    Payment ID
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'paymentId')}
                    />
                  </th>
                  <th 
                    style={{ width: `${columnWidths.totalPrice}px`, minWidth: `${columnWidths.totalPrice}px`, position: 'relative' }}
                  >
                    Total Price
                    <span 
                      className="resize-handle"
                      onMouseDown={(e) => handleResizeStart(e, 'totalPrice')}
                    />
                  </th>
                  
                </tr>
              </thead>
              <tbody>
                {paginatedRegistrations.map(reg => (
                  <tr key={`detail-${reg.id}`}>
                    <td style={{ width: `${columnWidths.id}px`, minWidth: `${columnWidths.id}px` }}>{reg.id}</td>
                    <td style={{ width: `${columnWidths.badgeName}px`, minWidth: `${columnWidths.badgeName}px` }}>{displayValue(reg.badgeName)}</td>
                    <td style={{ width: `${columnWidths.firstName}px`, minWidth: `${columnWidths.firstName}px` }}>{displayValue(reg.firstName)}</td>
                    <td style={{ width: `${columnWidths.lastName}px`, minWidth: `${columnWidths.lastName}px` }}>{displayValue(reg.lastName)}</td>
                    <td style={{ width: `${columnWidths.email}px`, minWidth: `${columnWidths.email}px` }}>{displayValue(reg.email)}</td>
                    <td style={{ width: `${columnWidths.secondaryEmail}px`, minWidth: `${columnWidths.secondaryEmail}px` }}>{displayValue(reg.secondaryEmail)}</td>
                    <td style={{ width: `${columnWidths.organization}px`, minWidth: `${columnWidths.organization}px` }}>{displayValue(reg.organization)}</td>
                    <td style={{ width: `${columnWidths.jobTitle}px`, minWidth: `${columnWidths.jobTitle}px` }}>{displayValue(reg.jobTitle)}</td>
                    <td style={{ width: `${columnWidths.address}px`, minWidth: `${columnWidths.address}px` }}>{displayValue((reg as any).addressStreet)}</td>
                    <td style={{ width: `${columnWidths.city}px`, minWidth: `${columnWidths.city}px` }}>{displayValue((reg as any).city)}</td>
                    <td style={{ width: `${columnWidths.state}px`, minWidth: `${columnWidths.state}px` }}>{displayValue((reg as any).state)}</td>
                    <td style={{ width: `${columnWidths.zipCode}px`, minWidth: `${columnWidths.zipCode}px` }}>{displayValue((reg as any).zipCode)}</td>
                    <td style={{ width: `${columnWidths.country}px`, minWidth: `${columnWidths.country}px` }}>{displayValue((reg as any).country)}</td>
                    <td style={{ width: `${columnWidths.mobile}px`, minWidth: `${columnWidths.mobile}px` }}>{displayValue(reg.mobile)}</td>
                    <td style={{ width: `${columnWidths.officePhone}px`, minWidth: `${columnWidths.officePhone}px` }}>{displayValue(reg.officePhone)}</td>
                    <td style={{ width: `${columnWidths.firstTime}px`, minWidth: `${columnWidths.firstTime}px` }}>{reg.isFirstTimeAttending ? 'Yes' : 'No'}</td>
                    <td style={{ width: `${columnWidths.companyType}px`, minWidth: `${columnWidths.companyType}px` }}>{displayValue(reg.companyType)}</td>
                    <td style={{ width: `${columnWidths.companyTypeOther}px`, minWidth: `${columnWidths.companyTypeOther}px` }}>{displayValue(reg.companyTypeOther)}</td>
                    <td style={{ width: `${columnWidths.emergencyContactName}px`, minWidth: `${columnWidths.emergencyContactName}px` }}>{displayValue(reg.emergencyContactName)}</td>
                    <td style={{ width: `${columnWidths.emergencyContactPhone}px`, minWidth: `${columnWidths.emergencyContactPhone}px` }}>{displayValue(reg.emergencyContactPhone)}</td>
                    <td style={{ width: `${columnWidths.activity}px`, minWidth: `${columnWidths.activity}px` }}>{displayValue(reg.wednesdayActivity)}</td>
                    <td style={{ width: `${columnWidths.groupAssigned}px`, minWidth: `${columnWidths.groupAssigned}px` }}>{displayValue(getGroupForRegistration(reg) === '-' ? '' : getGroupForRegistration(reg))}</td>
                    <td style={{ width: `${columnWidths.clubRentals}px`, minWidth: `${columnWidths.clubRentals}px` }}>{displayValue((reg as any).clubRentals)}</td>
                    <td style={{ width: `${columnWidths.golfHandicap}px`, minWidth: `${columnWidths.golfHandicap}px` }}>{displayValue(reg.golfHandicap)}</td>
                    <td style={{ width: `${columnWidths.massageTimeSlot}px`, minWidth: `${columnWidths.massageTimeSlot}px` }}>{displayValue((reg as any).massageTimeSlot)}</td>
                    <td style={{ width: `${columnWidths.tuesdayEarlyReception}px`, minWidth: `${columnWidths.tuesdayEarlyReception}px` }}>{displayValue((reg as any).tuesdayEarlyReception)}</td>
                    <td style={{ width: `${columnWidths.wednesdayReception}px`, minWidth: `${columnWidths.wednesdayReception}px` }}>{displayValue(reg.wednesdayReception)}</td>
                    <td style={{ width: `${columnWidths.thursdayBreakfast}px`, minWidth: `${columnWidths.thursdayBreakfast}px` }}>{displayValue(reg.thursdayBreakfast)}</td>
                    <td style={{ width: `${columnWidths.thursdayLuncheon}px`, minWidth: `${columnWidths.thursdayLuncheon}px` }}>{displayValue(reg.thursdayLuncheon)}</td>
                    <td style={{ width: `${columnWidths.thursdayDinner}px`, minWidth: `${columnWidths.thursdayDinner}px` }}>{displayValue(reg.thursdayDinner)}</td>
                    <td style={{ width: `${columnWidths.fridayBreakfast}px`, minWidth: `${columnWidths.fridayBreakfast}px` }}>{displayValue(reg.fridayBreakfast)}</td>
                    <td style={{ width: `${columnWidths.dietaryRestrictions}px`, minWidth: `${columnWidths.dietaryRestrictions}px` }}>{displayValue(reg.dietaryRestrictions)}</td>
                    <td style={{ width: `${columnWidths.specialRequests}px`, minWidth: `${columnWidths.specialRequests}px` }}>{displayValue((reg as any).specialRequests)}</td>
                    <td style={{ width: `${columnWidths.spouseFirstName}px`, minWidth: `${columnWidths.spouseFirstName}px` }}>{displayValue(reg.spouseFirstName)}</td>
                    <td style={{ width: `${columnWidths.spouseLastName}px`, minWidth: `${columnWidths.spouseLastName}px` }}>{displayValue(reg.spouseLastName)}</td>
                    <td style={{ width: `${columnWidths.spouseDinnerTicket}px`, minWidth: `${columnWidths.spouseDinnerTicket}px` }}>{reg.spouseDinnerTicket ? 'Yes' : 'No'}</td>
                    <td style={{ width: `${columnWidths.paymentMethod}px`, minWidth: `${columnWidths.paymentMethod}px` }}>{displayValue(reg.paymentMethod)}</td>
                    <td style={{ width: `${columnWidths.paid}px`, minWidth: `${columnWidths.paid}px` }}>{(reg as any).paid ? 'Yes' : 'No'}</td>
                    <td style={{ width: `${columnWidths.paymentId}px`, minWidth: `${columnWidths.paymentId}px` }}>{displayValue((reg as any).squarePaymentId)}</td>
                    <td style={{ width: `${columnWidths.totalPrice}px`, minWidth: `${columnWidths.totalPrice}px` }}>{reg.totalPrice != null ? Number(reg.totalPrice).toFixed(2) : ''}</td>
                    
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
                <th 
                  className="sortable-header"
                  onClick={() => handleSort('id')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  ID
                  {sortField === 'id' && (
                    <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                <th 
                  className="sortable-header"
                  onClick={() => handleSort('name')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  Name
                  {sortField === 'name' && (
                    <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                <th 
                  className="sortable-header"
                  onClick={() => handleSort('email')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  Email
                  {sortField === 'email' && (
                    <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                <th 
                  className="sortable-header"
                  onClick={() => handleSort('category')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  Category
                  {sortField === 'category' && (
                    <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                <th 
                  className="sortable-header"
                  onClick={() => handleSort('paymentMethod')}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  Payment Type
                  {sortField === 'paymentMethod' && (
                    <span className="sort-indicator">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
                  )}
                </th>
                <th className="no-print">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRegistrations.map(reg => (
                <tr key={reg.id}>
                  <td className="td-checkbox no-print">
                    <input 
                      type="checkbox" 
                      checked={selectedRegIds.includes(reg.id)}
                      onChange={(e) => handleSelectOne(reg.id, e.target.checked)}
                      aria-label={`Select ${reg.name}`}
                    />
                  </td>
                  <td>{reg.id}</td>
                  <td>{reg.name}</td>
                  <td>{reg.email}</td>
                  <td>{reg.category}</td>
                  <td>{reg.paymentMethod === 'Card' ? 'Card' : reg.paymentMethod === 'Check' ? 'Check' : ''}</td>
                  <td className="no-print">
                      <div className="action-buttons">
                    <button 
                      className="btn btn-secondary btn-sm btn-details" 
                          onClick={() => setPreviewRegId(reg.id)}
                      title="Details"
                    >
                      Details
                    </button>
                        <button 
                          className="btn btn-primary btn-sm" 
                          onClick={() => onEditRegistration(reg.id)}
                          title="Edit"
                        >
                          Edit
                        </button>
                        {/* <button 
                          className="btn btn-outline btn-sm" 
                          onClick={() => handleResendConfirmation(reg.id)}
                          disabled={resendingEmailId === reg.id}
                          title="Resend Confirmation Email"
                        >
                          {resendingEmailId === reg.id ? 'Sending...' : 'Resend Email'}
                        </button> */}
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleOpenSingleDelete(reg)}
                          title="Delete registration"
                        >
                          Delete
                        </button>
                      </div>
                      {/* {emailMessage && emailMessage.regId === reg.id && (
                        <div className={`email-message-small ${emailMessage.type === 'success' ? 'success' : 'error'}`}>
                          {emailMessage.text}
                        </div>
                      )} */}
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

      {filteredRegistrations.length > 0 && totalPages > 1 && (
        <div className="admin-users-pagination">
          <button
            className="btn btn-secondary"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <div className="pagination-numbers">
            {(() => {
              const pages: (number | string)[] = [];
              const showEllipsis = totalPages > 7; // Show ellipsis if more than 7 pages
              
              if (!showEllipsis) {
                // Show all pages if 7 or fewer
                for (let i = 1; i <= totalPages; i++) {
                  pages.push(i);
                }
              } else {
                // Always show first page
                pages.push(1);
                
                if (currentPage <= 4) {
                  // Near the start: show 1, 2, 3, 4, 5, ..., last
                  for (let i = 2; i <= 5; i++) {
                    pages.push(i);
                  }
                  pages.push('ellipsis-end');
                  pages.push(totalPages);
                } else if (currentPage >= totalPages - 3) {
                  // Near the end: show 1, ..., last-4, last-3, last-2, last-1, last
                  pages.push('ellipsis-start');
                  for (let i = totalPages - 4; i <= totalPages; i++) {
                    pages.push(i);
                  }
                } else {
                  // In the middle: show 1, ..., current-1, current, current+1, ..., last
                  pages.push('ellipsis-start');
                  for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pages.push(i);
                  }
                  pages.push('ellipsis-end');
                  pages.push(totalPages);
                }
              }
              
              return pages.map((page, idx) => {
                if (typeof page === 'string') {
                  return <span key={`${page}-${idx}`} className="pagination-ellipsis">...</span>;
                }
                return (
                  <button
                    key={page}
                    className={`btn btn-secondary pagination-number ${page === currentPage ? 'active' : ''}`}
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </button>
                );
              });
            })()}
          </div>
          <button
            className="btn btn-secondary"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}

      <div className="admin-users-footer">
        <p>
          Showing {paginatedRegistrations.length} of {filteredRegistrations.length} attendees
          {searchQuery && ` matching "${searchQuery}"`}
        </p>
      </div>

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
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
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

      {singleDeleteTarget && (
        <Modal
          title="Delete Registration"
          onClose={() => (deletingSingle ? null : setSingleDeleteTarget(null))}
          footer={
            <div className="modal-footer-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSingleDeleteTarget(null)}
                disabled={deletingSingle}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={confirmSingleDelete}
                disabled={deletingSingle}
              >
                {deletingSingle ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          }
        >
          <p>
            Are you sure you want to delete <strong>{singleDeleteTarget.name}</strong>? This action cannot be
            undone.
          </p>
        </Modal>
      )}
    </div>
  );
};
