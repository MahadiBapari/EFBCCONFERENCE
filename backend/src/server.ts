import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database';
import { DatabaseService } from './services/databaseService';

// Import routes
import eventRoutes from './routes/eventRoutes';
import registrationRoutes from './routes/registrationRoutes';
import groupRoutes from './routes/groupRoutes';
import userRoutes from './routes/userRoutes';

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
    
    // Initialize routes after database is ready
    await initRoutes();
    
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

    // Events table
    await databaseService.query(`
      CREATE TABLE IF NOT EXISTS events (
        id INT PRIMARY KEY AUTO_INCREMENT,
        year INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        eventId INT UNIQUE NOT NULL,
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
        userId INT NOT NULL,
        eventId INT NOT NULL,
        firstName VARCHAR(100) NOT NULL,
        lastName VARCHAR(100) NOT NULL,
        badgeName VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        secondaryEmail VARCHAR(255),
        organization VARCHAR(255) NOT NULL,
        jobTitle VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        mobile VARCHAR(20) NOT NULL,
        officePhone VARCHAR(20),
        isFirstTimeAttending BOOLEAN DEFAULT FALSE,
        companyType VARCHAR(100) NOT NULL,
        companyTypeOther VARCHAR(255),
        emergencyContactName VARCHAR(100),
        emergencyContactPhone VARCHAR(20),
        wednesdayActivity ENUM('Golf Tournament', 'Fishing', 'Networking', 'None') NOT NULL,
        golfHandicap VARCHAR(50),
        golfClubPreference ENUM('Own Clubs', 'Right-handed Mens', 'Left-handed Mens', 'Right-handed Ladies', 'Left-handed Ladies'),
        massageTimeSlot ENUM('8:00 AM- 10:00 AM', '10:00 AM - 12:00 PM', '12:00 PM - 2:00 PM', '2:00 PM - 4:00 PM'),
        wednesdayReception ENUM('I will attend', 'I will NOT attend') NOT NULL,
        thursdayBreakfast ENUM('I will attend', 'I will NOT attend') NOT NULL,
        thursdayLunch ENUM('I will attend', 'I will NOT attend') NOT NULL,
        thursdayReception ENUM('I will attend', 'I will NOT attend') NOT NULL,
        fridayBreakfast ENUM('I will attend', 'I will NOT attend') NOT NULL,
        fridayLunch ENUM('I will attend', 'I will NOT attend') NOT NULL,
        fridayDinner ENUM('I will attend', 'I will NOT attend') NOT NULL,
        dietaryRestrictions TEXT,
        spouseFirstName VARCHAR(100),
        spouseLastName VARCHAR(100),
        spouseDinnerTicket ENUM('Yes', 'No') DEFAULT 'No',
        totalPrice DECIMAL(10,2) NOT NULL,
        paymentMethod ENUM('Card', 'Check') NOT NULL,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE
      )
    `);

    // Groups table
    await databaseService.query(`
      CREATE TABLE IF NOT EXISTS \`groups\` (
        id INT PRIMARY KEY AUTO_INCREMENT,
        eventId INT NOT NULL,
        category VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        members JSON,
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

// Routes - Initialize controllers first
const initRoutes = async () => {
  // Initialize controllers with database service
  if (databaseService) {
    // Routes will be initialized when controllers are ready
    app.use('/api/users', userRoutes);
    app.use('/api/events', eventRoutes);
    app.use('/api/registrations', registrationRoutes);
    app.use('/api/groups', groupRoutes);
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
    await databaseService.query(
      'INSERT IGNORE INTO users (name, email, password, role, isActive) VALUES (?, ?, ?, ?, ?)',
      ['Admin User', 'admin@efbc.com', 'admin123', 'admin', true]
    );

    // Create demo regular user (password: user123)
    await databaseService.query(
      'INSERT IGNORE INTO users (name, email, password, role, isActive) VALUES (?, ?, ?, ?, ?)',
      ['Regular User', 'user@efbc.com', 'user123', 'user', true]
    );

    // Create demo event
    const demoEvent = {
      year: 2024,
      name: 'EFBC 2024 Conference',
      date: '2024-04-22',
      eventId: 1,
      activities: JSON.stringify(['Golf', 'Fishing', 'Networking', 'Tennis', 'Swimming']),
      location: 'Disney\'s Yacht & Beach Club Resorts, Orlando, Florida',
      description: 'Annual East Florida Business Conference featuring networking, education, and recreational activities.'
    };

    await databaseService.query(
      'INSERT IGNORE INTO events (year, name, date, eventId, activities, location, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [demoEvent.year, demoEvent.name, demoEvent.date, demoEvent.eventId, demoEvent.activities, demoEvent.location, demoEvent.description]
    );

    // Create demo groups
    const demoGroups = [
      { eventId: 1, category: 'Networking', name: 'Networking Group 1', members: JSON.stringify([]) },
      { eventId: 1, category: 'Golf', name: 'Golf Group 1', members: JSON.stringify([]) },
      { eventId: 1, category: 'Fishing', name: 'Fishing Group 1', members: JSON.stringify([]) }
    ];

    for (const group of demoGroups) {
      await databaseService.query(
        'INSERT IGNORE INTO `groups` (eventId, category, name, members) VALUES (?, ?, ?, ?)',
        [group.eventId, group.category, group.name, group.members]
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
  });
};

startServer().catch(error => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

export default app;