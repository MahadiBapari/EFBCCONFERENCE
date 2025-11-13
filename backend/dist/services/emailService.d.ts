export declare function sendVerificationEmail(to: string, token: string): Promise<void>;
export declare function sendRegistrationConfirmationEmail(params: {
    to: string;
    name: string;
    eventName?: string;
    eventDate?: string;
    totalPrice?: number;
    registration?: any;
}): Promise<void>;
export declare function sendPasswordResetEmail(to: string, token: string): Promise<void>;
//# sourceMappingURL=emailService.d.ts.map