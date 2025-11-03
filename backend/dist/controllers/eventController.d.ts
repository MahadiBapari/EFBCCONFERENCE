import { Request, Response } from 'express';
import { DatabaseService } from '../services/databaseService';
export declare class EventController {
    private db;
    constructor(db: DatabaseService);
    getEvents(req: Request, res: Response): Promise<void>;
    getEventById(req: Request, res: Response): Promise<void>;
    createEvent(req: Request, res: Response): Promise<void>;
    updateEvent(req: Request, res: Response): Promise<void>;
    deleteEvent(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=eventController.d.ts.map