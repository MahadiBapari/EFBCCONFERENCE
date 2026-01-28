import { User as IUser } from '../types';
export declare class User {
    id?: number;
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'user' | 'guest';
    isActive: boolean;
    created_at?: string;
    updated_at?: string;
    constructor(data: Partial<IUser> & {
        created_at?: string;
        updated_at?: string;
        created_At?: string;
        updated_At?: string;
    });
    hashPassword(): Promise<void>;
    verifyPassword(plainPassword: string): Promise<boolean>;
    get createdAt(): string | undefined;
    set createdAt(value: string | undefined);
    get updatedAt(): string | undefined;
    set updatedAt(value: string | undefined);
    toJSON(): Omit<IUser, 'password'> & {
        emailVerifiedAt?: string | null;
    };
    toDatabase(): any;
    static fromDatabase(row: any): User;
    static isValidEmail(email: string): boolean;
    static isValidPassword(password: string): boolean;
    validate(): {
        isValid: boolean;
        errors: string[];
    };
}
//# sourceMappingURL=User.d.ts.map