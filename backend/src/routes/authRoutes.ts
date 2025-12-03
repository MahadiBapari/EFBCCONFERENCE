import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { DatabaseService } from '../services/databaseService';
import crypto from 'crypto';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/emailService';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

const getDb = (): DatabaseService => (globalThis as any).databaseService as DatabaseService;

const sign = (u: any) => jwt.sign({ sub: u.id, email: u.email, role: u.role, name: u.name }, JWT_SECRET, { expiresIn: '7d' });

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password are required' });
    const db = getDb();
    // First check if user exists (without password check)
    const rows = await db.query('SELECT id, name, email, role, password, email_verified_at FROM users WHERE email=? AND isActive=true LIMIT 1', [email]);
    const u = rows[0];
    if (!u) return res.status(401).json({ success: false, error: 'No user with this email exists' });
    // User exists, now check password
    const ok = await bcrypt.compare(password, u.password);
    if (!ok) return res.status(401).json({ success: false, error: 'Invalid password' });
    // Require email verification before issuing token
    if (!u.email_verified_at) {
      return res.status(403).json({ success: false, error: 'Email not verified' });
    }
    const user = { id: u.id, name: u.name, email: u.email, role: u.role };
    return res.json({ success: true, data: { user, token: sign(user) } });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: 'Login failed' });
  }
});

router.get('/me', (req: Request, res: Response) => {
  try {
    const hdr = (req.headers.authorization || '') as string;
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
    if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const p: any = jwt.verify(token, JWT_SECRET);
    return res.json({ success: true, data: { id: p.sub, email: p.email, name: p.name, role: p.role } });
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
});

router.put('/profile', async (req: Request, res: Response) => {
  try {
    const hdr = (req.headers.authorization || '') as string;
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
    const p: any = jwt.verify(token, JWT_SECRET);
    const { name, email } = req.body || {};
    if (!name || !email) return res.status(400).json({ success: false, error: 'Missing fields' });
    const db = getDb();
    const dup = await db.query('SELECT id FROM users WHERE email=? AND id<>?', [email, p.sub]);
    if (dup.length) return res.status(409).json({ success: false, error: 'Email already in use' });
    await db.query('UPDATE users SET name=?, email=? WHERE id=?', [name, email, p.sub]);
    const user = { id: p.sub, name, email, role: p.role };
    return res.json({ success: true, data: { user, token: sign(user) } });
  } catch {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
});

router.put('/password', async (req: Request, res: Response) => {
  try {
    const hdr = (req.headers.authorization || '') as string;
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
    const p: any = jwt.verify(token, JWT_SECRET);
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, error: 'Missing fields' });
    const db = getDb();
    const rows = await db.query('SELECT password FROM users WHERE id=?', [p.sub]);
    const ok = await bcrypt.compare(currentPassword, rows[0]?.password || '');
    if (!ok) return res.status(401).json({ success: false, error: 'Invalid current password' });
    const hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password=? WHERE id=?', [hash, p.sub]);
    return res.json({ success: true, message: 'Password updated' });
  } catch {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
});

export default router;
// Request password reset
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });
    const db = getDb();
    const users = await db.query('SELECT id FROM users WHERE email=? LIMIT 1', [email]);
    // Always respond 200 to prevent user enumeration
    if (users.length) {
      const token = crypto.randomBytes(32).toString('hex');
      // Rely on DB time to avoid timezone conversions
      await db.query('UPDATE users SET password_reset_token=?, password_reset_expires_at=DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id=?', [token, users[0].id]);
      // Fire-and-forget email send so API returns immediately
      setImmediate(async () => {
        try {
          await sendPasswordResetEmail(email, token);
        } catch (e: any) {
          console.error('SMTP sendPasswordResetEmail failed:', e?.message || e);
        }
      });
    }
    return res.json({ success: true, message: 'If an account exists for that email, a reset link has been sent.' });
  } catch {
    return res.status(500).json({ success: false, error: 'Request failed' });
  }
});

// Reset password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) return res.status(400).json({ success: false, error: 'Token and newPassword are required' });
    
    // Validate password strength (same as registration)
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      return res.status(400).json({ success: false, error: 'Password must contain uppercase, lowercase, and number' });
    }
    
    const db = getDb();
    // Validate token and expiry in DB time to avoid timezone issues
    const rows = await db.query('SELECT id FROM users WHERE password_reset_token=? AND password_reset_expires_at > NOW() LIMIT 1', [token]);
    const u = rows[0];
    if (!u) return res.status(400).json({ success: false, error: 'Invalid or expired token' });
    const hash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password=?, password_reset_token=NULL, password_reset_expires_at=NULL WHERE id=?', [hash, u.id]);
    return res.json({ success: true, message: 'Password updated' });
  } catch {
    return res.status(500).json({ success: false, error: 'Reset failed' });
  }
});

// Verify email using token
router.get('/verify-email', async (req: Request, res: Response) => {
  try {
    let token = (req.query.token as string) || '';
    
    // Handle URL encoding - try decoding, but handle errors gracefully
    try {
      token = decodeURIComponent(token).trim();
    } catch (e) {
      // If decodeURIComponent fails, token might already be decoded or have special characters
      token = token.trim();
    }
    
    if (!token) return res.status(400).json({ success: false, error: 'Token is required' });
    
    // Log the incoming token for debugging
    console.log(`[VERIFY] Attempting verification with token: length=${token.length}, prefix=${token.substring(0, 10)}`);
    
    const db = getDb();
    
    // First check if user is already verified
    const alreadyVerified = await db.query(
      'SELECT id, email FROM users WHERE email_verification_token=? AND email_verified_at IS NOT NULL LIMIT 1',
      [token]
    );
    if (alreadyVerified.length > 0) {
      const redirect = process.env.EMAIL_VERIFY_REDIRECT || process.env.FRONTEND_URL || 'http://localhost:3000';
      if (redirect) return res.redirect(302, `${redirect}/login?verified=true`);
      return res.json({ success: true, message: 'Email already verified' });
    }
    
    // Check for valid token
    const rows = await db.query(
      'SELECT id, email, email_verification_expires_at, email_verified_at, email_verification_token FROM users WHERE email_verification_token=? LIMIT 1',
      [token]
    );
    const u = rows[0];
    
    if (!u) {
      console.log(`[VERIFY] Token not found in database. Token length: ${token.length}, prefix: ${token.substring(0, 10)}`);
      // Log for debugging - check if token exists in database at all
      const allTokens = await db.query('SELECT id, email, email_verification_token, LENGTH(email_verification_token) as token_len FROM users WHERE email_verification_token IS NOT NULL LIMIT 5');
      console.warn('Email verification failed: Invalid token', { 
        tokenLength: token.length, 
        tokenPrefix: token.substring(0, 10),
        tokenSuffix: token.substring(token.length - 10),
        tokensInDb: allTokens.length,
        sampleTokens: allTokens.map((t: any) => ({ 
          id: t.id, 
          email: t.email, 
          tokenLen: t.token_len,
          tokenPrefix: t.email_verification_token?.substring(0, 10) 
        }))
      });
      
      // Try to find if token might be expired (check all users with tokens)
      const allUsersWithTokens = await db.query(
        'SELECT id, email, email_verification_token, email_verification_expires_at FROM users WHERE email_verification_token IS NOT NULL'
      );
      
      // Check if any token is similar (might be a partial match or encoding issue)
      for (const user of allUsersWithTokens) {
        const dbToken = user.email_verification_token;
        if (dbToken && (dbToken.includes(token.substring(0, 20)) || token.includes(dbToken.substring(0, 20)))) {
          console.warn(`[VERIFY] Possible token mismatch for user ${user.id} (${user.email}). DB token prefix: ${dbToken.substring(0, 10)}, provided token prefix: ${token.substring(0, 10)}`);
        }
      }
      
      // Try to find user by partial token match (in case of truncation) or redirect to resend page
      const frontendUrl = process.env.FRONTEND_URL || process.env.EMAIL_VERIFY_REDIRECT || 'http://localhost:3000';
      return res.redirect(302, `${frontendUrl}/resend-verification?invalid=true`);
    }
    
    // Check if already verified
    if (u.email_verified_at) {
      const redirect = process.env.EMAIL_VERIFY_REDIRECT || process.env.FRONTEND_URL || 'http://localhost:3000';
      if (redirect) return res.redirect(302, `${redirect}/login?verified=true`);
      return res.json({ success: true, message: 'Email already verified' });
    }
    
    // Check expiration
    const expiresAt = u.email_verification_expires_at ? new Date(u.email_verification_expires_at).getTime() : null;
    const now = Date.now();
    
    if (expiresAt && expiresAt < now) {
      console.log(`[VERIFY] Token expired for user ${u.id} (${u.email}). Expires: ${u.email_verification_expires_at}, Now: ${new Date(now).toISOString()}`);
      // Redirect to resend page with email parameter
      const frontendUrl = process.env.FRONTEND_URL || process.env.EMAIL_VERIFY_REDIRECT || 'http://localhost:3000';
      return res.redirect(302, `${frontendUrl}/resend-verification?email=${encodeURIComponent(u.email)}&expired=true`);
    }
    
    console.log(`[VERIFY] Token is valid for user ${u.id} (${u.email}). Proceeding with verification...`);
    
    // Verify the email
    const updateResult = await db.query(
      'UPDATE users SET email_verified_at=NOW(), email_verification_token=NULL, email_verification_expires_at=NULL WHERE id=?',
      [u.id]
    );
    
    // Verify the update was successful
    const verifyUpdate = await db.query(
      'SELECT id, email, email_verified_at FROM users WHERE id=? LIMIT 1',
      [u.id]
    );
    
    if (!verifyUpdate[0] || !verifyUpdate[0].email_verified_at) {
      console.error(`[VERIFY] Failed to verify email for user ${u.id}. Update query may have failed.`, {
        updateResult,
        verifyUpdate: verifyUpdate[0]
      });
      return res.status(500).json({ success: false, error: 'Failed to verify email. Please try again.' });
    }
    
    console.log(`[VERIFY] Successfully verified email for user ${u.id} (${u.email}). Verified at: ${verifyUpdate[0].email_verified_at}`);
    
    const redirect = process.env.EMAIL_VERIFY_REDIRECT || process.env.FRONTEND_URL || 'http://localhost:3000';
    if (redirect) {
      return res.redirect(302, `${redirect}/login?verified=true&email=${encodeURIComponent(u.email)}`);
    }
    return res.json({ success: true, message: 'Email verified successfully' });
  } catch (e: any) {
    console.error('Email verification error:', e);
    return res.status(500).json({ success: false, error: 'Verification failed. Please try again or contact support.' });
  }
});

// Resend verification email
router.post('/resend-verification', async (req: Request, res: Response) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ success: false, error: 'Email is required' });
    const db = getDb();
    const rows = await db.query('SELECT id, email, email_verified_at, email_verification_token FROM users WHERE email=? LIMIT 1', [email]);
    const u = rows[0];
    if (!u) return res.status(404).json({ success: false, error: 'User not found' });
    
    // Check if already verified
    if (u.email_verified_at) {
      console.log(`[RESEND] User ${u.id} (${email}) is already verified. Skipping token generation.`);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.json({ 
        success: true, 
        message: 'Email already verified',
        redirect: `${frontendUrl}/login?verified=true`
      });
    }
    
    // Generate new token and update expiry
    const token = crypto.randomBytes(32).toString('hex');
    console.log(`[RESEND] Generated token for user ${u.id} (${email}): length=${token.length}, prefix=${token.substring(0, 10)}`);
    
    // Log old token if it exists (for debugging)
    if (u.email_verification_token) {
      console.log(`[RESEND] Replacing old token for user ${u.id}. Old token prefix: ${u.email_verification_token.substring(0, 10)}`);
    }
    
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '); // 24 hours
    await db.query('UPDATE users SET email_verification_token=?, email_verification_expires_at=? WHERE id=?', [token, expires, u.id]);
    
    // Verify the token was saved
    const verifyToken = await db.query('SELECT email_verification_token, LENGTH(email_verification_token) as token_len FROM users WHERE id=? LIMIT 1', [u.id]);
    if (!verifyToken[0] || !verifyToken[0].email_verification_token) {
      console.error(`[RESEND] Failed to save verification token for user ${u.id}. Token in DB:`, verifyToken[0]);
      return res.status(500).json({ success: false, error: 'Failed to generate verification token. Please try again.' });
    }
    
    if (verifyToken[0].email_verification_token !== token) {
      console.error(`[RESEND] Token mismatch for user ${u.id}. Expected: ${token.substring(0, 10)}..., Got: ${verifyToken[0].email_verification_token?.substring(0, 10)}...`);
      return res.status(500).json({ success: false, error: 'Token verification failed. Please try again.' });
    }
    
    console.log(`[RESEND] Token saved successfully for user ${u.id}. Token length in DB: ${verifyToken[0].token_len}`);
    
    // Send email immediately (not fire-and-forget) to ensure it's sent with the correct token
    try {
      await sendVerificationEmail(email, token);
      console.log(`[RESEND] Verification email sent to ${email}`);
    } catch (e: any) {
      console.error('SMTP sendVerificationEmail failed:', e?.message || e);
      // Don't fail the request if email fails, but log it
    }
    
    return res.json({ success: true, message: 'Verification email sent. Please check your inbox.' });
  } catch (e: any) {
    console.error('Resend verification error:', e);
    return res.status(500).json({ success: false, error: 'Failed to resend verification email. Please try again later.' });
  }
});

// GET endpoint for resend verification page (returns user info if email provided)
router.get('/resend-verification', async (req: Request, res: Response) => {
  try {
    const email = (req.query.email as string) || '';
    if (!email) {
      return res.json({ success: true, email: null });
    }
    const db = getDb();
    const rows = await db.query('SELECT id, email, email_verified_at FROM users WHERE email=? LIMIT 1', [email]);
    const u = rows[0];
    if (!u) {
      return res.json({ success: false, error: 'User not found', email: null });
    }
    if (u.email_verified_at) {
      return res.json({ 
        success: true, 
        email: u.email,
        verified: true,
        message: 'Email already verified'
      });
    }
    return res.json({ 
      success: true, 
      email: u.email,
      verified: false,
      canResend: true
    });
  } catch (e: any) {
    console.error('Get resend verification error:', e);
    return res.status(500).json({ success: false, error: 'Failed to check verification status' });
  }
});



