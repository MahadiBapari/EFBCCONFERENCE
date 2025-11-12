import { Request, Response } from 'express';
import { User } from '../models/User';
import { ApiResponse, CreateUserRequest, UpdateUserRequest, LoginRequest, RegisterRequest, AuthResponse } from '../types';
import { DatabaseService } from '../services/databaseService';
import crypto from 'crypto';
import { sendVerificationEmail } from '../services/emailService';

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
      user.updatedAt = new Date().toISOString();
      
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
      await this.db.query(
        'UPDATE users SET email_verification_token=?, email_verification_expires_at=DATE_ADD(NOW(), INTERVAL 24 HOUR) WHERE id=?',
        [token, user.id]
      );
      // Fire-and-forget email send on registration
      setImmediate(async () => {
        try {
          await sendVerificationEmail(email, token);
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
}
