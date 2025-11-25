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
  date: string; // End date (kept for backward compatibility)
  startDate?: string; // Start date
  activities?: string[];
  location?: string;
  description?: string | string[];
  createdAt?: string;
  updatedAt?: string;
  spousePricing?: Array<{ label: string; price: number; startDate?: string; endDate?: string }>;
  registrationPricing?: Array<{ label: string; price: number; startDate?: string; endDate?: string }>;
  breakfastPrice?: number;
  breakfastEndDate?: string;
}

export interface Registration {
  id: number;
  userId: number;
  eventId: number;
  status?: 'active' | 'cancelled';
  cancellationReason?: string;
  cancellationAt?: string;
  tuesdayEarlyReception?: 'I will attend' | 'I will NOT attend';
  
  // Personal Information
  firstName: string;
  lastName: string;
  badgeName: string;
  email: string;
  secondaryEmail?: string;
  organization: string;
  jobTitle: string;
  address: string; // Legacy field, kept for backward compatibility
  addressStreet?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
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
  clubRentals?: string;
  massageTimeSlot?: string;
  pickleballEquipment?: boolean;
  spouseBreakfast?: boolean;
  
  // Conference Meals
  wednesdayReception: 'I will attend' | 'I will NOT attend';
  thursdayBreakfast: 'I will attend' | 'I will NOT attend';
  thursdayLunch: 'I will attend' | 'I will NOT attend';
  thursdayReception: 'I will attend' | 'I will NOT attend';
  fridayBreakfast: 'I will attend' | 'I will NOT attend';
  fridayDinner: 'I will attend' | 'I will NOT attend';
  dietaryRestrictions?: string;
  specialRequests?: string;
  
  // Spouse Information
  spouseFirstName?: string;
  spouseLastName?: string;
  spouseDinnerTicket: boolean;
  
  // Child Information
  childFirstName?: string;
  childLastName?: string;
  childLunchTicket?: boolean;
  
  // Payment Information
  totalPrice: number;
  paymentMethod: 'Card' | 'Check';
  paid?: boolean;
  squarePaymentId?: string;
  
  // Group Assignment
  groupAssigned?: number;
  
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
  date: string; // End date
  startDate?: string; // Start date
  activities?: string[];
  location?: string;
  description?: string | string[];
  spousePricing?: Array<{ label: string; price: number; startDate?: string; endDate?: string }>;
  registrationPricing?: Array<{ label: string; price: number; startDate?: string; endDate?: string }>;
  breakfastPrice?: number;
  breakfastEndDate?: string;
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
  address: string; // Legacy field, kept for backward compatibility
  addressStreet?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  mobile: string;
  officePhone?: string;
  isFirstTimeAttending: boolean;
  companyType: string;
  companyTypeOther?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  wednesdayActivity: 'Golf Tournament' | 'Fishing' | 'Networking' | 'None';
  golfHandicap?: string;
  clubRentals?: string;
  wednesdayReception: 'I will attend' | 'I will NOT attend';
  tuesdayEarlyReception?: 'I will attend' | 'I will NOT attend';
  thursdayBreakfast: 'I will attend' | 'I will NOT attend';
  thursdayLunch: 'I will attend' | 'I will NOT attend';
  thursdayReception: 'I will attend' | 'I will NOT attend';
  fridayBreakfast: 'I will attend' | 'I will NOT attend';
  fridayDinner: 'I will attend' | 'I will NOT attend';
  dietaryRestrictions?: string;
  specialRequests?: string;
  spouseFirstName?: string;
  spouseLastName?: string;
  spouseDinnerTicket: boolean;
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