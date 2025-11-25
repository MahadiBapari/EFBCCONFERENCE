import nodemailer, { type Transporter } from 'nodemailer';
import dotenv from 'dotenv';
// Load .env only in non-production to avoid overriding platform env vars
if ((process.env.NODE_ENV || '').toLowerCase() !== 'production') {
dotenv.config();
}

const ensureTransporter = (): Transporter | null => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    const missing: string[] = [];
    if (!host) missing.push('SMTP_HOST');
    if (!user) missing.push('SMTP_USER');
    if (!pass) missing.push('SMTP_PASS');
    console.warn('SMTP not fully configured. Missing:', missing.join(', ') || 'none', '- emails will be logged to console.');
    return null;
  }
  // Allow overriding secure mode via env; default: implicit TLS on 465, STARTTLS otherwise
  const secure = (process.env.SMTP_SECURE || '').length
    ? /^(1|true|yes)$/i.test(process.env.SMTP_SECURE as string)
    : port === 465;
  // Optional IP family override (4, 6). If not provided, use IPv4 by default.
  const familyEnv = process.env.SMTP_FAMILY;
  const family = familyEnv ? Number(familyEnv) : 4;
  // Add sane timeouts; use STARTTLS on 587
  const transport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    requireTLS: !secure,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    ...(family ? { family } : {}),
    tls: secure ? { minVersion: 'TLSv1.2', servername: host } : { minVersion: 'TLSv1.2', servername: host },
    logger: /^(1|true|yes)$/i.test(process.env.SMTP_DEBUG || ''),
    debug: /^(1|true|yes)$/i.test(process.env.SMTP_DEBUG || ''),
  });
  return transport;
};

const transporter: Transporter | null = ensureTransporter();
let smtpVerifiedLogged = false;

// Generic send helper with HTTP API fallback (Resend)
type MailPayload = { to: string; subject: string; text: string; html: string };

const sendUsingTransporter = async (payload: MailPayload): Promise<void> => {
  if (!transporter) throw new Error('No SMTP transporter');
  if (!smtpVerifiedLogged) {
    try {
      await transporter.verify();
      console.log('SMTP OK - transporter verified');
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || String(e);
      console.error('❌ SMTP FAIL -', msg);
    } finally {
      smtpVerifiedLogged = true;
    }
  }
  const from = process.env.EMAIL_FROM || 'no-reply@efbc.local';
  await transporter.sendMail({ from, ...payload });
};

const sendUsingResend = async (payload: MailPayload): Promise<void> => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY not set');
  const from = process.env.EMAIL_FROM || 'no-reply@efbc.local';
  const fetchAny: any = (globalThis as any).fetch;
  const res = await fetchAny('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from, to: payload.to, subject: payload.subject, html: payload.html, text: payload.text })
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API failed (${res.status}): ${body}`);
  }
};

const sendMail = async (payload: MailPayload): Promise<void> => {
  try {
    if (transporter) {
      await sendUsingTransporter(payload);
      return;
    }
  } catch (e) {
    console.error('SMTP send failed, falling back to HTTP API:', (e as any)?.message || e);
  }
  if (process.env.RESEND_API_KEY) {
    await sendUsingResend(payload);
    return;
  }
  console.warn('⚠️ No email transport available (SMTP or RESEND_API_KEY). Email not sent.');
};

// Get custom footer from database
const getCustomFooter = async (): Promise<string> => {
  try {
    const db = (globalThis as any).databaseService;
    if (!db) return '';
    const result = await db.query('SELECT footer_text FROM email_customizations WHERE id = 1 LIMIT 1');
    if (Array.isArray(result) && result.length > 0 && result[0].footer_text) {
      return result[0].footer_text;
    }
  } catch (error) {
    // Silently fail and return empty string
  }
  return '';
};

// Basic, responsive-ish HTML email wrapper
const renderEmailTemplate = async (params: {
  subject?: string;
  heading?: string;
  preheader?: string;
  contentHtml: string;
  cta?: { label: string; url: string };
  footerHtml?: string;
}) => {
  const brand = (process.env.EMAIL_BRAND || 'EFBC Conference').trim();
  const heading = params.heading || brand;
  const preheader = params.preheader || '';
  // Use provided footerHtml or fetch from database
  const customFooter = params.footerHtml !== undefined ? params.footerHtml : await getCustomFooter();
  const footerHtml = customFooter || '';
  const buttonHtml = params.cta
    ? `
      <a href="${params.cta.url}"
         style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">
        ${params.cta.label}
      </a>
    `
    : '';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const logoUrl = `${frontendUrl}/EFBClogo.png`;
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${params.subject || heading}</title>
    <style></style>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', sans-serif;">
    <span style="display:none;opacity:0;visibility:hidden;mso-hide:all;">${preheader}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:24px;text-align:center;background:#ffffff;">
                <img src="${logoUrl}" alt="${brand}" style="max-width:150px;height:auto;display:block;margin:0 auto;" />
              </td>
            </tr>
            <tr>
              <td style="padding:20px 24px;border-bottom:1px solid #e5e7eb;background:#ffffff;">
                <h1 style="margin:0;color:#111827;font-size:18px;">${brand}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 24px 8px 24px;">
                <h2 style="margin:0 0 8px 0;color:#111827;font-size:20px;line-height:1.4;">${heading}</h2>
              </td>
            </tr>
            <tr>
              <td style="padding:0 24px 8px 24px;color:#374151;font-size:14px;line-height:1.7;">
                ${params.contentHtml}
              </td>
            </tr>
            ${params.cta ? `<tr><td style="padding:16px 24px 8px 24px;">${buttonHtml}</td></tr>` : ''}
            <tr>
              <td style="padding:20px 24px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:12px;">
                ${footerHtml}
              </td>
            </tr>
          </table>
          <div style="color:#6b7280;font-size:11px;margin-top:12px;">© ${new Date().getFullYear()} ${brand}. All rights reserved.</div>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;
};

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || '5000'}`;
  const verifyPath = `/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  const link = `${baseUrl}${verifyPath}`;

  const from = process.env.EMAIL_FROM || 'no-reply@efbc.local';
  const subject = 'Verify your email address';
  const html = await renderEmailTemplate({
    subject,
    heading: 'Verify your email',
    preheader: 'Confirm your email to finish setting up your account',
    contentHtml: `
      <p style="margin:0 0 12px 0;">Welcome to the EFBC Conference! Please confirm your email address to activate your account.</p>
      <p style="margin:0;opacity:.8;">This link expires in 24 hours.</p>
    `,
    cta: { label: 'Verify Email', url: link },
    footerHtml: '', // No custom footer for verification emails
  });
  const text = `Verify your email: ${link}`;

  await sendMail({ to, subject, text, html });
}

// Helper function to format date as MM/DD/YYYY
const formatDateMMDDYYYY = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  try {
    // Parse the date string (could be YYYY-MM-DD or ISO format)
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr; // Return original if invalid
    
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  } catch {
    return dateStr;
  }
};

export async function sendRegistrationConfirmationEmail(params: {
  to: string;
  name: string;
  eventName?: string;
  eventDate?: string;
  totalPrice?: number;
  registration?: any; // optional full registration to include details in email
}): Promise<void> {
  const { to, name, eventName, eventDate, totalPrice, registration } = params;
  const from = process.env.EMAIL_FROM || 'no-reply@efbc.local';
  const subject = 'Your EFBC Conference Registration is Confirmed';
  const priceText = typeof totalPrice === 'number' ? `Total: $${totalPrice.toFixed(2)}` : '';
  const paymentMethod = registration?.paymentMethod || registration?.payment_method || '';
  const squarePaymentId = registration?.squarePaymentId || registration?.square_payment_id || '';
  
  // Format event date as MM/DD/YYYY (remove hours)
  const formattedEventDate = formatDateMMDDYYYY(eventDate);
  
  // Get activity-specific details
  const wednesdayActivity = registration?.wednesdayActivity || registration?.wednesday_activity || '';
  const clubRentals = registration?.clubRentals || registration?.club_rentals || '';
  const golfHandicap = registration?.golfHandicap || registration?.golf_handicap || '';
  const massageTimeSlot = registration?.massageTimeSlot || registration?.massage_time_slot || '';
  const pickleballEquipment = registration?.pickleballEquipment || registration?.pickleball_equipment;
  
  // Get additional fields
  const dietaryRestrictions = registration?.dietaryRestrictions || registration?.dietary_restrictions || '';
  const specialRequests = registration?.specialRequests || registration?.special_requests || '';
  const emergencyContactName = registration?.emergencyContactName || registration?.emergency_contact_name || '';
  const emergencyContactPhone = registration?.emergencyContactPhone || registration?.emergency_contact_phone || '';

  const detailsHtml = registration
    ? `
      <table role="presentation" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px;">
        ${registration.badgeName ? `<tr><td style="color:#6b7280;">Badge Name</td><td><strong>${registration.badgeName}</strong></td></tr>`:''}
        ${registration.email ? `<tr><td style="color:#6b7280;">Email</td><td>${registration.email}</td></tr>`:''}
        ${registration.secondaryEmail ? `<tr><td style="color:#6b7280;">Secondary Email</td><td>${registration.secondaryEmail}</td></tr>`:''}
        ${registration.organization ? `<tr><td style="color:#6b7280;">Organization</td><td>${registration.organization}</td></tr>`:''}
        ${registration.jobTitle ? `<tr><td style="color:#6b7280;">Job Title</td><td>${registration.jobTitle}</td></tr>`:''}
        ${registration.address ? `<tr><td style="color:#6b7280;">Address</td><td>${String(registration.address).replace(/\n/g,'<br/>')}</td></tr>`:''}
        ${registration.mobile ? `<tr><td style="color:#6b7280;">Mobile</td><td>${registration.mobile}</td></tr>`:''}
        ${wednesdayActivity ? `<tr><td style="color:#6b7280;">Selected Activity</td><td>${wednesdayActivity}</td></tr>`:''}
        ${wednesdayActivity && wednesdayActivity.toLowerCase().includes('golf') && golfHandicap ? `<tr><td style="color:#6b7280;">Golf Handicap</td><td>${golfHandicap}</td></tr>`:''}
        ${wednesdayActivity && wednesdayActivity.toLowerCase().includes('golf') && clubRentals ? `<tr><td style="color:#6b7280;">Golf Club Preference</td><td>${clubRentals}</td></tr>`:''}
        ${wednesdayActivity && wednesdayActivity.toLowerCase().includes('massage') && massageTimeSlot ? `<tr><td style="color:#6b7280;">Massage Time Slot</td><td>${massageTimeSlot}</td></tr>`:''}
        ${wednesdayActivity && wednesdayActivity.toLowerCase().includes('pickleball') && pickleballEquipment !== undefined ? `<tr><td style="color:#6b7280;">Pickleball Equipment</td><td>${pickleballEquipment ? 'I will bring my own' : 'I need equipment'}</td></tr>`:''}
        ${registration.tuesdayEarlyReception ? `<tr><td style="color:#6b7280;">Tuesday Early Arrivals Reception</td><td>${registration.tuesdayEarlyReception}</td></tr>`:''}
        ${registration.wednesdayReception ? `<tr><td style="color:#6b7280;">Wednesday Reception</td><td>${registration.wednesdayReception}</td></tr>`:''}
        ${registration.thursdayBreakfast ? `<tr><td style="color:#6b7280;">Thursday Breakfast</td><td>${registration.thursdayBreakfast}</td></tr>`:''}
        ${registration.thursdayLuncheon ? `<tr><td style="color:#6b7280;">Thursday Luncheon</td><td>${registration.thursdayLuncheon}</td></tr>`:''}
        ${registration.thursdayDinner ? `<tr><td style="color:#6b7280;">Thursday Dinner</td><td>${registration.thursdayDinner}</td></tr>`:''}
        ${registration.fridayBreakfast ? `<tr><td style="color:#6b7280;">Friday Breakfast</td><td>${registration.fridayBreakfast}</td></tr>`:''}
        ${dietaryRestrictions ? `<tr><td style="color:#6b7280;">Dietary Restrictions</td><td>${dietaryRestrictions}</td></tr>`:''}
        ${specialRequests ? `<tr><td style="color:#6b7280;">Special Requests</td><td>${specialRequests}</td></tr>`:''}
        ${emergencyContactName || emergencyContactPhone ? `<tr><td style="color:#6b7280;">Emergency Contact</td><td>${emergencyContactName || ''}${emergencyContactName && emergencyContactPhone ? ' - ' : ''}${emergencyContactPhone || ''}</td></tr>`:''}
        ${priceText ? `<tr><td style="color:#6b7280;">Total</td><td><strong>$${Number(totalPrice).toFixed(2)}</strong></td></tr>`:''}
        ${paymentMethod ? `<tr><td style="color:#6b7280;">Payment Method</td><td>${paymentMethod}</td></tr>` : ''}
        ${paymentMethod === 'Card' && squarePaymentId ? `<tr><td style="color:#6b7280;">Square Payment ID</td><td><code>${squarePaymentId}</code></td></tr>` : ''}
      </table>
    `
    : '';
  const html = await renderEmailTemplate({
    subject,
    heading: 'Registration Confirmed',
    preheader: 'Your EFBC Conference registration is confirmed',
    contentHtml: `
      <p style="margin:0 0 12px 0;">Hi ${name || 'Attendee'},</p>
      <p style="margin:0 0 8px 0;">Thank you for registering for the EFBC Conference.</p>
      ${eventName ? `<p style=\"margin:0;\"><strong>Event:</strong> ${eventName}</p>` : ''}
      ${formattedEventDate ? `<p style=\"margin:4px 0 0 0;\"><strong>Date:</strong> ${formattedEventDate}</p>` : ''}
      ${priceText ? `<p style=\"margin:8px 0 0 0;\"><strong>${priceText}</strong></p>` : ''}
      ${detailsHtml}
      
    `,
  });
  const parts: string[] = [];
  parts.push('Thank you for registering for EFBC Conference.');
  if (eventName) parts.push(`Event: ${eventName}.`);
  if (formattedEventDate) parts.push(`Date: ${formattedEventDate}.`);
  if (priceText) parts.push(`${priceText}.`);
  if (paymentMethod) parts.push(`Payment method: ${paymentMethod}.`);
  if (paymentMethod === 'Card' && squarePaymentId) {
    parts.push(`Square payment ID: ${squarePaymentId}.`);
  }
  const text = parts.join(' ').trim();

  await sendMail({ to, subject, text, html });
}

// Email sent when an admin creates a user account on behalf of someone
export async function sendAdminCreatedUserEmail(params: {
  to: string;
  name: string;
  tempPassword: string;
  role?: string;
}): Promise<void> {
  const { to, name, tempPassword, role } = params;
  const brand = (process.env.EMAIL_BRAND || 'EFBC Conference').trim();
  const from = process.env.EMAIL_FROM || 'no-reply@efbc.local';
  const subject = `${brand} account created for you`;
  const loginUrl = (process.env.FRONTEND_URL || 'http://localhost:3000') + '/login';

  const html = await renderEmailTemplate({
    subject,
    heading: 'Your account has been created',
    preheader: `An administrator has created a ${brand} account for you.`,
    contentHtml: `
      <p style="margin:0 0 12px 0;">Hi ${name || 'there'},</p>
      <p style="margin:0 0 8px 0;">An administrator has created an account for you in the ${brand} portal.</p>
      <p style="margin:0 0 8px 0;">You can sign in using the details below:</p>
      <table role="presentation" cellpadding="6" cellspacing="0" style="margin:0 0 8px 0;font-size:14px;">
        <tr>
          <td style="color:#6b7280;">Login URL</td>
          <td><a href="${loginUrl}" style="color:#2563eb;text-decoration:none;">${loginUrl}</a></td>
        </tr>
        <tr>
          <td style="color:#6b7280;">Email</td>
          <td><strong>${to}</strong></td>
        </tr>
        <tr>
          <td style="color:#6b7280;">Temporary password</td>
          <td><strong>${tempPassword}</strong></td>
        </tr>
        ${role ? `<tr><td style="color:#6b7280;">Role</td><td>${role}</td></tr>` : ''}
      </table>
      <p style="margin:8px 0 0 0;">For your security, please sign in and change this password as soon as possible from your profile settings.</p>
    `,
  });

  const text = [
    `Hi ${name || 'there'},`,
    `An administrator has created an account for you in the ${brand} portal.`,
    `Login URL: ${loginUrl}`,
    `Email: ${to}`,
    `Temporary password: ${tempPassword}`,
    `Please sign in and change this password as soon as possible.`,
  ].join('\n');

  await sendMail({ to, subject, text, html });
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const link = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const from = process.env.EMAIL_FROM || 'no-reply@efbc.local';
  const subject = 'Reset your EFBC Conference password';
  const html = await renderEmailTemplate({
    subject,
    heading: 'Reset your password',
    preheader: 'Password reset instructions for your EFBC account',
    contentHtml: `
      <p style="margin:0 0 8px 0;">You requested a password reset for your EFBC account.</p>
      <p style="margin:0;opacity:.85;">This link expires in 1 hour.</p>
    `,
    cta: { label: 'Reset Password', url: link },
    footerHtml: '', 
  });
  const text = `Reset your password: ${link}`;

  await sendMail({ to, subject, text, html });
}
 
// Email to admin when a user submits a cancellation request
export async function sendCancellationRequestAdminEmail(params: {
  registrationId: number;
  userName?: string;
  userEmail?: string;
  eventName?: string;
  reason?: string | null;
}): Promise<void> {
  const brand = (process.env.EMAIL_BRAND || 'EFBC Conference').trim();
  const to =
    process.env.ADMIN_EMAIL ||
    process.env.SUPPORT_EMAIL ||
    process.env.EMAIL_FROM ||
    'admin@example.com';
  const subject = `New cancellation request for ${params.eventName || 'event'} (#${params.registrationId})`;

  const html = await renderEmailTemplate({
    subject,
    heading: 'New cancellation request',
    preheader: 'A user has requested to cancel a registration.',
    contentHtml: `
      <p style="margin:0 0 8px 0;">A new cancellation request has been submitted in the ${brand} portal.</p>
      <table role="presentation" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr>
          <td style="color:#6b7280;">Registration ID</td>
          <td><strong>#${params.registrationId}</strong></td>
        </tr>
        ${params.userName ? `<tr><td style="color:#6b7280;">User</td><td>${params.userName}</td></tr>` : ''}
        ${params.userEmail ? `<tr><td style="color:#6b7280;">Email</td><td>${params.userEmail}</td></tr>` : ''}
        ${params.eventName ? `<tr><td style="color:#6b7280;">Event</td><td>${params.eventName}</td></tr>` : ''}
        ${params.reason ? `<tr><td style="color:#6b7280;">Reason</td><td>${params.reason}</td></tr>` : ''}
      </table>
      <p style="margin:12px 0 0 0;">You can review and approve or reject this request from the admin Cancellation Requests page.</p>
    `,
  });

  const lines: string[] = [];
  lines.push(`New cancellation request in ${brand}.`);
  lines.push(`Registration ID: #${params.registrationId}.`);
  if (params.userName) lines.push(`User: ${params.userName}.`);
  if (params.userEmail) lines.push(`Email: ${params.userEmail}.`);
  if (params.eventName) lines.push(`Event: ${params.eventName}.`);
  if (params.reason) lines.push(`Reason: ${params.reason}.`);
  const text = lines.join(' ');

  await sendMail({ to, subject, text, html });
}

// Email to user when their cancellation is approved or rejected
export async function sendCancellationDecisionEmail(params: {
  to: string;
  userName?: string;
  eventName?: string;
  status: 'approved' | 'rejected';
  reason?: string | null;
  adminNote?: string | null;
}): Promise<void> {
  const brand = (process.env.EMAIL_BRAND || 'EFBC Conference').trim();
  const subject =
    params.status === 'approved'
      ? 'Your registration cancellation has been approved'
      : 'Your registration cancellation has been reviewed';

  const statusText = params.status === 'approved' ? 'approved' : 'not approved';

  const html = await renderEmailTemplate({
    subject,
    heading: 'Cancellation request update',
    preheader: `Your cancellation request has been ${statusText}.`,
    contentHtml: `
      <p style="margin:0 0 12px 0;">Hi ${params.userName || 'there'},</p>
      <p style="margin:0 0 8px 0;">This is an update regarding your recent request to cancel your registration${params.eventName ? ` for <strong>${params.eventName}</strong>` : ''}.</p>
      <p style="margin:0 0 8px 0;">Status: <strong style="text-transform:capitalize;">${statusText}</strong></p>
      ${
        params.reason
          ? `<p style="margin:0 0 8px 0;">Your original reason for cancellation:</p>
             <p style="margin:0 0 8px 0;white-space:pre-line;">${params.reason}</p>`
          : ''
      }
      ${
        params.adminNote
          ? `<p style="margin:0 0 8px 0;">Admin note:</p>
             <p style="margin:0 0 8px 0;white-space:pre-line;">${params.adminNote}</p>`
          : ''
      }
      <p style="margin:12px 0 0 0;">If you have any questions, please contact the conference organizers.</p>
    `,
  });

  const lines: string[] = [];
  lines.push(`Your cancellation request has been ${statusText}.`);
  if (params.eventName) lines.push(`Event: ${params.eventName}.`);
  if (params.reason) lines.push(`Your reason: ${params.reason}.`);
  if (params.adminNote) lines.push(`Admin note: ${params.adminNote}.`);
  const text = lines.join(' ');

  await sendMail({ to: params.to, subject, text, html });
}

// Email to user when a previously cancelled registration is restored
export async function sendRegistrationRestoredEmail(params: {
  to: string;
  userName?: string;
  eventName?: string;
}): Promise<void> {
  const brand = (process.env.EMAIL_BRAND || 'EFBC Conference').trim();
  const subject = 'Your registration has been restored';

  const html = await renderEmailTemplate({
    subject,
    heading: 'Registration restored',
    preheader: 'Your conference registration has been restored.',
    contentHtml: `
      <p style="margin:0 0 12px 0;">Hi ${params.userName || 'there'},</p>
      <p style="margin:0 0 8px 0;">Good news! Your registration${params.eventName ? ` for <strong>${params.eventName}</strong>` : ''} has been restored.</p>
      <p style="margin:0 0 8px 0;">You are once again listed as an active attendee for this event.</p>
      <p style="margin:12px 0 0 0;">If you have any questions or need to make changes to your registration, you can log in to the portal at any time.</p>
    `,
  });

  const lines: string[] = [];
  lines.push('Your registration has been restored.');
  if (params.eventName) lines.push(`Event: ${params.eventName}.`);
  const text = lines.join(' ');

  await sendMail({ to: params.to, subject, text, html });
}

