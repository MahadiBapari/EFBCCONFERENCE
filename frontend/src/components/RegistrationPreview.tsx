import React, { useEffect, useState } from 'react';
import { Event, Registration } from '../types';
import { Modal } from './Modal';
import { registrationsApi } from '../services/apiClient';
import jsPDF from 'jspdf';
import '../styles/RegistrationPreview.css';

interface RegistrationPreviewProps {
  event: Event | undefined;
  registrationId: number | undefined;
  onClose: () => void;
}

export const RegistrationPreview: React.FC<RegistrationPreviewProps> = ({
  event,
  registrationId,
  onClose
}) => {
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRegistration = async () => {
      if (!registrationId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await registrationsApi.getById(registrationId);
        if (response.success && response.data) {
          setRegistration(response.data);
        }
      } catch (error) {
        console.error('Error fetching registration:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRegistration();
  }, [registrationId]);

  const parseAddress = (addr?: string) => {
    const res = { street: '', city: '', state: '', zip: '', country: '' } as any;
    if (!addr) return res;
    const lines = String(addr).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (lines[0]) res.street = lines[0];
    if (lines[1]) {
      const m = lines[1].match(/^(.*?)[,]\s*(\w{2,})\s*(\S+)?$/);
      if (m) { res.city = m[1] || ''; res.state = m[2] || ''; res.zip = (m[3] || ''); } else { res.city = lines[1]; }
    }
    if (lines[2]) res.country = lines[2];
    return res;
  };

  const downloadPDF = async () => {
    if (!registration || !event) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = margin;

    // Load and add logo
    try {
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      
      // Load image and convert to base64 for jsPDF
      const logoDataUrl = await new Promise<string>((resolve, reject) => {
        logoImg.onload = () => {
          try {
            // Create canvas to convert image to base64
            const canvas = document.createElement('canvas');
            canvas.width = logoImg.naturalWidth;
            canvas.height = logoImg.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(logoImg, 0, 0);
              const dataUrl = canvas.toDataURL('image/png');
              resolve(dataUrl);
            } else {
              reject(new Error('Could not get canvas context'));
            }
          } catch (err) {
            reject(err);
          }
        };
        logoImg.onerror = () => {
          console.warn('Failed to load logo, continuing without it');
          resolve(''); // Return empty string to indicate no logo
        };
        logoImg.src = '/EFBClogo.png';
      });

      // Add logo at the top (centered, max width 50mm, maintain aspect ratio)
      if (logoDataUrl && logoImg.complete && logoImg.naturalWidth > 0) {
        const logoMaxWidth = 50; // mm
        const logoAspectRatio = logoImg.naturalHeight / logoImg.naturalWidth;
        const logoWidth = Math.min(logoMaxWidth, logoImg.naturalWidth * 0.264583); // Convert px to mm (1px = 0.264583mm at 96dpi)
        const logoHeight = logoWidth * logoAspectRatio;
        const logoX = (pageWidth - logoWidth) / 2; // Center horizontally
        
        doc.addImage(logoDataUrl, 'PNG', logoX, yPos, logoWidth, logoHeight);
        yPos += logoHeight + 10; // Add spacing after logo
      }
    } catch (error) {
      console.warn('Error loading logo for PDF:', error);
      // Continue without logo
    }

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Registration Confirmation', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Event Info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Event: ${event.name}`, margin, yPos);
    yPos += 10;

    // Personal Information
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Personal Information', margin, yPos);
    yPos += 8;

    const addr = parseAddress(registration.address);
    const personalData = [
      ['Name', `${registration.firstName} ${registration.lastName}`],
      ['Badge Name', registration.badgeName || ''],
      ['Email', registration.email || ''],
      ...(registration.secondaryEmail ? [['Secondary Email', registration.secondaryEmail]] : []),
      ['Organization', registration.organization || ''],
      ['Job Title', registration.jobTitle || ''],
      ['Address', addr.street || registration.address || ''],
      ...(addr.city ? [['City', addr.city]] : []),
      ...(addr.state ? [['State', addr.state]] : []),
      ...(addr.zip ? [['Zip Code', addr.zip]] : []),
      ...(addr.country ? [['Country', addr.country]] : []),
      ['Mobile', registration.mobile || ''],
      ...(registration.officePhone ? [['Office Phone', registration.officePhone]] : []),
      ['First-time Attending', registration.isFirstTimeAttending ? 'Yes' : 'No'],
      ['Company Type', registration.companyType || ''],
      ...(registration.companyTypeOther ? [['Company Type (Other)', registration.companyTypeOther]] : []),
      ...(registration.emergencyContactName ? [['Emergency Contact Name', registration.emergencyContactName]] : []),
      ...(registration.emergencyContactPhone ? [['Emergency Contact Phone', registration.emergencyContactPhone]] : []),
    ];

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    personalData.forEach(([label, value]) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = margin;
      }
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, margin, yPos);
      doc.setFont('helvetica', 'normal');
      const textLines = doc.splitTextToSize(value || '-', pageWidth - margin * 2 - 60);
      doc.text(textLines, margin + 60, yPos);
      yPos += textLines.length * 5 + 2;
    });

    yPos += 5;

    // Conference Events
    if (yPos > 250) {
      doc.addPage();
      yPos = margin;
    }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Conference Events', margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const isPickleball = (registration.wednesdayActivity || '').toLowerCase().includes('pickleball');
    const eventData = [
      ['Selected Activity', registration.wednesdayActivity || ''],
      ...(registration.golfHandicap ? [['Golf Handicap', String(registration.golfHandicap)]] : []),
      ...(registration.clubRentals ? [['Club Rentals', registration.clubRentals]] : []),
      ...((registration as any).massageTimeSlot ? [['Massage Time Slot', (registration as any).massageTimeSlot]] : []),
      ...(isPickleball && (registration as any).pickleballEquipment !== undefined ? [['Pickleball Equipment', (registration as any).pickleballEquipment ? 'I will bring my own' : 'I need equipment']] : []),
    ];

    eventData.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, margin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value || '-', margin + 60, yPos);
      yPos += 6;
    });

    yPos += 5;

    // Conference Meals
    if (yPos > 250) {
      doc.addPage();
      yPos = margin;
    }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Conference Meals', margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const mealData = [
      ...((registration as any).tuesdayEarlyReception ? [['Tuesday Early Arrivals Reception', (registration as any).tuesdayEarlyReception]] : []),
      ['Wednesday Reception', registration.wednesdayReception || ''],
      ['Thursday Breakfast', registration.thursdayBreakfast || ''],
      ['Thursday Luncheon', registration.thursdayLuncheon || ''],
      ['Thursday Dinner', registration.thursdayDinner || ''],
      ['Friday Breakfast', registration.fridayBreakfast || ''],
      ...(registration.dietaryRestrictions ? [['Dietary Restrictions', registration.dietaryRestrictions]] : []),
      ...((registration as any).specialRequests ? [['Special Requests', (registration as any).specialRequests]] : []),
    ];

    mealData.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, margin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value || '-', margin + 60, yPos);
      yPos += 6;
    });

    yPos += 5;

    // Spouse/Guest
    if (registration.spouseDinnerTicket) {
      if (yPos > 250) {
        doc.addPage();
        yPos = margin;
      }
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Spouse/Guest', margin, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setFont('helvetica', 'bold');
      doc.text('Dinner Ticket:', margin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text('Yes', margin + 60, yPos);
      yPos += 6;
      if (registration.spouseFirstName) {
        doc.setFont('helvetica', 'bold');
        doc.text('Spouse First Name:', margin, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(registration.spouseFirstName, margin + 60, yPos);
        yPos += 6;
      }
      if (registration.spouseLastName) {
        doc.setFont('helvetica', 'bold');
        doc.text('Spouse Last Name:', margin, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(registration.spouseLastName, margin + 60, yPos);
        yPos += 6;
      }
    }

    // Child Information
    if ((registration as any).childLunchTicket) {
      if (yPos > 250) {
        doc.addPage();
        yPos = margin;
      }
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Child Information', margin, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setFont('helvetica', 'bold');
      doc.text('Lunch Ticket:', margin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text('Yes', margin + 60, yPos);
      yPos += 6;
      if ((registration as any).childFirstName) {
        doc.setFont('helvetica', 'bold');
        doc.text('Child First Name:', margin, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text((registration as any).childFirstName, margin + 60, yPos);
        yPos += 6;
      }
      if ((registration as any).childLastName) {
        doc.setFont('helvetica', 'bold');
        doc.text('Child Last Name:', margin, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text((registration as any).childLastName, margin + 60, yPos);
        yPos += 6;
      }
    }

    // Payment
    if (yPos > 250) {
      doc.addPage();
      yPos = margin;
    }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Information', margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setFont('helvetica', 'bold');
    doc.text('Total Price:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(`$${registration.totalPrice || '0.00'}`, margin + 60, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Method:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(registration.paymentMethod || '-', margin + 60, yPos);
    yPos += 6;
    if (typeof (registration as any).paid !== 'undefined') {
      doc.setFont('helvetica', 'bold');
      doc.text('Paid:', margin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text((registration as any).paid ? 'Yes' : 'No', margin + 60, yPos);
      yPos += 6;
    }
    if (registration.paymentMethod === 'Card' && (registration as any).squarePaymentId) {
      doc.setFont('helvetica', 'bold');
      doc.text('Square Payment ID:', margin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text((registration as any).squarePaymentId, margin + 60, yPos);
    }

    // Save PDF
    const fileName = `Registration_${registration.firstName}_${registration.lastName}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  const addr = registration ? parseAddress(registration.address) : { street: '', city: '', state: '', zip: '', country: '' };
  const Line = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="preview-line">
      <div className="preview-label">{label}</div>
      <div className="preview-value">{value || '-'}</div>
    </div>
  );

  if (loading) {
    return (
      <Modal
        size="xl"
        title="Registration Preview"
        onClose={onClose}
      >
        <div className="preview-loading">Loading registration details...</div>
      </Modal>
    );
  }

  if (!registration) {
    return (
      <Modal
        size="xl"
        title="Registration Preview"
        onClose={onClose}
      >
        <div className="preview-loading">Registration not found.</div>
      </Modal>
    );
  }

  return (
    <Modal
      size="xl"
      title={
        <div className="modal-title-content">
          <div>
            <h2>Registration Preview</h2>
            {event && (
              <p className="modal-subtitle">
                {event.name}
              </p>
            )}
          </div>
        </div>
      }
      onClose={onClose}
      footer={
        <div className="modal-footer-actions">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={downloadPDF}>Download PDF</button>
        </div>
      }
    >
      <div className="preview-container">
        <div className="preview-section">
          <h3 className="section-title">Personal Information</h3>
          <Line label="Name" value={`${registration.firstName} ${registration.lastName}`} />
          <Line label="Badge Name" value={registration.badgeName} />
          <Line label="Email" value={registration.email} />
          {registration.secondaryEmail && <Line label="Secondary Email" value={registration.secondaryEmail} />}
          <Line label="Organization" value={registration.organization} />
          <Line label="Job Title" value={registration.jobTitle} />
          <Line label="Address" value={addr.street || registration.address} />
          {addr.city && <Line label="City" value={addr.city} />}
          {addr.state && <Line label="State" value={addr.state} />}
          {addr.zip && <Line label="Zip Code" value={addr.zip} />}
          {addr.country && <Line label="Country" value={addr.country} />}
          <Line label="Mobile" value={registration.mobile} />
          {registration.officePhone && <Line label="Office Phone" value={registration.officePhone} />}
          <Line label="First-time Attending" value={registration.isFirstTimeAttending ? 'Yes' : 'No'} />
          <Line label="Company Type" value={registration.companyType} />
          {registration.companyTypeOther && <Line label="Company Type (Other)" value={registration.companyTypeOther} />}
          {registration.emergencyContactName && <Line label="Emergency Contact Name" value={registration.emergencyContactName} />}
          {registration.emergencyContactPhone && <Line label="Emergency Contact Phone" value={registration.emergencyContactPhone} />}
        </div>

        <div className="preview-section">
          <h3 className="section-title">Conference Events</h3>
          <Line label="Selected Activity" value={registration.wednesdayActivity} />
          {registration.golfHandicap && <Line label="Golf Handicap" value={registration.golfHandicap} />}
          {registration.clubRentals && <Line label="Club Rentals" value={registration.clubRentals} />}
          {(registration as any).massageTimeSlot && <Line label="Massage Time Slot" value={(registration as any).massageTimeSlot} />}
          {((registration.wednesdayActivity || '').toLowerCase().includes('pickleball') && (registration as any).pickleballEquipment !== undefined) && (
            <Line 
              label="Pickleball Equipment" 
              value={(registration as any).pickleballEquipment ? 'I will bring my own' : 'I need equipment'} 
            />
          )}
        </div>

        <div className="preview-section">
          <h3 className="section-title">Conference Meals</h3>
          {(registration as any).tuesdayEarlyReception && <Line label="Tuesday Early Arrivals Reception" value={(registration as any).tuesdayEarlyReception} />}
          <Line label="Wednesday Reception" value={registration.wednesdayReception} />
          <Line label="Thursday Breakfast" value={registration.thursdayBreakfast} />
          <Line label="Thursday Luncheon" value={registration.thursdayLuncheon} />
          <Line label="Thursday Dinner" value={registration.thursdayDinner} />
          <Line label="Friday Breakfast" value={registration.fridayBreakfast} />
          {registration.dietaryRestrictions && <Line label="Dietary Restrictions" value={registration.dietaryRestrictions} />}
          {(registration as any).specialRequests && <Line label="Special Requests" value={(registration as any).specialRequests} />}
        </div>

        {(registration as any).childLunchTicket && (
          <div className="preview-section">
            <h3 className="section-title">Child Information</h3>
            <div className="preview-item">
              <span className="preview-label">Lunch Ticket:</span>
              <span className="preview-value">Yes</span>
            </div>
            {(registration as any).childFirstName && (
              <div className="preview-item">
                <span className="preview-label">Child First Name:</span>
                <span className="preview-value">{(registration as any).childFirstName}</span>
              </div>
            )}
            {(registration as any).childLastName && (
              <div className="preview-item">
                <span className="preview-label">Child Last Name:</span>
                <span className="preview-value">{(registration as any).childLastName}</span>
              </div>
            )}
          </div>
        )}

        {registration.spouseDinnerTicket && (
          <div className="preview-section">
            <h3 className="section-title">Spouse/Guest</h3>
            <Line label="Dinner Ticket" value="Yes" />
            {registration.spouseFirstName && <Line label="Spouse First Name" value={registration.spouseFirstName} />}
            {registration.spouseLastName && <Line label="Spouse Last Name" value={registration.spouseLastName} />}
          </div>
        )}

        <div className="preview-section">
          <h3 className="section-title">Payment</h3>
          <Line label="Total Price" value={`$${registration.totalPrice || '0.00'}`} />
          <Line label="Payment Method" value={registration.paymentMethod} />
          {typeof (registration as any).paid !== 'undefined' && (
            <Line label="Paid" value={(registration as any).paid ? 'Yes' : 'No'} />
          )}
          {registration.paymentMethod === 'Card' && (registration as any).squarePaymentId && (
            <Line label="Square Payment ID" value={(registration as any).squarePaymentId} />
          )}
        </div>
      </div>
    </Modal>
  );
};

export default RegistrationPreview;

