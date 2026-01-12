import { Request, Response } from 'express';
import { DatabaseService } from '../services/databaseService';
import { DiscountCode } from '../models/DiscountCode';
import { ApiResponse } from '../types';

export class DiscountCodeController {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // Get all discount codes for an event
  async getDiscountCodesByEvent(req: Request, res: Response): Promise<void> {
    try {
      const eventId = parseInt(req.params.eventId);
      const rows = await this.db.query('SELECT * FROM discount_codes WHERE event_id = ? ORDER BY created_at DESC', [eventId]);
      const codes = rows.map((row: any) => DiscountCode.fromDatabase(row));
      
      const response: ApiResponse = {
        success: true,
        data: codes.map(c => c.toJSON()),
      };
      res.json(response);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Create discount code
  async createDiscountCode(req: Request, res: Response): Promise<void> {
    try {
      const code = new DiscountCode(req.body);
      const result = await this.db.insert('discount_codes', code.toDatabase());
      code.id = result.insertId;
      
      const response: ApiResponse = {
        success: true,
        data: code.toJSON(),
        message: 'Discount code created successfully'
      };
      res.status(201).json(response);
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        res.status(400).json({ success: false, error: 'Discount code already exists' });
      } else {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  }

  // Update discount code
  async updateDiscountCode(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      const code = new DiscountCode({ ...req.body, id });
      await this.db.update('discount_codes', id, code.toDatabase());
      
      const response: ApiResponse = {
        success: true,
        data: code.toJSON(),
        message: 'Discount code updated successfully'
      };
      res.json(response);
    } catch (error: any) {
      if (error.code === 'ER_DUP_ENTRY') {
        res.status(400).json({ success: false, error: 'Discount code already exists' });
      } else {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  }

  // Delete discount code
  async deleteDiscountCode(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      await this.db.delete('discount_codes', id);
      
      const response: ApiResponse = {
        success: true,
        message: 'Discount code deleted successfully'
      };
      res.json(response);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Validate discount code (for registration form)
  async validateDiscountCode(req: Request, res: Response): Promise<void> {
    try {
      const { code, eventId } = req.body;
      if (!code || !eventId) {
        res.status(400).json({ success: false, error: 'Code and eventId are required' });
        return;
      }

      const rows = await this.db.query(
        'SELECT * FROM discount_codes WHERE code = ? AND event_id = ?',
        [code.toUpperCase().trim(), eventId]
      );

      if (rows.length === 0) {
        res.json({ success: true, valid: false, error: 'Invalid discount code' });
        return;
      }

      const discountCode = DiscountCode.fromDatabase(rows[0]);
      const validation = discountCode.isValid();

      if (!validation.valid) {
        res.json({ success: true, valid: false, error: validation.error });
        return;
      }

      res.json({
        success: true,
        valid: true,
        data: discountCode.toJSON()
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

