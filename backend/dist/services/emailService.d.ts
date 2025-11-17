export declare function sendVerificationEmail(to: string, token: string): Promise<void>;
export declare function sendRegistrationConfirmationEmail(params: {
    to: string;
    name: string;
    eventName?: string;
    eventDate?: string;
    totalPrice?: number;
    registration?: any;
}): Promise<void>;
export declare function sendAdminCreatedUserEmail(params: {
    to: string;
    name: string;
    tempPassword: string;
    role?: string;
}): Promise<void>;
export declare function sendPasswordResetEmail(to: string, token: string): Promise<void>;
export declare function sendCancellationRequestAdminEmail(params: {
    registrationId: number;
    userName?: string;
    userEmail?: string;
    eventName?: string;
    reason?: string | null;
}): Promise<void>;
export declare function sendCancellationDecisionEmail(params: {
    to: string;
    userName?: string;
    eventName?: string;
    status: 'approved' | 'rejected';
    reason?: string | null;
    adminNote?: string | null;
}): Promise<void>;
//# sourceMappingURL=emailService.d.ts.map