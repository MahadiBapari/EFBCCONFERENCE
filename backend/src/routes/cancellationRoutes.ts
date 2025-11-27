import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { DatabaseService } from '../services/databaseService';
import { sendCancellationRequestAdminEmail, sendCancellationRequestConfirmationEmail, sendCancellationDecisionEmail, sendRegistrationRestoredEmail } from '../services/emailService';

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
    // Allow admins to create cancellation requests for any registration, but regular users can only cancel their own
    if (auth.role !== 'admin' && auth.id && reg.user_id && Number(auth.id) !== Number(reg.user_id)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    if (reg.status === 'cancelled') return res.status(400).json({ success: false, error: 'Already cancelled' });
    const dup = await db.query('SELECT id FROM cancellation_requests WHERE registration_id=? AND status="pending"', [id]);
    if (dup.length) return res.status(400).json({ success: false, error: 'Cancellation already pending' });
    await db.query(
      'INSERT INTO cancellation_requests (registration_id, user_id, event_id, reason) VALUES (?,?,?,?)',
      [id, reg.user_id, reg.event_id, reason || null]
    );
    // Send emails (best-effort, non-blocking)
    try {
      const userRows = await db.query('SELECT name, email FROM users WHERE id=? LIMIT 1', [reg.user_id]);
      const eventRows = await db.query('SELECT name FROM events WHERE id=? LIMIT 1', [reg.event_id]);
      const user = userRows[0] || {};
      const event = eventRows[0] || {};
      
      // Send admin notification email
      await sendCancellationRequestAdminEmail({
        registrationId: id,
        userName: user.name,
        userEmail: user.email,
        eventName: event.name,
        reason: reason || null,
      }).catch((err) => console.warn('Failed to send cancellation request admin email:', (err as any)?.message || err));
      
      // Send confirmation email to user (also sends admin copy)
      if (user.email) {
        await sendCancellationRequestConfirmationEmail({
          to: user.email,
          userName: user.name,
          eventName: event.name,
          registrationId: id,
          reason: reason || null,
        }).catch((err) => console.warn('Failed to send cancellation request confirmation email:', (err as any)?.message || err));
      }
    } catch (err) {
      console.warn('Failed to send cancellation request emails:', (err as any)?.message || err);
    }
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

    // Notify user about approval (best-effort)
    try {
      const userRows = await db.query('SELECT name, email FROM users WHERE id=? LIMIT 1', [r.user_id]);
      const eventRows = await db.query('SELECT name FROM events WHERE id=? LIMIT 1', [r.event_id]);
      const user = userRows[0] || {};
      const event = eventRows[0] || {};
      if (user.email) {
        await sendCancellationDecisionEmail({
          to: user.email,
          userName: user.name,
          eventName: event.name,
          status: 'approved',
          reason: r.reason || null,
          adminNote: adminNote || null,
        });
      }
    } catch (err) {
      console.warn('Failed to send cancellation approval email:', (err as any)?.message || err);
    }
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

    // Notify user about rejection (best-effort)
    try {
      const userRows = await db.query('SELECT name, email FROM users WHERE id=? LIMIT 1', [r.user_id]);
      const eventRows = await db.query('SELECT name FROM events WHERE id=? LIMIT 1', [r.event_id]);
      const user = userRows[0] || {};
      const event = eventRows[0] || {};
      if (user.email) {
        await sendCancellationDecisionEmail({
          to: user.email,
          userName: user.name,
          eventName: event.name,
          status: 'rejected',
          reason: r.reason || null,
          adminNote: adminNote || null,
        });
      }
    } catch (err) {
      console.warn('Failed to send cancellation rejection email:', (err as any)?.message || err);
    }
    return res.json({ success: true, message: 'Cancellation rejected' });
  } catch {
    return res.status(500).json({ success: false, error: 'Reject failed' });
  }
});

// Restore a cancelled registration (admin)
router.put('/cancel-requests/:id/restore', async (req: Request, res: Response) => {
  try {
    const auth = getAuth(req);
    if (auth.role !== 'admin') return res.status(403).json({ success: false, error: 'Forbidden' });
    const id = Number(req.params.id);
    const db = getDb();
    const rows = await db.query('SELECT * FROM cancellation_requests WHERE id=?', [id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Request not found' });
    const r = rows[0];
    if (r.status !== 'approved') {
      return res.status(400).json({ success: false, error: 'Only approved cancellations can be restored' });
    }
    await db.query(
      'UPDATE registrations SET status="active", cancellation_reason=NULL, cancellation_at=NULL WHERE id=?',
      [r.registration_id]
    );
    // Mark this request as rejected after restoration so it no longer counts as approved
    await db.query(
      'UPDATE cancellation_requests SET status="rejected", admin_id=? WHERE id=?',
      [auth.id || null, id]
    );
    // Notify user that registration has been restored (best-effort)
    try {
      const userRows = await db.query('SELECT name, email FROM users WHERE id=? LIMIT 1', [r.user_id]);
      const eventRows = await db.query('SELECT name FROM events WHERE id=? LIMIT 1', [r.event_id]);
      const user = userRows[0] || {};
      const event = eventRows[0] || {};
      if (user.email) {
        await sendRegistrationRestoredEmail({
          to: user.email,
          userName: user.name,
          eventName: event.name,
        });
      }
    } catch (err) {
      console.warn('Failed to send registration restored email:', (err as any)?.message || err);
    }
    return res.json({ success: true, message: 'Registration restored' });
  } catch {
    return res.status(500).json({ success: false, error: 'Restore failed' });
  }
});

// List current user's pending cancellation requests (user)
router.get('/my-cancel-requests', async (req: Request, res: Response) => {
  try {
    const auth = getAuth(req);
    if (!auth.id) return res.status(401).json({ success: false, error: 'Unauthorized' });
    const db = getDb();
    const rows = await db.query(
      'SELECT id, registration_id, event_id, status, created_at FROM cancellation_requests WHERE user_id=? AND status="pending" ORDER BY created_at DESC',
      [auth.id]
    );
    return res.json({ success: true, data: rows });
  } catch {
    return res.status(500).json({ success: false, error: 'Failed to load requests' });
  }
});

export default router;

