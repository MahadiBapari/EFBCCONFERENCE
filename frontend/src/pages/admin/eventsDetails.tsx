import React, { useMemo, useEffect, useState } from 'react';
import { Event, Registration, DiscountCode } from '../../types';
import { getActivityNames, getActivitySeatLimit } from '../../utils/eventUtils';
import { formatDateShort } from '../../utils/dateUtils';

interface EventDetailsPageProps {
  event: Event;
  registrations: Registration[];
  groups: any[];
  onBack: () => void;
}

export const EventDetailsPage: React.FC<EventDetailsPageProps> = ({ 
  event, 
  registrations, 
  groups, 
  onBack 
}) => {
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Load discount codes for this event
  useEffect(() => {
    if (event?.id) {
      loadDiscountCodes(event.id);
    }
  }, [event?.id]);

  const loadDiscountCodes = async (eventId: number) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/discount-codes/events/${eventId}`);
      const data = await res.json();
      if (data.success) {
        setDiscountCodes(data.data || []);
      } else {
        console.error('Failed to load discount codes:', data.error);
        setDiscountCodes([]);
      }
    } catch (error) {
      console.error('Error loading discount codes:', error);
      setDiscountCodes([]);
    }
  };

  // Get active registrations for this event (excluding cancelled)
  const activeRegistrations = useMemo(() => {
    return registrations.filter(r => 
      r.eventId === event.id && 
      r.status !== 'cancelled' &&
      !(r as any).cancellationAt
    );
  }, [registrations, event.id]);

  // Get activity details with seat availability
  const activityDetails = useMemo(() => {
    const activities = getActivityNames(event.activities || []);
    
    // Count registrations per activity (moved inside useMemo to avoid dependency issues)
    const getActivityRegistrationCount = (activityName: string): number => {
      return activeRegistrations.filter(reg => 
        reg.wednesdayActivity === activityName
      ).length;
    };
    
    return activities.map(activityName => {
      const seatLimit = getActivitySeatLimit(event.activities, activityName);
      const currentCount = getActivityRegistrationCount(activityName);
      const remaining = seatLimit !== undefined ? seatLimit - currentCount : null;
      
      return {
        name: activityName,
        seatLimit,
        currentCount,
        remaining,
        isFull: seatLimit !== undefined && remaining !== null && remaining <= 0
      };
    });
  }, [event.activities, activeRegistrations]);

  const startDateStr = event.startDate ? formatDateShort(event.startDate) : null;
  const endDateStr = formatDateShort(event.date || event.endDate || '');
  const dateDisplay = startDateStr ? `${startDateStr} - ${endDateStr}` : endDateStr;

  return (
    <div className="container">
      <div className="page-header">
        <div>
          <button onClick={onBack} className="btn btn-secondary back-button">← Back to Events</button>
          <h1>{event.name} - Event Details</h1>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Basic Event Information */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h2 style={{ marginTop: '0', marginBottom: '20px', borderBottom: '2px solid #e0e0e0', paddingBottom: '10px' }}>
            Basic Information
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '15px', alignItems: 'start' }}>
            <strong>Event Name:</strong>
            <div>{event.name}</div>

            <strong>Dates:</strong>
            <div>{dateDisplay}</div>

            {event.location && (
              <>
                <strong>Location:</strong>
                <div>{event.location}</div>
              </>
            )}

            {event.year && (
              <>
                <strong>Year:</strong>
                <div>{event.year}</div>
              </>
            )}

            {event.description && (
              <>
                <strong>Description:</strong>
                <div>
                  {Array.isArray(event.description) ? (
                    event.description.length > 0 ? (
                      <ul style={{ margin: '0', paddingLeft: '20px' }}>
                        {event.description.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    ) : null
                  ) : (
                    <p style={{ margin: '0', whiteSpace: 'pre-line' }}>{event.description}</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Activities & Seat Availability */}
        {activityDetails.length > 0 && (
          <div className="card" style={{ marginBottom: '20px' }}>
            <h2 style={{ marginTop: '0', marginBottom: '20px', borderBottom: '2px solid #e0e0e0', paddingBottom: '10px' }}>
              Activities & Seat Availability
            </h2>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Activity Name</th>
                    <th>Seat Limit</th>
                    <th>Registered</th>
                    <th>Remaining</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activityDetails.map((activity, idx) => (
                    <tr key={idx}>
                      <td><strong>{activity.name}</strong></td>
                      <td>{activity.seatLimit !== undefined ? activity.seatLimit : 'Unlimited'}</td>
                      <td>{activity.currentCount}</td>
                      <td>
                        {activity.remaining !== null ? (
                          <span style={{ 
                            color: activity.isFull ? '#e74c3c' : activity.remaining <= 5 ? '#f39c12' : '#27ae60',
                            fontWeight: '600'
                          }}>
                            {activity.remaining}
                          </span>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td>
                        {activity.isFull ? (
                          <span style={{ color: '#e74c3c', fontWeight: '600' }}>FULL</span>
                        ) : activity.remaining !== null && activity.remaining <= 5 ? (
                          <span style={{ color: '#f39c12', fontWeight: '600' }}>LOW</span>
                        ) : (
                          <span style={{ color: '#27ae60', fontWeight: '600' }}>Available</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Registration Pricing Tiers */}
        {event.registrationPricing && Array.isArray(event.registrationPricing) && event.registrationPricing.length > 0 && (
          <div className="card" style={{ marginBottom: '20px' }}>
            <h2 style={{ marginTop: '0', marginBottom: '20px', borderBottom: '2px solid #e0e0e0', paddingBottom: '10px' }}>
              Registration Pricing Tiers
            </h2>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tier Name</th>
                    <th>Price</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                  </tr>
                </thead>
                <tbody>
                  {event.registrationPricing.map((tier, idx) => (
                    <tr key={idx}>
                      <td>{tier.label || 'N/A'}</td>
                      <td>${(typeof tier.price === 'number' ? tier.price : 0).toFixed(2)}</td>
                      <td>{tier.startDate ? formatDateShort(tier.startDate) : 'N/A'}</td>
                      <td>{tier.endDate ? formatDateShort(tier.endDate) : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Spouse Pricing Tiers */}
        {event.spousePricing && Array.isArray(event.spousePricing) && event.spousePricing.length > 0 && (
          <div className="card" style={{ marginBottom: '20px' }}>
            <h2 style={{ marginTop: '0', marginBottom: '20px', borderBottom: '2px solid #e0e0e0', paddingBottom: '10px' }}>
              Spouse/Guest Pricing Tiers
            </h2>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tier Name</th>
                    <th>Price</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                  </tr>
                </thead>
                <tbody>
                  {event.spousePricing.map((tier, idx) => (
                    <tr key={idx}>
                      <td>{tier.label || 'N/A'}</td>
                      <td>${(typeof tier.price === 'number' ? tier.price : 0).toFixed(2)}</td>
                      <td>{tier.startDate ? formatDateShort(tier.startDate) : 'N/A'}</td>
                      <td>{tier.endDate ? formatDateShort(tier.endDate) : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Children Pricing Tiers */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h2 style={{ marginTop: '0', marginBottom: '20px', borderBottom: '2px solid #e0e0e0', paddingBottom: '10px' }}>
            Child/Children Pricing Tiers
          </h2>
          {event.kidsPricing && Array.isArray(event.kidsPricing) && event.kidsPricing.length > 0 ? (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tier Name</th>
                    <th>Price</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                  </tr>
                </thead>
                <tbody>
                  {event.kidsPricing.map((tier, idx) => (
                    <tr key={idx}>
                      <td>{tier.label || 'N/A'}</td>
                      <td>${(typeof tier.price === 'number' ? tier.price : 0).toFixed(2)}</td>
                      <td>{tier.startDate ? formatDateShort(tier.startDate) : 'N/A'}</td>
                      <td>{tier.endDate ? formatDateShort(tier.endDate) : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No children pricing tiers configured for this event.</p>
          )}
        </div>

        {/* Discount Codes */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h2 style={{ marginTop: '0', marginBottom: '20px', borderBottom: '2px solid #e0e0e0', paddingBottom: '10px' }}>
            Discount Codes
          </h2>
          {discountCodes.length > 0 ? (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Type</th>
                    <th>Value</th>
                    <th>Expiry Date</th>
                    <th>Usage Limit</th>
                    <th>Used</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {discountCodes.map((code) => {
                    const isExpired = code.expiryDate ? new Date(code.expiryDate) < new Date() : false;
                    const isLimitReached = code.usageLimit !== undefined && code.usedCount !== undefined && code.usedCount >= code.usageLimit;
                    const isActive = !isExpired && !isLimitReached;
                    return (
                      <tr key={code.id}>
                        <td><strong>{code.code}</strong></td>
                        <td>{code.discountType === 'percentage' ? 'Percentage' : 'Fixed Amount'}</td>
                        <td>
                          {code.discountType === 'percentage' 
                            ? `${code.discountValue}%` 
                            : `$${code.discountValue.toFixed(2)}`}
                        </td>
                        <td>{code.expiryDate ? formatDateShort(code.expiryDate) : 'No expiry'}</td>
                        <td>{code.usageLimit || 'Unlimited'}</td>
                        <td>{code.usedCount || 0}</td>
                        <td>
                          <span style={{ 
                            color: isActive ? '#27ae60' : '#e74c3c',
                            fontWeight: '600'
                          }}>
                            {isActive ? 'Active' : isExpired ? 'Expired' : 'Limit Reached'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: '#666', fontStyle: 'italic' }}>No discount codes configured for this event.</p>
          )}
        </div>

        {/* Additional Event Information */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h2 style={{ marginTop: '0', marginBottom: '20px', borderBottom: '2px solid #e0e0e0', paddingBottom: '10px' }}>
            Additional Information
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '15px', alignItems: 'start' }}>
            {event.breakfastPrice !== undefined && event.breakfastPrice !== null && typeof event.breakfastPrice === 'number' && (
              <>
                <strong>Breakfast Price:</strong>
                <div>${event.breakfastPrice.toFixed(2)}</div>
              </>
            )}

            {event.breakfastEndDate && (
              <>
                <strong>Breakfast End Date:</strong>
                <div>{formatDateShort(event.breakfastEndDate)}</div>
              </>
            )}

            {event.childLunchPrice !== undefined && event.childLunchPrice !== null && typeof event.childLunchPrice === 'number' && (
              <>
                <strong>Child Lunch Price:</strong>
                <div>${event.childLunchPrice.toFixed(2)}</div>
              </>
            )}

            <strong>Total Active Registrations:</strong>
            <div style={{ fontWeight: '600', fontSize: '1.1em' }}>{activeRegistrations.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
