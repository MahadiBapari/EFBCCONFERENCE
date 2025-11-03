import { Request, Response } from 'express';
import { DatabaseService } from '../services/databaseService';
export declare class GroupController {
    private db;
    constructor(db: DatabaseService);
    getGroups(req: Request, res: Response): Promise<void>;
    getGroupById(req: Request, res: Response): Promise<void>;
    createGroup(req: Request, res: Response): Promise<void>;
    updateGroup(req: Request, res: Response): Promise<void>;
    deleteGroup(req: Request, res: Response): Promise<void>;
    addMemberToGroup(req: Request, res: Response): Promise<void>;
    removeMemberFromGroup(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=groupController.d.ts.map