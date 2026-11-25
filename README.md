# Fix My Campus 🏫🛠️
### Smart Campus Issue Reporting and Management System

**Fix My Campus** is a modern, responsive web application engineered to streamline facility problem reporting and campus infrastructure maintenance for universities and colleges.

---

## 🚀 Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (Modern SPA architecture, no React)
- **Backend**: Node.js, Express.js
- **Database**: MySQL 8.0+ (with dual-mode fallback driver for immediate evaluation)
- **Authentication**: Session-based authentication (`express-session`) with `bcryptjs` password hashing
- **Real-time Engine**: Socket.IO (instant notifications, work order dispatch, live status stepper updates)
- **Visual Analytics**: Chart.js (status distribution, category breakdown, facility hotspots)
- **Icons**: Font Awesome 6
- **Campus Mapping**: Interactive campus map layout with predefined buildings, clickable pins, and floor/zone selectors

---

## 👥 User Roles & Features

### 1. Student / Faculty
- **Register & Login**: Fast session authentication with student ID and department.
- **Report Campus Issues**:
  - Title, problem description, urgency level.
  - Category selector: Plumbing, Electrical, HVAC, Furniture, WiFi, Cleanliness, Safety, Civil, Other.
  - Interactive Campus Building selector and floor/zone dropdown.
  - Photograph upload with drag-and-drop file picker and live preview.
- **Track Complaint Status**: Visual 4-step progress stepper (Submitted ➔ Assigned ➔ In Progress ➔ Resolved).
- **Audit Timeline**: View timestamps and actions for every transition.
- **Real-Time Notifications**: Unread badge count, audio chime, and toast alerts.
- **Student Feedback**: Rate completed repairs from 1 to 5 stars with written reviews.

### 2. Administrator
- **Admin Dashboard & Visual Analytics**:
  - Total tickets, pending review, active repairs, resolution rate %, average resolution hours.
  - Chart.js Status Doughnut chart, Category distribution bar chart, Building hotspots bar chart.
- **Master Tickets Control Board**:
  - Multi-criteria filtering by Status, Category, Priority, and Building.
  - Live search across ticket IDs, reporter names, keywords, and locations.
- **Priority Management**: Set issues to Low, Medium, High, or Critical.
- **Staff Assignment**: Dispatch work orders to maintenance staff filtered by specialization (Electrical, Plumbing, HVAC, WiFi/Network).
- **User Management**: View registered students and staff directory, add new technicians, and toggle active/inactive status.

### 3. Maintenance Staff
- **Staff Dashboard**: View assigned work orders categorized by status.
- **Work Order Progression**: Transition tickets to "In Progress" upon arrival at the campus location.
- **Resolution Proof**: Mark tickets as Resolved with technician notes and proof-of-work photographs.
- **Campus Map Integration**: View building location and room details for on-site repairs.

---

## 🔐 Default Demo Accounts

For immediate testing, use the top header **One-Click Role Switcher** or log in with these pre-seeded accounts:

| Role | Name | Email | Password | Details |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | Campus Operations Admin | `admin@campus.edu` | `AdminPassword123!` | Full control, analytics, user management |
| **Staff (Electrician)** | David Miller | `electrician@campus.edu` | `StaffPassword123!` | Electrical work orders |
| **Staff (Plumber)** | Sarah Jenkins | `plumber@campus.edu` | `StaffPassword123!` | Plumbing work orders |
| **Staff (Network)** | Alex Rivera | `network@campus.edu` | `StaffPassword123!` | Campus WiFi & network issues |
| **Student** | Emma Watson | `student@campus.edu` | `StudentPassword123!` | Computer Science (STU-2024-8841) |
| **Faculty** | Prof. Robert Langdon | `faculty@campus.edu` | `FacultyPassword123!` | Mechanical Engineering (FAC-2020-0441) |

---

## ⚙️ Quick Start Guide

### 1. Installation
```bash
# Navigate to project directory
cd fix-my-campus

# Install dependencies (already pre-installed)
npm install
```

### 2. MySQL Configuration (Optional)
The system connects to MySQL if running on `localhost:3306`, or automatically falls back to the built-in storage engine if MySQL is stopped.
To configure your MySQL server credentials, create or edit `.env`:

```env
PORT=3000
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=fix_my_campus
```

To re-seed tables at any time:
```bash
npm run seed
```

### 3. Start Application
```bash
npm start
```
Open your browser at **`http://localhost:3000`**.

### 4. Running the Automated Test Suite
```bash
npm test
# or
node scripts/test-api.js
```

---

## 📁 Project Structure

```
fix-my-campus/
├── package.json               # Project manifest & dependencies
├── server.js                  # Main Express & Socket.IO server
├── .env                       # Environment configuration
├── database/
│   ├── schema.sql             # Production MySQL schema DDL
│   ├── seed.sql               # SQL seed script
│   └── seed-data.json         # Campus buildings, locations & accounts
├── src/
│   ├── config/
│   │   └── db.js              # Dual-driver database abstraction
│   ├── middleware/
│   │   ├── auth.js            # Session authentication & role guards
│   │   └── upload.js          # Multer file upload configuration
│   ├── routes/
│   │   ├── auth.js            # Authentication endpoints
│   │   ├── campus.js          # Buildings & location endpoints
│   │   ├── complaints.js      # Ticket lifecycle & feedback endpoints
│   │   ├── users.js           # Student & staff management
│   │   ├── stats.js           # Analytics & KPI aggregations
│   │   └── notifications.js   # Notification endpoints
│   └── sockets/
│       └── socketHandler.js   # Socket.IO real-time event broadcaster
├── public/
│   ├── index.html             # Main responsive web application
│   ├── css/
│   │   ├── style.css          # Core design system & layout
│   │   ├── dashboard.css      # KPIs, tables, cards & tracker stepper
│   │   └── map.css            # Campus map & location picker styles
│   ├── js/
│   │   ├── api.js             # REST API client
│   │   ├── socket.js          # Real-time WebSocket listener
│   │   ├── map.js             # Interactive campus map engine
│   │   ├── charts.js          # Chart.js analytics visualizations
│   │   ├── student.js         # Student portal controller
│   │   ├── admin.js           # Admin portal controller
│   │   ├── staff.js           # Staff portal controller
│   │   └── app.js             # Main application coordinator
│   ├── uploads/               # User-submitted issue photos
│   └── assets/images/         # Graphical assets & illustrations
└── scripts/
    ├── seed.js                # Database seed script
    └── test-api.js            # 34-point automated test suite
```
