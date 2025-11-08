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
  public address: string;
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
  public clubRentals?: boolean;
  public golfHandicap?: string;
  public spouseBreakfast?: boolean;
  public tuesdayEarlyReception?: 'I will attend' | 'I will NOT attend';
  public spouseFirstName?: string;
  public spouseLastName?: string;
  public spouseDinnerTicket: 'Yes' | 'No';
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
  public squarePaymentId?: string;

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
    this.thursdayLunch = data.thursdayLunch || 'I will attend';
    this.thursdayReception = data.thursdayReception || 'I will attend';
    this.fridayBreakfast = data.fridayBreakfast || 'I will attend';
    this.fridayDinner = data.fridayDinner || 'I will attend';
    this.dietaryRestrictions = data.dietaryRestrictions;
    this.clubRentals = (data as any).clubRentals ?? false;
    this.spouseBreakfast = (data as any).spouseBreakfast ?? false;
    this.tuesdayEarlyReception = (data as any).tuesdayEarlyReception ?? 'I will attend';
    this.golfHandicap = (data as any).golfHandicap;
    this.spouseFirstName = data.spouseFirstName;
    this.spouseLastName = data.spouseLastName;
    this.spouseDinnerTicket = data.spouseDinnerTicket || 'No';
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
      thursdayReception: this.thursdayReception,
      fridayBreakfast: this.fridayBreakfast,
      fridayDinner: this.fridayDinner,
      dietaryRestrictions: this.dietaryRestrictions,
      clubRentals: this.clubRentals,
      golfHandicap: this.golfHandicap,
      spouseFirstName: this.spouseFirstName,
      spouseLastName: this.spouseLastName,
      spouseDinnerTicket: this.spouseDinnerTicket,
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
    return base as any;
  }

  // Convert to database format
  toDatabase(): any {
    return {
      user_id: this.userId,
      event_id: this.eventId,
      first_name: this.firstName,
      last_name: this.lastName,
      badge_name: this.badgeName,
      email: this.email,
      secondary_email: this.secondaryEmail,
      organization: this.organization,
      job_title: this.jobTitle,
      address: this.address,
      mobile: this.mobile,
      office_phone: this.officePhone,
      is_first_time_attending: this.isFirstTimeAttending,
      company_type: this.companyType,
      company_type_other: this.companyTypeOther,
      emergency_contact_name: this.emergencyContactName,
      emergency_contact_phone: this.emergencyContactPhone,
      wednesday_activity: this.wednesdayActivity,
      wednesday_reception: this.wednesdayReception,
      thursday_breakfast: this.thursdayBreakfast,
      thursday_luncheon: this.thursdayLunch,
      thursday_dinner: this.thursdayReception,
      friday_breakfast: this.fridayBreakfast,
      dietary_restrictions: this.dietaryRestrictions,
      club_rentals: this.clubRentals ?? false,
      golf_handicap: this.golfHandicap,
      spouse_dinner_ticket: this.spouseDinnerTicket === 'Yes',
      spouse_breakfast: !!this.spouseBreakfast,
      tuesday_early_reception: this.tuesdayEarlyReception,
      spouse_first_name: this.spouseFirstName,
      spouse_last_name: this.spouseLastName,
      total_price: this.totalPrice,
      payment_method: this.paymentMethod,
      paid: this.paid ?? false,
      square_payment_id: this.squarePaymentId || null,
    };
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
      clubRentals: !!row.club_rentals,
      golfHandicap: row.golf_handicap,
      spouseDinnerTicket: row.spouse_dinner_ticket ? 'Yes' : 'No',
      spouseBreakfast: !!row.spouse_breakfast,
      spouseFirstName: row.spouse_first_name,
      spouseLastName: row.spouse_last_name,
      totalPrice: row.total_price,
      paymentMethod: row.payment_method,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      status: row.status,
      cancellationReason: row.cancellation_reason,
      cancellationAt: row.cancellation_at,
      tuesdayEarlyReception: row.tuesday_early_reception,
      paid: !!row.paid,
      squarePaymentId: row.square_payment_id,
      // Legacy fields are not mapped from DB in this version
      name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
      category: row.wednesday_activity || 'Networking',
    });
  }
}
