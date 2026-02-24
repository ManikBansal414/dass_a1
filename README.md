# Felicity Event Management System

A full-stack MERN event management platform for managing clubs, events, registrations, and participants at IIIT Hyderabad's annual fest.

---

## Live Deployment

| Service | URL |
|---|---|
| Frontend | https://dass-a1-jldm.onrender.com |
| Backend API | https://felicity-backend-55fy.onrender.com/api |
| Health Check | https://felicity-backend-55fy.onrender.com/api/health |
| Database | MongoDB Atlas (cloud) |

---

## Advanced Features Implemented

### Tier A (Core Advanced) — 2 features selected

#### Feature A2: Merchandise Payment Approval Workflow ✅

**What is implemented:**
- Participants place a merchandise order and upload a payment proof image (base64)
- Order enters **Pending Approval** state immediately after upload
- Organizers see a dedicated **Manage Orders** tab showing all orders with payment proof images, current status (Pending / Approved / Rejected), and approve/reject action buttons
- On **approval**: order status → `Successful`, stock is decremented, a QR ticket is generated and emailed to the participant
- On **rejection**: order status → `Rejected`, no QR/ticket generated
- QR codes are **never** generated while order is Pending or Rejected

**Justification for selection:**
This feature was selected because it models a real-world payment workflow found in college fest registrations where UPI/bank transfer proof must be verified manually before confirming an order. It adds meaningful business logic around state transitions, file handling, and conditional ticket generation.

**Design choices:**
- Payment proof stored as base64 string in the database — avoids needing a separate file storage service (S3/Cloudinary) for a college project scope
- Status machine: `Pending → Approved/Rejected` enforced server-side in `eventController.js`
- QR generation (`qrcode` npm package) is called only inside the approval branch, never at registration time for Merchandise events
- Email confirmation sent via Nodemailer on approval with QR code attached

**Technical decisions:**
- `Participant` subdocument in `Event` model stores `paymentProof`, `paymentProofUploadedAt`, `paymentStatus` fields
- `getMerchandiseOrders` controller returns all orders with proof for the organizer view
- `approveOrder` / `rejectOrder` are separate endpoints to keep logic clean

---

#### Feature A3: QR Scanner & Attendance Tracking ✅

**What is implemented:**
- Organizers open a dedicated **QR Scanner** page per event
- Supports **two scan modes**: live camera scan (using `getUserMedia` + `jsQR` + canvas frame extraction) and file upload scan (using `jsQR` on uploaded image)
- On scan: ticket QR is decoded → participant looked up → attendance marked with timestamp
- **Duplicate scan rejection**: if participant already marked present, scan returns an error
- **Live attendance dashboard**: shows total registered, total scanned, percentage, and a list of all participants with attended/not-attended status
- **Export CSV**: downloads attendance data as a `.csv` file
- **Manual override**: organizer can manually mark/unmark attendance for any participant with reason logging (`AttendanceLog` model)

**Justification for selection:**
QR-based attendance is the most practically valuable feature for a college fest — it replaces manual name-checking at entry gates. Camera-based scanning means organizers only need their phone/laptop, no external hardware.

**Design choices:**
- Native browser `getUserMedia` API used instead of `react-qr-reader` package — avoids npm peer dependency conflicts and works on all modern browsers
- `jsQR` library decodes QR from canvas frame at 100ms intervals during camera scan
- Duplicate scan check done server-side (`participant.attendance === true` → 400 error) to prevent race conditions
- `AttendanceLog` is a separate MongoDB collection (not embedded) to support audit queries

**Technical decisions:**
- `markAttendance` endpoint: `POST /api/events/:id/mark-attendance` accepts `{ ticketId }` in body
- `manualAttendanceOverride` endpoint: `POST /api/events/:id/manual-attendance` accepts `{ participantId, attended, reason }`
- CSV export done client-side from attendance data already fetched — no separate backend endpoint needed

---

### Tier B (Real-time & Communication) — 2 features selected

#### Feature B1: Real-Time Discussion Forum ✅

**What is implemented:**
- Discussion forum embedded on the **Event Details** page, visible only to registered participants
- Participants can post messages, reply to threads, and react with emoji reactions (👍 ❤️ 🎉 🤔 👏)
- Organizers can **pin** messages, **delete** any message, and post **Announcements** (highlighted differently)
- **Message threading**: replies are nested under parent messages
- Auto-polling every 10 seconds for new messages (simulates real-time without WebSockets)
- 403 error shown if non-registered user tries to access forum

**Justification for selection:**
A discussion forum enables participants to ask questions about event logistics, form teams, and get organizer announcements — all without needing external tools like WhatsApp groups.

**Design choices:**
- Polling (10s interval) chosen over WebSockets — keeps the backend stateless and works within Render's free tier (no persistent connections needed)
- `Discussion` model stores `parentMessage` ref for threading, `reactions` array for emoji counts, `isPinned` and `isAnnouncement` booleans
- Access control enforced server-side: `GET /api/events/:id/discussions` returns 403 if requester is not a registered participant or the organizer

**Technical decisions:**
- `authorModel` field (discriminator pattern) on Discussion allows both `Participant` and `Organizer` to be authors
- Reactions stored as `[{ user, emoji }]` — allows toggling (react again = remove reaction) and per-user deduplication
- Frontend uses `setInterval` + `clearInterval` in `useEffect` cleanup to avoid memory leaks

---

#### Feature B2: Organizer Password Reset Workflow ✅

**What is implemented:**
- Organizers submit a **password reset request** from their profile page with a reason
- Admin dashboard has a dedicated **Password Reset Requests** tab showing all requests with club name, date, reason, and status
- Admin can **Approve** (system auto-generates a new random password, sends it to the organizer via email) or **Reject** with a comment
- Status tracking: `Pending → Approved / Rejected`
- Organizer can view their request history and current status

**Justification for selection:**
Organizers don't have self-service password reset (no public-facing forgot-password) — all accounts are admin-managed. This workflow gives organizers a formal channel to recover access while keeping the admin in control.

**Design choices:**
- `PasswordResetRequest` is a separate MongoDB model (not embedded in Organizer) — allows admin to query all requests across all organizers
- New password auto-generated server-side using `crypto.randomBytes` → sent via email → admin never needs to manually create one
- Request history preserved (not deleted on resolve) for audit trail

**Technical decisions:**
- `POST /api/organizer/password-reset-request` creates the request
- `PUT /api/admin/password-reset/:id/approve` generates password, updates organizer record, sends email, updates request status
- `PUT /api/admin/password-reset/:id/reject` updates status with rejection reason

---

### Tier C (Integration & Enhancement) — 1 feature selected

#### Feature C2: Add to Calendar Integration ✅

**What is implemented:**
- On the Event Details page, registered participants see three calendar export options:
  1. **Download .ics** — generates a standard iCalendar file downloadable for any calendar app (Apple Calendar, Thunderbird, etc.)
  2. **Add to Google Calendar** — opens Google Calendar with event pre-filled (title, dates, description, location)
  3. **Add to Outlook** — opens Outlook web composer with event pre-filled
- Event name, start/end dates, description, and location (IIIT Hyderabad) are included in all formats

**Justification for selection:**
Calendar integration is a zero-backend feature (pure frontend) that adds high practical value — participants won't forget event timings if the event is in their calendar with a reminder.

**Design choices:**
- `.ics` generated entirely client-side using `Blob` + dynamic `<a>` link — no server endpoint needed
- Google Calendar and Outlook use their public URL schemes (`calendar.google.com/render?action=TEMPLATE&...`) — no API keys required
- Dates formatted as `YYYYMMDDTHHmmssZ` (UTC) for `.ics` compatibility

**Technical decisions:**
- `downloadICS()`, `addToGoogleCalendar()`, `addToOutlook()` are three separate functions in `EventDetails.js`
- Only shown when `isRegistered === true` — no point exporting an event you haven't registered for

---

## Libraries & Frameworks

### Backend

| Library | Version | Justification |
|---|---|---|
| **Express** | ^4.18.2 | Minimal, unopinionated Node.js web framework. Chosen for its simplicity, large ecosystem, and suitability for REST APIs |
| **Mongoose** | ^8.0.0 | MongoDB ODM — provides schema validation, middleware hooks, and a clean query API over raw MongoDB driver |
| **jsonwebtoken** | ^9.0.2 | Stateless JWT-based auth — no session storage needed, works well with React SPA clients |
| **bcrypt** | ^5.1.1 | Password hashing with salt rounds — industry standard for secure password storage |
| **nodemailer** | ^6.9.7 | Email sending for ticket confirmation, password reset, and approval notifications. Supports Gmail SMTP |
| **qrcode** | ^1.5.3 | Generates QR code images (base64 PNG) embedded in ticket emails and stored per registration |
| **cors** | ^2.8.5 | Configures Cross-Origin Resource Sharing — required for React frontend on a different domain to call the API |
| **dotenv** | ^16.3.1 | Loads environment variables from `.env` file — keeps secrets out of source code |
| **express-validator** | ^7.0.1 | Request body validation middleware — validates and sanitizes inputs before they reach controllers |
| **axios** | (via frontend) | HTTP client used on the frontend — not a backend dependency |

### Frontend

| Library | Version | Justification |
|---|---|---|
| **React** | ^18.x | Component-based UI library. Chosen for its virtual DOM, hooks API, and large ecosystem |
| **React Router DOM** | ^6.x | Client-side routing — enables SPA navigation without full page reloads |
| **Axios** | ^1.x | HTTP client for API calls. Chosen over `fetch` for its interceptor support (auto-attach JWT token, handle 401 globally) |
| **React Toastify** | ^9.x | Non-blocking toast notifications for success/error feedback — better UX than `alert()` |
| **jsQR** | ^1.4.0 | Pure JavaScript QR code decoder. Used for both camera-frame and file-upload QR scanning without native dependencies |
| **React Router** | ^6.x | Navigation and protected route management |

---

## Setup & Installation (Local)

### Prerequisites
- Node.js >= 18.x
- MongoDB running locally (`mongod`)
- Git

### 1. Clone the repository
```bash
git clone https://github.com/ManikBansal414/dass_a1.git
cd dass_a1
```

### 2. Install backend dependencies
```bash
npm install
```

### 3. Configure backend environment
```bash
cp backend/.env.example backend/.env
# Edit backend/.env and fill in:
# MONGODB_URI, JWT_SECRET, EMAIL_USER, EMAIL_PASS, ADMIN_EMAIL, ADMIN_PASSWORD
```

### 4. Install frontend dependencies
```bash
cd frontend
npm install
cd ..
```

### 5. Configure frontend environment
```bash
# frontend/.env is already set to localhost:5000
# No changes needed for local development
```

### 6. Run both servers
```bash
# Terminal 1 — Backend (from project root)
npm run dev

# Terminal 2 — Frontend
cd frontend
npm start
```

### 7. Access the app
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- Health check: http://localhost:5000/api/health

### 8. Default Admin credentials
```
Email:    admin@felicity.com
Password: admin123
```

---

## Environment Variables

### Backend (`backend/.env`)
```env
MONGODB_URI=mongodb://localhost:27017/felicity
JWT_SECRET=<long random string>
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=<your gmail>
EMAIL_PASS=<gmail app password>
EMAIL_FROM=Felicity Events <your@gmail.com>
DISCORD_WEBHOOK_URL=<optional>
ADMIN_EMAIL=admin@felicity.com
ADMIN_PASSWORD=admin123
```

### Frontend (`frontend/.env`)
```env
REACT_APP_API_URL=http://localhost:5000/api
DISABLE_ESLINT_PLUGIN=true
```

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
