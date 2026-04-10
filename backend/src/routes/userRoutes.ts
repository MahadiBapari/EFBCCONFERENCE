import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { DatabaseService } from '../services/databaseService';
import { requireAdmin } from '../middleware/auth';

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

// User management routes (admin-only)
router.get('/', requireAdmin, async (req: any, res: any) => {
  await req.userController.getUsers(req, res);
});

router.get('/:id', requireAdmin, async (req: any, res: any) => {
  await req.userController.getUserById(req, res);
});

router.post('/', requireAdmin, async (req: any, res: any) => {
  await req.userController.createUser(req, res);
});

router.post('/admin-create', requireAdmin, async (req: any, res: any) => {
  await req.userController.createUserByAdmin(req, res);
});

router.put('/:id', requireAdmin, async (req: any, res: any) => {
  await req.userController.updateUser(req, res);
});

router.delete('/:id', requireAdmin, async (req: any, res: any) => {
  await req.userController.deleteUser(req, res);
});

router.put('/:id/verify', requireAdmin, async (req: any, res: any) => {
  await req.userController.verifyUser(req, res);
});

export default router;
