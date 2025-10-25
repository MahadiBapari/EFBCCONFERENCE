import { Router } from 'express';
import { GroupController } from '../controllers/groupController';
import { DatabaseService } from '../services/databaseService';

const router = Router();

// Initialize database service and controller
let groupController: GroupController;

// Initialize controller when database is available
const initController = async () => {
  if (!groupController) {
    // This will be set when the database connection is established
    const db = (globalThis as any).databaseService;
    if (db) {
      groupController = new GroupController(db);
    }
  }
};

// Middleware to ensure controller is initialized
const ensureController = async (req: any, res: any, next: any) => {
  await initController();
  if (!groupController) {
    return res.status(500).json({
      success: false,
      error: 'Database not initialized'
    });
  }
  req.groupController = groupController;
  next();
};

// Apply middleware to all routes
router.use(ensureController);

// Routes
router.get('/', async (req: any, res: any) => {
  await req.groupController.getGroups(req, res);
});

router.get('/:id', async (req: any, res: any) => {
  await req.groupController.getGroupById(req, res);
});

router.post('/', async (req: any, res: any) => {
  await req.groupController.createGroup(req, res);
});

router.put('/:id', async (req: any, res: any) => {
  await req.groupController.updateGroup(req, res);
});

router.delete('/:id', async (req: any, res: any) => {
  await req.groupController.deleteGroup(req, res);
});

router.post('/:id/members', async (req: any, res: any) => {
  await req.groupController.addMemberToGroup(req, res);
});

router.delete('/:id/members', async (req: any, res: any) => {
  await req.groupController.removeMemberFromGroup(req, res);
});

export default router;
