import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { DatabaseService } from '../services/databaseService';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

const getDb = (): DatabaseService => (globalThis as any).databaseService as DatabaseService;

const sign = (u: any) => jwt.sign({ sub: u.id, email: u.email, role: u.role, name: u.name }, JWT_SECRET, { expiresIn: '7d' });

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ success: false, error: 'Email and password are required' });
    const db = getDb();
    const rows = await db.query('SELECT id, name, email, role, password FROM users WHERE email=? AND isActive=true LIMIT 1', [email]);
    const u = rows[0];
    if (!u) return res.status(401).json({ success: false, error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, u.password);
    if (!ok) return res.status(401).json({ success: false, error: 'Invalid credentials' });
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


