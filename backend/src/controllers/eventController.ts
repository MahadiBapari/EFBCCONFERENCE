import { Request, Response } from 'express';
import { Event } from '../models/Event';
import { ApiResponse, CreateEventRequest, UpdateEventRequest, EventQuery } from '../types';
import { DatabaseService } from '../services/databaseService';

export class EventController {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // Get all events
  async getEvents(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, search } = req.query as EventQuery;
      const offset = (Number(page) - 1) * Number(limit);

      let conditions: Record<string, any> = {};
      if (search) {
        // For search, we'll use LIKE in the query
        const searchCondition = `name LIKE '%${search}%' OR location LIKE '%${search}%'`;
        const events = await this.db.query(
          `SELECT * FROM events WHERE ${searchCondition} LIMIT ? OFFSET ?`,
          [Number(limit), offset]
        );
        const total = await this.db.query(
          `SELECT COUNT(*) as count FROM events WHERE ${searchCondition}`
        );

        const response: ApiResponse = {
          success: true,
          data: events.map((row: any) => Event.fromDatabase(row).toJSON()),
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: total[0].count,
            totalPages: Math.ceil(total[0].count / Number(limit))
          }
        };

        res.status(200).json(response);
        return;
      }

      const events = await this.db.findAll('events', conditions, Number(limit), offset);
      const total = await this.db.count('events', conditions);

      const response: ApiResponse = {
        success: true,
        data: events.map((row: any) => Event.fromDatabase(row).toJSON()),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit))
        }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching events:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to fetch events'
      };
      res.status(500).json(response);
    }
  }

  // Get event by ID
  async getEventById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const event = await this.db.findById('events', Number(id));

      if (!event) {
        const response: ApiResponse = {
          success: false,
          error: 'Event not found'
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: Event.fromDatabase(event).toJSON()
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching event:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to fetch event'
      };
      res.status(500).json(response);
    }
  }

  // Create new event
  async createEvent(req: Request, res: Response): Promise<void> {
    try {
      const eventData: CreateEventRequest = req.body;
      // Normalize date to YYYY-MM-DD to avoid locale-specific formats from browsers
      if (eventData.date) {
        const dt = new Date(eventData.date);
        if (!isNaN(dt.getTime())) {
          (eventData as any).date = dt.toISOString().slice(0, 10);
        }
      }
      // Normalize optional breakfast_end_date
      if ((eventData as any).breakfastEndDate) {
        const bed = new Date((eventData as any).breakfastEndDate as any);
        if (!isNaN(bed.getTime())) {
          (eventData as any).breakfastEndDate = bed.toISOString().slice(0, 10);
        } else {
          // handle strings like '2026-02-12T00:00:00.000Z'
          const raw = String((eventData as any).breakfastEndDate);
          (eventData as any).breakfastEndDate = raw.slice(0, 10);
        }
      }
      const event = new Event(eventData);
      
      const result = await this.db.insert('events', event.toDatabase());
      event.id = result.insertId;

      const response: ApiResponse = {
        success: true,
        data: event.toJSON(),
        message: 'Event created successfully'
      };

      res.status(201).json(response);
    } catch (error: any) {
      console.error('Error creating event:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to create event',
        message: error.message || 'An unexpected error occurred'
      };
      res.status(500).json(response);
    }
  }

  // Update event
  async updateEvent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: UpdateEventRequest = req.body;
      // Normalize incoming date if provided
      if ((updateData as any).date) {
        const dt = new Date((updateData as any).date as any);
        if (!isNaN(dt.getTime())) {
          (updateData as any).date = dt.toISOString().slice(0, 10);
        }
      }
      // Normalize optional breakfast_end_date
      if ((updateData as any).breakfastEndDate) {
        const bed = new Date((updateData as any).breakfastEndDate as any);
        if (!isNaN(bed.getTime())) {
          (updateData as any).breakfastEndDate = bed.toISOString().slice(0, 10);
        } else {
          const raw = String((updateData as any).breakfastEndDate);
          (updateData as any).breakfastEndDate = raw.slice(0, 10);
        }
      }
      
      const existingEventData = await this.db.findById('events', Number(id));
      if (!existingEventData) {
        const response: ApiResponse = {
          success: false,
          error: 'Event not found'
        };
        res.status(404).json(response);
        return;
      }

      const event = Event.fromDatabase(existingEventData);
      Object.assign(event, updateData);
      event.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
      
      await this.db.update('events', Number(id), event.toDatabase());

      const response: ApiResponse = {
        success: true,
        data: event.toJSON(),
        message: 'Event updated successfully'
      };

      res.status(200).json(response);
    } catch (error: any) {
      console.error('Error updating event:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to update event',
        message: error.message || 'An unexpected error occurred'
      };
      res.status(500).json(response);
    }
  }

  // Delete event
  async deleteEvent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const existingEvent = await this.db.findById('events', Number(id));
      if (!existingEvent) {
        const response: ApiResponse = {
          success: false,
          error: 'Event not found'
        };
        res.status(404).json(response);
        return;
      }

      await this.db.delete('events', Number(id));

      const response: ApiResponse = {
        success: true,
        message: 'Event deleted successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error deleting event:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to delete event'
      };
      res.status(500).json(response);
    }
  }
}
