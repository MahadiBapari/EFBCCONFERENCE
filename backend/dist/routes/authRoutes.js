"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
const emailService_1 = require("../services/emailService");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const getDb = () => globalThis.databaseService;
const sign = (u) => jsonwebtoken_1.default.sign({ sub: u.id, email: u.email, role: u.role, name: u.name }, JWT_SECRET, { expiresIn: '7d' });
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password)
            return res.status(400).json({ success: false, error: 'Email and password are required' });
        const db = getDb();
        const rows = await db.query('SELECT id, name, email, role, password, email_verified_at FROM users WHERE email=? AND isActive=true LIMIT 1', [email]);
        const u = rows[0];
        if (!u)
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        const ok = await bcrypt_1.default.compare(password, u.password);
        if (!ok)
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        if (!u.email_verified_at)
            return res.status(403).json({ success: false, error: 'Email not verified' });
        const user = { id: u.id, name: u.name, email: u.email, role: u.role };
        return res.json({ success: true, data: { user, token: sign(user) } });
    }
    catch (e) {
        return res.status(500).json({ success: false, error: 'Login failed' });
    }
});
router.get('/me', (req, res) => {
    try {
        const hdr = (req.headers.authorization || '');
        const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
        if (!token)
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        const p = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        return res.json({ success: true, data: { id: p.sub, email: p.email, name: p.name, role: p.role } });
    }
    catch {
        return res.status(401).json({ success: false, error: 'Invalid token' });
    }
});
router.put('/profile', async (req, res) => {
    try {
        const hdr = (req.headers.authorization || '');
        const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
        const p = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const { name, email } = req.body || {};
        if (!name || !email)
            return res.status(400).json({ success: false, error: 'Missing fields' });
        const db = getDb();
        const dup = await db.query('SELECT id FROM users WHERE email=? AND id<>?', [email, p.sub]);
        if (dup.length)
            return res.status(409).json({ success: false, error: 'Email already in use' });
        await db.query('UPDATE users SET name=?, email=? WHERE id=?', [name, email, p.sub]);
        const user = { id: p.sub, name, email, role: p.role };
        return res.json({ success: true, data: { user, token: sign(user) } });
    }
    catch {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
});
router.put('/password', async (req, res) => {
    try {
        const hdr = (req.headers.authorization || '');
        const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
        const p = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const { currentPassword, newPassword } = req.body || {};
        if (!currentPassword || !newPassword)
            return res.status(400).json({ success: false, error: 'Missing fields' });
        const db = getDb();
        const rows = await db.query('SELECT password FROM users WHERE id=?', [p.sub]);
        const ok = await bcrypt_1.default.compare(currentPassword, rows[0]?.password || '');
        if (!ok)
            return res.status(401).json({ success: false, error: 'Invalid current password' });
        const hash = await bcrypt_1.default.hash(newPassword, 10);
        await db.query('UPDATE users SET password=? WHERE id=?', [hash, p.sub]);
        return res.json({ success: true, message: 'Password updated' });
    }
    catch {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
});
exports.default = router;
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body || {};
        if (!email)
            return res.status(400).json({ success: false, error: 'Email is required' });
        const db = getDb();
        const users = await db.query('SELECT id FROM users WHERE email=? LIMIT 1', [email]);
        if (users.length) {
            const token = crypto_1.default.randomBytes(32).toString('hex');
            await db.query('UPDATE users SET password_reset_token=?, password_reset_expires_at=DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id=?', [token, users[0].id]);
            await (0, emailService_1.sendPasswordResetEmail)(email, token);
        }
        return res.json({ success: true, message: 'If an account exists for that email, a reset link has been sent.' });
    }
    catch {
        return res.status(500).json({ success: false, error: 'Request failed' });
    }
});
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body || {};
        if (!token || !newPassword)
            return res.status(400).json({ success: false, error: 'Token and newPassword are required' });
        const db = getDb();
        const rows = await db.query('SELECT id FROM users WHERE password_reset_token=? AND password_reset_expires_at > NOW() LIMIT 1', [token]);
        const u = rows[0];
        if (!u)
            return res.status(400).json({ success: false, error: 'Invalid or expired token' });
        const hash = await bcrypt_1.default.hash(newPassword, 10);
        await db.query('UPDATE users SET password=?, password_reset_token=NULL, password_reset_expires_at=NULL WHERE id=?', [hash, u.id]);
        return res.json({ success: true, message: 'Password updated' });
    }
    catch {
        return res.status(500).json({ success: false, error: 'Reset failed' });
    }
});
router.get('/verify-email', async (req, res) => {
    try {
        const token = req.query.token || '';
        if (!token)
            return res.status(400).json({ success: false, error: 'Token is required' });
        const db = getDb();
        const rows = await db.query('SELECT id, email_verification_expires_at FROM users WHERE email_verification_token=? LIMIT 1', [token]);
        const u = rows[0];
        if (!u)
            return res.status(400).json({ success: false, error: 'Invalid token' });
        if (u.email_verification_expires_at && new Date(u.email_verification_expires_at).getTime() < Date.now()) {
            return res.status(400).json({ success: false, error: 'Token expired' });
        }
        await db.query('UPDATE users SET email_verified_at=NOW(), email_verification_token=NULL, email_verification_expires_at=NULL WHERE id=?', [u.id]);
        const redirect = process.env.EMAIL_VERIFY_REDIRECT;
        if (redirect)
            return res.redirect(302, redirect);
        return res.json({ success: true, message: 'Email verified successfully' });
    }
    catch (e) {
        return res.status(500).json({ success: false, error: 'Verification failed' });
    }
});
router.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body || {};
        if (!email)
            return res.status(400).json({ success: false, error: 'Email is required' });
        const db = getDb();
        const rows = await db.query('SELECT id, email_verified_at FROM users WHERE email=? LIMIT 1', [email]);
        const u = rows[0];
        if (!u)
            return res.status(404).json({ success: false, error: 'User not found' });
        if (u.email_verified_at)
            return res.json({ success: true, message: 'Email already verified' });
        const token = crypto_1.default.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
        await db.query('UPDATE users SET email_verification_token=?, email_verification_expires_at=? WHERE id=?', [token, expires, u.id]);
        await (0, emailService_1.sendVerificationEmail)(email, token);
        return res.json({ success: true, message: 'Verification email sent' });
    }
    catch (e) {
        return res.status(500).json({ success: false, error: 'Resend failed' });
    }
});
//# sourceMappingURL=authRoutes.js.map