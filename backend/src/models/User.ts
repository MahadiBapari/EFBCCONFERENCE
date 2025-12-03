import bcrypt from 'bcryptjs';
import { User as IUser } from '../types';

export class User {
  public id?: number;
  public name: string;
  public email: string;
  public password: string;
  public role: 'admin' | 'user' | 'guest';
  public isActive: boolean;
  public created_at?: string;
  public updated_at?: string;

  constructor(
    data: Partial<IUser> & {
      created_at?: string;
      updated_at?: string;
      created_At?: string;
      updated_At?: string;
    }
  ) {
    this.id = data.id;
    this.name = data.name || '';
    this.email = data.email || '';
    this.password = data.password || '';
    this.role = data.role || 'user';
    this.isActive = data.isActive ?? true;
    const fmt = (d?: string) => {
      if (!d) return new Date().toISOString().slice(0,19).replace('T',' ');
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return new Date().toISOString().slice(0,19).replace('T',' ');
      return dt.toISOString().slice(0,19).replace('T',' ');
    };
    // accept multiple input shapes for backward compatibility
    const createdInput = (data as any).created_at || (data as any).createdAt || (data as any).created_At;
    const updatedInput = (data as any).updated_at || (data as any).updatedAt || (data as any).updated_At;
    this.created_at = fmt(createdInput);
    this.updated_at = fmt(updatedInput);
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

  // Accessors to maintain camelCase usage across the codebase
  get createdAt(): string | undefined {
    return this.created_at;
  }

  set createdAt(value: string | undefined) {
    this.created_at = value;
  }

  get updatedAt(): string | undefined {
    return this.updated_at;
  }

  set updatedAt(value: string | undefined) {
    this.updated_at = value;
  }

  // Convert to JSON (without password)
  toJSON(): Omit<IUser, 'password'> & { emailVerifiedAt?: string | null } {
    return {
      id: this.id!,
      name: this.name,
      email: this.email,
      role: this.role,
      isActive: this.isActive,
      // expose snake_case columns to align with DB schema
      // Note: API consumers expecting camelCase can map as needed upstream
      createdAt: this.created_at,
      updatedAt: this.updated_at,
      emailVerifiedAt: (this as any).email_verified_at || null
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
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  // Create from database row
  static fromDatabase(row: any): User {
    const user = new User({
      id: row.id,
      name: row.name,
      email: row.email,
      password: row.password,
      role: row.role,
      isActive: row.isActive,
      created_at: row.created_at || row.created_At,
      updated_at: row.updated_at || row.updated_At
    });
    // Store email_verified_at for JSON output
    (user as any).email_verified_at = row.email_verified_at || null;
    return user;
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
