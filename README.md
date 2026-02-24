# Felicity Event Management System

A full-stack MERN event management platform for managing clubs, events, registrations, and participants at IIIT Hyderabad's annual fest.

## Live Deployment

| Service  | URL |
|----------|-----|
| Frontend | https://dass-a1-jldm.onrender.com |
| Backend API | https://felicity-backend-55fy.onrender.com/api |
| Health Check | https://felicity-backend-55fy.onrender.com/api/health |

---

## Project Structure

```
dass_a1/
├── backend/
│   ├── controllers/     # Business logic for each resource
│   ├── middleware/      # JWT auth middleware
│   ├── models/          # Mongoose schemas
│   ├── routes/          # Express route definitions
│   ├── scripts/         # Admin seed scripts
│   ├── utils/           # Email, Discord, QR, ticket helpers
│   └── server.js        # App entry point
├── frontend/            # React frontend (Create React App)
│   ├── public/
│   └── src/
│       ├── components/  # Shared UI components
│       ├── constants/   # Predefined interests/tags
│       ├── context/     # Auth context (React Context API)
│       ├── pages/       # Page-level components
│       └── utils/       # Axios API instance
├── package.json         # Root scripts
└── deployment.txt       # Deployment URLs
```

---

## Libraries & Frameworks

### Backend

| Library | Version | Justification |
|---------|---------|---------------|
| **express** | ^4.18.2 | Minimal, flexible Node.js web framework. Chosen for its large ecosystem, middleware support, and clean routing API. |
| **mongoose** | ^8.0.0 | MongoDB ODM providing schema validation, virtual fields, and query building. Reduces boilerplate for DB operations. |
| **jsonwebtoken** | ^9.0.2 | Industry-standard JWT implementation for stateless authentication. Supports role-based access without server-side sessions. |
| **bcrypt** | ^5.1.1 | Password hashing with salt rounds. Chosen over md5/sha for its purposely slow algorithm that resists brute-force attacks. |
| **dotenv** | ^16.3.1 | Loads environment variables from `.env` files. Keeps secrets out of source code. |
| **cors** | ^2.8.5 | Configures cross-origin headers. Required for frontend (different origin) to make API calls. |
| **nodemailer** | ^6.9.7 | Sends transactional emails (registration confirmations, tickets). Supports SMTP/Gmail with minimal setup. |
| **qrcode** | ^1.5.3 | Generates QR code images for event tickets. Used for attendance scanning at events. |
| **express-validator** | ^7.0.1 | Request validation middleware. Prevents invalid data from reaching the database layer. |
| **concurrently** | ^8.2.2 | Runs backend and frontend dev servers simultaneously with one command. |
| **nodemon** | ^3.0.1 | Auto-restarts backend on file changes during development. Improves dev workflow. |

### Frontend

| Library | Version | Justification |
|---------|---------|---------------|
| **react** | ^18.x | Component-based UI library. Chosen for its virtual DOM, hooks API, and large ecosystem. |
| **react-router-dom** | ^6.x | Client-side routing for SPA navigation. Supports protected routes and URL params. |
| **axios** | ^1.x | HTTP client with interceptors. Used for automatic JWT header injection and global 401 redirect. |
| **react-toastify** | ^9.x | Non-blocking toast notifications. Provides consistent feedback for async actions (save, error, success). |
| **jsqr** | ^1.x | Pure-JS QR code decoder. Used for file-upload QR scanning without camera dependency conflicts. |
| **react-scripts** | ^5.0.1 | Create React App toolchain. Provides zero-config Webpack, Babel, ESLint, and dev server. |

---

## Features Implemented

### Tier A — Core Features

| Feature | Description |
|---------|-------------|
| **Role-based Auth** | Three roles: Participant, Organizer, Admin. JWT stored in localStorage, validated on every protected route. |
| **Event CRUD** | Organizers create/edit/delete events with status transitions (Draft → Published → Ongoing → Closed). |
| **Event Registration** | Participants register for events; system enforces eligibility, deadlines, and registration limits. |
| **QR Ticket Generation** | On registration, a QR code is generated server-side (node-qrcode) and emailed as a PNG attachment. |
| **Admin Dashboard** | Admin can create/approve/remove organizer accounts and manage password reset requests. |
| **Browse & Filter Events** | Participants browse events with filters for type, eligibility, date range, and text search. |

### Tier B — Intermediate Features

| Feature | Description | Design Choice |
|---------|-------------|---------------|
| **Custom Registration Forms** | Organizers define custom fields (text, number, dropdown, checkbox, file) per event. Locked after first registration to protect data integrity. | Schema stored as `customFormFields[]` in Event model. Form builder UI in EditEvent.js. |
| **Discussion Forum** | Per-event threaded discussion with replies, reactions, pin, and organizer announcements. Polled every 10s. | Separate Discussion model with `parentMessage` ref for threading. |
| **Merchandise Orders** | Special event type for merchandise with size/color/variant selection and order management. | `eventType: 'Merchandise'` branch in Event model; separate order tracking. |
| **Attendance via QR Scan** | Organizer scans participant QR codes using device camera (getUserMedia + jsQR + canvas) or file upload to mark attendance. | Replaced `react-qr-reader` (peer dep conflict) with native browser APIs. |
| **Recommended Events** | Participants see events matching their interest tags on the Browse page. | Backend filters by tag overlap with participant's `interests[]`. |

### Tier C — Advanced Features

| Feature | Description | Design Choice |
|---------|-------------|---------------|
| **Discord Webhook Notifications** | When an event is published, a formatted embed is posted to the configured Discord channel. | Implemented in `backend/utils/discord.js` using `axios` POST to webhook URL. Zero extra packages. |
| **Password Reset Workflow** | Organizers submit reset requests; Admin reviews and approves from dashboard. | Custom `PasswordResetRequest` model; avoids email-based reset for organizer accounts managed by Admin. |
| **Organizer Follow System** | Participants follow/unfollow clubs. "Sort by Followed Clubs" filter on Browse page. | `followedOrganizers[]` in Participant model; backend filters events by organizer ID. |
| **Event Analytics** | Organizer dashboard shows registration count, attendance rate, gender breakdown, and revenue per event. | Computed from AttendanceLog and registration data; no external analytics library. |
| **CSV Export** | Organizers export participant list as CSV from event detail page. | Client-side generation using Blob API; no extra library. |

---

## Setup & Installation (Local)

### Prerequisites
- Node.js v18+
- MongoDB running locally (`mongod`) or a MongoDB Atlas URI

### 1. Clone the repository
```bash
git clone https://github.com/ManikBansal414/dass_a1.git
cd dass_a1
```

### 2. Install backend dependencies
```bash
npm install
```

### 3. Install frontend dependencies
```bash
cd frontend
npm install
cd ..
```

### 4. Configure environment variables
Create `backend/.env`:
```env
MONGODB_URI=mongodb://localhost:27017/felicity
JWT_SECRET=your_secret_here
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=Felicity Events <your_email@gmail.com>

DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
ADMIN_EMAIL=admin@felicity.com
ADMIN_PASSWORD=admin123
```

Create `frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:5000/api
DISABLE_ESLINT_PLUGIN=true
```

### 5. Run the application
```bash
# Run both backend and frontend together
npm run dev:all

# Or separately:
npm run dev        # backend on :5000
npm run client     # frontend on :3000
```

### 6. Access the application
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- Health check: http://localhost:5000/api/health

### Default Admin Credentials
```
Email:    admin@felicity.com
Password: admin123
```

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register participant |
| POST | `/api/auth/login` | Login (all roles) |
| GET | `/api/auth/me` | Get current user |

### Events
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events` | Browse/filter events |
| POST | `/api/events` | Create event (Organizer) |
| GET | `/api/events/:id` | Event details |
| PUT | `/api/events/:id` | Update event |
| POST | `/api/events/:id/register` | Register for event |
| DELETE | `/api/events/:id` | Delete event |

### Participant
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/participant/dashboard` | Dashboard data |
| GET | `/api/participant/registrations` | My registrations |
| POST | `/api/participant/follow/:orgId` | Follow organizer |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/organizers` | Create organizer |
| GET | `/api/admin/organizers` | List organizers |
| DELETE | `/api/admin/organizers/:id` | Remove organizer |
| GET | `/api/admin/password-requests` | List reset requests |

---

## Environment Variables Reference

### Backend
| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret for signing JWTs |
| `PORT` | No | Server port (default: 5000) |
| `NODE_ENV` | No | `development` or `production` |
| `FRONTEND_URL` | Yes (prod) | Frontend URL for CORS |
| `EMAIL_USER` | No | Gmail address for sending emails |
| `EMAIL_PASS` | No | Gmail app password |
| `DISCORD_WEBHOOK_URL` | No | Discord channel webhook |
| `ADMIN_EMAIL` | No | Initial admin email |
| `ADMIN_PASSWORD` | No | Initial admin password |

### Frontend
| Variable | Required | Description |
|----------|----------|-------------|
| `REACT_APP_API_URL` | Yes | Backend API base URL |
| `DISABLE_ESLINT_PLUGIN` | No | Disable ESLint in CRA build |
