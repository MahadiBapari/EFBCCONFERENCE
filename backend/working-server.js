const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const PORT = parseInt(process.env.PORT) || 5002;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
let dbConnection;

async function connectDB() {
  try {
    dbConnection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'has10129656',
      database: process.env.DB_NAME || 'efbctestdb',
      port: parseInt(process.env.DB_PORT || '3306')
    });
    console.log('✅ Connected to MySQL database');
  } catch (error) {
    console.error('❌ Error connecting to MySQL:', error);
    process.exit(1);
  }
}

// Create tables if they don't exist
async function createTables() {
  try {
    console.log('🔄 Ensuring database tables exist...');
    
    // Create users table
    await dbConnection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'user') DEFAULT 'user',
        isActive BOOLEAN DEFAULT true,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create events table
    await dbConnection.execute(`
      CREATE TABLE IF NOT EXISTS events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        location VARCHAR(255),
        description TEXT,
        activities JSON,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Create registrations table
    await dbConnection.execute(`
      CREATE TABLE IF NOT EXISTS registrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT,
        eventId INT,
        firstName VARCHAR(255) NOT NULL,
        lastName VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        organization VARCHAR(255),
        phone VARCHAR(20),
        totalPrice DECIMAL(10,2) DEFAULT 0,
        paymentStatus ENUM('pending', 'paid', 'cancelled') DEFAULT 'pending',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE
      )
    `);

    // Create groups table
    await dbConnection.execute(`
      CREATE TABLE IF NOT EXISTS \`groups\` (
        id INT AUTO_INCREMENT PRIMARY KEY,
        eventId INT,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        maxMembers INT DEFAULT 10,
        currentMembers INT DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE
      )
    `);

    // Create group_members table
    await dbConnection.execute(`
      CREATE TABLE IF NOT EXISTS group_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        groupId INT,
        userId INT,
        joinedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (groupId) REFERENCES \`groups\`(id) ON DELETE CASCADE,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_group_user (groupId, userId)
      )
    `);

    console.log('✅ All tables verified/created');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
  }
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    database: dbConnection ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

// Events API
app.get('/api/events', async (req, res) => {
  try {
    const [rows] = await dbConnection.execute('SELECT * FROM events ORDER BY date DESC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const { name, date, location, description, activities } = req.body;
    const [result] = await dbConnection.execute(
      'INSERT INTO events (name, date, location, description, activities) VALUES (?, ?, ?, ?, ?)',
      [name, date, location, description, JSON.stringify(activities || [])]
    );
    res.json({ success: true, data: { id: result.insertId, ...req.body } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, date, location, description, activities } = req.body;
    await dbConnection.execute(
      'UPDATE events SET name = ?, date = ?, location = ?, description = ?, activities = ? WHERE id = ?',
      [name, date, location, description, JSON.stringify(activities || []), id]
    );
    res.json({ success: true, data: { id: parseInt(id), ...req.body } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await dbConnection.execute('DELETE FROM events WHERE id = ?', [id]);
    res.json({ success: true, message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Registrations API
app.get('/api/registrations', async (req, res) => {
  try {
    const { eventId } = req.query;
    let query = 'SELECT * FROM registrations';
    let params = [];
    
    if (eventId) {
      query += ' WHERE eventId = ?';
      params.push(eventId);
    }
    
    query += ' ORDER BY createdAt DESC';
    const [rows] = await dbConnection.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/registrations', async (req, res) => {
  try {
    const { userId, eventId, firstName, lastName, email, organization, phone, totalPrice } = req.body;
    const [result] = await dbConnection.execute(
      'INSERT INTO registrations (userId, eventId, firstName, lastName, email, organization, phone, totalPrice) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, eventId, firstName, lastName, email, organization, phone, totalPrice]
    );
    res.json({ success: true, data: { id: result.insertId, ...req.body } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Groups API
app.get('/api/groups', async (req, res) => {
  try {
    const { eventId } = req.query;
    let query = 'SELECT * FROM `groups`';
    let params = [];
    
    if (eventId) {
      query += ' WHERE eventId = ?';
      params.push(eventId);
    }
    
    query += ' ORDER BY createdAt DESC';
    const [rows] = await dbConnection.execute(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/groups', async (req, res) => {
  try {
    const { eventId, name, category, maxMembers } = req.body;
    const [result] = await dbConnection.execute(
      'INSERT INTO `groups` (eventId, name, category, maxMembers) VALUES (?, ?, ?, ?)',
      [eventId, name, category, maxMembers]
    );
    res.json({ success: true, data: { id: result.insertId, ...req.body } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Users API
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await dbConnection.execute('SELECT id, name, email, role, isActive, createdAt FROM users ORDER BY createdAt DESC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const [result] = await dbConnection.execute(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, password, role || 'user']
    );
    res.json({ success: true, data: { id: result.insertId, name, email, role: role || 'user' } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Demo data endpoint
app.post('/api/demo/setup', async (req, res) => {
  try {
    // Create demo users
    await dbConnection.execute(
      'INSERT IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      ['Admin User', 'admin@efbc.com', 'admin123', 'admin']
    );
    await dbConnection.execute(
      'INSERT IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      ['John Doe', 'john@example.com', 'user123', 'user']
    );

    // Create demo events
    const [eventResult] = await dbConnection.execute(
      'INSERT IGNORE INTO events (name, date, location, description, activities) VALUES (?, ?, ?, ?, ?)',
      ['EFBC Conference 2024', '2024-12-15', 'Convention Center', 'Annual EFBC Conference', JSON.stringify(['Golf', 'Fishing', 'Networking'])]
    );

    res.json({ 
      success: true, 
      message: 'Demo data created successfully',
      data: {
        users: ['admin@efbc.com', 'john@example.com'],
        events: ['EFBC Conference 2024']
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Start server
async function startServer() {
  await connectDB();
  await createTables();
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🎯 API Base URL: http://localhost:${PORT}/api`);
    console.log(`📋 Available endpoints:`);
    console.log(`  - GET    /api/events`);
    console.log(`  - POST   /api/events`);
    console.log(`  - PUT    /api/events/:id`);
    console.log(`  - DELETE /api/events/:id`);
    console.log(`  - GET    /api/registrations`);
    console.log(`  - POST   /api/registrations`);
    console.log(`  - GET    /api/groups`);
    console.log(`  - POST   /api/groups`);
    console.log(`  - GET    /api/users`);
    console.log(`  - POST   /api/users`);
    console.log(`  - POST   /api/demo/setup`);
  });
}

startServer().catch(console.error);
