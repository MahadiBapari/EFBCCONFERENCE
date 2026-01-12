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
    this.expiryDate = data.expiryDate;
    this.usageLimit = data.usageLimit;
    this.usedCount = data.usedCount || 0;
  }

  toDatabase(): any {
    return {
      id: this.id,
      code: this.code.toUpperCase().trim(),
      event_id: this.eventId,
      discount_type: this.discountType,
      discount_value: this.discountValue,
      expiry_date: this.expiryDate || null,
      usage_limit: this.usageLimit || null,
      used_count: this.usedCount || 0,
    };
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

