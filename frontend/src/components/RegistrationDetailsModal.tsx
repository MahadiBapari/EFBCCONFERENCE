import React from 'react';
import { Event, Registration } from '../types';
import { Modal } from './Modal';

interface RegistrationDetailsModalProps {
  event: Event | undefined;
  registration: Registration;
  onClose: () => void;
}

export const RegistrationDetailsModal: React.FC<RegistrationDetailsModalProps> = ({
  event,
  registration,
  onClose
}) => {
  const Line = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div style={{ display: 'flex', gap: '1rem', padding: '0.35rem 0', alignItems: 'baseline' }}>
      <div style={{ minWidth: 220, color: 'var(--muted-color)' }}>{label}</div>
      <div style={{ flex: 1 }}>{value || '-'}</div>
    </div>
  );

  return (
    <Modal
      size="xl"
      title={
        <div className="modal-title-content">
          <div>
            <h2>Registration Details</h2>
            {event && (
              <p className="modal-subtitle">
                {event.name} - {new Date(event.date).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      }
      onClose={onClose}
      footer={
        <div className="modal-footer-actions">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      }
    >
      <div style={{ display: 'grid', gap: '1.25rem' }}>
        <div className="card" style={{ padding: '1rem' }}>
          <h3 className="section-title">Personal Information</h3>
          <Line label="Name" value={`${registration.firstName} ${registration.lastName}`} />
          <Line label="Badge Name" value={registration.badgeName} />
          <Line label="Email" value={registration.email} />
          {registration.secondaryEmail && <Line label="Secondary Email" value={registration.secondaryEmail} />}
          <Line label="Organization" value={registration.organization} />
          <Line label="Job Title" value={registration.jobTitle} />
          <Line label="Address" value={registration.address} />
          <Line label="Mobile" value={registration.mobile} />
          {registration.officePhone && <Line label="Office Phone" value={registration.officePhone} />}
          <Line label="First-time Attending" value={registration.isFirstTimeAttending ? 'Yes' : 'No'} />
          <Line label="Company Type" value={registration.companyType} />
          {registration.companyTypeOther && <Line label="Company Type (Other)" value={registration.companyTypeOther} />}
          {registration.emergencyContactName && <Line label="Emergency Contact Name" value={registration.emergencyContactName} />}
          {registration.emergencyContactPhone && <Line label="Emergency Contact Phone" value={registration.emergencyContactPhone} />}
        </div>

        <div className="card" style={{ padding: '1rem' }}>
          <h3 className="section-title">Conference Events</h3>
          <Line label="Selected Activity" value={registration.wednesdayActivity} />
          {registration.golfHandicap && <Line label="Golf Handicap" value={registration.golfHandicap} />}
          {(registration as any).massageTimeSlot && <Line label="Massage Time Slot" value={(registration as any).massageTimeSlot} />}
        </div>

        <div className="card" style={{ padding: '1rem' }}>
          <h3 className="section-title">Conference Meals</h3>
          <Line label="Wednesday Reception" value={registration.wednesdayReception} />
          <Line label="Thursday Breakfast" value={registration.thursdayBreakfast} />
          <Line label="Thursday Luncheon" value={registration.thursdayLuncheon} />
          <Line label="Thursday Dinner" value={registration.thursdayDinner} />
          <Line label="Friday Breakfast" value={registration.fridayBreakfast} />
          {registration.dietaryRestrictions && <Line label="Dietary Restrictions" value={registration.dietaryRestrictions} />}
        </div>

        <div className="card" style={{ padding: '1rem' }}>
          <h3 className="section-title">Spouse/Guest</h3>
          <Line label="Dinner Ticket" value={registration.spouseDinnerTicket ? 'Yes' : 'No'} />
          {registration.spouseDinnerTicket && (
            <>
              <Line label="Spouse First Name" value={registration.spouseFirstName} />
              <Line label="Spouse Last Name" value={registration.spouseLastName} />
            </>
          )}
        </div>

        <div className="card" style={{ padding: '1rem' }}>
          <h3 className="section-title">Payment</h3>
          <Line label="Total Price" value={`$${registration.totalPrice}.00`} />
          <Line label="Payment Method" value={registration.paymentMethod} />
        </div>
      </div>
    </Modal>
  );
};

export default RegistrationDetailsModal;


