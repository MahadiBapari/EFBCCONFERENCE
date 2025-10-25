import { Router } from 'express';
import { EventController } from '../controllers/eventController';
import { DatabaseService } from '../services/databaseService';

const router = Router();

// Initialize database service and controller
let eventController: EventController;

// Initialize controller when database is available
const initController = async () => {
  if (!eventController) {
    // This will be set when the database connection is established
    const db = (globalThis as any).databaseService;
    if (db) {
      eventController = new EventController(db);
    }
  }
};

// Middleware to ensure controller is initialized
const ensureController = async (req: any, res: any, next: any) => {
  await initController();
  if (!eventController) {
    return res.status(500).json({
      success: false,
      error: 'Database not initialized'
    });
  }
  req.eventController = eventController;
  next();
};

// Apply middleware to all routes
router.use(ensureController);

// Routes
router.get('/', async (req: any, res: any) => {
  await req.eventController.getEvents(req, res);
});

router.get('/:id', async (req: any, res: any) => {
  await req.eventController.getEventById(req, res);
});

router.post('/', async (req: any, res: any) => {
  await req.eventController.createEvent(req, res);
});

router.put('/:id', async (req: any, res: any) => {
  await req.eventController.updateEvent(req, res);
});

router.delete('/:id', async (req: any, res: any) => {
  await req.eventController.deleteEvent(req, res);
});

export default router;
