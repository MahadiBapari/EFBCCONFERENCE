import { Request, Response } from 'express';
import { User } from '../models/User';
import { ApiResponse, CreateUserRequest, UpdateUserRequest, LoginRequest, RegisterRequest, AuthResponse } from '../types';
import { DatabaseService } from '../services/databaseService';
import crypto from 'crypto';
import { sendVerificationEmail, sendAdminCreatedUserEmail, sendVerificationCompleteEmail } from '../services/emailService';
import { generateStrongTempPassword } from './adminPasswordUtils';

export class UserController {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  // Get all users
  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10, role, isActive, search } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      let conditions: Record<string, any> = {};
      if (role) conditions.role = role;
      if (isActive !== undefined) conditions.isActive = isActive === 'true';

      let users;
      let total;

      if (search) {
        // Use parameterized queries for search to prevent SQL injection
        const searchPattern = `%${search}%`;
        const searchCondition = `(name LIKE ? OR email LIKE ?)`;
        let whereClause = searchCondition;
        const params: any[] = [searchPattern, searchPattern];
        
        if (Object.keys(conditions).length > 0) {
          const conditionClause = Object.keys(conditions).map(key => `${key} = ?`).join(' AND ');
          whereClause = `${conditionClause} AND ${searchCondition}`;
          params.unshift(...Object.values(conditions));
        }

        // Inline LIMIT and OFFSET as numbers (already sanitized) to avoid parameter binding issues
        const limitNum = Number(limit);
        const offsetNum = Number(offset);
        users = await this.db.query(
          `SELECT * FROM users WHERE ${whereClause} LIMIT ${limitNum} OFFSET ${offsetNum}`,
          params
        );
        
        total = await this.db.query(
          `SELECT COUNT(*) as count FROM users WHERE ${whereClause}`,
          params
        );
      } else {
        users = await this.db.findAll('users', conditions, Number(limit), offset);
        total = await this.db.count('users', conditions);
      }

      const response: ApiResponse = {
        success: true,
        data: users.map((row: any) => User.fromDatabase(row).toJSON()),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Array.isArray(total) ? total[0].count : total,
          totalPages: Math.ceil((Array.isArray(total) ? total[0].count : total) / Number(limit))
        }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching users:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to fetch users'
      };
      res.status(500).json(response);
    }
  }

  // Get user by ID
  async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await this.db.findById('users', Number(id));

      if (!user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not found'
        };
        res.status(404).json(response);
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: User.fromDatabase(user).toJSON()
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error fetching user:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to fetch user'
      };
      res.status(500).json(response);
    }
  }

  // Create new user
  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const userData: CreateUserRequest = req.body;
      const user = new User(userData);
      
      // Validate user data
      const validation = user.validate();
      if (!validation.isValid) {
        const response: ApiResponse = {
          success: false,
          error: 'Validation failed',
          message: validation.errors.join(', ')
        };
        res.status(400).json(response);
        return;
      }

      // Check if email already exists
      const existingUser = await this.db.query(
        'SELECT id FROM users WHERE email = ?',
        [user.email]
      );

      if (existingUser.length > 0) {
        const response: ApiResponse = {
          success: false,
          error: 'Email already exists'
        };
        res.status(400).json(response);
        return;
      }

      // Hash password
      await user.hashPassword();
      
      const result = await this.db.insert('users', user.toDatabase());
      user.id = result.insertId;

      const response: ApiResponse = {
        success: true,
        data: user.toJSON(),
        message: 'User created successfully'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error creating user:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to create user'
      };
      res.status(500).json(response);
    }
  }

  // Admin creates a user on behalf of someone (no email verification required)
  async createUserByAdmin(req: Request, res: Response): Promise<void> {
    try {
      const { firstName, lastName, email, role }: { firstName?: string; lastName?: string; email?: string; role?: string } = req.body;

      const name = `${(firstName || '').trim()} ${(lastName || '').trim()}`.trim();
      if (!name || !email) {
        const response: ApiResponse = {
          success: false,
          error: 'First name, last name, and email are required',
        };
        res.status(400).json(response);
        return;
      }

      // Only allow 'admin' or 'user'; default to 'user'
      const normalizedRole = (role === 'admin' ? 'admin' : 'user') as 'admin' | 'user';

      // Check if email already exists
      const existingUser = await this.db.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existingUser.length > 0) {
        const response: ApiResponse = {
          success: false,
          error: 'Email already exists',
        };
        res.status(400).json(response);
        return;
      }

      // Generate a strong temporary password that satisfies password policy
      const tempPassword = generateStrongTempPassword();

      const user = new User({
        name,
        email,
        password: tempPassword,
        role: normalizedRole,
        isActive: true,
      });

      const validation = user.validate();
      if (!validation.isValid) {
        const response: ApiResponse = {
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

      // Mark email as verified and clear any verification tokens
      await this.db.query(
        'UPDATE users SET email_verified_at = NOW(), email_verification_token = NULL, email_verification_expires_at = NULL WHERE id = ?',
        [user.id],
      );

      // Fire-and-forget email with temporary password
      setImmediate(async () => {
        try {
          await sendAdminCreatedUserEmail({
            to: email,
            name,
            tempPassword,
            role: normalizedRole,
          });
        } catch (e: any) {
          console.error('Failed to send admin-created user email:', e?.message || e);
        }
      });

      const response: ApiResponse = {
        success: true,
        data: user.toJSON(),
        message: 'User created successfully and a temporary password has been emailed.',
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error creating user by admin:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to create user',
      };
      res.status(500).json(response);
    }
  }

  // Update user
  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: UpdateUserRequest = req.body;
      
      const existingUser = await this.db.findById('users', Number(id));
      if (!existingUser) {
        const response: ApiResponse = {
          success: false,
          error: 'User not found'
        };
        res.status(404).json(response);
        return;
      }

      const user = new User({ ...existingUser, ...updateData });
      // Ensure updatedAt is stored in MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
      user.updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
      
      // Hash password if it's being updated
      if (updateData.password) {
        await user.hashPassword();
      }
      
      await this.db.update('users', Number(id), user.toDatabase());

      const response: ApiResponse = {
        success: true,
        data: user.toJSON(),
        message: 'User updated successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error updating user:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to update user'
      };
      res.status(500).json(response);
    }
  }

  // Delete user
  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const existingUser = await this.db.findById('users', Number(id));
      if (!existingUser) {
        const response: ApiResponse = {
          success: false,
          error: 'User not found'
        };
        res.status(404).json(response);
        return;
      }

      await this.db.delete('users', Number(id));

      const response: ApiResponse = {
        success: true,
        message: 'User deleted successfully'
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error deleting user:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to delete user'
      };
      res.status(500).json(response);
    }
  }

  // User login
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password }: LoginRequest = req.body;

      if (!email || !password) {
        const response: AuthResponse = {
          success: false,
          error: 'Email and password are required'
        };
        res.status(400).json(response);
        return;
      }

      // Find user by email
      const users = await this.db.query(
        'SELECT * FROM users WHERE email = ? AND isActive = true',
        [email]
      );

      if (users.length === 0) {
        const response: AuthResponse = {
          success: false,
          error: 'Invalid email or password'
        };
        res.status(401).json(response);
        return;
      }

      const user = User.fromDatabase(users[0]);
      const isValidPassword = await user.verifyPassword(password);

      if (!isValidPassword) {
        const response: AuthResponse = {
          success: false,
          error: 'Invalid email or password'
        };
        res.status(401).json(response);
        return;
      }

      // Require verified email
      if (!users[0].email_verified_at) {
        const response: AuthResponse = {
          success: false,
          error: 'Email not verified'
        };
        res.status(403).json(response);
        return;
      }

      // In a real application, you would generate a JWT token here
      const response: AuthResponse = {
        success: true,
        user: user.toJSON(),
        message: 'Login successful'
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error during login:', error);
      const response: AuthResponse = {
        success: false,
        error: 'Login failed'
      };
      res.status(500).json(response);
    }
  }

  // User registration
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password, role = 'user' }: RegisterRequest = req.body;

      if (!name || !email || !password) {
        const response: AuthResponse = {
          success: false,
          error: 'Name, email, and password are required'
        };
        res.status(400).json(response);
        return;
      }

      // Check if email already exists
      const existingUser = await this.db.query(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingUser.length > 0) {
        const response: AuthResponse = {
          success: false,
          error: 'Email already exists'
        };
        res.status(400).json(response);
        return;
      }

      const user = new User({ name, email, password, role });
      
      // Validate user data
      const validation = user.validate();
      if (!validation.isValid) {
        const response: AuthResponse = {
          success: false,
          error: 'Validation failed',
          message: validation.errors.join(', ')
        };
        res.status(400).json(response);
        return;
      }

      // Hash password
      await user.hashPassword();
      
      const result = await this.db.insert('users', user.toDatabase());
      user.id = result.insertId;

      // Generate verification token, store expiry, and send email
      const token = crypto.randomBytes(32).toString('hex');
      console.log(`[REGISTER] Generated token for user ${user.id} (${email}): length=${token.length}, prefix=${token.substring(0, 10)}`);
      
      // Ensure token is saved before sending email
      const updateResult = await this.db.query(
        'UPDATE users SET email_verification_token=?, email_verification_expires_at=DATE_ADD(NOW(), INTERVAL 24 HOUR) WHERE id=?',
        [token, user.id]
      );
      
      // Verify the token was saved
      const verifyToken = await this.db.query(
        'SELECT email_verification_token, LENGTH(email_verification_token) as token_len FROM users WHERE id=? LIMIT 1',
        [user.id]
      );
      
      if (!verifyToken[0] || !verifyToken[0].email_verification_token) {
        console.error(`[REGISTER] Failed to save verification token for user ${user.id}. Token in DB:`, verifyToken[0]);
        throw new Error('Failed to save verification token');
      }
      
      if (verifyToken[0].email_verification_token !== token) {
        console.error(`[REGISTER] Token mismatch for user ${user.id}. Expected: ${token.substring(0, 10)}..., Got: ${verifyToken[0].email_verification_token?.substring(0, 10)}...`);
        throw new Error('Token verification failed');
      }
      
      console.log(`[REGISTER] Token saved successfully for user ${user.id}. Token length in DB: ${verifyToken[0].token_len}`);
      
      // Fire-and-forget email send on registration (after token is confirmed saved)
      setImmediate(async () => {
        try {
          await sendVerificationEmail(email, token);
          console.log(`[REGISTER] Verification email sent to ${email}`);
        } catch (e: any) {
          console.error('SMTP sendVerificationEmail (register) failed:', e?.message || e);
        }
      });

      const response: AuthResponse = {
        success: true,
        user: user.toJSON(),
        message: 'Registration successful. Please check your email to verify your account.'
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('Error during registration:', error);
      const response: AuthResponse = {
        success: false,
        error: 'Registration failed'
      };
      res.status(500).json(response);
    }
  }

  // Verify user email (admin action)
  async verifyUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = Number(id);

      if (isNaN(userId)) {
        const response: ApiResponse = {
          success: false,
          error: 'Invalid user ID'
        };
        res.status(400).json(response);
        return;
      }

      // Check if user exists
      const user = await this.db.findById('users', userId);
      if (!user) {
        const response: ApiResponse = {
          success: false,
          error: 'User not found'
        };
        res.status(404).json(response);
        return;
      }

      // Check if already verified
      if (user.email_verified_at) {
        const response: ApiResponse = {
          success: true,
          message: 'User email is already verified',
          data: User.fromDatabase(user).toJSON()
        };
        res.status(200).json(response);
        return;
      }

      // Verify the email
      await this.db.query(
        'UPDATE users SET email_verified_at = NOW(), email_verification_token = NULL, email_verification_expires_at = NULL WHERE id = ?',
        [userId]
      );

      // Fetch updated user
      const updatedUser = await this.db.findById('users', userId);
      if (!updatedUser) {
        const response: ApiResponse = {
          success: false,
          error: 'Failed to verify user'
        };
        res.status(500).json(response);
        return;
      }

      console.log(`[ADMIN] User ${userId} (${updatedUser.email}) email verified by admin`);

      // Send verification complete email
      try {
        await sendVerificationCompleteEmail(updatedUser.email, updatedUser.name || '');
        console.log(`[ADMIN] Verification complete email sent to ${updatedUser.email}`);
      } catch (e: any) {
        console.error('Failed to send verification complete email:', e?.message || e);
        // Don't fail the verification if email fails
      }

      const response: ApiResponse = {
        success: true,
        message: 'User email verified successfully',
        data: User.fromDatabase(updatedUser).toJSON()
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Error verifying user:', error);
      const response: ApiResponse = {
        success: false,
        error: 'Failed to verify user'
      };
      res.status(500).json(response);
    }
  }
}
