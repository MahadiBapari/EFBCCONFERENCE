"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistrationController = void 0;
const Registration_1 = require("../models/Registration");
const emailService_1 = require("../services/emailService");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function getEasternTimeMidnight(dateString) {
    if (!dateString)
        return -Infinity;
    try {
        const [year, month, day] = dateString.split('-').map(Number);
        if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) {
            return new Date(dateString + 'T00:00:00Z').getTime();
        }
        let guessUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/New_York',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        let easternTime = formatter.format(guessUtc);
        let [easternHour, easternMinute] = easternTime.split(':').map(Number);
        let iterations = 0;
        while ((easternHour !== 0 || easternMinute !== 0) && iterations < 10) {
            const hoursToSubtract = easternHour;
            const minutesToSubtract = easternMinute;
            const adjustmentMs = (hoursToSubtract * 60 + minutesToSubtract) * 60 * 1000;
            guessUtc = new Date(guessUtc.getTime() - adjustmentMs);
            easternTime = formatter.format(guessUtc);
            [easternHour, easternMinute] = easternTime.split(':').map(Number);
            iterations++;
        }
        return guessUtc.getTime();
    }
    catch (error) {
        console.warn(`Failed to parse date ${dateString} as Eastern Time, using UTC:`, error);
        return new Date(dateString + 'T00:00:00Z').getTime();
    }
}
function getEasternTimeEndOfDay(dateString) {
    if (!dateString)
        return Infinity;
    try {
        const [year, month, day] = dateString.split('-').map(Number);
        if (!year || !month || !day || isNaN(year) || isNaN(month) || isNaN(day)) {
            const fallbackDate = new Date(dateString + 'T00:00:00Z');
            fallbackDate.setUTCDate(fallbackDate.getUTCDate() + 1);
            return getEasternTimeMidnight(`${fallbackDate.getUTCFullYear()}-${String(fallbackDate.getUTCMonth() + 1).padStart(2, '0')}-${String(fallbackDate.getUTCDate()).padStart(2, '0')}`);
        }
        const nextDay = new Date(year, month - 1, day + 1);
        const nextDayStr = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}-${String(nextDay.getDate()).padStart(2, '0')}`;
        return getEasternTimeMidnight(nextDayStr);
    }
    catch (error) {
        console.warn(`Failed to parse end date ${dateString} as Eastern Time, using UTC:`, error);
        const fallbackDate = new Date(dateString + 'T00:00:00Z');
        fallbackDate.setUTCDate(fallbackDate.getUTCDate() + 1);
        return fallbackDate.getTime();
    }
}
function getCurrentEasternTime() {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    const parts = formatter.formatToParts(now);
    const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
    const month = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1;
    const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    const second = parseInt(parts.find(p => p.type === 'second')?.value || '0');
    let guessUtc = new Date(Date.UTC(year, month, day, hour, minute, second));
    const checkFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    let checkTime = checkFormatter.format(guessUtc);
    let [checkH, checkM, checkS] = checkTime.split(':').map(Number);
    if (checkH !== hour || checkM !== minute || checkS !== second) {
        const diffH = hour - checkH;
        const diffM = minute - checkM;
        const diffS = second - checkS;
        const adjustmentMs = (diffH * 3600 + diffM * 60 + diffS) * 1000;
        guessUtc = new Date(guessUtc.getTime() + adjustmentMs);
    }
    return guessUtc.getTime();
}
class RegistrationController {
    constructor(db) {
        this.db = db;
    }
    getAuth(req) {
        try {
            const hdr = (req.headers.authorization || '');
            const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : '';
            if (!token)
                return {};
            const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
            const p = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            return { id: Number(p.sub), role: p.role };
        }
        catch {
            return {};
        }
    }
    async getRegistrations(req, res) {
        try {
            const { page = 1, limit = 10, eventId, category, search } = req.query;
            const offset = (Number(page) - 1) * Number(limit);
            let conditions = {};
            if (eventId)
                conditions.event_id = eventId;
            if (category)
                conditions.category = category;
            let registrations;
            let total;
            if (search) {
                const searchCondition = `first_name LIKE '%${search}%' OR last_name LIKE '%${search}%' OR email LIKE '%${search}%' OR organization LIKE '%${search}%'`;
                let whereClause = searchCondition;
                if (Object.keys(conditions).length > 0) {
                    const conditionClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
                    whereClause = `${conditionClause} AND ${searchCondition}`;
                }
                registrations = await this.db.query(`SELECT * FROM registrations WHERE ${whereClause} LIMIT ? OFFSET ?`, [...Object.values(conditions), Number(limit), offset]);
                total = await this.db.query(`SELECT COUNT(*) as count FROM registrations WHERE ${whereClause}`, Object.values(conditions));
            }
            else {
                registrations = await this.db.findAll('registrations', conditions, Number(limit), offset);
                total = await this.db.count('registrations', conditions);
            }
            const response = {
                success: true,
                data: registrations.map((row) => Registration_1.Registration.fromDatabase(row).toJSON()),
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total: Array.isArray(total) ? total[0].count : total,
                    totalPages: Math.ceil((Array.isArray(total) ? total[0].count : total) / Number(limit))
                }
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error fetching registrations:', error);
            const response = {
                success: false,
                error: 'Failed to fetch registrations'
            };
            res.status(500).json(response);
        }
    }
    async getRegistrationById(req, res) {
        try {
            const { id } = req.params;
            const registration = await this.db.findById('registrations', Number(id));
            if (!registration) {
                const response = {
                    success: false,
                    error: 'Registration not found'
                };
                res.status(404).json(response);
                return;
            }
            const response = {
                success: true,
                data: Registration_1.Registration.fromDatabase(registration).toJSON()
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error fetching registration:', error);
            const response = {
                success: false,
                error: 'Failed to fetch registration'
            };
            res.status(500).json(response);
        }
    }
    async createRegistration(req, res) {
        try {
            const registrationData = req.body;
            if (registrationData.wednesdayActivity && registrationData.eventId) {
                const event = await this.db.findById('events', registrationData.eventId);
                if (event && event.activities) {
                    const activities = typeof event.activities === 'string'
                        ? JSON.parse(event.activities)
                        : event.activities;
                    if (Array.isArray(activities) && activities.length > 0 && typeof activities[0] === 'object') {
                        const activity = activities
                            .find(a => a.name === registrationData.wednesdayActivity);
                        if (activity?.seatLimit !== undefined) {
                            const existingRegs = await this.db.query(`SELECT COUNT(*) as count FROM registrations 
                 WHERE event_id = ? 
                 AND wednesday_activity = ? 
                 AND (status IS NULL OR status != 'cancelled')
                 AND cancellation_at IS NULL`, [registrationData.eventId, registrationData.wednesdayActivity]);
                            const currentCount = existingRegs[0]?.count || 0;
                            if (currentCount >= activity.seatLimit) {
                                const response = {
                                    success: false,
                                    error: `Sorry, ${activity.name} is full (${activity.seatLimit} seats). Please select another activity.`
                                };
                                res.status(400).json(response);
                                return;
                            }
                        }
                    }
                }
            }
            const activity = registrationData.wednesdayActivity || '';
            const isPickleball = activity.toLowerCase().includes('pickleball');
            if (!isPickleball) {
                registrationData.pickleballEquipment = undefined;
            }
            const registration = new Registration_1.Registration(registrationData);
            try {
                const ev = await this.db.findById('events', registration.eventId);
                if (ev) {
                    const parseJson = (v) => { try {
                        return JSON.parse(v || '[]');
                    }
                    catch {
                        return [];
                    } };
                    const regTiers = parseJson(ev.registration_pricing);
                    const spouseTiers = parseJson(ev.spouse_pricing);
                    const breakfastPrice = Number(ev.breakfast_price ?? 0);
                    const bEnd = ev.breakfast_end_date ? getEasternTimeEndOfDay(ev.breakfast_end_date) : Infinity;
                    const now = getCurrentEasternTime();
                    const pick = (tiers) => {
                        const mapped = (tiers || []).map(t => ({
                            ...t,
                            s: t.startDate ? getEasternTimeMidnight(t.startDate) : -Infinity,
                            e: t.endDate ? getEasternTimeEndOfDay(t.endDate) : Infinity
                        }));
                        return mapped.find((t) => now >= t.s && now < t.e) || mapped[mapped.length - 1] || null;
                    };
                    const base = pick(regTiers);
                    const spouse = registration.spouseDinnerTicket ? pick(spouseTiers) : null;
                    let total = 0;
                    if (base && typeof base.price === 'number')
                        total += base.price;
                    else
                        total += Number(ev.default_price || 0);
                    if (spouse && typeof spouse.price === 'number')
                        total += spouse.price;
                    if (registration.spouseBreakfast && now <= bEnd)
                        total += (isNaN(breakfastPrice) ? 0 : breakfastPrice);
                    const kidsTiers = parseJson(ev.kids_pricing);
                    const kidsActive = pick(kidsTiers);
                    if (registration.kids && registration.kids.length > 0) {
                        const pricePerKid = kidsActive?.price ?? 0;
                        total += pricePerKid * registration.kids.length;
                    }
                    registration.totalPrice = total || registration.totalPrice || 0;
                    if (registration.discountCode) {
                        try {
                            const codeRows = await this.db.query('SELECT * FROM discount_codes WHERE code = ? AND event_id = ?', [registration.discountCode.toUpperCase().trim(), registration.eventId]);
                            if (codeRows.length > 0) {
                                const { DiscountCode } = await Promise.resolve().then(() => __importStar(require('../models/DiscountCode')));
                                const discountCode = DiscountCode.fromDatabase(codeRows[0]);
                                const validation = discountCode.isValid();
                                if (validation.valid) {
                                    let discountAmount = 0;
                                    if (discountCode.discountType === 'percentage') {
                                        discountAmount = (registration.totalPrice * discountCode.discountValue) / 100;
                                    }
                                    else {
                                        discountAmount = discountCode.discountValue;
                                    }
                                    registration.discountAmount = discountAmount;
                                    registration.totalPrice = Math.max(0, registration.totalPrice - discountAmount);
                                    await this.db.query('UPDATE discount_codes SET used_count = used_count + 1 WHERE id = ?', [discountCode.id]);
                                }
                            }
                        }
                        catch (discountError) {
                            console.error('Error applying discount code:', discountError);
                        }
                    }
                }
            }
            catch (e) {
            }
            const result = await this.db.insert('registrations', registration.toDatabase());
            registration.id = result.insertId;
            const adminCopy = process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_EMAIL || process.env.SUPPORT_EMAIL || 'planner@efbcconference.org';
            const toName = registration.badgeName || `${registration.firstName} ${registration.lastName}`.trim();
            const eventRow = await this.db.findById('events', registration.eventId);
            const evName = eventRow?.name;
            const evDate = eventRow?.date;
            const evStartDate = eventRow?.start_date;
            const payload = {
                name: toName,
                eventName: evName,
                eventDate: evDate,
                eventStartDate: evStartDate,
                totalPrice: registration.totalPrice,
                registration: registration.toJSON ? registration.toJSON() : registration
            };
            (0, emailService_1.sendRegistrationConfirmationEmail)({ to: registration.email, ...payload }).catch((e) => console.warn('⚠️ Failed to queue registration confirmation:', e));
            if (adminCopy && adminCopy !== registration.email) {
                (0, emailService_1.sendRegistrationConfirmationEmail)({ to: adminCopy, ...payload }).catch((e) => console.warn('⚠️ Failed to queue admin confirmation:', e));
            }
            if (registration.secondaryEmail && registration.secondaryEmail !== registration.email && registration.secondaryEmail !== adminCopy) {
                (0, emailService_1.sendRegistrationConfirmationEmail)({ to: registration.secondaryEmail, ...payload }).catch((e) => console.warn('⚠️ Failed to queue secondary confirmation:', e));
            }
            const response = {
                success: true,
                data: registration.toJSON(),
                message: 'Registration created successfully'
            };
            res.status(201).json(response);
        }
        catch (error) {
            console.error('Error creating registration:', error);
            const response = {
                success: false,
                error: 'Failed to create registration'
            };
            res.status(500).json(response);
        }
    }
    async updateRegistration(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body || {};
            console.log(`[UPDATE] Received update request for registration ${id}`);
            console.log(`[UPDATE] Update data keys:`, Object.keys(updateData));
            console.log(`[UPDATE] Sample fields:`, {
                firstName: updateData.firstName,
                email: updateData.email,
                clubRentals: updateData.clubRentals,
                wednesdayActivity: updateData.wednesdayActivity
            });
            const existingRow = await this.db.findById('registrations', Number(id));
            if (!existingRow) {
                console.log(`[UPDATE] Registration ${id} not found in database`);
                const response = {
                    success: false,
                    error: 'Registration not found'
                };
                res.status(404).json(response);
                return;
            }
            if (updateData.wednesdayActivity &&
                updateData.wednesdayActivity !== existingRow.wednesday_activity) {
                const event = await this.db.findById('events', existingRow.event_id);
                if (event && event.activities) {
                    const activities = typeof event.activities === 'string'
                        ? JSON.parse(event.activities)
                        : event.activities;
                    if (Array.isArray(activities) && activities.length > 0 && typeof activities[0] === 'object') {
                        const activity = activities
                            .find(a => a.name === updateData.wednesdayActivity);
                        if (activity?.seatLimit !== undefined) {
                            const existingRegs = await this.db.query(`SELECT COUNT(*) as count FROM registrations 
                 WHERE event_id = ? 
                 AND wednesday_activity = ? 
                 AND (status IS NULL OR status != 'cancelled')
                 AND cancellation_at IS NULL
                 AND id != ?`, [existingRow.event_id, updateData.wednesdayActivity, Number(id)]);
                            const currentCount = existingRegs[0]?.count || 0;
                            if (currentCount >= activity.seatLimit) {
                                const response = {
                                    success: false,
                                    error: `Sorry, ${activity.name} is full (${activity.seatLimit} seats). Please select another activity.`
                                };
                                res.status(400).json(response);
                                return;
                            }
                        }
                    }
                }
            }
            console.log(`[UPDATE] Found existing registration ${id}`);
            const fieldMapping = {
                userId: 'user_id',
                eventId: 'event_id',
                firstName: 'first_name',
                lastName: 'last_name',
                badgeName: 'badge_name',
                email: 'email',
                secondaryEmail: 'secondary_email',
                organization: 'organization',
                jobTitle: 'job_title',
                address: 'address',
                addressStreet: 'address_street',
                city: 'city',
                state: 'state',
                zipCode: 'zip_code',
                country: 'country',
                mobile: 'mobile',
                officePhone: 'office_phone',
                isFirstTimeAttending: 'is_first_time_attending',
                companyType: 'company_type',
                companyTypeOther: 'company_type_other',
                emergencyContactName: 'emergency_contact_name',
                emergencyContactPhone: 'emergency_contact_phone',
                wednesdayActivity: 'wednesday_activity',
                wednesdayReception: 'wednesday_reception',
                thursdayBreakfast: 'thursday_breakfast',
                thursdayLuncheon: 'thursday_luncheon',
                thursdayDinner: 'thursday_dinner',
                fridayBreakfast: 'friday_breakfast',
                dietaryRestrictions: 'dietary_restrictions',
                specialRequests: 'special_requests',
                clubRentals: 'club_rentals',
                golfHandicap: 'golf_handicap',
                massageTimeSlot: 'massage_time_slot',
                pickleballEquipment: 'pickleball_equipment',
                spouseDinnerTicket: 'spouse_dinner_ticket',
                spouseBreakfast: 'spouse_breakfast',
                tuesdayEarlyReception: 'tuesday_early_reception',
                spouseFirstName: 'spouse_first_name',
                spouseLastName: 'spouse_last_name',
                childFirstName: 'child_first_name',
                childLastName: 'child_last_name',
                childLunchTicket: 'child_lunch_ticket',
                totalPrice: 'total_price',
                paymentMethod: 'payment_method',
                paid: 'paid',
                squarePaymentId: 'square_payment_id',
                paidAt: 'paid_at',
                spousePaidAt: 'spouse_paid_at',
                discountCode: 'discount_code',
                discountAmount: 'discount_amount',
            };
            const dbPayload = {
                updated_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
            };
            const updateDataObj = updateData || {};
            const updatedActivity = updateDataObj.wednesdayActivity || existingRow.wednesday_activity || '';
            const isGolf = updatedActivity.toLowerCase().includes('golf');
            const isMassage = updatedActivity.toLowerCase().includes('massage');
            const isPickleball = updatedActivity.toLowerCase().includes('pickleball');
            for (const [camelKey, dbKey] of Object.entries(fieldMapping)) {
                if (camelKey in updateDataObj && camelKey !== 'id') {
                    let value = updateDataObj[camelKey];
                    if ((camelKey === 'clubRentals' || camelKey === 'golfHandicap') && !isGolf) {
                        value = null;
                    }
                    if (camelKey === 'massageTimeSlot' && !isMassage) {
                        value = null;
                    }
                    if (camelKey === 'pickleballEquipment' && !isPickleball) {
                        value = null;
                    }
                    if (camelKey === 'spouseDinnerTicket') {
                        value = value === true || value === 'Yes' || value === 'yes' || value === 1 ? 1 : 0;
                    }
                    else if (camelKey === 'isFirstTimeAttending' || camelKey === 'spouseBreakfast' || camelKey === 'paid') {
                        value = value === true || value === 1 ? 1 : 0;
                    }
                    else if (camelKey === 'paidAt' || camelKey === 'spousePaidAt') {
                        value = value ? new Date(value).toISOString().slice(0, 19).replace('T', ' ') : null;
                    }
                    else if (value === null || value === undefined) {
                        value = null;
                    }
                    dbPayload[dbKey] = value;
                }
            }
            if (updateDataObj.wednesdayActivity !== undefined) {
                if (!isGolf) {
                    dbPayload.club_rentals = null;
                    dbPayload.golf_handicap = null;
                }
                if (!isMassage) {
                    dbPayload.massage_time_slot = null;
                }
                if (!isPickleball) {
                    dbPayload.pickleball_equipment = null;
                }
            }
            console.log(`[UPDATE] Database payload keys:`, Object.keys(dbPayload));
            console.log(`[UPDATE] Sample DB fields:`, {
                first_name: dbPayload.first_name,
                email: dbPayload.email,
                club_rentals: dbPayload.club_rentals,
                wednesday_activity: dbPayload.wednesday_activity
            });
            const updateResult = await this.db.update('registrations', Number(id), dbPayload);
            console.log(`[UPDATE] Database update result:`, updateResult);
            const verifyRow = await this.db.findById('registrations', Number(id));
            console.log(`[UPDATE] Verification - Updated record:`, {
                first_name: verifyRow?.first_name,
                email: verifyRow?.email,
                club_rentals: verifyRow?.club_rentals,
                wednesday_activity: verifyRow?.wednesday_activity
            });
            const updatedRegistration = Registration_1.Registration.fromDatabase(verifyRow);
            const auth = this.getAuth(req);
            const isAdminUpdate = auth.role === 'admin';
            if (!isAdminUpdate) {
                try {
                    const adminCopy = process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_EMAIL || process.env.SUPPORT_EMAIL || 'planner@efbcconference.org';
                    const eventRow = await this.db.findById('events', updatedRegistration.eventId);
                    const evName = eventRow?.name;
                    const evDate = eventRow?.date;
                    const evStartDate = eventRow?.start_date;
                    const toName = updatedRegistration.badgeName || `${updatedRegistration.firstName} ${updatedRegistration.lastName}`.trim();
                    const payload = {
                        name: toName,
                        eventName: evName,
                        eventDate: evDate,
                        eventStartDate: evStartDate,
                        totalPrice: updatedRegistration.totalPrice,
                        registration: updatedRegistration.toJSON ? updatedRegistration.toJSON() : updatedRegistration
                    };
                    (0, emailService_1.sendRegistrationUpdateEmail)({ to: updatedRegistration.email, ...payload }).catch((e) => console.warn('Failed to queue registration update email:', e));
                    if (adminCopy && adminCopy !== updatedRegistration.email) {
                        (0, emailService_1.sendRegistrationUpdateEmail)({ to: adminCopy, ...payload }).catch((e) => console.warn('Failed to queue admin update email:', e));
                    }
                    if (updatedRegistration.secondaryEmail && updatedRegistration.secondaryEmail !== updatedRegistration.email && updatedRegistration.secondaryEmail !== adminCopy) {
                        (0, emailService_1.sendRegistrationUpdateEmail)({ to: updatedRegistration.secondaryEmail, ...payload }).catch((e) => console.warn('Failed to queue secondary update email:', e));
                    }
                }
                catch (emailError) {
                    console.warn('Failed to send update email after registration update:', emailError?.message || emailError);
                }
            }
            const response = {
                success: true,
                data: updatedRegistration.toJSON(),
                message: 'Registration updated successfully'
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error updating registration:', error);
            const response = {
                success: false,
                error: 'Failed to update registration'
            };
            res.status(500).json(response);
        }
    }
    async deleteRegistration(req, res) {
        try {
            const { id } = req.params;
            const existingRegistration = await this.db.findById('registrations', Number(id));
            if (!existingRegistration) {
                const response = {
                    success: false,
                    error: 'Registration not found'
                };
                res.status(404).json(response);
                return;
            }
            await this.db.delete('registrations', Number(id));
            const response = {
                success: true,
                message: 'Registration deleted successfully'
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error deleting registration:', error);
            const response = {
                success: false,
                error: 'Failed to delete registration'
            };
            res.status(500).json(response);
        }
    }
    async bulkDeleteRegistrations(req, res) {
        try {
            const { ids } = req.body;
            if (!Array.isArray(ids) || ids.length === 0) {
                const response = {
                    success: false,
                    error: 'Invalid registration IDs provided'
                };
                res.status(400).json(response);
                return;
            }
            const placeholders = ids.map(() => '?').join(',');
            await this.db.query(`DELETE FROM registrations WHERE id IN (${placeholders})`, ids);
            const response = {
                success: true,
                message: `${ids.length} registrations deleted successfully`
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error bulk deleting registrations:', error);
            const response = {
                success: false,
                error: 'Failed to delete registrations'
            };
            res.status(500).json(response);
        }
    }
    async resendConfirmationEmail(req, res) {
        try {
            const { id } = req.params;
            const registrationId = Number(id);
            if (isNaN(registrationId)) {
                const response = {
                    success: false,
                    error: 'Invalid registration ID'
                };
                res.status(400).json(response);
                return;
            }
            const registrationRow = await this.db.findById('registrations', registrationId);
            if (!registrationRow) {
                const response = {
                    success: false,
                    error: 'Registration not found'
                };
                res.status(404).json(response);
                return;
            }
            const registration = Registration_1.Registration.fromDatabase(registrationRow);
            const eventRow = await this.db.findById('events', registration.eventId);
            if (!eventRow) {
                const response = {
                    success: false,
                    error: 'Event not found'
                };
                res.status(404).json(response);
                return;
            }
            const toName = registration.badgeName || `${registration.firstName} ${registration.lastName}`.trim();
            const evName = eventRow?.name;
            const evDate = eventRow?.date;
            const evStartDate = eventRow?.start_date;
            const payload = {
                name: toName,
                eventName: evName,
                eventDate: evDate,
                eventStartDate: evStartDate,
                totalPrice: registration.totalPrice,
                registration: registration.toJSON ? registration.toJSON() : registration
            };
            (0, emailService_1.sendRegistrationConfirmationEmail)({ to: registration.email, ...payload }).catch((e) => console.warn('⚠️ Failed to queue registration confirmation (resend):', e));
            if (registration.secondaryEmail && registration.secondaryEmail !== registration.email) {
                (0, emailService_1.sendRegistrationConfirmationEmail)({ to: registration.secondaryEmail, ...payload }).catch((e) => console.warn('⚠️ Failed to queue secondary confirmation (resend):', e));
            }
            const response = {
                success: true,
                message: 'Confirmation email(s) sent successfully'
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error resending confirmation email:', error);
            const response = {
                success: false,
                error: 'Failed to resend confirmation email'
            };
            res.status(500).json(response);
        }
    }
}
exports.RegistrationController = RegistrationController;
//# sourceMappingURL=registrationController.js.map