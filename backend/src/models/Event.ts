import { Event as IEvent } from '../types';

export class Event {
  public id?: number;
  public year: number;
  public name: string;
  public date: string;
  public eventId: number;
  public activities?: string[];
  public location?: string;
  public description?: string;
  public createdAt?: string;
  public updatedAt?: string;

  constructor(data: Partial<IEvent>) {
    this.id = data.id;
    this.year = data.year || new Date().getFullYear();
    this.name = data.name || '';
    this.date = data.date || new Date().toISOString().split('T')[0];
    this.eventId = data.eventId ?? Date.now();
    this.activities = data.activities || [];
    this.location = data.location || '';
    this.description = data.description || '';
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  // Convert to JSON
  toJSON(): IEvent {
    return {
      id: this.id!,
      year: this.year,
      name: this.name,
      date: this.date,
      eventId: this.eventId,
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
      year: this.year,
      name: this.name,
      date: this.date,
      eventId: this.eventId,
      activities: this.activities ? JSON.stringify(this.activities) : null,
      location: this.location,
      description: this.description,
      created_at: this.createdAt,
      updated_at: this.updatedAt
    };
  }

  // Create from database row
  static fromDatabase(row: any): Event {
    return new Event({
      id: row.id,
      year: row.year,
      name: row.name,
      date: row.date,
      eventId: row.eventId,
      activities: row.activities ? JSON.parse(row.activities) : [],
      location: row.location,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
}