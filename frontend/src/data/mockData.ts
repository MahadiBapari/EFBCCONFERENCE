import { Event, Registration, Group } from '../types';

// --- MOCK DATA --- //
export const MOCK_EVENTS: Event[] = [
    { id: 1, year: 2024, name: "EFBC Annual Conference 2024", date: "2024-10-26" },
    { id: 2, year: 2023, name: "EFBC Annual Conference 2023", date: "2023-10-20" },
];

export const MOCK_REGISTRATIONS: Registration[] = [
    {
        id: 101,
        userId: 1,
        eventId: 1,
        // Personal Information
        firstName: "John",
        lastName: "Doe",
        badgeName: "John",
        email: "john.doe@example.com",
        secondaryEmail: "",
        organization: "ABC Power Company",
        jobTitle: "Plant Manager",
        address: "123 Power Plant Rd, Orlando, FL 32801",
        mobile: "(555) 123-4567",
        officePhone: "(555) 123-4568",
        isFirstTimeAttending: false,
        companyType: "Utility Company",
        companyTypeOther: "",
        emergencyContactName: "Jane Doe",
        emergencyContactPhone: "(555) 123-4569",
        // Conference Events
        wednesdayActivity: "Golf Tournament",
        golfHandicap: "15",
        golfClubPreference: "Own Clubs",
        massageTimeSlot: "8:00 AM- 10:00 AM",
        // Conference Meals
        wednesdayReception: "I will attend",
        thursdayBreakfast: "I will attend",
        thursdayLuncheon: "I will attend",
        thursdayDinner: "I will attend",
        fridayBreakfast: "I will attend",
        dietaryRestrictions: "",
        // Spouse/Guest Information
        spouseDinnerTicket: false,
        spouseFirstName: "",
        spouseLastName: "",
        // Payment Information
        totalPrice: 675,
        paymentMethod: "Card",
        // Legacy fields
        name: "John Doe",
        category: "Golf"
    },
    {
        id: 102,
        userId: 2,
        eventId: 1,
        // Personal Information
        firstName: "Jane",
        lastName: "Smith",
        badgeName: "Jane",
        email: "jane.smith@example.com",
        secondaryEmail: "jane.smith.personal@gmail.com",
        organization: "Coal Mining Corp",
        jobTitle: "Operations Director",
        address: "456 Mining Ave, Tampa, FL 33601",
        mobile: "(555) 234-5678",
        officePhone: "(555) 234-5679",
        isFirstTimeAttending: true,
        companyType: "Supplier: Coal Mine/Coal Producer",
        companyTypeOther: "",
        emergencyContactName: "Bob Smith",
        emergencyContactPhone: "(555) 234-5680",
        // Conference Events
        wednesdayActivity: "Fishing",
        golfHandicap: "",
        golfClubPreference: "Own Clubs",
        massageTimeSlot: "8:00 AM- 10:00 AM",
        // Conference Meals
        wednesdayReception: "I will attend",
        thursdayBreakfast: "I will attend",
        thursdayLuncheon: "I will attend",
        thursdayDinner: "I will attend",
        fridayBreakfast: "I will attend",
        dietaryRestrictions: "Vegetarian",
        // Spouse/Guest Information
        spouseDinnerTicket: true,
        spouseFirstName: "Mike",
        spouseLastName: "Smith",
        // Payment Information
        totalPrice: 875,
        paymentMethod: "Card",
        // Legacy fields
        name: "Jane Smith",
        category: "Fishing"
    },
    {
        id: 103,
        userId: 3,
        eventId: 1,
        // Personal Information
        firstName: "Peter",
        lastName: "Jones",
        badgeName: "Peter",
        email: "peter.jones@example.com",
        secondaryEmail: "",
        organization: "Energy Consulting Group",
        jobTitle: "Senior Consultant",
        address: "789 Consulting Blvd, Miami, FL 33101",
        mobile: "(555) 345-6789",
        officePhone: "(555) 345-6790",
        isFirstTimeAttending: false,
        companyType: "Supplier: Consultant",
        companyTypeOther: "",
        emergencyContactName: "Sarah Jones",
        emergencyContactPhone: "(555) 345-6791",
        // Conference Events
        wednesdayActivity: "Networking",
        golfHandicap: "",
        golfClubPreference: "Own Clubs",
        massageTimeSlot: "10:00 AM - 12:00 PM",
        // Conference Meals
        wednesdayReception: "I will attend",
        thursdayBreakfast: "I will attend",
        thursdayLuncheon: "I will attend",
        thursdayDinner: "I will attend",
        fridayBreakfast: "I will attend",
        dietaryRestrictions: "",
        // Spouse/Guest Information
        spouseDinnerTicket: false,
        spouseFirstName: "",
        spouseLastName: "",
        // Payment Information
        totalPrice: 675,
        paymentMethod: "Check",
        // Legacy fields
        name: "Peter Jones",
        category: "Networking"
    },
    {
        id: 104,
        userId: 4,
        eventId: 1,
        // Personal Information
        firstName: "Mary",
        lastName: "Williams",
        badgeName: "Mary",
        email: "mary.w@example.com",
        secondaryEmail: "",
        organization: "Gas Supply Inc",
        jobTitle: "Business Development Manager",
        address: "321 Gas Station St, Jacksonville, FL 32201",
        mobile: "(555) 456-7890",
        officePhone: "(555) 456-7891",
        isFirstTimeAttending: true,
        companyType: "Supplier: Gas",
        companyTypeOther: "",
        emergencyContactName: "Tom Williams",
        emergencyContactPhone: "(555) 456-7892",
        // Conference Events
        wednesdayActivity: "Fishing",
        golfHandicap: "",
        golfClubPreference: "Own Clubs",
        massageTimeSlot: "8:00 AM- 10:00 AM",
        // Conference Meals
        wednesdayReception: "I will attend",
        thursdayBreakfast: "I will attend",
        thursdayLuncheon: "I will attend",
        thursdayDinner: "I will attend",
        fridayBreakfast: "I will attend",
        dietaryRestrictions: "Gluten-free",
        // Spouse/Guest Information
        spouseDinnerTicket: false,
        spouseFirstName: "",
        spouseLastName: "",
        // Payment Information
        totalPrice: 675,
        paymentMethod: "Card",
        // Legacy fields
        name: "Mary Williams",
        category: "Fishing"
    }
];

export const MOCK_GROUPS: Group[] = [
    { id: 201, eventId: 1, category: "Fishing", name: "Boat A", members: [104, 102] },
    { id: 202, eventId: 1, category: "Fishing", name: "Boat B", members: [] },
    { id: 203, eventId: 1, category: "Golf", name: "Team 1", members: [101] },
    { id: 204, eventId: 1, category: "Golf", name: "Team 2", members: [] },
    { id: 205, eventId: 1, category: "Networking", name: "Table Alpha", members: [103] },
    { id: 206, eventId: 1, category: "Networking", name: "Table Beta", members: [] },
];
