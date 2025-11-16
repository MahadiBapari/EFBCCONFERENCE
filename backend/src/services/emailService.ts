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
        ${registration.wednesdayActivity ? `<tr><td style="color:#6b7280;">Selected Activity</td><td>${registration.wednesdayActivity}</td></tr>`:''}
        ${registration.tuesdayEarlyReception ? `<tr><td style="color:#6b7280;">Tuesday Early Arrivals Reception</td><td>${registration.tuesdayEarlyReception}</td></tr>`:''}
        ${registration.wednesdayReception ? `<tr><td style="color:#6b7280;">Wednesday Reception</td><td>${registration.wednesdayReception}</td></tr>`:''}
        ${registration.thursdayBreakfast ? `<tr><td style="color:#6b7280;">Thursday Breakfast</td><td>${registration.thursdayBreakfast}</td></tr>`:''}
        ${registration.thursdayLuncheon ? `<tr><td style="color:#6b7280;">Thursday Luncheon</td><td>${registration.thursdayLuncheon}</td></tr>`:''}
        ${registration.thursdayDinner ? `<tr><td style="color:#6b7280;">Thursday Dinner</td><td>${registration.thursdayDinner}</td></tr>`:''}
        ${registration.fridayBreakfast ? `<tr><td style="color:#6b7280;">Friday Breakfast</td><td>${registration.fridayBreakfast}</td></tr>`:''}
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
      ${eventDate ? `<p style=\"margin:4px 0 0 0;\"><strong>Date:</strong> ${eventDate}</p>` : ''}
      ${priceText ? `<p style=\"margin:8px 0 0 0;\"><strong>${priceText}</strong></p>` : ''}
      ${detailsHtml}
      <p style="margin:12px 0 0 0;">We look forward to seeing you!</p>
    `,
  });
  const parts: string[] = [];
  parts.push('Thank you for registering for EFBC Conference.');
  if (eventName) parts.push(`Event: ${eventName}.`);
  if (eventDate) parts.push(`Date: ${eventDate}.`);
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


