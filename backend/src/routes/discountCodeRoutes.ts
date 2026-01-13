import { Router, Request, Response } from 'express';
import { DiscountCodeController } from '../controllers/discountCodeController';
import { DatabaseService } from '../services/databaseService';

const router = Router();

// Lazy initialization to ensure database is ready
const getController = (): DiscountCodeController => {
  const db = (globalThis as any).databaseService as DatabaseService;
  if (!db) {
    throw new Error('Database service not initialized');
  }
  return new DiscountCodeController(db);
};

router.get('/events/:eventId', (req: Request, res: Response) => {
  try {
    getController().getDiscountCodesByEvent(req, res);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    getController().createDiscountCode(req, res);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    getController().updateDiscountCode(req, res);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    getController().deleteDiscountCode(req, res);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/validate', (req: Request, res: Response) => {
  try {
    getController().validateDiscountCode(req, res);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

