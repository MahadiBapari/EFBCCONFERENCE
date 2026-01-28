"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const User_1 = require("../models/User");
const emailService_1 = require("../services/emailService");
const adminPasswordUtils_1 = require("./adminPasswordUtils");
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
                const searchPattern = `%${search}%`;
                const searchCondition = `(name LIKE ? OR email LIKE ?)`;
                let whereClause = searchCondition;
                const params = [searchPattern, searchPattern];
                if (Object.keys(conditions).length > 0) {
                    const conditionClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
                    whereClause = `${conditionClause} AND ${searchCondition}`;
                    params.unshift(...Object.values(conditions));
                }
                const limitNum = Number(limit);
                const offsetNum = Number(offset);
                users = await this.db.query(`SELECT * FROM users WHERE ${whereClause} LIMIT ${limitNum} OFFSET ${offsetNum}`, params);
                total = await this.db.query(`SELECT COUNT(*) as count FROM users WHERE ${whereClause}`, params);
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
    async createUserByAdmin(req, res) {
        try {
            const { firstName, lastName, email, role } = req.body;
            const name = `${(firstName || '').trim()} ${(lastName || '').trim()}`.trim();
            if (!name || !email) {
                const response = {
                    success: false,
                    error: 'First name, last name, and email are required',
                };
                res.status(400).json(response);
                return;
            }
            const normalizedRole = (role === 'admin' ? 'admin' : 'user');
            const existingUser = await this.db.query('SELECT id FROM users WHERE email = ?', [email]);
            if (existingUser.length > 0) {
                const response = {
                    success: false,
                    error: 'Email already exists',
                };
                res.status(400).json(response);
                return;
            }
            const tempPassword = (0, adminPasswordUtils_1.generateStrongTempPassword)();
            const user = new User_1.User({
                name,
                email,
                password: tempPassword,
                role: normalizedRole,
                isActive: true,
            });
            const validation = user.validate();
            if (!validation.isValid) {
                const response = {
                    success: false,
                    error: 'Validation failed',
                    message: validation.errors.join(', '),
                };
                res.status(400).json(response);
                return;
            }
            await user.hashPassword();
            const result = await this.db.insert('users', user.toDatabase());
            user.id = result.insertId;
            await this.db.query('UPDATE users SET email_verified_at = NOW(), email_verification_token = NULL, email_verification_expires_at = NULL WHERE id = ?', [user.id]);
            setImmediate(async () => {
                try {
                    await (0, emailService_1.sendAdminCreatedUserEmail)({
                        to: email,
                        name,
                        tempPassword,
                        role: normalizedRole,
                    });
                }
                catch (e) {
                    console.error('Failed to send admin-created user email:', e?.message || e);
                }
            });
            const response = {
                success: true,
                data: user.toJSON(),
                message: 'User created successfully and a temporary password has been emailed.',
            };
            res.status(201).json(response);
        }
        catch (error) {
            console.error('Error creating user by admin:', error);
            const response = {
                success: false,
                error: 'Failed to create user',
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
            user.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
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
            await this.db.query('UPDATE users SET email_verified_at = NOW() WHERE id = ?', [user.id]);
            const response = {
                success: true,
                user: user.toJSON(),
                message: 'Registration successful. You can now login.'
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
    async verifyUser(req, res) {
        try {
            const { id } = req.params;
            const userId = Number(id);
            if (isNaN(userId)) {
                const response = {
                    success: false,
                    error: 'Invalid user ID'
                };
                res.status(400).json(response);
                return;
            }
            const user = await this.db.findById('users', userId);
            if (!user) {
                const response = {
                    success: false,
                    error: 'User not found'
                };
                res.status(404).json(response);
                return;
            }
            if (user.email_verified_at) {
                const response = {
                    success: true,
                    message: 'User email is already verified',
                    data: User_1.User.fromDatabase(user).toJSON()
                };
                res.status(200).json(response);
                return;
            }
            await this.db.query('UPDATE users SET email_verified_at = NOW(), email_verification_token = NULL, email_verification_expires_at = NULL WHERE id = ?', [userId]);
            const updatedUser = await this.db.findById('users', userId);
            if (!updatedUser) {
                const response = {
                    success: false,
                    error: 'Failed to verify user'
                };
                res.status(500).json(response);
                return;
            }
            console.log(`[ADMIN] User ${userId} (${updatedUser.email}) email verified by admin`);
            try {
                await (0, emailService_1.sendVerificationCompleteEmail)(updatedUser.email, updatedUser.name || '');
                console.log(`[ADMIN] Verification complete email sent to ${updatedUser.email}`);
            }
            catch (e) {
                console.error('Failed to send verification complete email:', e?.message || e);
            }
            const response = {
                success: true,
                message: 'User email verified successfully',
                data: User_1.User.fromDatabase(updatedUser).toJSON()
            };
            res.status(200).json(response);
        }
        catch (error) {
            console.error('Error verifying user:', error);
            const response = {
                success: false,
                error: 'Failed to verify user'
            };
            res.status(500).json(response);
        }
    }
}
exports.UserController = UserController;
//# sourceMappingURL=userController.js.map