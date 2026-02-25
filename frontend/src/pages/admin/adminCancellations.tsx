import React, { useState, useEffect } from 'react';
import { cancelApi } from '../../services/apiClient';
import { RegistrationPreview } from '../../components/RegistrationPreview';
import { Event } from '../../types';
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
}

export const AdminCancellations: React.FC<AdminCancellationsProps> = ({ 
  pendingRows, 
  approvedRows, 
  loading, 
  onReload, 
  onChanged,
  events = [] 
}) => {
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const [note, setNote] = useState<Record<number,string>>({});
  const [activeTab, setActiveTab] = useState<'requests' | 'cancelled'>('requests');
  const [previewRegId, setPreviewRegId] = useState<number | null>(null);
  const [previewEvent, setPreviewEvent] = useState<Event | undefined>(undefined);

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
  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this cancellation request? This action cannot be undone.')) {
      return;
    }
    try {
      await cancelApi.delete(id);
      await onReload();
      if (onChanged) await onChanged();
    } catch (error) {
      console.error('Error deleting cancellation request:', error);
      alert('Failed to delete cancellation request. Please try again.');
    }
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

  return (
    <div className="container">
      <div className="page-header"><h1>Cancellation Requests</h1></div>
      {/* {loading && (
        // <p className="cancel-loading-text">Loading latest cancellation data…</p>
      )} */}
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
        pendingRows.length === 0 ? (
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
                {pendingRows.map(r => (
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
        approvedRows.length === 0 ? (
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
                {approvedRows.map(r => (
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
        />
      )}
    </div>
  );
};

export default AdminCancellations;


