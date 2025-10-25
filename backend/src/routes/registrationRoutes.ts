import { Router } from 'express';
import { RegistrationController } from '../controllers/registrationController';
import { DatabaseService } from '../services/databaseService';

const router = Router();

// Initialize database service and controller
let registrationController: RegistrationController;

// Initialize controller when database is available
const initController = async () => {
  if (!registrationController) {
    // This will be set when the database connection is established
    const db = (globalThis as any).databaseService;
    if (db) {
      registrationController = new RegistrationController(db);
    }
  }
};

// Middleware to ensure controller is initialized
const ensureController = async (req: any, res: any, next: any) => {
  await initController();
  if (!registrationController) {
    return res.status(500).json({
      success: false,
      error: 'Database not initialized'
    });
  }
  req.registrationController = registrationController;
  next();
};

// Apply middleware to all routes
router.use(ensureController);

// Routes
router.get('/', async (req: any, res: any) => {
  await req.registrationController.getRegistrations(req, res);
});

router.get('/:id', async (req: any, res: any) => {
  await req.registrationController.getRegistrationById(req, res);
});

router.post('/', async (req: any, res: any) => {
  await req.registrationController.createRegistration(req, res);
});

router.put('/:id', async (req: any, res: any) => {
  await req.registrationController.updateRegistration(req, res);
});

router.delete('/:id', async (req: any, res: any) => {
  await req.registrationController.deleteRegistration(req, res);
});

router.delete('/bulk', async (req: any, res: any) => {
  await req.registrationController.bulkDeleteRegistrations(req, res);
});

export default router;
