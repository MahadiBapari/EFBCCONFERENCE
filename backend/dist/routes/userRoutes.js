"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const router = (0, express_1.Router)();
let userController;
const initController = async () => {
    if (!userController) {
        const db = globalThis.databaseService;
        if (db) {
            userController = new userController_1.UserController(db);
        }
    }
};
const ensureController = async (req, res, next) => {
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
router.use(ensureController);
router.post('/login', async (req, res) => {
    await req.userController.login(req, res);
});
router.post('/register', async (req, res) => {
    await req.userController.register(req, res);
});
router.get('/', async (req, res) => {
    await req.userController.getUsers(req, res);
});
router.get('/:id', async (req, res) => {
    await req.userController.getUserById(req, res);
});
router.post('/', async (req, res) => {
    await req.userController.createUser(req, res);
});
router.put('/:id', async (req, res) => {
    await req.userController.updateUser(req, res);
});
router.delete('/:id', async (req, res) => {
    await req.userController.deleteUser(req, res);
});
exports.default = router;
//# sourceMappingURL=userRoutes.js.map