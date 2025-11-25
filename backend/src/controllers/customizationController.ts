import { Request, Response } from 'express';
import { DatabaseService } from '../services/databaseService';

export class CustomizationController {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // Get email customization settings
  async getEmailCustomization(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.db.query(
        'SELECT * FROM email_customizations WHERE id = 1 LIMIT 1'
      );
      
      if (Array.isArray(result) && result.length > 0) {
        res.json({
          success: true,
          data: {
            id: result[0].id,
            headerText: result[0].header_text || '',
            footerText: result[0].footer_text || '',
            updatedAt: result[0].updated_at,
          },
        });
      } else {
        // Return default empty values if no customization exists
        res.json({
          success: true,
          data: {
            id: null,
            headerText: '',
            footerText: '',
            updatedAt: null,
          },
        });
      }
    } catch (error: any) {
      console.error('Error fetching email customization:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to fetch email customization',
      });
    }
  }

  // Update email customization settings
  async updateEmailCustomization(req: Request, res: Response): Promise<void> {
    try {
      const { headerText, footerText } = req.body;

      // Check if record exists
      const existing = await this.db.query(
        'SELECT id FROM email_customizations WHERE id = 1 LIMIT 1'
      );

      if (Array.isArray(existing) && existing.length > 0) {
        // Update existing record
        await this.db.query(
          `UPDATE email_customizations 
           SET header_text = ?, footer_text = ?, updated_at = NOW() 
           WHERE id = 1`,
          [headerText || '', footerText || '']
        );
      } else {
        // Insert new record
        await this.db.query(
          `INSERT INTO email_customizations (id, header_text, footer_text, created_at, updated_at) 
           VALUES (1, ?, ?, NOW(), NOW())`,
          [headerText || '', footerText || '']
        );
      }

      res.json({
        success: true,
        message: 'Email customization updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating email customization:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to update email customization',
      });
    }
  }

  // Get contact customization settings
  async getContactCustomization(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.db.query(
        'SELECT * FROM contact_customizations WHERE id = 1 LIMIT 1'
      );
      
      if (Array.isArray(result) && result.length > 0) {
        res.json({
          success: true,
          data: {
            id: result[0].id,
            contactEmail: result[0].contact_email || '',
            contactPhone: result[0].contact_phone || '',
            updatedAt: result[0].updated_at,
          },
        });
      } else {
        // Return default empty values if no customization exists
        res.json({
          success: true,
          data: {
            id: null,
            contactEmail: '',
            contactPhone: '',
            updatedAt: null,
          },
        });
      }
    } catch (error: any) {
      console.error('Error fetching contact customization:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to fetch contact customization',
      });
    }
  }

  // Update contact customization settings
  async updateContactCustomization(req: Request, res: Response): Promise<void> {
    try {
      const { contactEmail, contactPhone } = req.body;

      // Check if record exists
      const existing = await this.db.query(
        'SELECT id FROM contact_customizations WHERE id = 1 LIMIT 1'
      );

      if (Array.isArray(existing) && existing.length > 0) {
        // Update existing record
        await this.db.query(
          `UPDATE contact_customizations 
           SET contact_email = ?, contact_phone = ?, updated_at = NOW() 
           WHERE id = 1`,
          [contactEmail || '', contactPhone || '']
        );
      } else {
        // Insert new record
        await this.db.query(
          `INSERT INTO contact_customizations (id, contact_email, contact_phone, created_at, updated_at) 
           VALUES (1, ?, ?, NOW(), NOW())`,
          [contactEmail || '', contactPhone || '']
        );
      }

      res.json({
        success: true,
        message: 'Contact customization updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating contact customization:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to update contact customization',
      });
    }
  }
}

