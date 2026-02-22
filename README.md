# Felicity Event Management System

A comprehensive MERN stack event management system for managing clubs, events, and participants.

## Technology Stack

- **MongoDB** - Database
- **Express.js** - Backend framework implementing REST APIs
- **React** - Frontend
- **Node.js** - Runtime

## Features

### User Roles
- **Participant** (IIIT Student / Non-IIIT Participant)
- **Organizer** (Clubs / Councils / Fest Teams)
- **Admin** (System-level administrator)

### Key Features
- JWT-based authentication with role-based access control
- Password hashing using bcrypt
- Event creation with custom registration forms
- Participant registration with QR code tickets
- Event browsing with search and filters
- Dashboard for participants and organizers
- Admin panel for club/organizer management

## Setup Instructions

### Prerequisites
- Node.js (v14+)
- MongoDB (running locally or MongoDB Atlas)

### Installation

1. Clone the repository
2. Install backend dependencies:
   ```bash
   npm install
   ```

3. Install frontend dependencies:
   ```bash
   cd client
   npm install
   cd ..
   ```

4. Create `.env` file in root directory (use `.env.example` as template)

5. Start MongoDB service

6. Run the application:
   ```bash
   # Development mode (both frontend and backend)
   npm run dev:all

   # Or run separately
   npm run dev     # Backend only
   npm run client  # Frontend only
   ```

7. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## Project Structure

```
├── backend/
│   ├── models/        # Mongoose models
│   ├── routes/        # API routes
│   ├── controllers/   # Route controllers
│   ├── middleware/    # Custom middleware
│   ├── utils/         # Utility functions
│   └── server.js      # Entry point
├── client/            # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   └── utils/
└── package.json
```

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register participant
- POST `/api/auth/login` - Login
- GET `/api/auth/me` - Get current user

### Events
- GET `/api/events` - Browse events
- POST `/api/events` - Create event (Organizer)
- GET `/api/events/:id` - Event details
- PUT `/api/events/:id` - Update event (Organizer)
- POST `/api/events/:id/register` - Register for event

### Admin
- POST `/api/admin/organizers` - Create organizer account
- DELETE `/api/admin/organizers/:id` - Remove organizer

## Default Admin Credentials
- Email: admin@felicity.com
- Password: admin123

**Note:** Change these credentials after first login.

## Submission
Submit as a single ZIP file as per assignment requirements.
