import { Event as IEvent } from '../types';

export class Event {
  public id?: number;
  public year: number;
  public name: string;
  public date: string;
  public activities?: string[];
  public location?: string;
  public description?: string;
  public createdAt?: string;
  public updatedAt?: string;

  constructor(data: Partial<IEvent>) {
    this.id = data.id;
    this.year = data.year || (data.date ? new Date(data.date).getFullYear() : new Date().getFullYear());
    this.name = data.name || '';
    this.date = data.date || new Date().toISOString().split('T')[0];
    this.activities = data.activities || [];
    this.location = data.location || '';
    this.description = data.description || '';
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    this.createdAt = data.createdAt ? new Date(data.createdAt).toISOString().slice(0, 19).replace('T', ' ') : now;
    this.updatedAt = data.updatedAt ? new Date(data.updatedAt).toISOString().slice(0, 19).replace('T', ' ') : now;
  }

  // Convert to JSON
  toJSON(): IEvent {
    return {
      id: this.id!,
      year: this.year,
      name: this.name,
      date: this.date,
      activities: this.activities,
      location: this.location,
      description: this.description,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Convert to database format
  toDatabase(): any {
    return {
      name: this.name,
      date: this.date,
      activities: this.activities ? JSON.stringify(this.activities) : null,
      location: this.location,
      description: this.description,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Create from database row
  static fromDatabase(row: any): Event {
    let activities: string[] = [];
    if (row.activities) {
      try {
        activities = JSON.parse(row.activities);
      } catch (e) {
        // Fallback for non-JSON strings
        activities = Array.isArray(row.activities) ? row.activities : String(row.activities).split(',');
      }
    }
    
    return new Event({
      id: row.id,
      name: row.name,
      date: row.date,
      activities: activities,
      location: row.location,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    });
  }
}