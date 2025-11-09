// Global type definitions

export interface User {
  id: number;
  name: string;
  email: string;
  role?: 'admin' | 'user' | 'guest';
}

export interface Event {
  id: number;
  year: number;
  name: string;
  date: string;
  activities?: string[];
  location?: string;
  description?: string;
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
  address: string;
  mobile: string;
  officePhone?: string;
  isFirstTimeAttending: boolean;
  companyType: string;
  companyTypeOther?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  
  // Conference Events
  wednesdayActivity: string;
  golfHandicap?: string;
  clubRentals?: boolean;
  massageTimeSlot?: '8:00 AM- 10:00 AM' | '10:00 AM - 12:00 PM' | '12:00 PM - 2:00 PM' | '2:00 PM - 4:00 PM';
  
  // Conference Meals
  wednesdayReception: 'I will attend' | 'I will NOT attend';
  thursdayBreakfast: 'I will attend' | 'I will NOT attend';
  thursdayLuncheon: 'I will attend' | 'I will NOT attend';
  thursdayDinner: 'I will attend' | 'I will NOT attend';
  fridayBreakfast: 'I will attend' | 'I will NOT attend';
  dietaryRestrictions?: string;
  specialRequests?: string;
  
  // Spouse/Guest Information
  spouseDinnerTicket: boolean;
  spouseFirstName?: string;
  spouseLastName?: string;
  spouseBreakfast?: boolean;
  
  // Payment Information
  totalPrice: number;
  paymentMethod: 'Card' | 'Check';
  paid?: boolean;
  squarePaymentId?: string;
  
  // Legacy fields for backward compatibility
  name: string;
  category: string;
}

export interface Group {
  id: number;
  eventId: number;
  category: string;
  name: string;
  members: number[];
}

export interface Team {
  id: string;
  name: string;
  sport: string;
  members: string[];
}

export interface Member {
  id: string;
  name: string;
  email: string;
  teamId?: string;
  sport: string;
}

export interface Sport {
  id: string;
  name: string;
  description: string;
  maxPlayers: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// Constants
export const CATEGORIES = ["Golf", "Fishing", "Networking"];

export const COMPANY_TYPES = [
  "Utility Company",
  "Media",
  "Supplier: Ash (Fly, Bottom, Coal) ",
  "Supplier: Broker",
  "Supplier: Coal Mine/Coal Producer",
  "Supplier: Consultant",
  "Supplier: Gas",
  "Supplier: Laboratory",
  "Supplier: LDC (Local distribution company)",
  "Supplier: Lime/Cement",
  "Supplier: Petcoke",
  "Supplier: Pipeline Operator",
  "Supplier: Rail",
  "Supplier: Shipping",
  "Supplier: Solar",
  "Supplier: Terminal",
  "Supplier: Trader",
  "Supplier: Transportation",
  "Other"
];

export const WEDNESDAY_ACTIVITIES = [
  "Golf Tournament",
  "Fishing", 
  "Networking",
  "None"
];

export const GOLF_CLUB_PREFERENCES = [
  "Own Clubs",
  "Right-handed Mens",
  "Left-handed Mens", 
  "Right-handed Ladies",
  "Left-handed Ladies"
];

export const MASSAGE_TIME_SLOTS = [
  "8:00 AM- 10:00 AM",
  "10:00 AM - 12:00 PM",
  "12:00 PM - 2:00 PM",
  "2:00 PM - 4:00 PM"
];

export const MEAL_OPTIONS = [
  "I will attend",
  "I will NOT attend"
];

export const PAYMENT_METHODS = [
  "Card",
  "Check"
];

// Helper functions
export const isEventExpired = (eventDate: string): boolean => new Date(eventDate) < new Date();
