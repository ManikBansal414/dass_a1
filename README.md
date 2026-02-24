# Felicity Event Management System

A full-stack MERN event management platform for managing clubs, events, registrations, and participants at IIIT Hyderabad's annual fest.

---

## Live Deployment

| Service | URL |
|---|---|
| **Frontend** | https://dass-a1-jldm.onrender.com |
| **Backend API** | https://felicity-backend-55fy.onrender.com/api |
| **Health Check** | https://felicity-backend-55fy.onrender.com/api/health |
| **Database** | MongoDB Atlas (cloud) |

> **Note:** Frontend is hosted on Render's free tier. The first request after inactivity may take 30–60 seconds to wake up.

---

## Default Credentials

```
Admin:
  Email:    admin@felicity.com
  Password: admin123
```

Organizer accounts are created by the Admin from the Admin Dashboard.

---

## Advanced Features Implemented

### Feature Selection Justification

The features were selected to maximise marks while keeping scope realistic for a solo project on a free-tier deployment. Tier A features (16 marks total) were prioritised first because they carry the highest weight and both fit naturally into the event registration flow already being built. Tier B features (12 marks) were chosen next: the discussion forum adds genuine value to participants and required no external services, while the password reset workflow is a mandatory operational concern for any admin-managed system. The Tier C calendar integration (2 marks) was added last as it is purely client-side and required no backend work.

No Tier A1 (Payment Gateway) was implemented because integrating a real payment gateway (Razorpay/Stripe) on a free-tier deployment without a verified business account introduces compliance and test-key limitations that would make end-to-end demonstration unreliable during evaluation.

---

### Tier A — Core Advanced Features

#### A2: Merchandise Payment Approval Workflow [8 Marks]

**What is implemented:**
- Participants place a merchandise order and upload a payment proof image
- Order enters **Pending Approval** state immediately after submission
- Organizers have a dedicated **Manage Orders** tab showing all orders with payment proof images, current status (Pending / Approved / Rejected), and approve/reject action buttons
- On **approval**: order status → Approved, stock is decremented, a QR ticket is generated and emailed to the participant as an image attachment
- On **rejection**: order status → Rejected, `registrationCount` is decremented, no QR generated
- QR codes are **never** generated while the order is in Pending or Rejected state

**Design choices:**
- Payment proof stored as base64 string in the DB — avoids needing a separate file storage service for project scope
- Status machine: `Pending → Approved / Rejected` enforced server-side in `eventController.js`
- QR generation called only inside the `approvePayment` branch, never at registration time for Merchandise events
- `registrationCount` is decremented on rejection to keep counts accurate
- QR code sent as a CID inline attachment (not base64 `src=`) so it renders correctly in all email clients including Gmail and university mail

**Files involved:**
- `backend/controllers/eventController.js` — `registerForEvent`, `approvePayment`, `rejectPayment`
- `backend/utils/email.js` — `sendMerchandisePendingEmail`, `sendMerchandiseApprovalEmail`, `sendMerchandiseRejectionEmail`
- `frontend/src/pages/MerchandiseOrders.js` — organizer order management UI
- `frontend/src/pages/EventDetails.js` — participant order placement with payment proof upload

---

#### A3: QR Scanner & Attendance Tracking [8 Marks]

**What is implemented:**
- Organizers open a dedicated **QR Scanner** page per event
- Supports **two scan modes**: live camera scan (native `getUserMedia` + `jsQR` + canvas frame extraction) and file upload scan (`jsQR` on uploaded image)
- On scan: QR is decoded → participant looked up → attendance marked with timestamp
- **Duplicate scan rejection**: returns an error if participant already marked present
- **Live attendance dashboard**: shows total registered, total scanned, percentage, and per-participant attended/absent status
- **Export CSV**: downloads full attendance report as `.csv`
- **Manual override**: organizer can manually mark/unmark attendance with a reason; all overrides logged in the `AttendanceLog` collection

**Design choices:**
- Native browser `getUserMedia` API used instead of `react-qr-reader` — avoids npm peer dependency conflicts, works on all modern browsers
- `jsQR` decodes QR from canvas frames at 100ms intervals during camera scan
- Duplicate scan check enforced server-side to prevent race conditions
- `AttendanceLog` is a separate MongoDB collection (not embedded) for clean audit queries

**Files involved:**
- `backend/controllers/eventController.js` — `markAttendance`, `manualAttendanceOverride`, `exportAttendanceCSV`
- `backend/models/AttendanceLog.js`
- `frontend/src/pages/QRScanner.js`

---

### Tier B — Intermediate Features

#### B1: Real-Time Discussion Forum [6 Marks]

**What is implemented:**
- Per-event discussion forum on the **Event Details** page, visible only to registered participants and the organizer
- Participants can post messages, reply to threads (message threading), and react with emoji reactions
- Organizers can **pin** messages, **delete** any message, and post **Announcements** (displayed with a distinct style)
- Auto-polls every 10 seconds for new messages
- Access control: non-registered users see a 403 message

**Design choices:**
- Polling (10s interval) chosen over WebSockets — keeps backend stateless, works within Render's free tier (no persistent connections)
- `Discussion` model stores `parentMessage` ref for threading, `reactions` array for per-user emoji tracking, `isPinned` and `isAnnouncement` booleans
- `authorModel` discriminator allows both `Participant` and `Organizer` to author messages
- Frontend uses `setInterval` + `clearInterval` in `useEffect` cleanup to prevent memory leaks

**Files involved:**
- `backend/models/Discussion.js`
- `backend/controllers/discussionController.js`
- `backend/routes/discussions.js`
- `frontend/src/components/DiscussionForum.js`

---

#### B2: Organizer Password Reset Workflow [6 Marks]

**What is implemented:**
- Organizers submit a **password reset request** from their Profile page with a reason (minimum 10 characters)
- Admin Dashboard has a dedicated **Password Reset Requests** tab showing all requests with organizer name, date, reason, and status
- Admin can **Approve** (system auto-generates a new random password, sends it to the organizer via email) or **Reject** with a comment
- Status tracking: `Pending → Approved / Rejected`
- Organizers can view their full request history on their profile page

**Design choices:**
- `PasswordResetRequest` is a separate MongoDB model — allows admin to query all requests across all organizers
- New password auto-generated server-side using `crypto.randomBytes` → sent via email
- Request history preserved after resolution for audit trail
- No public self-service password reset — admin manages all organizer accounts

**Files involved:**
- `backend/models/PasswordResetRequest.js`
- `backend/controllers/adminController.js` — `approvePasswordReset`, `rejectPasswordReset`
- `backend/controllers/organizerController.js` — `requestPasswordReset`
- `frontend/src/pages/PasswordResetRequests.js`
- `frontend/src/pages/OrganizerProfile.js`

---

### Tier C — Enhancement Features

#### C: Add to Calendar Integration [2 Marks]

**What is implemented:**
- On the Event Details page, registered participants see three calendar export options:
  1. **Download .ics** — standard iCalendar file, works with Apple Calendar, Thunderbird, and any calendar app
  2. **Add to Google Calendar** — opens Google Calendar with event pre-filled (title, dates, description, location)
  3. **Add to Outlook** — opens Outlook Web with event pre-filled
- Event name, start/end dates, description, and venue are included in all formats

**Design choices:**
- `.ics` generated entirely client-side using `Blob` + dynamic `<a>` download link — no server endpoint needed
- Google Calendar and Outlook use their public URL schemes — no API keys required
- Dates formatted as `YYYYMMDDTHHmmssZ` (UTC) for `.ics` spec compliance
- Only shown to registered participants (`isRegistered === true`)

**Files involved:**
- `frontend/src/pages/EventDetails.js` — `downloadICS()`, `addToGoogleCalendar()`, `addToOutlook()`

---

## Libraries & Frameworks

### UI Approach — Plain CSS (No UI Framework)

No CSS framework (Material-UI, Tailwind, Bootstrap, etc.) was used. All styling is hand-written CSS per component. This was a deliberate choice: the assignment evaluates full-stack development skill, and writing CSS from scratch demonstrates layout and design understanding rather than framework configuration. It also eliminates a large dependency that would add bundle size and build complexity on a free-tier deployment. Each page has its own `.css` file co-located with the component.

---

### Backend

| Library | Version | Justification |
|---|---|---|
| **express** | ^4.18 | Minimal, unopinionated Node.js web framework. Chosen for its mature middleware ecosystem, simple routing API, and widespread industry adoption. |
| **mongoose** | ^8.0 | MongoDB ODM providing schema definitions, built-in validation, middleware hooks (`pre`/`post` save), and a clean async query API. Eliminates raw MongoDB driver boilerplate. |
| **jsonwebtoken** | ^9.0 | Stateless JWT-based authentication. Tokens are signed with a server secret and verified on every protected request. No server-side session storage needed — works cleanly across a decoupled React SPA and REST API. |
| **bcrypt** | ^5.1 | Industry-standard password hashing using the bcrypt algorithm with configurable salt rounds. Deliberately slow to resist brute-force and rainbow-table attacks. |
| **nodemailer** | ^6.9 | Sends transactional emails (ticket confirmations, merchandise approval/rejection, password resets) via Gmail SMTP. Chosen over third-party email APIs (SendGrid, Mailgun) to avoid requiring an API key sign-up — works with a standard Gmail app password. |
| **qrcode** | ^1.5 | Generates QR code PNG images server-side as base64 strings. Used to produce unique scannable tickets at registration/payment approval time. Server-side generation ensures the QR is attached to the email before the response is sent. |
| **axios** | ^1.13 | HTTP client used in the backend to POST event announcements to Discord webhooks. Chosen over Node's native `fetch` for its cleaner error handling and response structure. |
| **cors** | ^2.8 | Express middleware that sets the `Access-Control-Allow-Origin` header. Required because the React frontend (port 3000 / Render subdomain) makes requests to a different origin than the API. |
| **dotenv** | ^16.3 | Loads environment variables from a `.env` file into `process.env`. Keeps secrets (DB URI, JWT secret, email credentials) out of source code. |
| **express-validator** | ^7.0 | Declarative request body validation middleware. Validates and sanitises inputs before they reach controller logic, returning structured error arrays on failure. |
| **nodemon** | ^3.0 | Dev-only process manager that watches backend files and automatically restarts the Node server on changes. Eliminates the need to manually restart during development. |

### Frontend

| Library | Version | Justification |
|---|---|---|
| **react** | ^18.2 | Component-based UI library with the Hooks API (`useState`, `useEffect`, `useContext`). Chosen as the industry standard for building SPAs with reusable, stateful UI components. |
| **react-dom** | ^18.2 | Required peer package for React — provides the `ReactDOM.createRoot` API used to mount the React tree into the HTML document. |
| **react-scripts** | 5.0.1 | Create React App (CRA) build toolchain. Provides zero-config Webpack + Babel setup, environment variable injection (`REACT_APP_*`), and a production build command. Chosen over Vite/manual Webpack for its stability and straightforward Render deployment support. |
| **react-router-dom** | ^6.20 | Declarative client-side routing. Provides `<BrowserRouter>`, `<Routes>`, `<Route>`, and `useNavigate`/`useParams` hooks. Used for protected routes (via a `PrivateRoute` wrapper) and URL-param-based navigation between pages. |
| **axios** | ^1.6 | HTTP client with request/response interceptor support. A single Axios instance in `utils/api.js` automatically attaches the JWT `Authorization` header to every request and globally handles 401 responses (token expiry) by redirecting to login. |
| **react-toastify** | ^9.1 | Non-blocking toast notification library. Provides success/error/warning notifications for all async operations (registration, approval, scan results) without interrupting the user's workflow with alert dialogs. |
| **jsqr** | ^1.4 | Pure JavaScript QR code decoder that works on raw pixel data from a `<canvas>` element. Used for both live camera scanning (frame-by-frame decode at 100ms intervals) and file upload scanning (decode from a static image). Chosen over `react-qr-reader` which has unresolved peer dependency conflicts with React 18. |

---

## Project Structure

```
dass_a1/
├── backend/
│   ├── controllers/          # Business logic
│   │   ├── adminController.js
│   │   ├── authController.js
│   │   ├── discussionController.js
│   │   ├── eventController.js
│   │   ├── organizerController.js
│   │   └── participantController.js
│   ├── middleware/
│   │   └── auth.js           # JWT verification & role checks
│   ├── models/               # Mongoose schemas
│   │   ├── Admin.js
│   │   ├── AttendanceLog.js
│   │   ├── Discussion.js
│   │   ├── Event.js
│   │   ├── Organizer.js
│   │   ├── Participant.js
│   │   └── PasswordResetRequest.js
│   ├── routes/               # Express route definitions
│   ├── scripts/
│   │   └── createAdmin.js    # Legacy seed script (auto-init now handles this)
│   ├── utils/
│   │   ├── discord.js        # Discord webhook helper
│   │   ├── email.js          # Nodemailer email templates
│   │   ├── eventStatus.js    # Computed status logic
│   │   └── ticket.js         # QR code + ticket ID generation
│   ├── package.json          # Backend dependencies & start scripts
│   └── server.js             # App entry point
├── frontend/                 # React (Create React App)
│   ├── src/
│   │   ├── components/       # Shared UI (Navbar, DiscussionForum, PrivateRoute)
│   │   ├── context/          # AuthContext (React Context API)
│   │   ├── pages/            # All page-level components
│   │   └── utils/
│   │       └── api.js        # Axios instance with JWT interceptor
│   ├── package.json          # Frontend dependencies & start scripts
│   ├── .env                  # Local dev API URL (not committed)
│   └── .env.production       # Production API URL (used on Render build)
├── render.yaml               # Render deployment config
└── deployment.txt            # Live deployment URL
```

---

## Local Setup

### Prerequisites
- Node.js >= 18
- npm >= 9
- MongoDB running locally (`mongod`) **or** a MongoDB Atlas connection string

### 1. Clone
```bash
git clone https://github.com/ManikBansal414/dass_a1.git
cd dass_a1
```

### 2. Install dependencies
```bash
# Backend (run from inside the backend folder)
cd backend && npm install && cd ..

# Frontend
cd frontend && npm install && cd ..
```

### 3. Configure environment

Create `backend/.env`:
```bash
touch backend/.env
```

Paste the following into `backend/.env` and fill in your values:
```env
MONGODB_URI=mongodb://localhost:27017/felicity
JWT_SECRET=any_long_random_string_here
PORT=5001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=Felicity Events <your_gmail@gmail.com>

DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

ADMIN_EMAIL=admin@felicity.com
ADMIN_PASSWORD=admin123
```

> **Gmail App Password**: Go to Google Account > Security > 2-Step Verification > App Passwords. Generate a password for "Mail". Use that as `EMAIL_PASS`. Your normal Gmail password will not work.

Create `frontend/.env`:
```bash
touch frontend/.env
```

Paste:
```env
REACT_APP_API_URL=http://localhost:5001/api
DISABLE_ESLINT_PLUGIN=true
```

### 4. Run

```bash
# Terminal 1: Backend (port 5001)
cd backend && npm start

# Terminal 2: Frontend (port 3000)
cd frontend && npm start
```

Open http://localhost:3000 in your browser.

Log in with the admin credentials set in `backend/.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).

> The admin account is auto-created on first backend startup if it does not already exist. No manual seeding step is needed.

---

## Key API Endpoints

### Auth
| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| GET | `/api/auth/me` | Authenticated |

### Events
| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/events` | Public |
| POST | `/api/events` | Organizer |
| PUT | `/api/events/:id` | Organizer / Admin |
| POST | `/api/events/:id/register` | Participant |
| GET | `/api/events/:id/participants` | Organizer / Admin |
| POST | `/api/events/:id/mark-attendance` | Organizer / Admin |
| POST | `/api/events/:id/manual-override` | Organizer / Admin |
| GET | `/api/events/:id/export-attendance` | Organizer / Admin |
| GET | `/api/events/:id/merchandise-orders` | Organizer / Admin |
| PUT | `/api/events/:id/approve-payment/:entryId` | Organizer / Admin |
| PUT | `/api/events/:id/reject-payment/:entryId` | Organizer / Admin |

### Discussions
| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/discussions/:eventId` | Registered Participant / Organizer |
| POST | `/api/discussions/:eventId` | Registered Participant / Organizer |
| DELETE | `/api/discussions/:id` | Author / Organizer |
| PUT | `/api/discussions/:id/pin` | Organizer |
| POST | `/api/discussions/:id/react` | Registered Participant |

### Admin
| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/admin/organizers` | Admin |
| GET | `/api/admin/organizers` | Admin |
| DELETE | `/api/admin/organizers/:id` | Admin |
| GET | `/api/admin/password-reset-requests` | Admin |
| PUT | `/api/admin/password-reset-requests/:id/approve` | Admin |
| PUT | `/api/admin/password-reset-requests/:id/reject` | Admin |

---

## Environment Variables

### Backend
| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret for signing JWTs |
| `PORT` | No | Server port (default: 5001) |
| `NODE_ENV` | No | `development` or `production` |
| `FRONTEND_URL` | Yes (prod) | Frontend URL for CORS whitelist |
| `EMAIL_USER` | No | Gmail address for sending emails |
| `EMAIL_PASS` | No | Gmail app password |
| `EMAIL_FROM` | No | Display name + address for emails |
| `DISCORD_WEBHOOK_URL` | No | Global Discord webhook (per-organizer webhooks set via profile) |
| `ADMIN_EMAIL` | No | Initial admin email (seeded on first start) |
| `ADMIN_PASSWORD` | No | Initial admin password (seeded on first start) |

### Frontend
| Variable | Required | Description |
|---|---|---|
| `REACT_APP_API_URL` | Yes | Backend API base URL |
| `DISABLE_ESLINT_PLUGIN` | No | Disables ESLint in CRA build (avoids build failures) |
