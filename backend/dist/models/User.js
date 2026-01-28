"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
class User {
    constructor(data) {
        this.id = data.id;
        this.name = data.name || '';
        this.email = data.email || '';
        this.password = data.password || '';
        this.role = data.role || 'user';
        this.isActive = data.isActive ?? true;
        const fmt = (d) => {
            if (!d)
                return new Date().toISOString().slice(0, 19).replace('T', ' ');
            const dt = new Date(d);
            if (isNaN(dt.getTime()))
                return new Date().toISOString().slice(0, 19).replace('T', ' ');
            return dt.toISOString().slice(0, 19).replace('T', ' ');
        };
        const createdInput = data.created_at || data.createdAt || data.created_At;
        const updatedInput = data.updated_at || data.updatedAt || data.updated_At;
        this.created_at = fmt(createdInput);
        this.updated_at = fmt(updatedInput);
    }
    async hashPassword() {
        if (this.password) {
            const saltRounds = 10;
            this.password = await bcryptjs_1.default.hash(this.password, saltRounds);
        }
    }
    async verifyPassword(plainPassword) {
        return await bcryptjs_1.default.compare(plainPassword, this.password);
    }
    get createdAt() {
        return this.created_at;
    }
    set createdAt(value) {
        this.created_at = value;
    }
    get updatedAt() {
        return this.updated_at;
    }
    set updatedAt(value) {
        this.updated_at = value;
    }
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            email: this.email,
            role: this.role,
            isActive: this.isActive,
            createdAt: this.created_at,
            updatedAt: this.updated_at,
            emailVerifiedAt: this.email_verified_at || null
        };
    }
    toDatabase() {
        return {
            name: this.name,
            email: this.email,
            password: this.password,
            role: this.role,
            isActive: this.isActive,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
    static fromDatabase(row) {
        const user = new User({
            id: row.id,
            name: row.name,
            email: row.email,
            password: row.password,
            role: row.role,
            isActive: row.isActive,
            created_at: row.created_at || row.created_At,
            updated_at: row.updated_at || row.updated_At
        });
        user.email_verified_at = row.email_verified_at || null;
        return user;
    }
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    static isValidPassword(password) {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
        return passwordRegex.test(password);
    }
    validate() {
        const errors = [];
        if (!this.name || this.name.trim().length < 2) {
            errors.push('Name must be at least 2 characters long');
        }
        if (!User.isValidEmail(this.email)) {
            errors.push('Invalid email format');
        }
        if (!this.password || this.password.length < 8) {
            errors.push('Password must be at least 8 characters long');
        }
        if (!User.isValidPassword(this.password)) {
            errors.push('Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number');
        }
        if (!['admin', 'user', 'guest'].includes(this.role)) {
            errors.push('Invalid role');
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}
exports.User = User;
//# sourceMappingURL=User.js.map