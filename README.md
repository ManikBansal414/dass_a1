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

> **Note:** Both frontend and backend are hosted on Render's free tier. The first request after inactivity may take 30–60 seconds to wake up.

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

### Tier A — Core Advanced Features

#### A2: Merchandise Payment Approval Workflow [8 Marks] ✅

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

#### A3: QR Scanner & Attendance Tracking [8 Marks] ✅

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

#### B1: Real-Time Discussion Forum [6 Marks] ✅

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

#### B2: Organizer Password Reset Workflow [6 Marks] ✅

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

#### C: Add to Calendar Integration [2 Marks] ✅

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

### Backend

| Library | Justification |
|---|---|
| **express** | Minimal Node.js web framework. Chosen for its simplicity, middleware ecosystem, and clean routing API. |
| **mongoose** | MongoDB ODM providing schema validation, middleware hooks, and a clean query API. |
| **jsonwebtoken** | Stateless JWT-based authentication. No server-side sessions needed — works cleanly with a React SPA. |
| **bcrypt** | Password hashing with salt rounds. Purposely slow algorithm to resist brute-force attacks. |
| **nodemailer** | Sends transactional emails (ticket confirmations, password resets, approvals) via Gmail SMTP. |
| **qrcode** | Generates QR code PNG images for event tickets, called server-side at registration/approval time. |
| **axios** | HTTP client used to POST to Discord webhooks from the backend. |
| **cors** | Configures Cross-Origin Resource Sharing so the React frontend can call the API. |
| **dotenv** | Loads environment variables from `.env` — keeps secrets out of source code. |
| **express-validator** | Request body validation middleware — validates inputs before they reach controllers. |
| **nodemon** | Auto-restarts backend on file changes during development. |

### Frontend

| Library | Justification |
|---|---|
| **react** | Component-based UI library with hooks API. Industry standard for SPAs. |
| **react-router-dom** | Client-side routing. Supports protected routes, URL params, and navigation without full-page reloads. |
| **axios** | HTTP client with interceptor support — automatically attaches JWT token to every request and handles 401 globally. |
| **react-toastify** | Non-blocking toast notifications for async feedback (success, errors, registration confirmation). |
| **jsqr** | Pure JavaScript QR code decoder. Used for both camera-frame and file-upload QR scanning. Chosen over `react-qr-reader` to avoid npm peer dependency conflicts with React 18. |

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
│   │   └── createAdmin.js    # Seeds the initial admin account
│   ├── utils/
│   │   ├── discord.js        # Discord webhook helper
│   │   ├── email.js          # Nodemailer email templates
│   │   ├── eventStatus.js    # Computed status logic
│   │   └── ticket.js         # QR code + ticket ID generation
│   └── server.js             # App entry point
├── frontend/                 # React (Create React App)
│   ├── src/
│   │   ├── components/       # Shared UI (Navbar, DiscussionForum, PrivateRoute)
│   │   ├── context/          # AuthContext (React Context API)
│   │   ├── pages/            # All page-level components
│   │   └── utils/
│   │       └── api.js        # Axios instance with JWT interceptor
│   ├── .env                  # Local dev API URL (not committed)
│   └── .env.production       # Production API URL (used on Render build)
├── package.json              # Root — starts backend
├── render.yaml               # Render deployment config
└── deployment.txt            # Live deployment URLs
```

---

## Local Setup

### Prerequisites
- Node.js >= 18
- MongoDB running locally (`mongod`) or a MongoDB Atlas URI

### 1. Clone
```bash
git clone https://github.com/ManikBansal414/dass_a1.git
cd dass_a1
```

### 2. Install dependencies
```bash
npm install
cd frontend && npm install && cd ..
```

### 3. Configure environment

**`backend/.env`**
```env
MONGODB_URI=mongodb://localhost:27017/felicity
JWT_SECRET=your_secret_here
PORT=5001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=Felicity Events <your_email@gmail.com>

DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

ADMIN_EMAIL=admin@felicity.com
ADMIN_PASSWORD=admin123
```

**`frontend/.env`**
```env
REACT_APP_API_URL=http://localhost:5001/api
DISABLE_ESLINT_PLUGIN=true
```

### 4. Run
```bash
# Terminal 1 — Backend (port 5001)
npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend && npm start
```

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
