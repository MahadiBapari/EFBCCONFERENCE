import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { CustomizationController } from '../controllers/customizationController';
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

// Middleware to get database service and create controller
const getController = (req: Request, res: Response, next: () => void) => {
  const db = getDb();
  if (!db) {
    res.status(500).json({ success: false, error: 'Database service not available' });
    return;
  }
  (req as any).customizationController = new CustomizationController(db);
  next();
};

// Get email customization (admin only)
router.get('/email', getController, async (req: Request, res: Response) => {
  const auth = getAuth(req);
  if (!auth.id || auth.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  const controller = (req as any).customizationController as CustomizationController;
  await controller.getEmailCustomization(req, res);
});

// Update email customization (admin only)
router.put('/email', getController, async (req: Request, res: Response) => {
  const auth = getAuth(req);
  if (!auth.id || auth.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  const controller = (req as any).customizationController as CustomizationController;
  await controller.updateEmailCustomization(req, res);
});

export default router;

