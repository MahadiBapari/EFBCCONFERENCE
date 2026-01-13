import { DiscountCode as IDiscountCode } from '../types';

export class DiscountCode {
  public id?: number;
  public code: string;
  public eventId: number;
  public discountType: 'percentage' | 'fixed';
  public discountValue: number;
  public expiryDate?: string;
  public usageLimit?: number;
  public usedCount: number;

  constructor(data: Partial<IDiscountCode>) {
    this.id = data.id;
    this.code = data.code || '';
    this.eventId = data.eventId || 0;
    this.discountType = data.discountType || 'percentage';
    this.discountValue = data.discountValue || 0;
    // Explicitly handle undefined/null/empty - set to undefined (will be converted to null in toDatabase)
    this.expiryDate = data.expiryDate !== undefined && data.expiryDate !== null && data.expiryDate !== '' 
      ? data.expiryDate 
      : undefined;
    this.usageLimit = data.usageLimit !== undefined && data.usageLimit !== null && data.usageLimit !== ''
      ? (typeof data.usageLimit === 'number' ? data.usageLimit : parseInt(String(data.usageLimit)))
      : undefined;
    this.usedCount = data.usedCount || 0;
  }

  toDatabase(): any {
    const data: any = {
      code: this.code.toUpperCase().trim(),
      event_id: this.eventId,
      discount_type: this.discountType,
      discount_value: this.discountValue,
      used_count: this.usedCount || 0,
    };
    
    // Only include id if it exists (for updates)
    if (this.id !== undefined) {
      data.id = this.id;
    }
    
    // Convert undefined to null for optional fields
    data.expiry_date = this.expiryDate !== undefined ? this.expiryDate : null;
    data.usage_limit = this.usageLimit !== undefined ? this.usageLimit : null;
    
    return data;
  }

  static fromDatabase(row: any): DiscountCode {
    return new DiscountCode({
      id: row.id,
      code: row.code || row.code,
      eventId: row.event_id || row.eventId,
      discountType: row.discount_type || row.discountType,
      discountValue: row.discount_value || row.discountValue,
      expiryDate: row.expiry_date || row.expiryDate,
      usageLimit: row.usage_limit || row.usageLimit,
      usedCount: row.used_count || row.usedCount,
      createdAt: row.created_at || row.createdAt,
      updatedAt: row.updated_at || row.updatedAt,
    });
  }

  toJSON(): IDiscountCode {
    return {
      id: this.id,
      code: this.code,
      eventId: this.eventId,
      discountType: this.discountType,
      discountValue: this.discountValue,
      expiryDate: this.expiryDate,
      usageLimit: this.usageLimit,
      usedCount: this.usedCount,
      createdAt: (this as any).createdAt,
      updatedAt: (this as any).updatedAt,
    };
  }

  // Validate if code is still valid
  isValid(): { valid: boolean; error?: string } {
    const now = new Date();
    
    // Check expiry
    if (this.expiryDate) {
      const expiry = new Date(this.expiryDate);
      if (now > expiry) {
        return { valid: false, error: 'This discount code has expired' };
      }
    }
    
    // Check usage limit
    if (this.usageLimit !== undefined && this.usedCount >= this.usageLimit) {
      return { valid: false, error: 'This discount code has reached its usage limit' };
    }
    
    return { valid: true };
  }
}

