# EFBC Conference Backend API

A Node.js/Express backend API for the East Florida Business Conference management system.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Create a `.env` file in the backend root directory:
```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=efbcconference
DB_PORT=3306

# Server Configuration
PORT=5000
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

### 3. Database Setup
1. Install MySQL
2. Create a database named `efbcconference`
3. Update the `.env` file with your MySQL credentials

### 4. Run the Server
```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

## 📊 API Endpoints

### Health Check
- `GET /api/health` - Server health status

### Demo Setup
- `GET /api/demo/setup` - Create demo data (events, groups)

### Authentication
- `POST /api/users/login` - User login
- `POST /api/users/register` - User registration

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Events
- `GET /api/events` - Get all events
- `GET /api/events/:id` - Get event by ID
- `POST /api/events` - Create new event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event

### Registrations
- `GET /api/registrations` - Get all registrations
- `GET /api/registrations/:id` - Get registration by ID
- `POST /api/registrations` - Create new registration
- `PUT /api/registrations/:id` - Update registration
- `DELETE /api/registrations/:id` - Delete registration
- `DELETE /api/registrations/bulk` - Bulk delete registrations

### Groups
- `GET /api/groups` - Get all groups
- `GET /api/groups/:id` - Get group by ID
- `POST /api/groups` - Create new group
- `PUT /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group
- `POST /api/groups/:id/members` - Add member to group
- `DELETE /api/groups/:id/members` - Remove member from group

## 🗄️ Database Schema

### Users Table
- `id` - Primary key
- `name` - User name
- `email` - User email (unique)
- `password` - Hashed password
- `role` - User role (admin, user, guest)
- `isActive` - Account status

### Events Table
- `id` - Primary key
- `year` - Event year
- `name` - Event name
- `date` - Event date
- `eventId` - Unique event identifier
- `activities` - JSON array of activities
- `location` - Event location
- `description` - Event description

### Registrations Table
- `id` - Primary key
- `userId` - User ID
- `eventId` - Event ID (foreign key)
- Personal information fields
- Conference activity preferences
- Meal preferences
- Spouse information
- Payment information

### Groups Table
- `id` - Primary key
- `eventId` - Event ID (foreign key)
- `category` - Group category
- `name` - Group name
- `members` - JSON array of member IDs

## 🛠️ Development

### Project Structure
```
src/
├── config/          # Database configuration
├── controllers/     # Route controllers
├── models/          # Data models
├── routes/          # API routes
├── services/        # Database service
├── types/           # TypeScript type definitions
└── server.ts        # Main server file
```

### Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run dev:build` - Build with watch mode

## 🔧 Features

- ✅ RESTful API design
- ✅ TypeScript support
- ✅ MySQL database integration
- ✅ CORS enabled for frontend
- ✅ Error handling middleware
- ✅ Input validation
- ✅ Pagination support
- ✅ Search functionality
- ✅ Bulk operations
- ✅ Demo data setup

## 📝 Notes

- The API automatically creates database tables on startup
- Demo data can be created by calling `/api/demo/setup`
- All endpoints return JSON responses with consistent format
- Database connections are managed through the DatabaseService class
- Controllers are initialized after database connection is established
