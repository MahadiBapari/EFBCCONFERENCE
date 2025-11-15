import { Request, Response } from 'express';
import { DatabaseService } from '../services/databaseService';
export declare class UserController {
    private db;
    constructor(db: DatabaseService);
    getUsers(req: Request, res: Response): Promise<void>;
    getUserById(req: Request, res: Response): Promise<void>;
    createUser(req: Request, res: Response): Promise<void>;
    createUserByAdmin(req: Request, res: Response): Promise<void>;
    updateUser(req: Request, res: Response): Promise<void>;
    deleteUser(req: Request, res: Response): Promise<void>;
    login(req: Request, res: Response): Promise<void>;
    register(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=userController.d.ts.map