import { Group as IGroup } from '../types';

export class Group {
  public id?: number;
  public eventId: number;
  public category: string;
  public name: string;
  public members: number[];
  public createdAt?: string;
  public updatedAt?: string;

  private formatDateForDB(dateValue: string | Date | undefined): string {
    if (!dateValue) {
      return new Date().toISOString().slice(0, 19).replace('T', ' ');
    }
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    if (isNaN(date.getTime())) {
      return new Date().toISOString().slice(0, 19).replace('T', ' ');
    }
    return date.toISOString().slice(0, 19).replace('T', ' ');
  }

  constructor(data: Partial<IGroup>) {
    this.id = data.id;
    this.eventId = data.eventId || 1;
    this.category = data.category || 'Networking';
    this.name = data.name || '';
    this.members = data.members || [];
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  // Convert to JSON
  toJSON(): IGroup {
    return {
      id: this.id!,
      eventId: this.eventId,
      category: this.category,
      name: this.name,
      members: this.members,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Convert to database format
  toDatabase(): any {
    return {
      eventId: this.eventId,
      category: this.category,
      name: this.name,
      members: JSON.stringify(this.members),
      created_at: this.formatDateForDB(this.createdAt || new Date().toISOString()),
      updated_at: this.formatDateForDB(this.updatedAt || new Date().toISOString())
    };
  }

  // Create from database row
  static fromDatabase(row: any): Group {
    return new Group({
      id: row.id,
      eventId: row.eventId,
      category: row.category,
      name: row.name,
      members: row.members ? JSON.parse(row.members) : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  // Add member to group
  addMember(memberId: number): void {
    if (!this.members.includes(memberId)) {
      this.members.push(memberId);
      this.updatedAt = new Date().toISOString();
    }
  }

  // Remove member from group
  removeMember(memberId: number): void {
    this.members = this.members.filter(id => id !== memberId);
    this.updatedAt = new Date().toISOString();
  }

  // Check if member is in group
  hasMember(memberId: number): boolean {
    return this.members.includes(memberId);
  }
}
