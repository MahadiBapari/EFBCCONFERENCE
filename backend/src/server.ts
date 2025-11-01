import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import connectDB from './config/database';
import { DatabaseService } from './services/databaseService';

// Import routes
import eventRoutes from './routes/eventRoutes';
import registrationRoutes from './routes/registrationRoutes';
import groupRoutes from './routes/groupRoutes';
import userRoutes from './routes/userRoutes';
import authRoutes from './routes/authRoutes';

// Load environment variables
dotenv.config();

// Express app
const app: Application = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use((express as any).json());
app.use((express as any).urlencoded({ extended: true }));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/registrations', registrationRoutes);
app.use('/api/groups', groupRoutes);

// Global database service
let databaseService: DatabaseService;

// Connect to database and initialize service
const initializeDatabase = async () => {
  try {
    const connection = await connectDB();
    databaseService = new DatabaseService(connection);
    
    // Make database service globally available
    (globalThis as any).databaseService = databaseService;
    
    console.log('🚀 Database service initialized');
    
    // Create tables if they don't exist
    await createTables();
    
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  }
};

// Create database tables
const createTables = async () => {
  try {
    // Users table
    await databaseService.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'user', 'guest') DEFAULT 'user',
        isActive BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Ensure email verification columns exist on users
    await migrateUsersEmailVerification();

    // Events table
    await databaseService.query(`
      CREATE TABLE IF NOT EXISTS events (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        activities JSON,
        location VARCHAR(500),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Registrations table
    await databaseService.query(`
      CREATE TABLE IF NOT EXISTS registrations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        event_id INT,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        badge_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        secondary_email VARCHAR(255),
        organization VARCHAR(255),
        job_title VARCHAR(255),
        address TEXT,
        mobile VARCHAR(50),
        office_phone VARCHAR(50),
        is_first_time_attending BOOLEAN,
        company_type VARCHAR(255),
        company_type_other VARCHAR(255),
        emergency_contact_name VARCHAR(255),
        emergency_contact_phone VARCHAR(50),
        wednesday_activity VARCHAR(255),
        wednesday_reception VARCHAR(50),
        thursday_breakfast VARCHAR(50),
        thursday_luncheon VARCHAR(50),
        thursday_dinner VARCHAR(50),
        friday_breakfast VARCHAR(50),
        dietary_restrictions TEXT,
        spouse_dinner_ticket BOOLEAN,
        spouse_first_name VARCHAR(255),
        spouse_last_name VARCHAR(255),
        total_price DECIMAL(10, 2),
        payment_method VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
      )
    `);

    // Attempt automatic migration of legacy registrations schema (camelCase -> snake_case)
    await migrateRegistrationsTable();

    // Add/verify spouse_pricing on events and rentals fields on registrations
    await migrateEventsAndRegistrationsEnhancements();

    // Groups table
    await databaseService.query(`
      CREATE TABLE IF NOT EXISTS \`groups\` (
        id INT PRIMARY KEY AUTO_INCREMENT,
        eventId INT NOT NULL,
        category VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Database tables created/verified');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
};

// Migration helper to add email verification columns to users
const migrateUsersEmailVerification = async (): Promise<void> => {
  try {
    const dbNameRows: any[] = await databaseService.query('SELECT DATABASE() as db');
    const dbName = dbNameRows[0]?.db;
    if (!dbName) return;

    const cols: any[] = await databaseService.query(
      'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION',
      [dbName, 'users']
    );
    const has = (name: string) => cols.some((c: any) => c.COLUMN_NAME === name);
    const alter: string[] = [];
    if (!has('email_verified_at')) alter.push('ADD COLUMN `email_verified_at` TIMESTAMP NULL AFTER `isActive`');
    if (!has('email_verification_token')) alter.push('ADD COLUMN `email_verification_token` VARCHAR(255) NULL AFTER `email_verified_at`');
    if (!has('email_verification_expires_at')) alter.push('ADD COLUMN `email_verification_expires_at` TIMESTAMP NULL AFTER `email_verification_token`');
    if (!has('password_reset_token')) alter.push('ADD COLUMN `password_reset_token` VARCHAR(255) NULL AFTER `email_verification_expires_at`');
    if (!has('password_reset_expires_at')) alter.push('ADD COLUMN `password_reset_expires_at` TIMESTAMP NULL AFTER `password_reset_token`');
    if (alter.length > 0) {
      await databaseService.query(`ALTER TABLE \`users\` ${alter.join(', ')}`);
      console.log('🛠️ Added users.email verification columns');
    }
  } catch (e) {
    console.warn('⚠️ Skipping users email verification migration:', e);
  }
};

// Migration helper to align legacy registrations table columns
const migrateRegistrationsTable = async () => {
  try {
    const dbNameRows: any[] = await databaseService.query('SELECT DATABASE() as db');
    const dbName = dbNameRows[0]?.db;
    if (!dbName) return;

    const columns: any[] = await databaseService.query(
      'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION',
      [dbName, 'registrations']
    );
    if (!Array.isArray(columns)) return;

    const has = (name: string) => columns.some((c: any) => c.COLUMN_NAME === name);

    const alter: string[] = [];
    const rename = (oldCol: string, newCol: string, type: string) => {
      if (!has(newCol) && has(oldCol)) alter.push(`CHANGE COLUMN \`${oldCol}\` \`${newCol}\` ${type}`);
    };
    const add = (col: string, type: string) => {
      if (!has(col)) alter.push(`ADD COLUMN \`${col}\` ${type}`);
    };
    const drop = (col: string) => {
      if (has(col)) alter.push(`DROP COLUMN \`${col}\``);
    };

    // Renames from legacy camelCase -> snake_case
    rename('userId', 'user_id', 'INT');
    rename('eventId', 'event_id', 'INT');
    rename('firstName', 'first_name', 'VARCHAR(255)');
    rename('lastName', 'last_name', 'VARCHAR(255)');
    rename('badgeName', 'badge_name', 'VARCHAR(255)');
    rename('secondaryEmail', 'secondary_email', 'VARCHAR(255)');
    rename('jobTitle', 'job_title', 'VARCHAR(255)');
    rename('officePhone', 'office_phone', 'VARCHAR(50)');
    rename('isFirstTimeAttending', 'is_first_time_attending', 'BOOLEAN');
    rename('companyType', 'company_type', 'VARCHAR(255)');
    rename('companyTypeOther', 'company_type_other', 'VARCHAR(255)');
    rename('emergencyContactName', 'emergency_contact_name', 'VARCHAR(255)');
    rename('emergencyContactPhone', 'emergency_contact_phone', 'VARCHAR(50)');
    rename('wednesdayActivity', 'wednesday_activity', 'VARCHAR(255)');
    rename('wednesdayReception', 'wednesday_reception', 'VARCHAR(50)');
    rename('thursdayBreakfast', 'thursday_breakfast', 'VARCHAR(50)');
    rename('thursdayLunch', 'thursday_luncheon', 'VARCHAR(50)');
    rename('thursdayReception', 'thursday_reception', 'VARCHAR(50)');
    rename('fridayBreakfast', 'friday_breakfast', 'VARCHAR(50)');
    rename('dietaryRestrictions', 'dietary_restrictions', 'TEXT');
    rename('spouseDinnerTicket', 'spouse_dinner_ticket', 'BOOLEAN');
    rename('spouseFirstName', 'spouse_first_name', 'VARCHAR(255)');
    rename('spouseLastName', 'spouse_last_name', 'VARCHAR(255)');
    rename('totalPrice', 'total_price', 'DECIMAL(10,2)');
    rename('paymentMethod', 'payment_method', 'VARCHAR(50)');
    rename('createdAt', 'created_at', 'TIMESTAMP');
    rename('updatedAt', 'updated_at', 'TIMESTAMP');

    // Add required columns if missing
    ['user_id','event_id','first_name','last_name','badge_name','email','organization','address','mobile','wednesday_activity','wednesday_reception','thursday_breakfast','thursday_luncheon','thursday_dinner','friday_breakfast','spouse_dinner_ticket','total_price','payment_method','created_at','updated_at']
      .forEach((col) => {
        if (!has(col)) {
          // minimal types for missing columns
          switch (col) {
            case 'user_id':
            case 'event_id':
              add(col, 'INT');
              break;
            case 'total_price':
              add(col, 'DECIMAL(10,2)');
              break;
            case 'spouse_dinner_ticket':
              add(col, 'BOOLEAN');
              break;
            case 'created_at':
            case 'updated_at':
              add(col, 'TIMESTAMP NULL');
              break;
            default:
              add(col, 'VARCHAR(255)');
          }
        }
      });

    // Drop removed columns if present
    drop('golfHandicap');
    drop('golfClubPreference');
    drop('massageTimeSlot');
    drop('golf_handicap');
    drop('golf_club_preference');
    drop('massage_time_slot');

    if (alter.length > 0) {
      const sql = `ALTER TABLE \`registrations\` ${alter.join(', ')}`;
      await databaseService.query(sql);
      console.log('🛠️ Migrated registrations table schema');
    }
  } catch (e) {
    console.warn('⚠️ Skipping registrations schema migration:', e);
  }
};

// Migration helper to add spouse_pricing to events and rentals fields to registrations
const migrateEventsAndRegistrationsEnhancements = async () => {
  try {
    const dbNameRows: any[] = await databaseService.query('SELECT DATABASE() as db');
    const dbName = dbNameRows[0]?.db;
    if (!dbName) return;

    const getCols = async (table: string) => await databaseService.query(
      'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',[dbName, table]
    );

    // events.spouse_pricing JSON
    const eventCols: any[] = await getCols('events');
    if (!eventCols.some((c:any)=>c.COLUMN_NAME==='spouse_pricing')) {
      await databaseService.query('ALTER TABLE `events` ADD COLUMN `spouse_pricing` JSON NULL AFTER `activities`');
      console.log('🛠️ Added events.spouse_pricing');
    }

    // registrations.club_rentals (BOOLEAN) and golf_handicap (VARCHAR(10))
    const regCols: any[] = await getCols('registrations');
    const alter: string[] = [];
    if (!regCols.some((c:any)=>c.COLUMN_NAME==='club_rentals')) alter.push('ADD COLUMN `club_rentals` BOOLEAN');
    if (!regCols.some((c:any)=>c.COLUMN_NAME==='golf_handicap')) alter.push('ADD COLUMN `golf_handicap` VARCHAR(10)');
    if (alter.length>0) {
      await databaseService.query(`ALTER TABLE \`registrations\` ${alter.join(', ')}`);
      console.log('🛠️ Added registrations.club_rentals/golf_handicap');
    }
  } catch(e) {
    console.warn('⚠️ Enhancement migration skipped:', e);
  }
};

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'EFBC Conference API is running',
    timestamp: new Date().toISOString(),
    database: databaseService ? 'Connected' : 'Disconnected'
  });
});

// Demo data endpoint
app.get('/api/demo/setup', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!databaseService) {
      res.status(500).json({
        success: false,
        error: 'Database not initialized'
      });
      return;
    }

    // Create demo admin user (password: admin123)
    // Note: In production, passwords should be properly hashed
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const adminSql = `
      INSERT INTO users (name, email, password, role, isActive) 
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE password = VALUES(password), name = VALUES(name), role = VALUES(role), isActive = VALUES(isActive)
    `;
    await databaseService.query(adminSql, ['Admin User', 'hasan5481@gmail.com', adminPasswordHash, 'admin', true]);


    // Create demo regular user (password: user123)
    const userPasswordHash = await bcrypt.hash('user123', 10);
    const userSql = `
      INSERT INTO users (name, email, password, role, isActive) 
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE password = VALUES(password), name = VALUES(name), role = VALUES(role), isActive = VALUES(isActive)
    `;
    await databaseService.query(userSql, ['Regular User', 'user@efbc.com', userPasswordHash, 'user', true]);


    // Create demo event
    const demoEvent = {
      name: 'EFBC 2024 Conference',
      date: '2024-04-22',
      activities: JSON.stringify(['Golf', 'Fishing', 'Networking', 'Tennis', 'Swimming']),
      location: 'Disney\'s Yacht & Beach Club Resorts, Orlando, Florida',
      description: 'Annual East Florida Business Conference featuring networking, education, and recreational activities.'
    };

    await databaseService.query(
      'INSERT IGNORE INTO events (name, date, activities, location, description) VALUES (?, ?, ?, ?, ?)',
      [demoEvent.name, demoEvent.date, demoEvent.activities, demoEvent.location, demoEvent.description]
    );

    // Create demo groups
    const demoGroups = [
      { eventId: 1, category: 'Networking', name: 'Networking Group 1' },
      { eventId: 1, category: 'Golf', name: 'Golf Group 1' },
      { eventId: 1, category: 'Fishing', name: 'Fishing Group 1' }
    ];

    for (const group of demoGroups) {
      await databaseService.query(
        'INSERT IGNORE INTO `groups` (eventId, category, name) VALUES (?, ?, ?)',
        [group.eventId, group.category, group.name]
      );
    }

    res.status(200).json({
      success: true,
      message: 'Demo data created successfully',
      data: {
        event: 'EFBC 2024 Conference',
        groups: demoGroups.length
      }
    });
  } catch (error) {
    console.error('Error setting up demo data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create demo data'
    });
  }
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: (req as any).originalUrl || (req as any).url
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Initialize database and start server
const startServer = async () => {
  try {
    await initializeDatabase();
    
    const PORT = parseInt(process.env.PORT || '5000');
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🎯 Demo setup: http://localhost:${PORT}/api/demo/setup`);
      console.log(`📝 API Documentation:`);
      console.log(`   Events: http://localhost:${PORT}/api/events`);
      console.log(`   Registrations: http://localhost:${PORT}/api/registrations`);
      console.log(`   Groups: http://localhost:${PORT}/api/groups`);
      console.log(`   Auth: http://localhost:${PORT}/api/auth/login`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;