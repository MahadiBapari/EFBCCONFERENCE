import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: number;
  email: string;
  role: string;
  name: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

function extractUser(req: Request): AuthUser | null {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  const hdr = (req.headers.authorization || '') as string;
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
  if (!token) return null;
  try {
    const p: any = jwt.verify(token, secret);
    return { id: Number(p.sub), email: p.email, role: p.role, name: p.name };
  } catch {
    return null;
  }
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const user = extractUser(req);
  if (!user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  req.user = user;
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  const user = extractUser(req);
  if (!user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }
  if (user.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Admin access required' });
    return;
  }
  req.user = user;
  next();
}
