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
  public golfHandicap?: string;
  public golfClubPreference?: 'Own Clubs' | 'Right-handed Mens' | 'Left-handed Mens' | 'Right-handed Ladies' | 'Left-handed Ladies';
  public massageTimeSlot?: '8:00 AM- 10:00 AM' | '10:00 AM - 12:00 PM' | '12:00 PM - 2:00 PM' | '2:00 PM - 4:00 PM';
  public wednesdayReception: 'I will attend' | 'I will NOT attend';
  public thursdayBreakfast: 'I will attend' | 'I will NOT attend';
  public thursdayLunch: 'I will attend' | 'I will NOT attend';
  public thursdayReception: 'I will attend' | 'I will NOT attend';
  public fridayBreakfast: 'I will attend' | 'I will NOT attend';
  public fridayLunch: 'I will attend' | 'I will NOT attend';
  public fridayDinner: 'I will attend' | 'I will NOT attend';
  public dietaryRestrictions?: string;
  public spouseFirstName?: string;
  public spouseLastName?: string;
  public spouseDinnerTicket: 'Yes' | 'No';
  public totalPrice: number;
  public paymentMethod: 'Card' | 'Check';
  public name: string;
  public category: string;
  public createdAt?: string;
  public updatedAt?: string;

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
    this.golfHandicap = data.golfHandicap;
    this.golfClubPreference = data.golfClubPreference;
    this.massageTimeSlot = data.massageTimeSlot;
    this.wednesdayReception = data.wednesdayReception || 'I will attend';
    this.thursdayBreakfast = data.thursdayBreakfast || 'I will attend';
    this.thursdayLunch = data.thursdayLunch || 'I will attend';
    this.thursdayReception = data.thursdayReception || 'I will attend';
    this.fridayBreakfast = data.fridayBreakfast || 'I will attend';
    this.fridayLunch = data.fridayLunch || 'I will attend';
    this.fridayDinner = data.fridayDinner || 'I will attend';
    this.dietaryRestrictions = data.dietaryRestrictions;
    this.spouseFirstName = data.spouseFirstName;
    this.spouseLastName = data.spouseLastName;
    this.spouseDinnerTicket = data.spouseDinnerTicket || 'No';
    this.totalPrice = data.totalPrice || 0;
    this.paymentMethod = data.paymentMethod || 'Card';
    this.name = data.name || `${this.firstName} ${this.lastName}`;
    this.category = data.category || 'Networking';
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  // Convert to JSON
  toJSON(): IRegistration {
    return {
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
      golfHandicap: this.golfHandicap,
      golfClubPreference: this.golfClubPreference,
      massageTimeSlot: this.massageTimeSlot,
      wednesdayReception: this.wednesdayReception,
      thursdayBreakfast: this.thursdayBreakfast,
      thursdayLunch: this.thursdayLunch,
      thursdayReception: this.thursdayReception,
      fridayBreakfast: this.fridayBreakfast,
      fridayLunch: this.fridayLunch,
      fridayDinner: this.fridayDinner,
      dietaryRestrictions: this.dietaryRestrictions,
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
  }

  // Convert to database format
  toDatabase(): any {
    return {
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
      golfHandicap: this.golfHandicap,
      golfClubPreference: this.golfClubPreference,
      massageTimeSlot: this.massageTimeSlot,
      wednesdayReception: this.wednesdayReception,
      thursdayBreakfast: this.thursdayBreakfast,
      thursdayLunch: this.thursdayLunch,
      thursdayReception: this.thursdayReception,
      fridayBreakfast: this.fridayBreakfast,
      fridayLunch: this.fridayLunch,
      fridayDinner: this.fridayDinner,
      dietaryRestrictions: this.dietaryRestrictions,
      spouseFirstName: this.spouseFirstName,
      spouseLastName: this.spouseLastName,
      spouseDinnerTicket: this.spouseDinnerTicket,
      totalPrice: this.totalPrice,
      paymentMethod: this.paymentMethod,
      name: this.name,
      category: this.category,
      created_at: this.createdAt,
      updated_at: this.updatedAt
    };
  }

  // Create from database row
  static fromDatabase(row: any): Registration {
    return new Registration({
      id: row.id,
      userId: row.userId,
      eventId: row.eventId,
      firstName: row.firstName,
      lastName: row.lastName,
      badgeName: row.badgeName,
      email: row.email,
      secondaryEmail: row.secondaryEmail,
      organization: row.organization,
      jobTitle: row.jobTitle,
      address: row.address,
      mobile: row.mobile,
      officePhone: row.officePhone,
      isFirstTimeAttending: row.isFirstTimeAttending,
      companyType: row.companyType,
      companyTypeOther: row.companyTypeOther,
      emergencyContactName: row.emergencyContactName,
      emergencyContactPhone: row.emergencyContactPhone,
      wednesdayActivity: row.wednesdayActivity,
      golfHandicap: row.golfHandicap,
      golfClubPreference: row.golfClubPreference,
      massageTimeSlot: row.massageTimeSlot,
      wednesdayReception: row.wednesdayReception,
      thursdayBreakfast: row.thursdayBreakfast,
      thursdayLunch: row.thursdayLunch,
      thursdayReception: row.thursdayReception,
      fridayBreakfast: row.fridayBreakfast,
      fridayLunch: row.fridayLunch,
      fridayDinner: row.fridayDinner,
      dietaryRestrictions: row.dietaryRestrictions,
      spouseFirstName: row.spouseFirstName,
      spouseLastName: row.spouseLastName,
      spouseDinnerTicket: row.spouseDinnerTicket,
      totalPrice: row.totalPrice,
      paymentMethod: row.paymentMethod,
      name: row.name,
      category: row.category,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }
}
