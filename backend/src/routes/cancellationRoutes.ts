import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { DatabaseService } from '../services/databaseService';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

const getDb = (): DatabaseService => (globalThis as any).databaseService as DatabaseService;

const getAuth = (req: Request): { id?: number; role?: string } => {
  try {
    const hdr = (req.headers.authorization || '') as string;
    const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
    if (!token) return {};
    const p: any = jwt.verify(token, JWT_SECRET);
    return { id: Number(p.sub), role: p.role };
  } catch { return {}; }
};

// Submit a cancellation request for a registration (user)
router.post('/registrations/:id/cancel-request', async (req: Request, res: Response) => {
  try {
    const auth = getAuth(req);
    const id = Number(req.params.id);
    const { reason } = (req.body || {}) as { reason?: string };
    const db = getDb();
    const rows = await db.query('SELECT id, user_id, event_id, status FROM registrations WHERE id=?', [id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Registration not found' });
    const reg = rows[0];
    if (auth.id && reg.user_id && Number(auth.id) !== Number(reg.user_id)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    if (reg.status === 'cancelled') return res.status(400).json({ success: false, error: 'Already cancelled' });
    const dup = await db.query('SELECT id FROM cancellation_requests WHERE registration_id=? AND status="pending"', [id]);
    if (dup.length) return res.status(400).json({ success: false, error: 'Cancellation already pending' });
    await db.query(
      'INSERT INTO cancellation_requests (registration_id, user_id, event_id, reason) VALUES (?,?,?,?)',
      [id, reg.user_id, reg.event_id, reason || null]
    );
    return res.json({ success: true, message: 'Cancellation request submitted' });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Request failed' });
  }
});

// List cancellation requests (admin)
router.get('/cancel-requests', async (req: Request, res: Response) => {
  try {
    const auth = getAuth(req);
    if (auth.role !== 'admin') return res.status(403).json({ success: false, error: 'Forbidden' });
    const { status = 'pending', page = 1, limit = 20 } = req.query as any;
    const off = (Number(page) - 1) * Number(limit);
    const db = getDb();
    const safeLimit = Math.max(1, Number(limit) || 20);
    const safeOffset = Math.max(0, off || 0);
    const sql =
      `SELECT cr.*, u.name as user_name, u.email as user_email, e.name as event_name ` +
      `FROM cancellation_requests cr ` +
      `LEFT JOIN users u ON u.id=cr.user_id ` +
      `LEFT JOIN events e ON e.id=cr.event_id ` +
      `WHERE cr.status=? ` +
      `ORDER BY cr.created_at DESC ` +
      `LIMIT ${safeLimit} OFFSET ${safeOffset}`;
    const rows = await db.query(sql, [status]);
    return res.json({ success: true, data: rows });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to load requests' });
  }
});

// Approve a request (admin)
router.put('/cancel-requests/:id/approve', async (req: Request, res: Response) => {
  try {
    const auth = getAuth(req);
    if (auth.role !== 'admin') return res.status(403).json({ success: false, error: 'Forbidden' });
    const id = Number(req.params.id);
    const { adminNote } = (req.body || {}) as { adminNote?: string };
    const db = getDb();
    const rows = await db.query('SELECT * FROM cancellation_requests WHERE id=?', [id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Request not found' });
    const r = rows[0];
    if (r.status !== 'pending') return res.status(400).json({ success: false, error: 'Already processed' });
    await db.query('UPDATE cancellation_requests SET status="approved", admin_id=?, admin_note=?, processed_at=NOW() WHERE id=?', [auth.id || null, adminNote || null, id]);
    await db.query('UPDATE registrations SET status="cancelled", cancellation_reason=?, cancellation_at=NOW() WHERE id=?', [r.reason || null, r.registration_id]);
    return res.json({ success: true, message: 'Cancellation approved' });
  } catch {
    return res.status(500).json({ success: false, error: 'Approve failed' });
  }
});

// Reject a request (admin)
router.put('/cancel-requests/:id/reject', async (req: Request, res: Response) => {
  try {
    const auth = getAuth(req);
    if (auth.role !== 'admin') return res.status(403).json({ success: false, error: 'Forbidden' });
    const id = Number(req.params.id);
    const { adminNote } = (req.body || {}) as { adminNote?: string };
    const db = getDb();
    const rows = await db.query('SELECT * FROM cancellation_requests WHERE id=?', [id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Request not found' });
    const r = rows[0];
    if (r.status !== 'pending') return res.status(400).json({ success: false, error: 'Already processed' });
    await db.query('UPDATE cancellation_requests SET status="rejected", admin_id=?, admin_note=?, processed_at=NOW() WHERE id=?', [auth.id || null, adminNote || null, id]);
    return res.json({ success: true, message: 'Cancellation rejected' });
  } catch {
    return res.status(500).json({ success: false, error: 'Reject failed' });
  }
});

export default router;

