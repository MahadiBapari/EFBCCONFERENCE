import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { DatabaseService } from '../services/databaseService';

const router = Router();

// Initialize database service and controller
let userController: UserController;

// Initialize controller when database is available
const initController = async () => {
  if (!userController) {
    // This will be set when the database connection is established
    const db = (globalThis as any).databaseService;
    if (db) {
      userController = new UserController(db);
    }
  }
};

// Middleware to ensure controller is initialized
const ensureController = async (req: any, res: any, next: any) => {
  await initController();
  if (!userController) {
    return res.status(500).json({
      success: false,
      error: 'Database not initialized'
    });
  }
  req.userController = userController;
  next();
};

// Apply middleware to all routes
router.use(ensureController);

// Authentication routes
router.post('/login', async (req: any, res: any) => {
  await req.userController.login(req, res);
});

router.post('/register', async (req: any, res: any) => {
  await req.userController.register(req, res);
});

// User management routes
router.get('/', async (req: any, res: any) => {
  await req.userController.getUsers(req, res);
});

router.get('/:id', async (req: any, res: any) => {
  await req.userController.getUserById(req, res);
});

// Create user (generic)
router.post('/', async (req: any, res: any) => {
  await req.userController.createUser(req, res);
});

// Admin creates user on behalf of someone (no verification required)
router.post('/admin-create', async (req: any, res: any) => {
  await req.userController.createUserByAdmin(req, res);
});

router.put('/:id', async (req: any, res: any) => {
  await req.userController.updateUser(req, res);
});

router.delete('/:id', async (req: any, res: any) => {
  await req.userController.deleteUser(req, res);
});

// Verify user email (admin action)
router.put('/:id/verify', async (req: any, res: any) => {
  await req.userController.verifyUser(req, res);
});

export default router;
