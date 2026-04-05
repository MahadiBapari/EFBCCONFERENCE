import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, { pairingApi } from '../../services/apiClient';
import { Event, Registration, User } from '../../types';
import { maxPartnerNameFields, resolvePairingActivityLabel } from '../../utils/pairingActivityUtils';
import '../../styles/PairingRequestPage.css';

interface PairingRequestPageProps {
  user: User;
}

export const PairingRequestPage: React.FC<PairingRequestPageProps> = ({ user }) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [registrationId, setRegistrationId] = useState<number | ''>('');
  const [partnerNames, setPartnerNames] = useState<string[]>(['', '', '', '']);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [evRes, regRes] = await Promise.all([
        apiClient.get<Event[]>('/events'),
        apiClient.get<Registration[]>('/registrations/mine'),
      ]);
      const evData = (evRes as any).data || [];
      const regData = (regRes as any).data || [];
      const normalizeEvent = (e: any): Event => {
        let acts = e?.activities;
        if (typeof acts === 'string') {
          try {
            acts = JSON.parse(acts);
          } catch {
            acts = [];
          }
        }
        return { ...e, activities: Array.isArray(acts) ? acts : [] } as Event;
      };
      setEvents(Array.isArray(evData) ? evData.map(normalizeEvent) : []);
      setRegistrations(Array.isArray(regData) ? regData : []);
    } catch (e: any) {
      setLoadError(e?.response?.data?.error || 'Failed to load your registrations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadData();
  }, [loadData]);

  const activeEvent = useMemo(() => {
    if (!events.length) return null;
    return events.reduce((latest, current) =>
      new Date(current.date) > new Date(latest.date) ? current : latest
    );
  }, [events]);

  const eligibleRegs = useMemo(() => {
    return registrations.filter((r) => {
      const ev = events.find((e) => e.id === r.eventId);
      return resolvePairingActivityLabel(r, ev) !== null;
    });
  }, [registrations, events]);

  const activeEventEligibleRegs = useMemo(() => {
    if (!activeEvent) return [];
    return eligibleRegs.filter((r) => r.eventId === activeEvent.id);
  }, [eligibleRegs, activeEvent]);

  useEffect(() => {
    if (activeEventEligibleRegs.length === 0) {
      setRegistrationId('');
      return;
    }
    // Auto-select latest registration for the active event; backend returns newest first.
    setRegistrationId(activeEventEligibleRegs[0].id);
  }, [activeEventEligibleRegs]);

  const selectedReg = useMemo(
    () => activeEventEligibleRegs.find((r) => r.id === registrationId) || activeEventEligibleRegs[0],
    [activeEventEligibleRegs, registrationId]
  );

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedReg?.eventId),
    [events, selectedReg?.eventId]
  );

  const activityLabel = useMemo(() => {
    if (!selectedReg) return null;
    return resolvePairingActivityLabel(selectedReg, selectedEvent);
  }, [selectedReg, selectedEvent]);

  const maxPartners = activityLabel ? maxPartnerNameFields(activityLabel) : 0;

  /** Registrant submitting the request — badge name + last name (read-only), matches common roster display. */
  const requesterBadgeLastName = useMemo(() => {
    if (!selectedReg) return '';
    const badge = String(selectedReg.badgeName || '').trim();
    const last = String(selectedReg.lastName || '').trim();
    const parts = [badge, last].filter(Boolean);
    if (parts.length) return parts.join(' ');
    return String(user.name || '').trim();
  }, [selectedReg, user.name]);

  useEffect(() => {
    if (maxPartners <= 0) return;
    setPartnerNames((prev) =>
      Array.from({ length: maxPartners }, (_, i) => (i < prev.length ? prev[i] : '') ?? '')
    );
  }, [maxPartners]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!registrationId || !selectedReg || !activityLabel) {
      setSubmitError('Please select a registration.');
      return;
    }

    const names = partnerNames.slice(0, maxPartners).map((s) => s.trim()).filter(Boolean);
    if (names.length === 0 && !additionalNotes.trim()) {
      setSubmitError('Please enter at least one name or notes.');
      return;
    }

    setSubmitting(true);
    try {
      const res: any = await pairingApi.submit({
        registrationId: Number(registrationId),
        partnerNames: names,
        additionalNotes: additionalNotes.trim() || undefined,
      });
      if (res.success === false) {
        setSubmitError(res.error || 'Submission failed.');
        return;
      }
      setSubmitSuccess(true);
      setPartnerNames(Array(maxPartners).fill(''));
      setAdditionalNotes('');
    } catch (err: any) {
      setSubmitError(err?.response?.data?.error || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pairing-request-page">
      <div className="pairing-request-inner">
        <header className="pairing-request-header">
          <button type="button" className="btn btn-secondary pairing-back-btn" onClick={() => navigate('/dashboard')}>
            Back to dashboard
          </button>
          <h1>Activity pairing request</h1>
          <p className="pairing-request-lead">
            Signed in as <strong>{user.name}</strong> ({user.email}). Submit who you would like to be grouped with for
            the Wednesday activity you signed up for. The conference team will confirm assignments.
          </p>
          {activeEvent && (
            <p className="pairing-event-header">
              Current event: <strong>{activeEvent.name}</strong>
            </p>
          )}
        </header>

        {loading && <p className="pairing-request-status">Loading…</p>}
        {loadError && <div className="error-message">{loadError}</div>}

        {!loading && !loadError && activeEventEligibleRegs.length === 0 && (
          <div className="card pairing-request-card">
            <p>
              {activeEvent
                ? `You have no active registration with a groupable Wednesday activity for ${activeEvent.name}.`
                : 'No active event is available right now.'}
            </p>
          </div>
        )}

        {!loading && !loadError && activeEventEligibleRegs.length > 0 && (
          <form className="card pairing-request-card" onSubmit={handleSubmit}>
            {selectedReg && activityLabel && (
              <>
                <p className="pairing-activity-banner">
                  Activity for this request: <strong>{activityLabel}</strong>
                  {selectedReg.wednesdayActivity && selectedReg.wednesdayActivity !== activityLabel && (
                    <span className="pairing-activity-sub"> ({selectedReg.wednesdayActivity})</span>
                  )}
                </p>

                {activityLabel.toLowerCase().includes('golf') && (
                  <p className="pairing-hint">Who would you like to play with? (Up to 3 names; your foursome is 4 including you.)</p>
                )}
                {activityLabel.toLowerCase().includes('fish') && (
                  <p className="pairing-hint">
                    Groups are up to 5 per boat. Add up to 4 additional names
                    if you are organizing a partial group.
                  </p>
                )}
                {!activityLabel.toLowerCase().includes('golf') &&
                  !activityLabel.toLowerCase().includes('fish') && (
                    <p className="pairing-hint">List people you would like to be grouped with (names as they should appear).</p>
                  )}

                {selectedReg && (
                  <div className="form-group pairing-requester-row">
                    <label className="form-label" htmlFor="pairing-requester-name">
                      1 — You (requesting)
                    </label>
                    <input
                      id="pairing-requester-name"
                      type="text"
                      className="form-control pairing-requester-input"
                      readOnly
                      value={requesterBadgeLastName}
                      title={requesterBadgeLastName}
                    />
                  </div>
                )}

                {partnerNames.slice(0, maxPartners).map((val, idx) => (
                  <div className="form-group" key={idx}>
                    <label htmlFor={`partner-${idx}`} className="form-label">
                      {idx + 2} — {maxPartners > 1 ? 'Person to group with' : 'Person to group with'}{' '}
                      {maxPartners > 1 ? '(optional)' : ''}
                    </label>
                    <input
                      id={`partner-${idx}`}
                      type="text"
                      className="form-control"
                      value={val}
                      onChange={(e) => {
                        const next = [...partnerNames];
                        next[idx] = e.target.value;
                        setPartnerNames(next);
                      }}
                      placeholder="Full name"
                    />
                  </div>
                ))}

                <div className="form-group">
                  <label htmlFor="pairingNotes" className="form-label">
                    Additional notes (optional)
                  </label>
                  <textarea
                    id="pairingNotes"
                    className="form-control"
                    rows={4}
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    placeholder="Anything else we should know for grouping…"
                  />
                </div>

                {submitError && <div className="error-message">{submitError}</div>}
                {submitSuccess && (
                  <div className="info-message pairing-success">
                    Your request was submitted. The organizers have been notified by email.
                  </div>
                )}

                <div className="pairing-actions">
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Sending…' : 'Submit group request'}
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
