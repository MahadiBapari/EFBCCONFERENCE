"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const User_1 = require("../models/User");
const crypto_1 = __importDefault(require("crypto"));
const emailService_1 = require("../services/emailService");
class UserController {
    constructor(db) {
        this.db = db;
    }
    async getUsers(req, res) {
        try {
            const { page = 1, limit = 10, role, isActive, search } = req.query;
            const offset = (Number(page) - 1) * Number(limit);
            let conditions = {};
            if (role)
                conditions.role = role;
            if (isActive !== undefined)
                conditions.isActive = isActive === 'true';
            let users;
            let total;
            if (search) {
                const searchCondition = `name LIKE '%${search}%' OR email LIKE '%${search}%'`;
                let whereClause = searchCondition;
                if (Object.keys(conditions).length > 0) {
                    const conditionClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
                    whereClause = `${conditionClause} AND ${searchCondition}`;
                }
                users = await this.db.query(`SELECT * FROM users WHERE ${whereClause} LIMIT ? OFFSET ?`, [...Object.values(conditions), Number(limit), offset]);
                total = await this.db.query(`SELECT COUNT(*) as count FROM users WHERE ${whereClause}`, Object.values(conditions));
            }
            else {
                users = await this.db.findAll('users', conditions, Number(limit), offset);
                total = await this.db.count('users', conditions);
            }
            const response = {
                success: true,
                data: users.map((row) => User_1.User.fromDatabase(row).toJSON()),
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
            console.error('Error fetching users:', error);
            const response = {
                success: false,
                error: 'Failed to fetch users'
            };
            res.status(500).json(response);
        }
    }
    async getUserById(req, res) {
        try {
            const { id } = req.params;
            const user = await this.db.findById('users', Number(id));
            if (!user) {
                const response = {
                    success: false,
                    error: 'User not found'
                };
                res.status(404).json(response);
                return;
            }
            const response = {
                success: true,
                data: User_1.User.fromDatabase(user).toJSON()
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error fetching user:', error);
            const response = {
                success: false,
                error: 'Failed to fetch user'
            };
            res.status(500).json(response);
        }
    }
    async createUser(req, res) {
        try {
            const userData = req.body;
            const user = new User_1.User(userData);
            const validation = user.validate();
            if (!validation.isValid) {
                const response = {
                    success: false,
                    error: 'Validation failed',
                    message: validation.errors.join(', ')
                };
                res.status(400).json(response);
                return;
            }
            const existingUser = await this.db.query('SELECT id FROM users WHERE email = ?', [user.email]);
            if (existingUser.length > 0) {
                const response = {
                    success: false,
                    error: 'Email already exists'
                };
                res.status(400).json(response);
                return;
            }
            await user.hashPassword();
            const result = await this.db.insert('users', user.toDatabase());
            user.id = result.insertId;
            const response = {
                success: true,
                data: user.toJSON(),
                message: 'User created successfully'
            };
            res.status(201).json(response);
        }
        catch (error) {
            console.error('Error creating user:', error);
            const response = {
                success: false,
                error: 'Failed to create user'
            };
            res.status(500).json(response);
        }
    }
    async updateUser(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const existingUser = await this.db.findById('users', Number(id));
            if (!existingUser) {
                const response = {
                    success: false,
                    error: 'User not found'
                };
                res.status(404).json(response);
                return;
            }
            const user = new User_1.User({ ...existingUser, ...updateData });
            user.updatedAt = new Date().toISOString();
            if (updateData.password) {
                await user.hashPassword();
            }
            await this.db.update('users', Number(id), user.toDatabase());
            const response = {
                success: true,
                data: user.toJSON(),
                message: 'User updated successfully'
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error updating user:', error);
            const response = {
                success: false,
                error: 'Failed to update user'
            };
            res.status(500).json(response);
        }
    }
    async deleteUser(req, res) {
        try {
            const { id } = req.params;
            const existingUser = await this.db.findById('users', Number(id));
            if (!existingUser) {
                const response = {
                    success: false,
                    error: 'User not found'
                };
                res.status(404).json(response);
                return;
            }
            await this.db.delete('users', Number(id));
            const response = {
                success: true,
                message: 'User deleted successfully'
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error deleting user:', error);
            const response = {
                success: false,
                error: 'Failed to delete user'
            };
            res.status(500).json(response);
        }
    }
    async login(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                const response = {
                    success: false,
                    error: 'Email and password are required'
                };
                res.status(400).json(response);
                return;
            }
            const users = await this.db.query('SELECT * FROM users WHERE email = ? AND isActive = true', [email]);
            if (users.length === 0) {
                const response = {
                    success: false,
                    error: 'Invalid email or password'
                };
                res.status(401).json(response);
                return;
            }
            const user = User_1.User.fromDatabase(users[0]);
            const isValidPassword = await user.verifyPassword(password);
            if (!isValidPassword) {
                const response = {
                    success: false,
                    error: 'Invalid email or password'
                };
                res.status(401).json(response);
                return;
            }
            if (!users[0].email_verified_at) {
                const response = {
                    success: false,
                    error: 'Email not verified'
                };
                res.status(403).json(response);
                return;
            }
            const response = {
                success: true,
                user: user.toJSON(),
                message: 'Login successful'
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error during login:', error);
            const response = {
                success: false,
                error: 'Login failed'
            };
            res.status(500).json(response);
        }
    }
    async register(req, res) {
        try {
            const { name, email, password, role = 'user' } = req.body;
            if (!name || !email || !password) {
                const response = {
                    success: false,
                    error: 'Name, email, and password are required'
                };
                res.status(400).json(response);
                return;
            }
            const existingUser = await this.db.query('SELECT id FROM users WHERE email = ?', [email]);
            if (existingUser.length > 0) {
                const response = {
                    success: false,
                    error: 'Email already exists'
                };
                res.status(400).json(response);
                return;
            }
            const user = new User_1.User({ name, email, password, role });
            const validation = user.validate();
            if (!validation.isValid) {
                const response = {
                    success: false,
                    error: 'Validation failed',
                    message: validation.errors.join(', ')
                };
                res.status(400).json(response);
                return;
            }
            await user.hashPassword();
            const result = await this.db.insert('users', user.toDatabase());
            user.id = result.insertId;
            const token = crypto_1.default.randomBytes(32).toString('hex');
            const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
                .toISOString().slice(0, 19).replace('T', ' ');
            await this.db.query('UPDATE users SET email_verification_token=?, email_verification_expires_at=? WHERE id=?', [token, expires, user.id]);
            (0, emailService_1.sendVerificationEmail)(user.email, token).catch((e) => {
                console.warn('⚠️ Failed to send verification email:', e);
            });
            const response = {
                success: true,
                user: user.toJSON(),
                message: 'Registration successful. Please check your email to verify your account.'
            };
            res.status(201).json(response);
        }
        catch (error) {
            console.error('Error during registration:', error);
            const response = {
                success: false,
                error: 'Registration failed'
            };
            res.status(500).json(response);
        }
    }
}
exports.UserController = UserController;
//# sourceMappingURL=userController.js.map