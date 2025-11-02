"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistrationController = void 0;
const Registration_1 = require("../models/Registration");
const emailService_1 = require("../services/emailService");
class RegistrationController {
    constructor(db) {
        this.db = db;
    }
    async getRegistrations(req, res) {
        try {
            const { page = 1, limit = 10, eventId, category, search } = req.query;
            const offset = (Number(page) - 1) * Number(limit);
            let conditions = {};
            if (eventId)
                conditions.eventId = eventId;
            if (category)
                conditions.category = category;
            let registrations;
            let total;
            if (search) {
                const searchCondition = `firstName LIKE '%${search}%' OR lastName LIKE '%${search}%' OR email LIKE '%${search}%' OR organization LIKE '%${search}%'`;
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
                    const bEnd = ev.breakfast_end_date ? new Date(ev.breakfast_end_date).getTime() : Infinity;
                    const now = Date.now();
                    const pick = (tiers) => {
                        const mapped = (tiers || []).map(t => ({ ...t, s: t.startDate ? new Date(t.startDate).getTime() : -Infinity, e: t.endDate ? new Date(t.endDate).getTime() : Infinity }));
                        return mapped.find((t) => now >= t.s && now <= t.e) || mapped[mapped.length - 1] || null;
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
                    registration.totalPrice = total || registration.totalPrice || 0;
                }
            }
            catch (e) {
            }
            const result = await this.db.insert('registrations', registration.toDatabase());
            registration.id = result.insertId;
            (0, emailService_1.sendRegistrationConfirmationEmail)({
                to: registration.email,
                name: registration.badgeName || `${registration.firstName} ${registration.lastName}`.trim(),
                totalPrice: registration.totalPrice,
            }).catch((e) => console.warn('⚠️ Failed to send registration confirmation:', e));
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
            const updateData = req.body;
            const existingRegistration = await this.db.findById('registrations', Number(id));
            if (!existingRegistration) {
                const response = {
                    success: false,
                    error: 'Registration not found'
                };
                res.status(404).json(response);
                return;
            }
            const registration = new Registration_1.Registration({ ...existingRegistration, ...updateData });
            registration.updatedAt = new Date().toISOString();
            await this.db.update('registrations', Number(id), registration.toDatabase());
            const response = {
                success: true,
                data: registration.toJSON(),
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
}
exports.RegistrationController = RegistrationController;
//# sourceMappingURL=registrationController.js.map