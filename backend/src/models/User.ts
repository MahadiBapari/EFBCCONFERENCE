import bcrypt from 'bcrypt';
import { User as IUser } from '../types';

export class User {
  public id?: number;
  public name: string;
  public email: string;
  public password: string;
  public role: 'admin' | 'user' | 'guest';
  public isActive: boolean;
  public createdAt?: string;
  public updatedAt?: string;

  constructor(data: Partial<IUser>) {
    this.id = data.id;
    this.name = data.name || '';
    this.email = data.email || '';
    this.password = data.password || '';
    this.role = data.role || 'user';
    this.isActive = data.isActive ?? true;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  // Hash password
  async hashPassword(): Promise<void> {
    if (this.password) {
      const saltRounds = 10;
      this.password = await bcrypt.hash(this.password, saltRounds);
    }
  }

  // Verify password
  async verifyPassword(plainPassword: string): Promise<boolean> {
    return await bcrypt.compare(plainPassword, this.password);
  }

  // Convert to JSON (without password)
  toJSON(): Omit<IUser, 'password'> {
    return {
      id: this.id!,
      name: this.name,
      email: this.email,
      role: this.role,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Convert to database format
  toDatabase(): any {
    return {
      name: this.name,
      email: this.email,
      password: this.password,
      role: this.role,
      isActive: this.isActive,
      created_at: this.createdAt,
      updated_at: this.updatedAt
    };
  }

  // Create from database row
  static fromDatabase(row: any): User {
    return new User({
      id: row.id,
      name: row.name,
      email: row.email,
      password: row.password,
      role: row.role,
      isActive: row.isActive,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  // Validate email format
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate password strength
  static isValidPassword(password: string): boolean {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  // Validate user data
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.name || this.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters long');
    }

    if (!User.isValidEmail(this.email)) {
      errors.push('Invalid email format');
    }

    if (!this.password || this.password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!User.isValidPassword(this.password)) {
      errors.push('Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number');
    }

    if (!['admin', 'user', 'guest'].includes(this.role)) {
      errors.push('Invalid role');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
