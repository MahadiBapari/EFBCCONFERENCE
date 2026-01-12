import { Router, Request, Response } from 'express';
import { DiscountCodeController } from '../controllers/discountCodeController';
import { DatabaseService } from '../services/databaseService';

const router = Router();
const db = (globalThis as any).databaseService as DatabaseService;
const controller = new DiscountCodeController(db);

router.get('/events/:eventId', (req: Request, res: Response) => controller.getDiscountCodesByEvent(req, res));
router.post('/', (req: Request, res: Response) => controller.createDiscountCode(req, res));
router.put('/:id', (req: Request, res: Response) => controller.updateDiscountCode(req, res));
router.delete('/:id', (req: Request, res: Response) => controller.deleteDiscountCode(req, res));
router.post('/validate', (req: Request, res: Response) => controller.validateDiscountCode(req, res));

export default router;

