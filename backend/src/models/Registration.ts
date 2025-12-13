import { Registration as IRegistration } from '../types';

export class Registration {
  public id?: number;
  public userId: number;
  public eventId: number;
  public firstName: string;
  public lastName: string;
  public badgeName: string;
  public email: string;
  public secondaryEmail?: string;
  public organization: string;
  public jobTitle: string;
  public address: string; // Legacy field, kept for backward compatibility
  public addressStreet?: string;
  public city?: string;
  public state?: string;
  public zipCode?: string;
  public country?: string;
  public mobile: string;
  public officePhone?: string;
  public isFirstTimeAttending: boolean;
  public companyType: string;
  public companyTypeOther?: string;
  public emergencyContactName?: string;
  public emergencyContactPhone?: string;
  public wednesdayActivity: 'Golf Tournament' | 'Fishing' | 'Networking' | 'None';
  public wednesdayReception: 'I will attend' | 'I will NOT attend';
  public thursdayBreakfast: 'I will attend' | 'I will NOT attend';
  public thursdayLunch: 'I will attend' | 'I will NOT attend';
  public thursdayReception: 'I will attend' | 'I will NOT attend';
  public fridayBreakfast: 'I will attend' | 'I will NOT attend';
  public fridayDinner: 'I will attend' | 'I will NOT attend';
  public dietaryRestrictions?: string;
  public specialRequests?: string;
  public clubRentals?: string;
  public golfHandicap?: string;
  public massageTimeSlot?: string;
  public pickleballEquipment?: boolean;
  public spouseBreakfast?: boolean;
  public tuesdayEarlyReception?: 'I will attend' | 'I will NOT attend';
  public spouseFirstName?: string;
  public spouseLastName?: string;
  public spouseDinnerTicket: boolean;
  public childFirstName?: string;
  public childLastName?: string;
  public childLunchTicket?: boolean;
  public totalPrice: number;
  public paymentMethod: 'Card' | 'Check';
  public name: string;
  public category: string;
  public createdAt?: string;
  public updatedAt?: string;
  public status?: 'active' | 'cancelled';
  public cancellationReason?: string;
  public cancellationAt?: string;
  public paid?: boolean;
  public paidAt?: string;
  public squarePaymentId?: string;
  public spousePaymentId?: string;
  public spousePaidAt?: string;
  public groupAssigned?: number;

  // Helper method to format dates for MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
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

  constructor(data: Partial<IRegistration>) {
    this.id = data.id;
    this.userId = data.userId ?? 1;
    this.eventId = data.eventId ?? 1;
    this.firstName = data.firstName || '';
    this.lastName = data.lastName || '';
    this.badgeName = data.badgeName || '';
    this.email = data.email || '';
    this.secondaryEmail = data.secondaryEmail;
    this.organization = data.organization || '';
    this.jobTitle = data.jobTitle || '';
    this.address = data.address || '';
    this.addressStreet = (data as any).addressStreet;
    this.city = (data as any).city;
    this.state = (data as any).state;
    this.zipCode = (data as any).zipCode;
    this.country = (data as any).country;
    this.mobile = data.mobile || '';
    this.officePhone = data.officePhone;
    this.isFirstTimeAttending = data.isFirstTimeAttending || false;
    this.companyType = data.companyType || '';
    this.companyTypeOther = data.companyTypeOther;
    this.emergencyContactName = data.emergencyContactName;
    this.emergencyContactPhone = data.emergencyContactPhone;
    this.wednesdayActivity = data.wednesdayActivity || 'None';
    this.wednesdayReception = data.wednesdayReception || 'I will attend';
    this.thursdayBreakfast = data.thursdayBreakfast || 'I will attend';
    // Support both thursdayLunch/thursdayLuncheon and thursdayReception/thursdayDinner for frontend compatibility
    this.thursdayLunch = (data as any).thursdayLunch || (data as any).thursdayLuncheon || 'I will attend';
    this.thursdayReception = (data as any).thursdayReception || (data as any).thursdayDinner || 'I will attend';
    this.fridayBreakfast = data.fridayBreakfast || 'I will attend';
    this.fridayDinner = data.fridayDinner || 'I will attend';
    this.dietaryRestrictions = data.dietaryRestrictions;
    this.specialRequests = (data as any).specialRequests;
    // Handle clubRentals as string (preference or 'I will bring my own')
    // Support backward compatibility with boolean values
    const cr = (data as any).clubRentals;
    if (typeof cr === 'boolean') {
      this.clubRentals = cr ? undefined : 'I will bring my own';
    } else if (typeof cr === 'string') {
      this.clubRentals = cr || undefined;
    } else {
      this.clubRentals = undefined;
    }
    this.spouseBreakfast = (data as any).spouseBreakfast ?? false;
    this.tuesdayEarlyReception = (data as any).tuesdayEarlyReception ?? 'I will attend';
    this.golfHandicap = (data as any).golfHandicap;
    this.massageTimeSlot = (data as any).massageTimeSlot;
    const pbe: any = (data as any).pickleballEquipment;
    // Only set pickleballEquipment if it's explicitly provided (true/false), otherwise leave it undefined
    if (pbe !== undefined && pbe !== null) {
      this.pickleballEquipment = pbe === true || pbe === 'Yes' || pbe === 'yes' || pbe === 1;
    } else {
      this.pickleballEquipment = undefined;
    }
    this.spouseFirstName = data.spouseFirstName;
    this.spouseLastName = data.spouseLastName;
    // Accept boolean or "Yes"/"No" and normalize to boolean
    const sdt: any = (data as any).spouseDinnerTicket;
    this.spouseDinnerTicket = sdt === true || sdt === 'Yes' || sdt === 'yes' || sdt === 1;
    this.childFirstName = (data as any).childFirstName;
    this.childLastName = (data as any).childLastName;
    const clt: any = (data as any).childLunchTicket;
    this.childLunchTicket = clt === true || clt === 'Yes' || clt === 'yes' || clt === 1 || false;
    this.totalPrice = data.totalPrice || 0;
    this.paymentMethod = data.paymentMethod || 'Card';
    this.name = data.name || `${this.firstName} ${this.lastName}`;
    this.category = data.category || 'Networking';
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    // optional cancellation fields
    this.status = (data as any).status as any;
    this.cancellationReason = (data as any).cancellationReason as any;
    this.cancellationAt = (data as any).cancellationAt as any;
    this.paid = (data as any).paid as any;
    this.squarePaymentId = (data as any).squarePaymentId as any;
    this.spousePaymentId = (data as any).spousePaymentId ?? (data as any).spouse_payment_id ?? undefined;
    this.groupAssigned = (data as any).groupAssigned ?? (data as any).group_assigned ?? undefined;
  }

  // Convert to JSON
  toJSON(): IRegistration {
    const base: any = {
      id: this.id!,
      userId: this.userId,
      eventId: this.eventId,
      firstName: this.firstName,
      lastName: this.lastName,
      badgeName: this.badgeName,
      email: this.email,
      secondaryEmail: this.secondaryEmail,
      organization: this.organization,
      jobTitle: this.jobTitle,
      address: this.address,
      addressStreet: this.addressStreet,
      city: this.city,
      state: this.state,
      zipCode: this.zipCode,
      country: this.country,
      mobile: this.mobile,
      officePhone: this.officePhone,
      isFirstTimeAttending: this.isFirstTimeAttending,
      companyType: this.companyType,
      companyTypeOther: this.companyTypeOther,
      emergencyContactName: this.emergencyContactName,
      emergencyContactPhone: this.emergencyContactPhone,
      wednesdayActivity: this.wednesdayActivity,
      wednesdayReception: this.wednesdayReception,
      thursdayBreakfast: this.thursdayBreakfast,
      thursdayLunch: this.thursdayLunch,
      thursdayLuncheon: this.thursdayLunch, // Map for frontend compatibility
      thursdayReception: this.thursdayReception,
      thursdayDinner: this.thursdayReception, // Map for frontend compatibility
      fridayBreakfast: this.fridayBreakfast,
      fridayDinner: this.fridayDinner,
      dietaryRestrictions: this.dietaryRestrictions,
      specialRequests: this.specialRequests,
      clubRentals: this.clubRentals,
      golfHandicap: this.golfHandicap,
      massageTimeSlot: this.massageTimeSlot,
      pickleballEquipment: this.pickleballEquipment,
      spouseFirstName: this.spouseFirstName,
      spouseLastName: this.spouseLastName,
      spouseDinnerTicket: this.spouseDinnerTicket,
      childFirstName: this.childFirstName,
      childLastName: this.childLastName,
      childLunchTicket: this.childLunchTicket,
      totalPrice: this.totalPrice,
      paymentMethod: this.paymentMethod,
      name: this.name,
      category: this.category,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
    if (this.status) (base as any).status = this.status;
    if (this.cancellationReason) (base as any).cancellationReason = this.cancellationReason;
    if (this.cancellationAt) (base as any).cancellationAt = this.cancellationAt;
    if (this.tuesdayEarlyReception) (base as any).tuesdayEarlyReception = this.tuesdayEarlyReception;
    if (typeof this.paid === 'boolean') (base as any).paid = this.paid;
    if (this.squarePaymentId) (base as any).squarePaymentId = this.squarePaymentId;
    if (this.spousePaymentId) (base as any).spousePaymentId = this.spousePaymentId;
    if (this.groupAssigned) (base as any).groupAssigned = this.groupAssigned;
    return base as any;
  }

  // Helper to convert undefined to null for MySQL compatibility
  private nullIfUndefined<T>(value: T): T | null {
    return value === undefined ? null : value;
  }

  // Convert to database format
  toDatabase(): any {
    // Exclude id from update payload (it's used in WHERE clause, not SET)
    // Convert all undefined values to null for MySQL compatibility
    const payload: any = {
      user_id: this.userId,
      event_id: this.eventId,
      first_name: this.firstName || null,
      last_name: this.lastName || null,
      badge_name: this.badgeName || null,
      email: this.email || null,
      secondary_email: this.nullIfUndefined(this.secondaryEmail),
      organization: this.organization || null,
      job_title: this.jobTitle || null,
      address: this.address || null,
      address_street: this.nullIfUndefined(this.addressStreet),
      city: this.nullIfUndefined(this.city),
      state: this.nullIfUndefined(this.state),
      zip_code: this.nullIfUndefined(this.zipCode),
      country: this.nullIfUndefined(this.country),
      mobile: this.mobile || null,
      office_phone: this.nullIfUndefined(this.officePhone),
      is_first_time_attending: this.isFirstTimeAttending ?? false,
      company_type: this.companyType || null,
      company_type_other: this.nullIfUndefined(this.companyTypeOther),
      emergency_contact_name: this.nullIfUndefined(this.emergencyContactName),
      emergency_contact_phone: this.nullIfUndefined(this.emergencyContactPhone),
      wednesday_activity: this.wednesdayActivity || null,
      wednesday_reception: this.wednesdayReception || null,
      thursday_breakfast: this.thursdayBreakfast || null,
      thursday_luncheon: this.thursdayLunch || null,
      thursday_dinner: this.thursdayReception || null,
      friday_breakfast: this.fridayBreakfast || null,
      dietary_restrictions: this.dietaryRestrictions || null,
      special_requests: this.nullIfUndefined(this.specialRequests),
      club_rentals: this.nullIfUndefined(this.clubRentals),
      golf_handicap: this.nullIfUndefined(this.golfHandicap),
      massage_time_slot: this.nullIfUndefined(this.massageTimeSlot),
      pickleball_equipment: this.pickleballEquipment ?? null,
      spouse_dinner_ticket: !!this.spouseDinnerTicket,
      spouse_breakfast: !!this.spouseBreakfast,
      tuesday_early_reception: this.nullIfUndefined(this.tuesdayEarlyReception),
      spouse_first_name: this.nullIfUndefined(this.spouseFirstName),
      spouse_last_name: this.nullIfUndefined(this.spouseLastName),
      child_first_name: this.nullIfUndefined(this.childFirstName),
      child_last_name: this.nullIfUndefined(this.childLastName),
      child_lunch_ticket: this.childLunchTicket ?? false,
      total_price: this.totalPrice || 0,
      payment_method: this.paymentMethod || null,
      paid: this.paid ?? false,
      paid_at: this.paidAt ? this.formatDateForDB(this.paidAt) : null,
      square_payment_id: this.nullIfUndefined(this.squarePaymentId),
      spouse_payment_id: this.nullIfUndefined(this.spousePaymentId),
      spouse_paid_at: this.spousePaidAt ? this.formatDateForDB(this.spousePaidAt) : null,
      group_assigned: this.nullIfUndefined(this.groupAssigned),
      updated_at: this.formatDateForDB(this.updatedAt || new Date().toISOString()),
    };
    
    // Add created_at only for new registrations (when id is not set)
    if (!this.id) {
      payload.created_at = this.formatDateForDB(this.createdAt || new Date().toISOString());
    }
    
    return payload;
  }

  // Create from database row
  static fromDatabase(row: any): Registration {
    return new Registration({
      id: row.id,
      userId: row.user_id,
      eventId: row.event_id,
      firstName: row.first_name,
      lastName: row.last_name,
      badgeName: row.badge_name,
      email: row.email,
      secondaryEmail: row.secondary_email,
      organization: row.organization,
      jobTitle: row.job_title,
      address: row.address,
      addressStreet: row.address_street,
      city: row.city,
      state: row.state,
      zipCode: row.zip_code,
      country: row.country,
      mobile: row.mobile,
      officePhone: row.office_phone,
      isFirstTimeAttending: !!row.is_first_time_attending,
      companyType: row.company_type,
      companyTypeOther: row.company_type_other,
      emergencyContactName: row.emergency_contact_name,
      emergencyContactPhone: row.emergency_contact_phone,
      wednesdayActivity: row.wednesday_activity,
      wednesdayReception: row.wednesday_reception,
      thursdayBreakfast: row.thursday_breakfast,
      thursdayLunch: row.thursday_luncheon,
      thursdayReception: row.thursday_dinner,
      fridayBreakfast: row.friday_breakfast,
      fridayDinner: row.friday_dinner,
      dietaryRestrictions: row.dietary_restrictions,
      specialRequests: row.special_requests,
      clubRentals: row.club_rentals || undefined,
      golfHandicap: row.golf_handicap,
      massageTimeSlot: row.massage_time_slot,
      pickleballEquipment: !!row.pickleball_equipment,
      spouseDinnerTicket: !!row.spouse_dinner_ticket,
      spouseBreakfast: !!row.spouse_breakfast,
      spouseFirstName: row.spouse_first_name,
      spouseLastName: row.spouse_last_name,
      childFirstName: row.child_first_name,
      childLastName: row.child_last_name,
      childLunchTicket: !!row.child_lunch_ticket,
      totalPrice: row.total_price,
      paymentMethod: row.payment_method,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      status: row.status,
      cancellationReason: row.cancellation_reason,
      cancellationAt: row.cancellation_at,
      tuesdayEarlyReception: row.tuesday_early_reception,
      paid: !!row.paid,
      paidAt: row.paid_at,
      squarePaymentId: row.square_payment_id,
      spousePaymentId: row.spouse_payment_id,
      spousePaidAt: row.spouse_paid_at,
      groupAssigned: row.group_assigned || undefined,
      // Legacy fields are not mapped from DB in this version
      name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      category: row.wednesday_activity || 'Networking',
    });
  }
}
