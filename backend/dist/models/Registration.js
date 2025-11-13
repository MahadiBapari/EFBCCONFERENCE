"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Registration = void 0;
class Registration {
    formatDateForDB(dateValue) {
        if (!dateValue) {
            return new Date().toISOString().slice(0, 19).replace('T', ' ');
        }
        const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
        if (isNaN(date.getTime())) {
            return new Date().toISOString().slice(0, 19).replace('T', ' ');
        }
        return date.toISOString().slice(0, 19).replace('T', ' ');
    }
    constructor(data) {
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
        this.thursdayLunch = data.thursdayLunch || data.thursdayLuncheon || 'I will attend';
        this.thursdayReception = data.thursdayReception || data.thursdayDinner || 'I will attend';
        this.fridayBreakfast = data.fridayBreakfast || 'I will attend';
        this.fridayDinner = data.fridayDinner || 'I will attend';
        this.dietaryRestrictions = data.dietaryRestrictions;
        this.specialRequests = data.specialRequests;
        const cr = data.clubRentals;
        if (typeof cr === 'boolean') {
            this.clubRentals = cr ? undefined : 'I will bring my own';
        }
        else if (typeof cr === 'string') {
            this.clubRentals = cr || undefined;
        }
        else {
            this.clubRentals = undefined;
        }
        this.spouseBreakfast = data.spouseBreakfast ?? false;
        this.tuesdayEarlyReception = data.tuesdayEarlyReception ?? 'I will attend';
        this.golfHandicap = data.golfHandicap;
        this.massageTimeSlot = data.massageTimeSlot;
        this.spouseFirstName = data.spouseFirstName;
        this.spouseLastName = data.spouseLastName;
        const sdt = data.spouseDinnerTicket;
        this.spouseDinnerTicket = sdt === true || sdt === 'Yes' || sdt === 'yes' || sdt === 1;
        const tp = data.totalPrice;
        this.totalPrice = typeof tp === 'string' ? parseFloat(tp) || 0 : (typeof tp === 'number' ? tp : 0);
        this.paymentMethod = data.paymentMethod || 'Card';
        this.name = data.name || `${this.firstName} ${this.lastName}`;
        this.category = data.category || 'Networking';
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
        this.status = data.status;
        this.cancellationReason = data.cancellationReason;
        this.cancellationAt = data.cancellationAt;
        this.paid = data.paid;
        this.squarePaymentId = data.squarePaymentId;
    }
    toJSON() {
        const base = {
            id: this.id,
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
            thursdayLuncheon: this.thursdayLunch,
            thursdayReception: this.thursdayReception,
            thursdayDinner: this.thursdayReception,
            fridayBreakfast: this.fridayBreakfast,
            fridayDinner: this.fridayDinner,
            dietaryRestrictions: this.dietaryRestrictions,
            specialRequests: this.specialRequests,
            clubRentals: this.clubRentals,
            golfHandicap: this.golfHandicap,
            massageTimeSlot: this.massageTimeSlot,
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
        if (this.status)
            base.status = this.status;
        if (this.cancellationReason)
            base.cancellationReason = this.cancellationReason;
        if (this.cancellationAt)
            base.cancellationAt = this.cancellationAt;
        if (this.tuesdayEarlyReception)
            base.tuesdayEarlyReception = this.tuesdayEarlyReception;
        if (typeof this.paid === 'boolean')
            base.paid = this.paid;
        if (this.squarePaymentId)
            base.squarePaymentId = this.squarePaymentId;
        return base;
    }
    toDatabase() {
        const payload = {
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
            special_requests: this.specialRequests,
            club_rentals: this.clubRentals || null,
            golf_handicap: this.golfHandicap,
            massage_time_slot: this.massageTimeSlot || null,
            spouse_dinner_ticket: !!this.spouseDinnerTicket,
            spouse_breakfast: !!this.spouseBreakfast,
            tuesday_early_reception: this.tuesdayEarlyReception,
            spouse_first_name: this.spouseFirstName,
            spouse_last_name: this.spouseLastName,
            total_price: this.totalPrice,
            payment_method: this.paymentMethod,
            paid: this.paid ?? false,
            square_payment_id: this.squarePaymentId || null,
            updated_at: this.formatDateForDB(this.updatedAt || new Date().toISOString()),
        };
        if (!this.id) {
            payload.created_at = this.formatDateForDB(this.createdAt || new Date().toISOString());
        }
        return payload;
    }
    static fromDatabase(row) {
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
            specialRequests: row.special_requests,
            clubRentals: row.club_rentals || undefined,
            golfHandicap: row.golf_handicap,
            massageTimeSlot: row.massage_time_slot,
            spouseDinnerTicket: !!row.spouse_dinner_ticket,
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
            name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
            category: row.wednesday_activity || 'Networking',
        });
    }
}
exports.Registration = Registration;
//# sourceMappingURL=Registration.js.map