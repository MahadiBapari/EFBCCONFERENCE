import React, { useState, useEffect, useMemo } from 'react';
import { cancelApi, registrationsApi } from '../../services/apiClient';
import { RegistrationPreview } from '../../components/RegistrationPreview';
import { Event, Registration } from '../../types';
import { formatDateShort } from '../../utils/dateUtils';
import * as XLSX from 'xlsx';
import '../../styles/AdminCancellations.css';

type CancelRow = {
  id: number;
  registration_id: number;
  user_id: number;
  event_id: number;
  reason?: string;
  status: 'pending'|'approved'|'rejected';
  created_at?: string;
  processed_at?: string;
  user_name?: string;
  user_email?: string;
  event_name?: string;
};

interface AdminCancellationsProps {
  pendingRows: CancelRow[];
  approvedRows: CancelRow[];
  loading: boolean;
  onReload: () => Promise<void> | void;
  onChanged?: () => void | Promise<void>;
  events?: Event[];
  registrations?: Registration[];
}

export const AdminCancellations: React.FC<AdminCancellationsProps> = ({ 
  pendingRows, 
  approvedRows, 
  loading, 
  onReload, 
  onChanged,
  events = [],
  registrations = []
}) => {

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const [note, setNote] = useState<Record<number,string>>({});
  const [activeTab, setActiveTab] = useState<'requests' | 'cancelled'>('requests');
  const [previewRegId, setPreviewRegId] = useState<number | null>(null);
  const [previewEvent, setPreviewEvent] = useState<Event | undefined>(undefined);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [cancelledRegistrations, setCancelledRegistrations] = useState<Registration[]>([]);

  // Filter cancellation rows by selected event
  const filteredPendingRows = useMemo(() => {
    if (!selectedEventId) return pendingRows;
    return pendingRows.filter(r => r.event_id === selectedEventId);
  }, [pendingRows, selectedEventId]);

  const filteredApprovedRows = useMemo(() => {
    if (!selectedEventId) return approvedRows;
    return approvedRows.filter(r => r.event_id === selectedEventId);
  }, [approvedRows, selectedEventId]);

  // Load full registration data for cancelled registrations
  useEffect(() => {
    const loadCancelledRegistrations = async () => {
      if (filteredApprovedRows.length === 0) {
        setCancelledRegistrations([]);
        return;
      }
      
      try {
        const regIds = filteredApprovedRows.map(r => r.registration_id);
        const regPromises = regIds.map(id => 
          registrationsApi.getById(id).catch(() => null)
        );
        const regResults = await Promise.all(regPromises);
        const validRegs = regResults
          .filter(r => r && r.success && r.data)
          .map(r => r.data as Registration);
        setCancelledRegistrations(validRegs);
      } catch (error) {
        console.error('Error loading cancelled registrations:', error);
        setCancelledRegistrations([]);
      }
    };

    loadCancelledRegistrations();
  }, [filteredApprovedRows]);

  const approve = async (id: number) => {
    await cancelApi.approve(id, note[id]);
    await onReload();
    if (onChanged) await onChanged();
  };
  const reject = async (id: number) => {
    await cancelApi.reject(id, note[id]);
    await onReload();
    if (onChanged) await onChanged();
  };
  const restore = async (id: number) => {
    await cancelApi.restore(id);
    await onReload();
    if (onChanged) await onChanged();
  };
  const handleDetails = (row: CancelRow) => {
    setPreviewRegId(row.registration_id);
    const event = events.find(e => e.id === row.event_id);
    setPreviewEvent(event);
  };

  // Helper to format reason text
  const formatReason = (reason?: string) => {
    if (!reason) return '-';
    // Check if it's admin-initiated (case-insensitive)
    if (reason.toLowerCase().includes('admin') && reason.toLowerCase().includes('initiated')) {
      return 'Admin Initiated Cancellation';
    }
    return reason;
  };

  // Excel export function for cancelled registrations
  const handleExportCancelledXlsx = () => {
    if (cancelledRegistrations.length === 0) {
      alert('No cancelled registrations to export');
      return;
    }

    const downloadDateTime = new Date().toLocaleString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    });

    const formatPaymentDateTime = (dateString: string | undefined | null): string => {
      if (!dateString) return '';
      try {
        return new Date(dateString).toLocaleString('en-US', {
          timeZone: 'America/New_York',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
          timeZoneName: 'short'
        });
      } catch (e) {
        return '';
      }
    };

    // Find max children count
    const maxChildrenCount = Math.max(
      ...cancelledRegistrations.map(reg => 
        (reg.kids && Array.isArray(reg.kids) ? reg.kids.length : 0)
      ),
      0
    );

    const rows = cancelledRegistrations.map((reg) => ({
      'ID': reg.id,
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
      'Transportation Method': reg.transportationMethod || '',
      'Transportation Details': reg.transportationDetails || '',
      'Staying at Beach Club Resort': reg.stayingAtBeachClub !== undefined ? (reg.stayingAtBeachClub ? 'Yes' : 'No') : '',
      'Accommodation Details': reg.accommodationDetails || '',
      'Dietary Requirements': reg.dietaryRequirements && Array.isArray(reg.dietaryRequirements) ? reg.dietaryRequirements.join(', ') : '',
      'Dietary Requirements (Other)': reg.dietaryRequirementsOther || '',
      'Special Physical Needs': reg.specialPhysicalNeeds !== undefined ? (reg.specialPhysicalNeeds ? 'Yes' : 'No') : '',
      'Special Physical Needs Details': reg.specialPhysicalNeedsDetails || '',
      'Spouse First Name': reg.spouseFirstName,
      'Spouse Last Name': reg.spouseLastName,
      'Spouse Dinner Ticket': reg.spouseDinnerTicket ? 'Yes' : 'No',
      'Children Count': reg.kids && reg.kids.length > 0 ? reg.kids.length : 0,
      ...(Array.from({ length: maxChildrenCount }, (_, index) => {
        const childNum = index + 1;
        const child = reg.kids && reg.kids.length > index ? reg.kids[index] : null;
        return {
          [`Child ${childNum} First Name`]: child?.firstName || '',
          [`Child ${childNum} Last Name`]: child?.lastName || '',
          [`Child ${childNum} Badge Name`]: child?.badgeName || '',
          [`Child ${childNum} Age`]: child?.age ? String(child.age) : '',
        };
      }).reduce((acc, obj) => ({ ...acc, ...obj }), {})),
      'Payment Method': reg.paymentMethod,
      'Paid?': (reg as any).paid ? 'Yes' : 'No',
      'Payment ID': (reg as any).squarePaymentId || '',
      'Payment Date/Time (EST)': (reg as any).paid 
        ? formatPaymentDateTime((reg as any).paidAt || (reg as any).paid_at || (reg as any).createdAt || (reg as any).created_at)
        : '',
      'Spouse Payment ID': (reg as any).spousePaymentId || '',
      'Spouse Payment Date/Time (EST)': (reg as any).spousePaymentId
        ? formatPaymentDateTime((reg as any).spousePaidAt || (reg as any).spouse_paid_at || (reg as any).createdAt || (reg as any).created_at)
        : '',
      'Children Payment ID(s)': (reg as any).kidsPaymentId
        ? (Array.isArray((reg as any).kidsPaymentId)
            ? (reg as any).kidsPaymentId.join(', ')
            : String((reg as any).kidsPaymentId))
        : '',
      'Children Payment Date/Time (EST)': (reg as any).kidsPaymentId
        ? formatPaymentDateTime((reg as any).kidsPaidAt || (reg as any).kids_paid_at || (reg as any).createdAt || (reg as any).created_at)
        : '',
      'Total Price': reg.totalPrice != null ? Number(reg.totalPrice).toFixed(2) : '',
      'Cancellation Reason': filteredApprovedRows.find(r => r.registration_id === reg.id)?.reason || '',
      'Cancelled At': formatPaymentDateTime((reg as any).cancellationAt || (reg as any).cancellation_at),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    const newWs: any = {};
    const downloadRow: any = {};
    
    downloadRow['A1'] = { t: 's', v: 'Downloaded Date/Time (EST):' };
    downloadRow['B1'] = { t: 's', v: downloadDateTime };
    
    Object.keys(ws).forEach(key => {
      if (key.startsWith('!')) {
        if (key !== '!ref') {
          newWs[key] = ws[key];
        }
      } else {
        const cell = XLSX.utils.decode_cell(key);
        const newCell = XLSX.utils.encode_cell({ r: cell.r + 2, c: cell.c });
        newWs[newCell] = ws[key];
      }
    });
    
    Object.keys(downloadRow).forEach(key => {
      newWs[key] = downloadRow[key];
    });
    
    const finalRange = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: range.e.r + 2, c: range.e.c }
    });
    newWs['!ref'] = finalRange;
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, newWs, 'Cancelled Registrations');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
    const eventName = selectedEventId 
      ? events.find(e => e.id === selectedEventId)?.name || 'AllEvents'
      : 'AllEvents';
    link.download = `cancelled_registrations_${eventName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.xlsx`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container">
      <div className="page-header">
        <h1>Cancellations</h1>
        <div className="event-selector">
          <label htmlFor="eventSelect" className="filter-label">Select Event:</label>
          <select
            id="eventSelect"
            className="form-control"
            value={selectedEventId || ''}
            onChange={(e) => {
              const eventId = e.target.value ? parseInt(e.target.value) : null;
              setSelectedEventId(eventId);
            }}
          >
            <option value="">All Events</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>
                {event.name} - {formatDateShort(event.date)}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="page-actions" style={{ marginBottom: '1rem' }}>
        {activeTab === 'cancelled' && (
          <button className="btn btn-secondary" onClick={handleExportCancelledXlsx}>
            Export Cancelled XLSX
          </button>
        )}
      </div>

      <div className="cancel-tabs">
        <button
          type="button"
          className={`cancel-tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          Requests
        </button>
        <button
          type="button"
          className={`cancel-tab-btn ${activeTab === 'cancelled' ? 'active' : ''}`}
          onClick={() => setActiveTab('cancelled')}
        >
          Cancelled
        </button>
      </div>

      {/* Pending requests */}
      {activeTab === 'requests' && (
        filteredPendingRows.length === 0 ? (
          <div className="card"><p>No pending requests.</p></div>
        ) : (
          <div className="card">
            <table className="cancel-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Event</th>
                  <th>Reason</th>
                  <th>Admin Cancellation</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPendingRows.map(r => (
                  <tr key={r.id}>
                    <td>{r.user_name || r.user_id}</td>
                    <td>{r.user_email}</td>
                    <td>{r.event_name || r.event_id}</td>
                    <td>{formatReason(r.reason)}</td>
                    <td>
                      <input 
                        className="form-control" 
                        value={note[r.id] || ''} 
                        onChange={e=>setNote(prev=>({ ...prev, [r.id]: e.target.value }))} 
                        placeholder="Admin Cancellation" 
                      />
                    </td>
                    <td>
                      <div className="action-buttons" style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn btn-secondary btn-sm btn-details" 
                          onClick={() => handleDetails(r)}
                          title="Details"
                        >
                          Details
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={()=>approve(r.id)}>Approve</button>
                        <button className="btn btn-danger btn-sm" onClick={()=>reject(r.id)}>Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Cancelled registrations (approved requests) */}
      {activeTab === 'cancelled' && (
        filteredApprovedRows.length === 0 ? (
          <div className="card"><p>No cancelled registrations.</p></div>
        ) : (
          <div className="card">
            <table className="cancel-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Event</th>
                  <th>Reason</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApprovedRows.map(r => (
                  <tr key={r.id}>
                    <td>{r.user_name || r.user_id}</td>
                    <td>{r.user_email}</td>
                    <td>{r.event_name || r.event_id}</td>
                    <td>{formatReason(r.reason)}</td>
                    <td>
                      <div className="action-buttons" style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn btn-secondary btn-sm btn-details" 
                          onClick={() => handleDetails(r)}
                          title="Details"
                        >
                          Details
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={()=>restore(r.id)}>Restore</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Registration Details Modal */}
      {previewRegId && (
        <RegistrationPreview
          event={previewEvent}
          registrationId={previewRegId}
          onClose={() => {
            setPreviewRegId(null);
            setPreviewEvent(undefined);
          }}
          showResendButton={false}
        />
      )}
    </div>
  );
};

export default AdminCancellations;


