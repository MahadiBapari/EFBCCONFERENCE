import { Router } from 'express';
import { DiscountCodeController } from '../controllers/discountCodeController';
import { DatabaseService } from '../services/databaseService';

const router = Router();
const db = (globalThis as any).databaseService as DatabaseService;
const controller = new DiscountCodeController(db);

router.get('/events/:eventId', (req, res) => controller.getDiscountCodesByEvent(req, res));
router.post('/', (req, res) => controller.createDiscountCode(req, res));
router.put('/:id', (req, res) => controller.updateDiscountCode(req, res));
router.delete('/:id', (req, res) => controller.deleteDiscountCode(req, res));
router.post('/validate', (req, res) => controller.validateDiscountCode(req, res));

export default router;

