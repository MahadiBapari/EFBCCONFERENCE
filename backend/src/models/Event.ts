import { Event as IEvent } from '../types';

export class Event {
  public id?: number;
  public year: number;
  public name: string;
  public date: string;
  public activities?: string[];
  public location?: string;
  public description?: string[];
  public createdAt?: string;
  public updatedAt?: string;
  public spousePricing?: Array<{ label: string; price: number; startDate?: string; endDate?: string }>;
  public registrationPricing?: Array<{ label: string; price: number; startDate?: string; endDate?: string }>;
  public breakfastPrice?: number;
  public breakfastEndDate?: string;

  constructor(data: Partial<IEvent> & { spousePricing?: any }) {
    this.id = data.id;
    this.year = data.year || (data.date ? new Date(data.date).getFullYear() : new Date().getFullYear());
    this.name = data.name || '';
    this.date = data.date || new Date().toISOString().split('T')[0];
    this.activities = data.activities || [];
    this.location = data.location || '';
    this.description = Array.isArray(data.description) ? data.description : (data.description ? [data.description] : []);
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    this.createdAt = (data as any).createdAt || now;
    this.updatedAt = (data as any).updatedAt || now;
    this.spousePricing = (data as any).spousePricing || [];
    this.registrationPricing = (data as any).registrationPricing || [];
    this.breakfastPrice = (data as any).breakfastPrice ?? undefined;
    this.breakfastEndDate = (data as any).breakfastEndDate || undefined;
  }

  // Convert to JSON
  toJSON(): any {
    return {
      id: this.id!,
      year: this.year,
      name: this.name,
      date: this.date,
      activities: this.activities,
      location: this.location,
      description: this.description,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      spousePricing: this.spousePricing,
      registrationPricing: this.registrationPricing,
      breakfastPrice: this.breakfastPrice,
      breakfastEndDate: this.breakfastEndDate
    };
  }

  // Convert to database format
  toDatabase(): any {
    return {
      name: this.name,
      date: this.date,
      activities: this.activities ? JSON.stringify(this.activities) : null,
      location: this.location,
      description: this.description && this.description.length > 0 ? JSON.stringify(this.description) : null,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
      spouse_pricing: this.spousePricing ? JSON.stringify(this.spousePricing) : null,
      registration_pricing: this.registrationPricing ? JSON.stringify(this.registrationPricing) : null,
      breakfast_price: this.breakfastPrice ?? null,
      breakfast_end_date: this.breakfastEndDate || null
    };
  }

  // Create from database row
  static fromDatabase(row: any): Event {
    let activities: string[] = [];
    if (row.activities) {
      try {
        activities = JSON.parse(row.activities);
      } catch (e) {
        activities = Array.isArray(row.activities) ? row.activities : String(row.activities).split(',');
      }
    }
    let spousePricing: any[] = [];
    let registrationPricing: any[] = [];
    // Support both string and native JSON return types from mysql2
    if (row.spouse_pricing !== undefined && row.spouse_pricing !== null) {
      if (typeof row.spouse_pricing === 'string') {
        try { spousePricing = JSON.parse(row.spouse_pricing); } catch { spousePricing = []; }
      } else if (Array.isArray(row.spouse_pricing)) {
        spousePricing = row.spouse_pricing;
      } else if (typeof row.spouse_pricing === 'object') {
        // Some drivers can return object for JSON columns
        spousePricing = Array.isArray((row.spouse_pricing as any)) ? (row.spouse_pricing as any) : [];
      }
    }
    if (row.registration_pricing !== undefined && row.registration_pricing !== null) {
      if (typeof row.registration_pricing === 'string') {
        try { registrationPricing = JSON.parse(row.registration_pricing); } catch { registrationPricing = []; }
      } else if (Array.isArray(row.registration_pricing)) {
        registrationPricing = row.registration_pricing;
      } else if (typeof row.registration_pricing === 'object') {
        registrationPricing = Array.isArray((row.registration_pricing as any)) ? (row.registration_pricing as any) : [];
      }
    }
    
    return new Event({
      id: row.id,
      name: row.name,
      date: row.date,
      activities: activities,
      location: row.location,
      description: (() => {
        if (!row.description) return [];
        if (typeof row.description === 'string') {
          try {
            const parsed = JSON.parse(row.description);
            return Array.isArray(parsed) ? parsed : [parsed];
          } catch {
            return [row.description];
          }
        }
        return Array.isArray(row.description) ? row.description : [row.description];
      })(),
      createdAt: row.created_at || row.createdAt,
      updatedAt: row.updated_at || row.updatedAt,
      spousePricing,
      registrationPricing,
      breakfastPrice: row.breakfast_price,
      breakfastEndDate: row.breakfast_end_date
    } as any);
  }
}