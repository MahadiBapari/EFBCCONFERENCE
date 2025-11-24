import { Request, Response } from 'express';
import { Registration } from '../models/Registration';
import { ApiResponse, CreateRegistrationRequest, UpdateRegistrationRequest, RegistrationQuery } from '../types';
import { DatabaseService } from '../services/databaseService';
import { sendRegistrationConfirmationEmail } from '../services/emailService';

export class RegistrationController {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // Get all registrations
  async getRegistrations(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, eventId, category, search } = req.query as RegistrationQuery;
      const offset = (Number(page) - 1) * Number(limit);

      // Map camelCase to snake_case for database columns
      let conditions: Record<string, any> = {};
      if (eventId) conditions.event_id = eventId;
      if (category) conditions.category = category;

      let registrations;
      let total;

      if (search) {
        const searchCondition = `first_name LIKE '%${search}%' OR last_name LIKE '%${search}%' OR email LIKE '%${search}%' OR organization LIKE '%${search}%'`;
        let whereClause = searchCondition;
        
        if (Object.keys(conditions).length > 0) {
          const conditionClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
          whereClause = `${conditionClause} AND ${searchCondition}`;
        }

        registrations = await this.db.query(
          `SELECT * FROM registrations WHERE ${whereClause} LIMIT ? OFFSET ?`,
          [...Object.values(conditions), Number(limit), offset]
        );
        
        total = await this.db.query(
          `SELECT COUNT(*) as count FROM registrations WHERE ${whereClause}`,
          Object.values(conditions)
        );
      } else {
        registrations = await this.db.findAll('registrations', conditions, Number(limit), offset);
        total = await this.db.count('registrations', conditions);
      }

      const response: ApiResponse = {
        success: true,
        data: registrations.map((row: any) => Registration.fromDatabase(row).toJSON()),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Array.isArray(total) ? total[0].count : total,
          totalPages: Math.ceil((Array.isArray(total) ? total[0].count : total) / Number(limit))
        }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to fetch registrations'
      };
      res.status(500).json(response);
    }
  }

  // Get registration by ID
  async getRegistrationById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const registration = await this.db.findById('registrations', Number(id));

      if (!registration) {
        const response: ApiResponse = {
          success: false,
          error: 'Registration not found'
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: Registration.fromDatabase(registration).toJSON()
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching registration:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to fetch registration'
      };
      res.status(500).json(response);
    }
  }

  // Create new registration
  async createRegistration(req: Request, res: Response): Promise<void> {
    try {
      const registrationData: CreateRegistrationRequest = req.body;
      const registration = new Registration(registrationData);
      // Compute total dynamically from event pricing
      try {
        const ev: any = await this.db.findById('events', registration.eventId);
        if (ev) {
          const parseJson = (v:any)=>{ try { return JSON.parse(v||'[]'); } catch { return []; } };
          const regTiers: any[] = parseJson(ev.registration_pricing);
          const spouseTiers: any[] = parseJson(ev.spouse_pricing);
          const breakfastPrice = Number(ev.breakfast_price ?? 0);
          const bEnd = ev.breakfast_end_date ? new Date(ev.breakfast_end_date).getTime() : Infinity;
          const now = Date.now();
          const pick = (tiers:any[])=>{
            const mapped = (tiers||[]).map(t=>({ ...t, s: t.startDate? new Date(t.startDate).getTime(): -Infinity, e: t.endDate? new Date(t.endDate).getTime(): Infinity }));
            return mapped.find((t:any)=> now>=t.s && now<=t.e) || mapped[mapped.length-1] || null;
          };
          const base = pick(regTiers);
          const spouse = registration.spouseDinnerTicket ? pick(spouseTiers) : null;
          let total = 0;
          if (base && typeof base.price==='number') total += base.price; else total += Number(ev.default_price || 0);
          if (spouse && typeof spouse.price==='number') total += spouse.price;
          if ((registration as any).spouseBreakfast && now <= bEnd) total += (isNaN(breakfastPrice)?0:breakfastPrice);
          registration.totalPrice = total || registration.totalPrice || 0;
        }
      } catch (e) {
        // fallback to existing total if compute fails
      }
      
      const result = await this.db.insert('registrations', registration.toDatabase());
      registration.id = result.insertId;

      // Fire-and-forget confirmation emails (primary, secondary if any, and admin copy)
      const adminCopy = process.env.ADMIN_NOTIFY_EMAIL || 'info@efbcconference.org';
      const toName = registration.badgeName || `${registration.firstName} ${registration.lastName}`.trim();
      const eventRow: any = await this.db.findById('events', registration.eventId);
      const evName = eventRow?.name;
      const evDate = eventRow?.date;
      const payload = {
        name: toName,
        eventName: evName,
        eventDate: evDate,
        totalPrice: registration.totalPrice,
        registration: registration.toJSON ? registration.toJSON() : registration
      } as any;
      sendRegistrationConfirmationEmail({ to: registration.email, ...payload }).catch((e) => console.warn('⚠️ Failed to send registration confirmation:', e));
      if ((registration as any).secondaryEmail) {
        sendRegistrationConfirmationEmail({ to: (registration as any).secondaryEmail, ...payload }).catch((e) => console.warn('⚠️ Failed to send secondary confirmation:', e));
      }
      if (adminCopy) {
        sendRegistrationConfirmationEmail({ to: adminCopy, ...payload }).catch((e) => console.warn('⚠️ Failed to send admin confirmation:', e));
      }

      const response: ApiResponse = {
        success: true,
        data: registration.toJSON(),
        message: 'Registration created successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error creating registration:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to create registration'
      };
      res.status(500).json(response);
    }
  }

  // Update registration
  async updateRegistration(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: UpdateRegistrationRequest = req.body || {};
      
      console.log(`[UPDATE] Received update request for registration ${id}`);
      console.log(`[UPDATE] Update data keys:`, Object.keys(updateData));
      console.log(`[UPDATE] Sample fields:`, {
        firstName: updateData.firstName,
        email: updateData.email,
        clubRentals: updateData.clubRentals,
        wednesdayActivity: updateData.wednesdayActivity
      });
      
      const existingRow = await this.db.findById('registrations', Number(id));
      if (!existingRow) {
        console.log(`[UPDATE] Registration ${id} not found in database`);
        const response: ApiResponse = {
          success: false,
          error: 'Registration not found'
        };
        res.status(404).json(response);
        return;
      }

      console.log(`[UPDATE] Found existing registration ${id}`);
      
      // Map camelCase fields from updateData to snake_case database columns
      const fieldMapping: Record<string, string> = {
        userId: 'user_id',
        eventId: 'event_id',
        firstName: 'first_name',
        lastName: 'last_name',
        badgeName: 'badge_name',
        email: 'email',
        secondaryEmail: 'secondary_email',
        organization: 'organization',
        jobTitle: 'job_title',
        address: 'address',
        mobile: 'mobile',
        officePhone: 'office_phone',
        isFirstTimeAttending: 'is_first_time_attending',
        companyType: 'company_type',
        companyTypeOther: 'company_type_other',
        emergencyContactName: 'emergency_contact_name',
        emergencyContactPhone: 'emergency_contact_phone',
        wednesdayActivity: 'wednesday_activity',
        wednesdayReception: 'wednesday_reception',
        thursdayBreakfast: 'thursday_breakfast',
        thursdayLuncheon: 'thursday_luncheon',
        thursdayDinner: 'thursday_dinner',
        fridayBreakfast: 'friday_breakfast',
        dietaryRestrictions: 'dietary_restrictions',
        specialRequests: 'special_requests',
        clubRentals: 'club_rentals',
        golfHandicap: 'golf_handicap',
        massageTimeSlot: 'massage_time_slot',
        spouseDinnerTicket: 'spouse_dinner_ticket',
        spouseBreakfast: 'spouse_breakfast',
        tuesdayEarlyReception: 'tuesday_early_reception',
        spouseFirstName: 'spouse_first_name',
        spouseLastName: 'spouse_last_name',
        totalPrice: 'total_price',
        paymentMethod: 'payment_method',
        paid: 'paid',
        squarePaymentId: 'square_payment_id',
      };
      
      // Build update payload by mapping fields and converting values
      const dbPayload: any = {
        updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
      };
      
      const updateDataObj = updateData as any || {};
      
      // Check if activity is being updated and determine if golf/massage fields should be cleared
      const updatedActivity = updateDataObj.wednesdayActivity || existingRow.wednesday_activity || '';
      const isGolf = updatedActivity.toLowerCase().includes('golf');
      const isMassage = updatedActivity.toLowerCase().includes('massage');
      
      for (const [camelKey, dbKey] of Object.entries(fieldMapping)) {
        if (camelKey in updateDataObj && camelKey !== 'id') {
          let value = updateDataObj[camelKey];
          
          // Clear golf-related fields if activity is not golf
          if ((camelKey === 'clubRentals' || camelKey === 'golfHandicap') && !isGolf) {
            value = null;
          }
          
          // Clear massage field if activity is not massage
          if (camelKey === 'massageTimeSlot' && !isMassage) {
            value = null;
          }
          
          // Handle special conversions
          if (camelKey === 'spouseDinnerTicket') {
            value = value === true || value === 'Yes' || value === 'yes' || value === 1 ? 1 : 0;
          } else if (camelKey === 'isFirstTimeAttending' || camelKey === 'spouseBreakfast' || camelKey === 'paid') {
            value = value === true || value === 1 ? 1 : 0;
          } else if (value === null || value === undefined) {
            value = null;
          }
          
          dbPayload[dbKey] = value;
        }
      }
      
      // Explicitly clear fields if activity changed and they're not applicable
      if (updateDataObj.wednesdayActivity !== undefined) {
        if (!isGolf) {
          dbPayload.club_rentals = null;
          dbPayload.golf_handicap = null;
        }
        if (!isMassage) {
          dbPayload.massage_time_slot = null;
        }
      }
      console.log(`[UPDATE] Database payload keys:`, Object.keys(dbPayload));
      console.log(`[UPDATE] Sample DB fields:`, {
        first_name: dbPayload.first_name,
        email: dbPayload.email,
        club_rentals: dbPayload.club_rentals,
        wednesday_activity: dbPayload.wednesday_activity
      });
      
      const updateResult = await this.db.update('registrations', Number(id), dbPayload);
      console.log(`[UPDATE] Database update result:`, updateResult);
      
      // Verify the update by fetching the updated record
      const verifyRow = await this.db.findById('registrations', Number(id));
      console.log(`[UPDATE] Verification - Updated record:`, {
        first_name: verifyRow?.first_name,
        email: verifyRow?.email,
        club_rentals: verifyRow?.club_rentals,
        wednesday_activity: verifyRow?.wednesday_activity
      });

      // Convert the updated row back to Registration object for response
      const updatedRegistration = Registration.fromDatabase(verifyRow);

      const response: ApiResponse = {
        success: true,
        data: updatedRegistration.toJSON(),
        message: 'Registration updated successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error updating registration:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to update registration'
      };
      res.status(500).json(response);
    }
  }

  // Delete registration
  async deleteRegistration(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const existingRegistration = await this.db.findById('registrations', Number(id));
      if (!existingRegistration) {
        const response: ApiResponse = {
          success: false,
          error: 'Registration not found'
        };
        res.status(404).json(response);
        return;
      }

      await this.db.delete('registrations', Number(id));

      const response: ApiResponse = {
        success: true,
        message: 'Registration deleted successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error deleting registration:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to delete registration'
      };
      res.status(500).json(response);
    }
  }

  // Bulk delete registrations
  async bulkDeleteRegistrations(req: Request, res: Response): Promise<void> {
    try {
      const { ids } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid registration IDs provided'
        };
        res.status(400).json(response);
        return;
      }

      const placeholders = ids.map(() => '?').join(',');
      await this.db.query(`DELETE FROM registrations WHERE id IN (${placeholders})`, ids);

      const response: ApiResponse = {
        success: true,
        message: `${ids.length} registrations deleted successfully`
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error bulk deleting registrations:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to delete registrations'
      };
      res.status(500).json(response);
    }
  }
}
