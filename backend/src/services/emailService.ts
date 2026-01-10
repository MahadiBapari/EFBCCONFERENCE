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

// Helper function to get admin email
const getAdminEmail = (): string | null => {
  return process.env.ADMIN_NOTIFY_EMAIL || 
         process.env.ADMIN_EMAIL || 
         process.env.SUPPORT_EMAIL || 
         'planner@efbcconference.org';
};

// Generic send helper with HTTP API fallback (Resend)
type MailPayload = { to: string; subject: string; text: string; html: string };

// Spam-triggering words and phrases to avoid in subject lines
const SPAM_TRIGGER_WORDS = [
  'free', 'act now', 'limited time', 'urgent', 'click here', 'winner', 
  'congratulations', 'guaranteed', 'no risk', 'special promotion', 
  'exclusive offer', 'buy now', 'order now', 'deal', 'discount', 'save',
  'win', 'prize', 'cash', 'money', '$$$', '!!!', 'asap', 'limited offer',
  'one time', 'once in a lifetime', 'risk free', 'no obligation',
  'act immediately', 'call now', 'order today', 'buy today', 'sale',
  'clearance', 'lowest price', 'best price', 'cheap', 'affordable',
  'amazing', 'incredible', 'unbelievable', 'shocking', 'secret',
  'hidden', 'exclusive', 'private', 'insider', 'members only'
];

// Sanitize subject line to avoid spam triggers
const sanitizeSubjectLine = (subject: string): string => {
  let sanitized = subject.trim();
  
  // Convert to lowercase for comparison (but preserve original case structure)
  const lowerSubject = sanitized.toLowerCase();
  
  // Check for spam-triggering words and replace with professional alternatives
  SPAM_TRIGGER_WORDS.forEach(spamWord => {
    const regex = new RegExp(`\\b${spamWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    if (regex.test(lowerSubject)) {
      // Replace with professional alternatives
      const replacements: Record<string, string> = {
        'free': 'complimentary',
        'act now': 'please review',
        'urgent': 'important',
        'click here': 'view details',
        'winner': 'selected',
        'congratulations': 'thank you',
        'guaranteed': 'confirmed',
        'special promotion': 'information',
        'exclusive offer': 'details',
        'buy now': 'register',
        'order now': 'register',
        'deal': 'information',
        'discount': 'pricing',
        'save': 'information',
        'win': 'selected',
        'prize': 'award',
        'cash': 'payment',
        'money': 'payment',
        'sale': 'information',
        'amazing': 'important',
        'incredible': 'important',
        'unbelievable': 'important',
        'shocking': 'important',
        'secret': 'information',
        'hidden': 'additional',
        'exclusive': 'important',
        'private': 'personal',
        'insider': 'important',
        'members only': 'for attendees'
      };
      
      const replacement = replacements[spamWord.toLowerCase()] || 'information';
      sanitized = sanitized.replace(regex, replacement);
    }
  });
  
  // Remove excessive capitalization (more than 3 consecutive uppercase letters)
  // But preserve common acronyms like EFBC
  sanitized = sanitized.replace(/([A-Z]{4,})/g, (match) => {
    // Preserve EFBC and other common acronyms
    const commonAcronyms = ['EFBC', 'API', 'HTTP', 'HTTPS', 'SMTP', 'URL', 'PDF', 'HTML', 'CSS', 'JS', 'JSON', 'XML'];
    if (commonAcronyms.includes(match)) {
      return match;
    }
    return match.charAt(0) + match.slice(1).toLowerCase();
  });
  
  // Remove excessive punctuation (more than 1 exclamation or question mark)
  sanitized = sanitized.replace(/[!?]{2,}/g, (match) => match.charAt(0));
  
  // Remove multiple spaces
  sanitized = sanitized.replace(/\s+/g, ' ');
  
  // Ensure proper capitalization (first letter uppercase, rest sentence case)
  sanitized = sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
  
  // Limit subject line length (recommended max 50 characters for best deliverability)
  if (sanitized.length > 60) {
    sanitized = sanitized.substring(0, 57) + '...';
  }
  
  return sanitized.trim();
};

const sendUsingTransporter = async (payload: MailPayload): Promise<void> => {
  if (!transporter) throw new Error('No SMTP transporter');
  if (!smtpVerifiedLogged) {
    try {
      await transporter.verify();
      console.log('SMTP OK - transporter verified');
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message || String(e);
      console.error('SMTP FAIL -', msg);
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

// Internal function to actually send email (used by queue)
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
  console.warn('No email transport available (SMTP or RESEND_API_KEY). Email not sent.');
  throw new Error('No email transport available');
};

// Email Queue System
interface QueuedEmail {
  payload: MailPayload;
  retries: number;
  maxRetries: number;
  id: string;
}

class EmailQueue {
  private queue: QueuedEmail[] = [];
  private processing: boolean = false;
  private readonly delayBetweenEmails = 800; // 800ms = 1.25 req/sec, well under 2 req/sec limit for Resend

  // Add email to queue
  enqueue(payload: MailPayload, maxRetries: number = 3): void {
    const id = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    this.queue.push({
      payload,
      retries: 0,
      maxRetries,
      id
    });
    console.log(`[EMAIL QUEUE] Email queued for ${payload.to}. Queue length: ${this.queue.length}`);
    
    // Start processing if not already processing
    if (!this.processing) {
      this.processQueue();
    }
  }

  // Process queue sequentially
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const email = this.queue.shift();
      if (!email) break;

      try {
        console.log(`[EMAIL QUEUE] Processing email ${email.id} to ${email.payload.to} (attempt ${email.retries + 1}/${email.maxRetries + 1})`);
        await sendMail(email.payload);
        console.log(`[EMAIL QUEUE] Successfully sent email ${email.id} to ${email.payload.to}`);
      } catch (error: any) {
        email.retries++;
        const errorMsg = error?.message || String(error);
        console.error(`[EMAIL QUEUE] Failed to send email ${email.id} to ${email.payload.to} (attempt ${email.retries}/${email.maxRetries + 1}):`, errorMsg);

        // Check if it's a rate limit error (429) from Resend
        const isRateLimit = errorMsg.includes('429') || 
                           errorMsg.includes('rate_limit') || 
                           errorMsg.includes('rate_limit_exceeded') ||
                           errorMsg.includes('Too many requests');

        if (email.retries <= email.maxRetries) {
          // For rate limit errors, use longer backoff to respect Resend's 2 req/sec limit
          // For other errors, use exponential backoff
          const retryDelay = isRateLimit 
            ? 5000 + (email.retries * 2000) // 5s, 7s, 9s for rate limits (gives time for rate limit to reset)
            : Math.min(1000 * email.retries, 5000); // 1s, 2s, 3s, max 5s for other errors
          
          console.log(`[EMAIL QUEUE] Retrying email ${email.id} in ${retryDelay}ms...${isRateLimit ? ' (rate limit detected)' : ''}`);
          setTimeout(() => {
            this.queue.unshift(email); // Add to front of queue for retry
            if (!this.processing) {
              this.processQueue();
            }
          }, retryDelay);
        } else {
          // Max retries exceeded
          console.error(`[EMAIL QUEUE] Max retries exceeded for email ${email.id} to ${email.payload.to}. Email will not be sent.`);
        }
      }

      // Add delay between emails to respect rate limits (except for last email)
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.delayBetweenEmails));
      }
    }

    this.processing = false;
    if (this.queue.length > 0) {
      // More emails were added while processing, continue
      this.processQueue();
    }
  }

  // Get queue status
  getStatus(): { queueLength: number; processing: boolean } {
    return {
      queueLength: this.queue.length,
      processing: this.processing
    };
  }
}

// Create singleton queue instance
const emailQueue = new EmailQueue();

// Public function to queue email for sending
export const queueEmail = (payload: MailPayload, maxRetries: number = 3): void => {
  // Sanitize subject line before queuing to avoid spam triggers
  const sanitizedPayload = {
    ...payload,
    subject: sanitizeSubjectLine(payload.subject)
  };
  emailQueue.enqueue(sanitizedPayload, maxRetries);
};

// Get queue status (for monitoring)
export const getEmailQueueStatus = () => emailQueue.getStatus();

// Helper to send email to user and also send a copy to admin (using queue)
const sendMailWithAdminCopy = async (payload: MailPayload, sendAdminCopy: boolean = true): Promise<void> => {
  // Queue primary recipient email
  emailQueue.enqueue(payload);
  
  // Queue admin copy if requested and admin email is different from recipient
  if (sendAdminCopy) {
    const adminEmail = getAdminEmail();
    if (adminEmail && adminEmail !== payload.to) {
      emailQueue.enqueue({ ...payload, to: adminEmail });
    }
  }
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
  // Use provided footerHtml or fetch from database (default to dynamic footer)
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
  const logoUrl = `${frontendUrl}/EFBClogoemail.png`;
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
  // Use BACKEND_URL for the API endpoint (where the verification endpoint is)
  // The backend will then redirect to FRONTEND_URL after verification
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || '5000'}`;
  // Ensure token is properly encoded (only encode once)
  const encodedToken = encodeURIComponent(token);
  const verifyPath = `/api/auth/verify-email?token=${encodedToken}`;
  const link = `${backendUrl}${verifyPath}`;
  
  // Log token and link for debugging (first 10 chars only for security)
  console.log(`[EMAIL] Sending verification email to ${to} with token prefix: ${token.substring(0, 10)}...`);
  console.log(`[EMAIL] Verification link: ${backendUrl}${verifyPath.substring(0, 50)}...`);

  const from = process.env.EMAIL_FROM || 'no-reply@efbc.local';
  const subject = sanitizeSubjectLine('Verify your email address');
  const html = await renderEmailTemplate({
    subject,
    heading: 'Verify your email',
    preheader: 'Confirm your email to finish setting up your account',
    contentHtml: `
      <p style="margin:0 0 12px 0;">Welcome to the EFBC Conference! Please confirm your email address to activate your account.</p>
      <p style="margin:0;opacity:.8;">This link expires in 30 minutes.</p>
    `,
    cta: { label: 'Verify Email', url: link },
    footerHtml: '', // No custom footer for verification emails
  });
  const text = `Verify your email: ${link}`;

  queueEmail({ to, subject, text, html });
  // Note: Verification emails don't need admin copy
}

// Email sent when user's email is successfully verified
export async function sendVerificationCompleteEmail(to: string, userName?: string): Promise<void> {
  const from = process.env.EMAIL_FROM || 'no-reply@efbc.local';
  const subject = sanitizeSubjectLine('Email verification complete');
  const loginUrl = (process.env.FRONTEND_URL || 'http://localhost:3000') + '/login';
  
  const html = await renderEmailTemplate({
    subject,
    heading: 'Email verified successfully',
    preheader: 'Your email address has been verified. You can now access your account.',
    contentHtml: `
      <p style="margin:0 0 12px 0;">Hi ${userName || 'there'},</p>
      <p style="margin:0 0 8px 0;">Your email address has been successfully verified.</p>
      <p style="margin:0 0 8px 0;">You can now sign in to your EFBC Conference account</p>
    `,
    cta: { label: 'Sign In', url: loginUrl },
    footerHtml: '', // No custom footer for verification complete emails
  });
  
  const text = [
    `Hi ${userName || 'there'},`,
    'Your email address has been successfully verified.',
    'You can now sign in to your EFBC Conference account.',
    `Sign in: ${loginUrl}`
  ].join('\n');

  queueEmail({ to, subject, text, html });
  // Note: Verification complete emails don't need admin copy
}

// Helper function to format date range as "12 to 15 May" or "DD Month to DD Month"
// Helper function to format date/time in Eastern Time (EST/EDT)
const formatDateInEST = (dateString: string | Date): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleString('en-US', {
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
};

const formatEventDateRange = (startDate?: string | null, endDate?: string | null): string => {
  if (!startDate && !endDate) return '';
  if (startDate && !endDate) {
    // Single date - format as "DD Month"
    try {
      const date = new Date(startDate);
      if (isNaN(date.getTime())) return startDate;
      const day = date.getDate();
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December'];
      return `${day} ${monthNames[date.getMonth()]}`;
    } catch {
      return startDate;
    }
  }
  if (!startDate && endDate) {
    // Only end date
    try {
      const date = new Date(endDate);
      if (isNaN(date.getTime())) return endDate;
      const day = date.getDate();
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December'];
      return `${day} ${monthNames[date.getMonth()]}`;
    } catch {
      return endDate;
    }
  }
  // Both dates - format as "DD to DD Month" or "DD Month to DD Month" if different months
  try {
    const start = new Date(startDate!);
    const end = new Date(endDate!);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return `${startDate} to ${endDate}`;
    }
    const startDay = start.getDate();
    const endDay = end.getDate();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const startMonth = start.getMonth();
    const endMonth = end.getMonth();
    
    if (startMonth === endMonth) {
      // Same month: "12 to 15 May"
      return `${startDay} to ${endDay} ${monthNames[startMonth]}`;
    } else {
      // Different months: "30 April to 2 May"
      return `${startDay} ${monthNames[startMonth]} to ${endDay} ${monthNames[endMonth]}`;
    }
  } catch {
    return `${startDate} to ${endDate}`;
  }
};

//Registration confirmation email
export async function sendRegistrationConfirmationEmail(params: {
  to: string;
  name: string;
  eventName?: string;
  eventDate?: string;
  eventStartDate?: string; // Add this parameter for date range formatting
  totalPrice?: number;
  registration?: any; // optional full registration to include details in email
}): Promise<void> {
  const { to, name, eventName, eventDate, eventStartDate, totalPrice, registration } = params;
  const from = process.env.EMAIL_FROM || 'no-reply@efbc.local';
  const subject = sanitizeSubjectLine('Your EFBC Conference Registration is Confirmed');
  
  // Get totalPrice from params or registration object, convert to number
  const paymentAmount = totalPrice !== undefined && totalPrice !== null 
    ? Number(totalPrice) 
    : (registration?.totalPrice !== undefined && registration?.totalPrice !== null 
        ? Number(registration.totalPrice) 
        : (registration?.total_price !== undefined && registration?.total_price !== null 
            ? Number(registration.total_price) 
            : 0));
  
  const priceText = paymentAmount > 0 ? `Total: $${paymentAmount.toFixed(2)}` : '';
  const paymentMethod = registration?.paymentMethod || registration?.payment_method || '';
  const squarePaymentId = registration?.squarePaymentId || registration?.square_payment_id || '';
  
  // Calculate convenience fee (3.5% for card payments) and total with fee
  const isCardPayment = paymentMethod === 'Card';
  const convenienceFee = isCardPayment && paymentAmount > 0 ? paymentAmount * 0.035 : 0;
  const totalWithFee = paymentAmount + convenienceFee;
  
  // Format event date range as "12 to 15 May"
  const formattedEventDate = formatEventDateRange(eventStartDate || null, eventDate || null);
  
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
  
  // Get missing fields
  const isFirstTimeAttending = registration?.isFirstTimeAttending !== undefined 
    ? registration.isFirstTimeAttending 
    : (registration?.is_first_time_attending !== undefined 
        ? registration.is_first_time_attending 
        : null);
  const companyType = registration?.companyType || registration?.company_type || '';
  const companyTypeOther = registration?.companyTypeOther || registration?.company_type_other || '';
  const officePhone = registration?.officePhone || registration?.office_phone || '';
  
  // Get full name
  const firstName = registration?.firstName || registration?.first_name || '';
  const lastName = registration?.lastName || registration?.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim();
  
  // Get separate address fields
  const addressStreet = registration?.addressStreet || registration?.address_street || '';
  const city = registration?.city || '';
  const state = registration?.state || '';
  const zipCode = registration?.zipCode || registration?.zip_code || '';
  const country = registration?.country || '';
  
  // Get spouse information
  const spouseFirstName = registration?.spouseFirstName || registration?.spouse_first_name || '';
  const spouseLastName = registration?.spouseLastName || registration?.spouse_last_name || '';
  const spouseDinnerTicket = registration?.spouseDinnerTicket !== undefined 
    ? registration.spouseDinnerTicket 
    : (registration?.spouse_dinner_ticket !== undefined ? registration.spouse_dinner_ticket : false);
  
  // Get children information
  const kids = registration?.kids || (registration?.kids_data ? (typeof registration.kids_data === 'string' ? JSON.parse(registration.kids_data) : registration.kids_data) : []);

  const detailsHtml = registration
    ? `
      <table role="presentation" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px;">
        ${fullName ? `<tr><td style="color:#6b7280;">Name</td><td><strong>${fullName}</strong></td></tr>`:''}
        ${registration.badgeName ? `<tr><td style="color:#6b7280;">Badge Name</td><td><strong>${registration.badgeName}</strong></td></tr>`:''}
        ${registration.email ? `<tr><td style="color:#6b7280;">Email</td><td>${registration.email}</td></tr>`:''}
        ${registration.secondaryEmail ? `<tr><td style="color:#6b7280;">Secondary Email</td><td>${registration.secondaryEmail}</td></tr>`:''}
        ${registration.organization ? `<tr><td style="color:#6b7280;">Organization</td><td>${registration.organization}</td></tr>`:''}
        ${registration.jobTitle ? `<tr><td style="color:#6b7280;">Job Title</td><td>${registration.jobTitle}</td></tr>`:''}
        ${addressStreet || registration.address ? `<tr><td style="color:#6b7280;">Address</td><td>${addressStreet || String(registration.address || '').replace(/\n/g,'<br/>')}</td></tr>`:''}
        ${city ? `<tr><td style="color:#6b7280;">City</td><td>${city}</td></tr>`:''}
        ${state ? `<tr><td style="color:#6b7280;">State</td><td>${state}</td></tr>`:''}
        ${zipCode ? `<tr><td style="color:#6b7280;">Zip Code</td><td>${zipCode}</td></tr>`:''}
        ${country ? `<tr><td style="color:#6b7280;">Country</td><td>${country}</td></tr>`:''}
        ${registration.mobile ? `<tr><td style="color:#6b7280;">Mobile</td><td>${registration.mobile}</td></tr>`:''}
        ${officePhone ? `<tr><td style="color:#6b7280;">Office Phone</td><td>${officePhone}</td></tr>`:''}
        ${isFirstTimeAttending !== null ? `<tr><td style="color:#6b7280;">First Time Attending?</td><td>${isFirstTimeAttending ? 'Yes' : 'No'}</td></tr>`:''}
        ${companyType ? `<tr><td style="color:#6b7280;">Company Type</td><td>${companyType}</td></tr>`:''}
        ${companyTypeOther ? `<tr><td style="color:#6b7280;">Company Type (Other)</td><td>${companyTypeOther}</td></tr>`:''}
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
        ${emergencyContactName ? `<tr><td style="color:#6b7280;">Emergency Contact Name</td><td>${emergencyContactName}</td></tr>`:''}
        ${emergencyContactPhone ? `<tr><td style="color:#6b7280;">Emergency Contact Phone</td><td>${emergencyContactPhone}</td></tr>`:''}
        ${spouseDinnerTicket ? `<tr><td style="color:#6b7280;padding-top:12px;" colspan="2"><strong>Spouse/Guest Information</strong></td></tr>`:''}
        ${spouseDinnerTicket ? `<tr><td style="color:#6b7280;">Spouse Dinner Ticket</td><td>Yes</td></tr>`:''}
        ${spouseFirstName ? `<tr><td style="color:#6b7280;">Spouse First Name</td><td>${spouseFirstName}</td></tr>`:''}
        ${spouseLastName ? `<tr><td style="color:#6b7280;">Spouse Last Name</td><td>${spouseLastName}</td></tr>`:''}
        ${kids && Array.isArray(kids) && kids.length > 0 ? `<tr><td style="color:#6b7280;padding-top:12px;" colspan="2"><strong>Child/Children Information</strong></td></tr>`:''}
        ${kids && Array.isArray(kids) && kids.length > 0 ? kids.map((kid: any, idx: number) => `
          <tr><td style="color:#6b7280;padding-top:${idx === 0 ? '0' : '8'}px;" colspan="2"><strong>Child ${idx + 1}</strong></td></tr>
          ${kid.firstName ? `<tr><td style="color:#6b7280;">First Name</td><td>${kid.firstName}</td></tr>`:''}
          ${kid.lastName ? `<tr><td style="color:#6b7280;">Last Name</td><td>${kid.lastName}</td></tr>`:''}
          ${kid.badgeName ? `<tr><td style="color:#6b7280;">Badge Name</td><td>${kid.badgeName}</td></tr>`:''}
          ${kid.age ? `<tr><td style="color:#6b7280;">Age</td><td>${kid.age}</td></tr>`:''}
        `).join('') : ''}
        ${paymentAmount > 0 ? `<tr><td style="color:#6b7280;padding-top:12px;" colspan="2"><strong>Payment Information</strong></td></tr>`:''}
        ${paymentAmount > 0 ? `<tr><td style="color:#6b7280;">Total Payment Amount</td><td><strong style="color:#111827;font-size:16px;">$${totalWithFee.toFixed(2)}</strong></td></tr>`:''}
        ${paymentMethod ? `<tr><td style="color:#6b7280;">Payment Method</td><td>${paymentMethod}</td></tr>` : ''}
        ${paymentMethod === 'Card' && squarePaymentId ? `<tr><td style="color:#6b7280;">Square Payment ID</td><td><code>${squarePaymentId}</code></td></tr>` : ''}
        ${paymentMethod === 'Card' && registration?.spousePaymentId ? `<tr><td style="color:#6b7280;">Spouse Payment ID</td><td><code>${registration.spousePaymentId}</code></td></tr>` : ''}
        ${paymentMethod === 'Card' && registration?.paid && (registration?.paidAt || registration?.createdAt || registration?.created_at) ? `<tr><td style="color:#6b7280;">Payment Date/Time (EST)</td><td>${formatDateInEST(registration.paidAt || registration.createdAt || registration.created_at)}</td></tr>` : ''}
        ${registration?.spousePaymentId && (registration?.spousePaidAt || registration?.createdAt || registration?.created_at) ? `<tr><td style="color:#6b7280;">Spouse Payment Date/Time (EST)</td><td>${formatDateInEST(registration.spousePaidAt || registration.createdAt || registration.created_at)}</td></tr>` : ''}
      </table>
    `
    : '';
  const html = await renderEmailTemplate({
    subject,
    heading: 'Registration Confirmed',
    preheader: 'Your EFBC Conference registration is confirmed',
    contentHtml: `
      <p style="margin:0 0 12px 0;">Hi ${fullName || 'Attendee'},</p>
      <p style="margin:0 0 8px 0;">Thank you for registering for the EFBC Conference.</p>
      ${eventName ? `<p style=\"margin:0;\"><strong>Event:</strong> ${eventName}</p>` : ''}
      ${formattedEventDate ? `<p style=\"margin:4px 0 0 0;\"><strong>Date:</strong> ${formattedEventDate}</p>` : ''}
      ${paymentAmount > 0 ? `<p style=\"margin:12px 0 8px 0;padding:12px;background:#f0f9ff;border-left:4px solidrgba(59, 131, 246, 0);border-radius:4px;\"><strong style=\"color:#111827;font-size:16px;\">Total Payment Amount: $${totalWithFee.toFixed(2)}</strong></p>` : ''}
      ${detailsHtml}
      ${paymentMethod === 'Check' ? `
        <div style="margin:20px 0;padding:16px;background:#f9fafb;border-left:4px solidrgba(59, 131, 246, 0);border-radius:4px;">
          <p style="margin:0;color:#374151;">Please mail check prior to deadline to:</p>
          <p style="margin:8px 0 0 0;color:#111827;font-weight:500;">
            EFBC Conference Inc<br/>
            127 Low Country Lane<br/>
            The Woodlands, TX 77380, USA
          </p>
        </div>
      ` : ''}
      
    `,
  });
  const parts: string[] = [];
  parts.push('Thank you for registering for EFBC Conference.');
  if (eventName) parts.push(`Event: ${eventName}.`);
  if (formattedEventDate) parts.push(`Date: ${formattedEventDate}.`);
  if (paymentAmount > 0) {
    parts.push(`Total Payment Amount: $${totalWithFee.toFixed(2)}.`);
  }
  if (paymentMethod) parts.push(`Payment method: ${paymentMethod}.`);
  if (paymentMethod === 'Card' && squarePaymentId) {
    parts.push(`Square payment ID: ${squarePaymentId}.`);
  }
  if (paymentMethod === 'Check') {
    parts.push('\n\nIf you prefer by check, please mail check prior to deadline to:\nEFBC Conference Inc\n127 Low Country Lane\nThe Woodlands, TX 77380, USA');
  }
  const text = parts.join(' ').trim();

  // Send to user (admin copy will be handled by the caller if needed)
  queueEmail({ to, subject, text, html });
}

export async function sendRegistrationUpdateEmail(params: {
  to: string;
  name: string;
  eventName?: string;
  eventDate?: string;
  eventStartDate?: string;
  totalPrice?: number;
  registration?: any;
}): Promise<void> {
  const { to, name, eventName, eventDate, eventStartDate, totalPrice, registration } = params;
  const from = process.env.EMAIL_FROM || 'no-reply@efbc.local';
  const subject = sanitizeSubjectLine('Your EFBC Conference registration has been updated');
  
  // Get totalPrice from params or registration object, convert to number
  const paymentAmount = totalPrice !== undefined && totalPrice !== null 
    ? Number(totalPrice) 
    : (registration?.totalPrice !== undefined && registration?.totalPrice !== null 
        ? Number(registration.totalPrice) 
        : (registration?.total_price !== undefined && registration?.total_price !== null 
            ? Number(registration.total_price) 
            : 0));
  
  const priceText = paymentAmount > 0 ? `Total: $${paymentAmount.toFixed(2)}` : '';
  const paymentMethod = registration?.paymentMethod || registration?.payment_method || '';
  const squarePaymentId = registration?.squarePaymentId || registration?.square_payment_id || '';
  
  // Calculate convenience fee (3.5% for card payments) and total with fee
  const isCardPayment = paymentMethod === 'Card';
  const convenienceFee = isCardPayment && paymentAmount > 0 ? paymentAmount * 0.035 : 0;
  const totalWithFee = paymentAmount + convenienceFee;
  
  // Format event date range as "12 to 15 May"
  const formattedEventDate = formatEventDateRange(eventStartDate || null, eventDate || null);
  
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
  
  // Get missing fields
  const isFirstTimeAttending = registration?.isFirstTimeAttending !== undefined 
    ? registration.isFirstTimeAttending 
    : (registration?.is_first_time_attending !== undefined 
        ? registration.is_first_time_attending 
        : null);
  const companyType = registration?.companyType || registration?.company_type || '';
  const companyTypeOther = registration?.companyTypeOther || registration?.company_type_other || '';
  const officePhone = registration?.officePhone || registration?.office_phone || '';
  
  // Get full name
  const firstName = registration?.firstName || registration?.first_name || '';
  const lastName = registration?.lastName || registration?.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim();
  
  // Get separate address fields
  const addressStreet = registration?.addressStreet || registration?.address_street || '';
  const city = registration?.city || '';
  const state = registration?.state || '';
  const zipCode = registration?.zipCode || registration?.zip_code || '';
  const country = registration?.country || '';
  
  // Get spouse information
  const spouseFirstName = registration?.spouseFirstName || registration?.spouse_first_name || '';
  const spouseLastName = registration?.spouseLastName || registration?.spouse_last_name || '';
  const spouseDinnerTicket = registration?.spouseDinnerTicket !== undefined 
    ? registration.spouseDinnerTicket 
    : (registration?.spouse_dinner_ticket !== undefined ? registration.spouse_dinner_ticket : false);
  
  // Get children information
  const kids = registration?.kids || (registration?.kids_data ? (typeof registration.kids_data === 'string' ? JSON.parse(registration.kids_data) : registration.kids_data) : []);

  const detailsHtml = registration
    ? `
      <table role="presentation" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px;">
        ${fullName ? `<tr><td style="color:#6b7280;">Full Name</td><td><strong>${fullName}</strong></td></tr>`:''}
        ${registration.badgeName ? `<tr><td style="color:#6b7280;">Badge Name</td><td><strong>${registration.badgeName}</strong></td></tr>`:''}
        ${registration.email ? `<tr><td style="color:#6b7280;">Email</td><td>${registration.email}</td></tr>`:''}
        ${registration.secondaryEmail ? `<tr><td style="color:#6b7280;">Secondary Email</td><td>${registration.secondaryEmail}</td></tr>`:''}
        ${registration.organization ? `<tr><td style="color:#6b7280;">Organization</td><td>${registration.organization}</td></tr>`:''}
        ${registration.jobTitle ? `<tr><td style="color:#6b7280;">Job Title</td><td>${registration.jobTitle}</td></tr>`:''}
        ${addressStreet || registration.address ? `<tr><td style="color:#6b7280;">Address</td><td>${addressStreet || String(registration.address || '').replace(/\n/g,'<br/>')}</td></tr>`:''}
        ${city ? `<tr><td style="color:#6b7280;">City</td><td>${city}</td></tr>`:''}
        ${state ? `<tr><td style="color:#6b7280;">State</td><td>${state}</td></tr>`:''}
        ${zipCode ? `<tr><td style="color:#6b7280;">Zip Code</td><td>${zipCode}</td></tr>`:''}
        ${country ? `<tr><td style="color:#6b7280;">Country</td><td>${country}</td></tr>`:''}
        ${registration.mobile ? `<tr><td style="color:#6b7280;">Mobile</td><td>${registration.mobile}</td></tr>`:''}
        ${officePhone ? `<tr><td style="color:#6b7280;">Office Phone</td><td>${officePhone}</td></tr>`:''}
        ${isFirstTimeAttending !== null ? `<tr><td style="color:#6b7280;">First Time Attending?</td><td>${isFirstTimeAttending ? 'Yes' : 'No'}</td></tr>`:''}
        ${companyType ? `<tr><td style="color:#6b7280;">Company Type</td><td>${companyType}</td></tr>`:''}
        ${companyTypeOther ? `<tr><td style="color:#6b7280;">Company Type (Other)</td><td>${companyTypeOther}</td></tr>`:''}
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
        ${emergencyContactName ? `<tr><td style="color:#6b7280;">Emergency Contact Name</td><td>${emergencyContactName}</td></tr>`:''}
        ${emergencyContactPhone ? `<tr><td style="color:#6b7280;">Emergency Contact Phone</td><td>${emergencyContactPhone}</td></tr>`:''}
        ${spouseDinnerTicket ? `<tr><td style="color:#6b7280;padding-top:12px;" colspan="2"><strong>Spouse/Guest Information</strong></td></tr>`:''}
        ${spouseDinnerTicket ? `<tr><td style="color:#6b7280;">Spouse Dinner Ticket</td><td>Yes</td></tr>`:''}
        ${spouseFirstName ? `<tr><td style="color:#6b7280;">Spouse First Name</td><td>${spouseFirstName}</td></tr>`:''}
        ${spouseLastName ? `<tr><td style="color:#6b7280;">Spouse Last Name</td><td>${spouseLastName}</td></tr>`:''}
        ${kids && Array.isArray(kids) && kids.length > 0 ? `<tr><td style="color:#6b7280;padding-top:12px;" colspan="2"><strong>Child/Children Information</strong></td></tr>`:''}
        ${kids && Array.isArray(kids) && kids.length > 0 ? kids.map((kid: any, idx: number) => `
          <tr><td style="color:#6b7280;padding-top:${idx === 0 ? '0' : '8'}px;" colspan="2"><strong>Child ${idx + 1}</strong></td></tr>
          ${kid.firstName ? `<tr><td style="color:#6b7280;">First Name</td><td>${kid.firstName}</td></tr>`:''}
          ${kid.lastName ? `<tr><td style="color:#6b7280;">Last Name</td><td>${kid.lastName}</td></tr>`:''}
          ${kid.badgeName ? `<tr><td style="color:#6b7280;">Badge Name</td><td>${kid.badgeName}</td></tr>`:''}
          ${kid.age ? `<tr><td style="color:#6b7280;">Age</td><td>${kid.age}</td></tr>`:''}
        `).join('') : ''}
        ${paymentAmount > 0 ? `<tr><td style="color:#6b7280;padding-top:12px;" colspan="2"><strong>Payment Information</strong></td></tr>`:''}
        ${paymentAmount > 0 ? `<tr><td style="color:#6b7280;">Total Payment Amount</td><td><strong style="color:#111827;font-size:16px;">$${totalWithFee.toFixed(2)}</strong></td></tr>`:''}
        ${paymentMethod ? `<tr><td style="color:#6b7280;">Payment Method</td><td>${paymentMethod}</td></tr>` : ''}
        ${paymentMethod === 'Card' && squarePaymentId ? `<tr><td style="color:#6b7280;">Square Payment ID</td><td><code>${squarePaymentId}</code></td></tr>` : ''}
        ${paymentMethod === 'Card' && registration?.spousePaymentId ? `<tr><td style="color:#6b7280;">Spouse Payment ID</td><td><code>${registration.spousePaymentId}</code></td></tr>` : ''}
        ${paymentMethod === 'Card' && registration?.paid && (registration?.paidAt || registration?.createdAt || registration?.created_at) ? `<tr><td style="color:#6b7280;">Payment Date/Time (EST)</td><td>${formatDateInEST(registration.paidAt || registration.createdAt || registration.created_at)}</td></tr>` : ''}
        ${registration?.spousePaymentId && (registration?.spousePaidAt || registration?.createdAt || registration?.created_at) ? `<tr><td style="color:#6b7280;">Spouse Payment Date/Time (EST)</td><td>${formatDateInEST(registration.spousePaidAt || registration.createdAt || registration.created_at)}</td></tr>` : ''}
      </table>
    `
    : '';
  const html = await renderEmailTemplate({
    subject,
    heading: 'Registration Updated',
    preheader: 'Your EFBC Conference registration has been updated',
    contentHtml: `
      <p style="margin:0 0 12px 0;">Hi ${fullName || 'Attendee'},</p>
      ${eventName ? `<p style=\"margin:0;\"><strong>Event:</strong> ${eventName}</p>` : ''}
      ${formattedEventDate ? `<p style=\"margin:4px 0 0 0;\"><strong>Date:</strong> ${formattedEventDate}</p>` : ''}
      ${paymentAmount > 0 ? `<p style=\"margin:12px 0 8px 0;padding:12px;background:#f0f9ff;border-left:4px solidrgba(59, 131, 246, 0);border-radius:4px;\"><strong style=\"color:#111827;font-size:16px;\">Total Payment Amount: $${totalWithFee.toFixed(2)}</strong></p>` : ''}
      ${detailsHtml}
      ${paymentMethod === 'Check' ? `
        <div style="margin:20px 0;padding:16px;background:#f9fafb;border-left:4px solidrgba(59, 131, 246, 0);border-radius:4px;">
          <p style="margin:0;color:#374151;">Please mail check prior to deadline to:</p>
          <p style="margin:8px 0 0 0;color:#111827;font-weight:500;">
            EFBC Conference Inc<br/>
            127 Low Country Lane<br/>
            The Woodlands, TX 77380, USA
          </p>
        </div>
      ` : ''}
      
    `,
  });
  const parts: string[] = [];
  if (eventName) parts.push(`Event: ${eventName}.`);
  if (formattedEventDate) parts.push(`Date: ${formattedEventDate}.`);
  if (paymentAmount > 0) {
    parts.push(`Total Payment Amount: $${totalWithFee.toFixed(2)}.`);
  }
  if (paymentMethod) parts.push(`Payment method: ${paymentMethod}.`);
  if (paymentMethod === 'Card' && squarePaymentId) {
    parts.push(`Square payment ID: ${squarePaymentId}.`);
  }
  if (paymentMethod === 'Check') {
    parts.push('\n\nIf you prefer by check, please mail check prior to deadline to:\nEFBC Conference Inc\n127 Low Country Lane\nThe Woodlands, TX 77380, USA');
  }
  const text = parts.join(' ').trim();

  // Send to user (admin copy will be handled by the caller if needed)
  queueEmail({ to, subject, text, html });
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
  const subject = sanitizeSubjectLine(`${brand} account created for you`);
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

  queueEmail({ to, subject, text, html });
  // Note: Admin-created user emails don't need admin copy (admin already knows)
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const link = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
  const from = process.env.EMAIL_FROM || 'no-reply@efbc.local';
  const subject = sanitizeSubjectLine('Reset your EFBC Conference password');
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

  queueEmail({ to, subject, text, html });
  // Note: Password reset emails don't need admin copy
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
    process.env.ADMIN_NOTIFY_EMAIL ||
    process.env.SUPPORT_EMAIL ||
    'planner@efbcconference.org';
  const subject = sanitizeSubjectLine(`New cancellation request for ${params.eventName || 'event'} (#${params.registrationId})`);

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

  queueEmail({ to, subject, text, html });
}

// Email to user confirming their cancellation request was submitted
export async function sendCancellationRequestConfirmationEmail(params: {
  to: string;
  userName?: string;
  eventName?: string;
  registrationId: number;
  reason?: string | null;
}): Promise<void> {
  const brand = (process.env.EMAIL_BRAND || 'EFBC Conference').trim();
  const subject = sanitizeSubjectLine(`Cancellation request submitted for ${params.eventName || 'event'}`);

  const html = await renderEmailTemplate({
    subject,
    heading: 'Cancellation request received',
    preheader: 'Your cancellation request has been submitted and is under review.',
    contentHtml: `
      <p style="margin:0 0 12px 0;">Hi ${params.userName || 'there'},</p>
      <p style="margin:0 0 8px 0;">We have received your request to cancel your registration${params.eventName ? ` for <strong>${params.eventName}</strong>` : ''}.</p>
      <p style="margin:0 0 8px 0;">Your cancellation request (Registration #${params.registrationId}) is now under review by our team.</p>
      ${params.reason ? `<p style="margin:8px 0 0 0;"><strong>Reason provided:</strong></p><p style="margin:4px 0 8px 0;white-space:pre-line;">${params.reason}</p>` : ''}
      <p style="margin:12px 0 0 0;">You will receive an email notification once your request has been reviewed and a decision has been made.</p>
      <p style="margin:8px 0 0 0;">If you have any questions, please contact the conference organizers.</p>
    `,
  });

  const lines: string[] = [];
  lines.push(`Hi ${params.userName || 'there'},`);
  lines.push(`We have received your request to cancel your registration${params.eventName ? ` for ${params.eventName}` : ''}.`);
  lines.push(`Your cancellation request (Registration #${params.registrationId}) is now under review.`);
  if (params.reason) lines.push(`Reason: ${params.reason}.`);
  lines.push('You will receive an email notification once your request has been reviewed.');
  const text = lines.join(' ');

  // Send to user and also send a copy to admin
  await sendMailWithAdminCopy({ to: params.to, subject, text, html }, true);
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
  const subject = sanitizeSubjectLine(
    params.status === 'approved'
      ? 'Your registration cancellation has been approved'
      : 'Your registration cancellation has been reviewed'
  );

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

  // Send to user and also send a copy to admin
  await sendMailWithAdminCopy({ to: params.to, subject, text, html }, true);
}

// Email to user when a previously cancelled registration is restored
export async function sendRegistrationRestoredEmail(params: {
  to: string;
  userName?: string;
  eventName?: string;
}): Promise<void> {
  const brand = (process.env.EMAIL_BRAND || 'EFBC Conference').trim();
  const subject = sanitizeSubjectLine('Your registration has been restored');

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

  // Send to user and also send a copy to admin
  await sendMailWithAdminCopy({ to: params.to, subject, text, html }, true);
}

