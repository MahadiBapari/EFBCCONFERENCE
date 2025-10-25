export interface IBaseEntity {
    _id?: string;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface IEvent extends IBaseEntity {
    title: string;
    description: string;
    date: Date;
    location: string;
    maxParticipants?: number;
    currentParticipants?: number;
    sportId: string;
    organizerId: string;
    status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
    registrationDeadline?: Date;
    requirements?: string[];
    prizes?: string[];
}
export interface IMember extends IBaseEntity {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    dateOfBirth?: Date;
    gender?: 'male' | 'female' | 'other';
    address?: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
    emergencyContact?: {
        name: string;
        phone: string;
        relationship: string;
    };
    medicalInfo?: {
        allergies?: string[];
        medications?: string[];
        conditions?: string[];
    };
    isActive: boolean;
    membershipType: 'individual' | 'team' | 'coach' | 'official';
}
export interface ISport extends IBaseEntity {
    name: string;
    description: string;
    category: 'individual' | 'team' | 'mixed';
    rules?: string;
    equipment?: string[];
    minParticipants?: number;
    maxParticipants?: number;
    duration?: number;
    isActive: boolean;
}
export interface ITeam extends IBaseEntity {
    name: string;
    description?: string;
    sportId: string;
    captainId: string;
    members: string[];
    maxMembers?: number;
    isActive: boolean;
    achievements?: string[];
    foundedDate?: Date;
}
export interface IApiResponse<T = any> {
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
export interface ICreateEventRequest {
    title: string;
    description: string;
    date: string;
    location: string;
    maxParticipants?: number;
    sportId: string;
    organizerId: string;
    registrationDeadline?: string;
    requirements?: string[];
    prizes?: string[];
}
export interface IUpdateEventRequest extends Partial<ICreateEventRequest> {
    status?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
}
export interface ICreateMemberRequest {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: 'male' | 'female' | 'other';
    address?: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
    emergencyContact?: {
        name: string;
        phone: string;
        relationship: string;
    };
    medicalInfo?: {
        allergies?: string[];
        medications?: string[];
        conditions?: string[];
    };
    membershipType: 'individual' | 'team' | 'coach' | 'official';
}
export interface ICreateSportRequest {
    name: string;
    description: string;
    category: 'individual' | 'team' | 'mixed';
    rules?: string;
    equipment?: string[];
    minParticipants?: number;
    maxParticipants?: number;
    duration?: number;
}
export interface ICreateTeamRequest {
    name: string;
    description?: string;
    sportId: string;
    captainId: string;
    maxMembers?: number;
    foundedDate?: string;
}
export interface IEventQuery {
    page?: number;
    limit?: number;
    sportId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
}
export interface IMemberQuery {
    page?: number;
    limit?: number;
    membershipType?: string;
    isActive?: boolean;
    search?: string;
}
export interface ISportQuery {
    page?: number;
    limit?: number;
    category?: string;
    isActive?: boolean;
    search?: string;
}
export interface ITeamQuery {
    page?: number;
    limit?: number;
    sportId?: string;
    isActive?: boolean;
    search?: string;
}
//# sourceMappingURL=index.d.ts.map