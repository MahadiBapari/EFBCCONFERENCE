// Backend type definitions aligned with frontend

export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'user' | 'guest';
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Event {
  id: number;
  year: number;
  name: string;
  date: string;
  eventId: number;
  activities?: string[];
  location?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Registration {
  id: number;
  userId: number;
  eventId: number;
  
  // Personal Information
  firstName: string;
  lastName: string;
  badgeName: string;
  email: string;
  secondaryEmail?: string;
  organization: string;
  jobTitle: string;
  address: string;
  mobile: string;
  officePhone?: string;
  isFirstTimeAttending: boolean;
  companyType: string;
  companyTypeOther?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  
  // Conference Events
  wednesdayActivity: 'Golf Tournament' | 'Fishing' | 'Networking' | 'None';
  golfHandicap?: string;
  golfClubPreference?: 'Own Clubs' | 'Right-handed Mens' | 'Left-handed Mens' | 'Right-handed Ladies' | 'Left-handed Ladies';
  massageTimeSlot?: '8:00 AM- 10:00 AM' | '10:00 AM - 12:00 PM' | '12:00 PM - 2:00 PM' | '2:00 PM - 4:00 PM';
  
  // Conference Meals
  wednesdayReception: 'I will attend' | 'I will NOT attend';
  thursdayBreakfast: 'I will attend' | 'I will NOT attend';
  thursdayLunch: 'I will attend' | 'I will NOT attend';
  thursdayReception: 'I will attend' | 'I will NOT attend';
  fridayBreakfast: 'I will attend' | 'I will NOT attend';
  fridayLunch: 'I will attend' | 'I will NOT attend';
  fridayDinner: 'I will attend' | 'I will NOT attend';
  dietaryRestrictions?: string;
  
  // Spouse Information
  spouseFirstName?: string;
  spouseLastName?: string;
  spouseDinnerTicket: 'Yes' | 'No';
  
  // Payment Information
  totalPrice: number;
  paymentMethod: 'Card' | 'Check';
  
  // Legacy fields for backward compatibility
  name: string;
  category: string;
  
  createdAt?: string;
  updatedAt?: string;
}

export interface Group {
  id: number;
  eventId: number;
  category: string;
  name: string;
  members: number[];
  createdAt?: string;
  updatedAt?: string;
}

// API Response interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Request interfaces
export interface CreateEventRequest {
  year: number;
  name: string;
  date: string;
  eventId: number;
  activities?: string[];
  location?: string;
  description?: string;
}

export interface UpdateEventRequest extends Partial<CreateEventRequest> {}

export interface CreateRegistrationRequest {
  userId: number;
  eventId: number;
  firstName: string;
  lastName: string;
  badgeName: string;
  email: string;
  secondaryEmail?: string;
  organization: string;
  jobTitle: string;
  address: string;
  mobile: string;
  officePhone?: string;
  isFirstTimeAttending: boolean;
  companyType: string;
  companyTypeOther?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  wednesdayActivity: 'Golf Tournament' | 'Fishing' | 'Networking' | 'None';
  golfHandicap?: string;
  golfClubPreference?: 'Own Clubs' | 'Right-handed Mens' | 'Left-handed Mens' | 'Right-handed Ladies' | 'Left-handed Ladies';
  massageTimeSlot?: '8:00 AM- 10:00 AM' | '10:00 AM - 12:00 PM' | '12:00 PM - 2:00 PM' | '2:00 PM - 4:00 PM';
  wednesdayReception: 'I will attend' | 'I will NOT attend';
  thursdayBreakfast: 'I will attend' | 'I will NOT attend';
  thursdayLunch: 'I will attend' | 'I will NOT attend';
  thursdayReception: 'I will attend' | 'I will NOT attend';
  fridayBreakfast: 'I will attend' | 'I will NOT attend';
  fridayLunch: 'I will attend' | 'I will NOT attend';
  fridayDinner: 'I will attend' | 'I will NOT attend';
  dietaryRestrictions?: string;
  spouseFirstName?: string;
  spouseLastName?: string;
  spouseDinnerTicket: 'Yes' | 'No';
  totalPrice: number;
  paymentMethod: 'Card' | 'Check';
  name: string;
  category: string;
}

export interface UpdateRegistrationRequest extends Partial<CreateRegistrationRequest> {}

export interface CreateGroupRequest {
  eventId: number;
  category: string;
  name: string;
  members?: number[];
}

export interface UpdateGroupRequest extends Partial<CreateGroupRequest> {}

// Query interfaces
export interface EventQuery {
  page?: number;
  limit?: number;
  year?: number;
  search?: string;
}

export interface RegistrationQuery {
  page?: number;
  limit?: number;
  eventId?: number;
  category?: string;
  search?: string;
}

export interface GroupQuery {
  page?: number;
  limit?: number;
  eventId?: number;
  category?: string;
  search?: string;
}

// Authentication interfaces
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'user' | 'guest';
}

export interface AuthResponse {
  success: boolean;
  user?: Omit<User, 'password'>;
  token?: string;
  message?: string;
  error?: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'user' | 'guest';
}

export interface UpdateUserRequest extends Partial<CreateUserRequest> {
  isActive?: boolean;
}