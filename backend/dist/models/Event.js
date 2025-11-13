"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Event = void 0;
class Event {
    constructor(data) {
        this.id = data.id;
        this.year = data.year || (data.date ? new Date(data.date).getFullYear() : new Date().getFullYear());
        this.name = data.name || '';
        this.date = data.date || new Date().toISOString().split('T')[0];
        this.startDate = data.startDate || data.start_date || undefined;
        this.activities = data.activities || [];
        this.location = data.location || '';
        this.description = Array.isArray(data.description) ? data.description : (data.description ? [data.description] : []);
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        this.createdAt = data.createdAt || now;
        this.updatedAt = data.updatedAt || now;
        this.spousePricing = data.spousePricing || [];
        this.registrationPricing = data.registrationPricing || [];
        this.breakfastPrice = data.breakfastPrice ?? undefined;
        this.breakfastEndDate = data.breakfastEndDate || undefined;
    }
    toJSON() {
        return {
            id: this.id,
            year: this.year,
            name: this.name,
            date: this.date,
            startDate: this.startDate,
            endDate: this.date,
            activities: this.activities,
            location: this.location,
            description: this.description,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            spousePricing: this.spousePricing,
            registrationPricing: this.registrationPricing,
            breakfastPrice: this.breakfastPrice,
            breakfastEndDate: this.breakfastEndDate
        };
    }
    toDatabase() {
        return {
            name: this.name,
            date: this.date,
            start_date: this.startDate || null,
            activities: this.activities ? JSON.stringify(this.activities) : null,
            location: this.location,
            description: this.description && this.description.length > 0 ? JSON.stringify(this.description) : null,
            created_at: this.createdAt,
            updated_at: this.updatedAt,
            spouse_pricing: this.spousePricing ? JSON.stringify(this.spousePricing) : null,
            registration_pricing: this.registrationPricing ? JSON.stringify(this.registrationPricing) : null,
            breakfast_price: this.breakfastPrice ?? null,
            breakfast_end_date: this.breakfastEndDate || null
        };
    }
    static fromDatabase(row) {
        let activities = [];
        if (row.activities) {
            try {
                activities = JSON.parse(row.activities);
            }
            catch (e) {
                activities = Array.isArray(row.activities) ? row.activities : String(row.activities).split(',');
            }
        }
        let spousePricing = [];
        let registrationPricing = [];
        if (row.spouse_pricing !== undefined && row.spouse_pricing !== null) {
            if (typeof row.spouse_pricing === 'string') {
                try {
                    spousePricing = JSON.parse(row.spouse_pricing);
                }
                catch {
                    spousePricing = [];
                }
            }
            else if (Array.isArray(row.spouse_pricing)) {
                spousePricing = row.spouse_pricing;
            }
            else if (typeof row.spouse_pricing === 'object') {
                spousePricing = Array.isArray(row.spouse_pricing) ? row.spouse_pricing : [];
            }
        }
        if (row.registration_pricing !== undefined && row.registration_pricing !== null) {
            if (typeof row.registration_pricing === 'string') {
                try {
                    registrationPricing = JSON.parse(row.registration_pricing);
                }
                catch {
                    registrationPricing = [];
                }
            }
            else if (Array.isArray(row.registration_pricing)) {
                registrationPricing = row.registration_pricing;
            }
            else if (typeof row.registration_pricing === 'object') {
                registrationPricing = Array.isArray(row.registration_pricing) ? row.registration_pricing : [];
            }
        }
        return new Event({
            id: row.id,
            name: row.name,
            date: row.date,
            startDate: row.start_date || row.startDate,
            activities: activities,
            location: row.location,
            description: (() => {
                if (!row.description)
                    return [];
                if (typeof row.description === 'string') {
                    try {
                        const parsed = JSON.parse(row.description);
                        return Array.isArray(parsed) ? parsed : [parsed];
                    }
                    catch {
                        return [row.description];
                    }
                }
                return Array.isArray(row.description) ? row.description : [row.description];
            })(),
            createdAt: row.created_at || row.createdAt,
            updatedAt: row.updated_at || row.updatedAt,
            spousePricing,
            registrationPricing,
            breakfastPrice: row.breakfast_price,
            breakfastEndDate: row.breakfast_end_date
        });
    }
}
exports.Event = Event;
//# sourceMappingURL=Event.js.map