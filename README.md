# 🏨 Grand Palace Hotel Portal

Full-stack Hotel Booking & Room Service Portal  
**Frontend:** HTML + CSS + Vanilla JS  
**Backend:** Node.js + Express  
**Database:** Microsoft SQL Server

---

## 📁 Project Structure

```
hotel-portal/
├── frontend/
│   ├── Login.html              ← Login page (admin + guest)
│   ├── css/main.css
│   ├── js/api.js               ← API helper
│   ├── js/auth.js              ← Auth guard
│   ├── admin/
│   │   ├── index.html
│   │   ├── rooms.html
│   │   ├── bookings.html
│   │   ├── guests.html
│   │   ├── pricing.html
│   │   └── services.html
│   └── guest/
│       ├── dashboard.html
│       ├── browse-rooms.html
│       ├── my-bookings.html
│       └── room-service.html
└── backend/
    ├── server.js
    ├── package.json
    ├── .env
    ├── config/
    │   ├── db.js
    │   └── schema.sql          ← Run this in SSMS first
    ├── routes/
    ├── controllers/
    └── middleware/
```

---

## ✅ STEP-BY-STEP SETUP

### STEP 1 — Install SQL Server

1. Download **SQL Server 2019/2022 Developer Edition** (free):  
   https://www.microsoft.com/en-us/sql-server/sql-server-downloads

2. Download **SQL Server Management Studio (SSMS)**:  
   https://aka.ms/ssmsfullsetup

3. Install both. During SQL Server install, choose **Mixed Mode Authentication** and set an `sa` password.

---

### STEP 2 — Set Up the Database

1. Open SSMS
2. Connect using:  
   - Server: `localhost`  
   - Authentication: **SQL Server Authentication**  
   - Login: `sa`  
   - Password: (the one you set during install)

3. Click **New Query**

4. Open the file `backend/config/schema.sql` and paste the entire content into the query window

5. Click **Execute (F5)**

6. You should see: `Database setup complete!`

---

### STEP 3 — Configure Backend Environment

Edit `backend/.env`:

```env
PORT=5000
DB_USER=sa
DB_PASSWORD=YourStrongPassword123   ← change this to your sa password
DB_SERVER=localhost
DB_DATABASE=HotelPortalDB
DB_PORT=1433
JWT_SECRET=hotel_portal_super_secret_key_change_in_production
```

---

### STEP 4 — Install Node.js Dependencies

Make sure you have Node.js installed (https://nodejs.org — LTS version).

Open terminal and run:

```bash
cd hotel-portal/backend
npm install
```

This installs: express, mssql, bcrypt, jsonwebtoken, cors, dotenv

---

### STEP 5 — Start the Backend Server

```bash
cd hotel-portal/backend
node server.js
```

You should see:
```
🏨 Hotel Portal API running on http://localhost:5000
✅ Connected to SQL Server
```

Test it: Open browser → http://localhost:5000/api/health  
Should return: `{"status":"ok"}`

```
Frontend: http://localhost:5000

---

### STEP 6 — Serve the Frontend

**Option A — VS Code Live Server (Recommended)**
1. Install the "Live Server" extension in VS Code
2. Open the `frontend` folder in VS Code
3. Right-click on `index.html` → **"Open with Live Server"**
4. It opens at http://127.0.0.1:5500

**Option B — Python simple server**
```bash
cd hotel-portal/frontend
python -m http.server 8080
```
Then open http://localhost:8080

**Option C — Node http-server**
```bash
npm install -g http-server
cd hotel-portal/frontend
http-server -p 8080
```

---

### STEP 7 — Login and Test

Open the frontend URL in your browser.

**Admin Login:**
- Email: `admin@hotel.com`
- Password: `admin123`
- → Redirects to `/admin/dashboard.html`

**Guest Login:**
- Email: `guest@hotel.com`
- Password: `guest123`
- → Redirects to `/guest/index.html`

**Register new guest:** Use the Register tab on the login page.

---

## 🔗 Frontend ↔ Backend Connection

The frontend connects to the backend via `js/api.js`:

```javascript
const BASE_URL = 'http://localhost:5000/api';
```

If you run the backend on a different port or server, update this line in `frontend/js/api.js`.

**JWT Token flow:**
1. Login → Backend returns JWT token
2. Token stored in `localStorage` as `hotelToken`
3. Every API call sends `Authorization: Bearer <token>` header
4. Backend middleware validates token on every protected route
5. If token is expired/invalid → auto-redirect to login page

---

## 🗄️ Database Tables

| Table | Description |
|-------|-------------|
| Users | All users (admin + guests) with hashed passwords |
| Guests | Guest profiles linked to Users |
| Rooms | Room inventory with status tracking |
| Bookings | All reservations with status flow |
| SeasonalPricing | Price multiplier rules by date range |
| ServiceMenuItems | Room service menu (food, housekeeping, etc.) |
| ServiceRequests | Guest service orders with status |

**Room Status Flow:**
```
Available → Reserved (booking created)
Reserved → Occupied (guest checks in)
Occupied → Available (guest checks out)
Any → Under Maintenance (admin sets manually)
Reserved/Confirmed → Available (booking cancelled)
```

---

## 🔑 Login Routing Logic

```
Single login page (index.html)
    ↓
POST /api/auth/login
    ↓
Response: { role: 'admin' | 'guest' }
    ↓
role === 'admin' → /admin/dashboard.html
role === 'guest' → /guest/dashboard.html
```

Every admin page runs `requireAdmin()` on load.  
Every guest page runs `requireGuest()` on load.  
If role doesn't match → redirected back to login.

---

## 🛠️ Troubleshooting

**"Cannot connect to SQL Server"**
- Check SQL Server is running: Windows Services → SQL Server (MSSQLSERVER)
- Check `DB_SERVER`, `DB_USER`, `DB_PASSWORD` in `.env`
- Enable TCP/IP in SQL Server Configuration Manager

**"Login failed for user sa"**
- Make sure SQL Server is in Mixed Mode Authentication
- Right-click server in SSMS → Properties → Security → SQL Server and Windows Authentication

**CORS errors in browser**
- Make sure backend is running on port 5000
- Check `BASE_URL` in `frontend/js/api.js`

**"Port 5000 already in use"**
- Change PORT in `.env` and update `BASE_URL` in `api.js`

---

## 📦 All Dependencies

```json
{
  "express":        "HTTP server framework",
  "mssql":          "SQL Server driver for Node.js",
  "bcrypt":         "Password hashing",
  "jsonwebtoken":   "JWT token generation & verification",
  "cors":           "Cross-origin resource sharing",
  "dotenv":         "Environment variable loader"
}
```

Install all: `npm install` inside the `backend/` folder.
