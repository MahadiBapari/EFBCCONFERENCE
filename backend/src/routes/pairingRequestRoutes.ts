import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { DatabaseService } from '../services/databaseService';
import { sendPairingRequestAdminEmail } from '../services/emailService';

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
  } catch {
    return {};
  }
};

/** Map wednesday_activity string to an event activity tab name */
function resolveActivityLabel(wednesdayActivity: string, activitiesRaw: unknown): string | null {
  const wa = String(wednesdayActivity || '').trim();
  if (!wa || wa.toLowerCase() === 'none') return null;

  let activities = activitiesRaw;
  if (typeof activities === 'string') {
    try {
      activities = JSON.parse(activities);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(activities) || activities.length === 0) return null;

  const names: string[] =
    typeof (activities as any[])[0] === 'string'
      ? (activities as string[])
      : (activities as Array<{ name: string }>).map((a) => a.name).filter(Boolean);

  const exact = names.find((n) => n === wa);
  if (exact) return exact;

  const wl = wa.toLowerCase();
  const firstToken = wl.split(/\s+/)[0] || wl;
  for (const name of names) {
    const n = name.toLowerCase();
    if (wl.includes(n) || n.includes(firstToken)) return name;
  }
  return null;
}

function maxPartnerSlots(activityLabel: string): number {
  const lower = activityLabel.toLowerCase();
  if (lower.includes('golf')) return 3;
  if (lower.includes('fish')) return 4;
  return 4;
}

router.post('/pairing-requests', async (req: Request, res: Response) => {
  try {
    const auth = getAuth(req);
    if (!auth.id) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const registrationId = Number((req.body || {}).registrationId);
    const partnerNamesRaw = (req.body || {}).partnerNames;
    const boatPreference = typeof (req.body || {}).boatPreference === 'string' ? String((req.body || {}).boatPreference).trim() : '';
    const additionalNotes =
      typeof (req.body || {}).additionalNotes === 'string' ? String((req.body || {}).additionalNotes).trim() : '';

    if (!registrationId || Number.isNaN(registrationId)) {
      return res.status(400).json({ success: false, error: 'registrationId is required' });
    }

    const db = getDb();
    const rows = await db.query(
      'SELECT r.*, e.name as event_name, e.activities as event_activities FROM registrations r LEFT JOIN events e ON e.id = r.event_id WHERE r.id = ? LIMIT 1',
      [registrationId]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, error: 'Registration not found' });
    }

    const reg = rows[0];
    if (auth.role !== 'admin' && Number(reg.user_id) !== Number(auth.id)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    if (reg.status === 'cancelled' || reg.cancellation_at) {
      return res.status(400).json({ success: false, error: 'Cancelled registrations cannot submit pairing requests' });
    }

    const activityLabel = resolveActivityLabel(reg.wednesday_activity, reg.event_activities);
    if (!activityLabel) {
      return res.status(400).json({
        success: false,
        error: 'No groupable activity on this registration. Pairing requests apply to Wednesday activities only.',
      });
    }

    let partnerNames: string[] = [];
    if (Array.isArray(partnerNamesRaw)) {
      partnerNames = partnerNamesRaw
        .map((x) => String(x || '').trim())
        .filter(Boolean);
    } else if (typeof partnerNamesRaw === 'string' && partnerNamesRaw.trim()) {
      partnerNames = partnerNamesRaw
        .split(/[\n,;]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const maxPartners = maxPartnerSlots(activityLabel);
    if (partnerNames.length > maxPartners) {
      return res.status(400).json({
        success: false,
        error: `You may list at most ${maxPartners} name(s) for this activity.`,
      });
    }

    const dup = await db.query(
      'SELECT id FROM pairing_requests WHERE registration_id = ? AND status = ?',
      [registrationId, 'pending']
    );
    if (dup.length) {
      return res.status(400).json({
        success: false,
        error: 'You already have a pending pairing request for this registration.',
      });
    }

    const partnerJson = JSON.stringify(partnerNames);
    const insertResult = await db.insert('pairing_requests', {
      registration_id: registrationId,
      user_id: reg.user_id,
      event_id: reg.event_id,
      activity_label: activityLabel,
      partner_names: partnerJson,
      boat_preference: boatPreference || null,
      additional_notes: additionalNotes || null,
      status: 'pending',
    });
    const requestId = Number((insertResult as any)?.insertId) || 0;

    try {
      const badge = String(reg.badge_name || '').trim();
      const last = String(reg.last_name || '').trim();
      const registrantName = [badge, last].filter(Boolean).join(' ') || undefined;
      await sendPairingRequestAdminEmail({
        requestId: Number(requestId) || 0,
        registrationId,
        activityLabel,
        registrantName,
        registrantEmail: reg.email ? String(reg.email).trim() : undefined,
        eventName: reg.event_name,
        partnerNames,
        boatPreference: boatPreference || null,
        additionalNotes: additionalNotes || null,
        wednesdayActivity: reg.wednesday_activity,
      }).catch((err) => console.warn('Pairing request admin email failed:', (err as any)?.message || err));
    } catch (err) {
      console.warn('Pairing request email block failed:', (err as any)?.message || err);
    }

    return res.status(201).json({ success: true, message: 'Pairing request submitted', data: { id: requestId } });
  } catch (e) {
    console.error('pairing-requests POST', e);
    return res.status(500).json({ success: false, error: 'Request failed' });
  }
});

export default router;
