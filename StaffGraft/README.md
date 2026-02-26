# StaffGraft — Textile Workforce OS

A full-stack MERN application for managing manpower in a textile/garment factory.
Features attendance, shift allocation, role matching by skill, attrition pipeline, and CSV bulk import.

---

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React 18 + Vite + React Router v6   |
| Backend  | Node.js + Express 4                 |
| Database | MongoDB + Mongoose                  |
| Charts   | Recharts                            |
| Auth     | JWT (jsonwebtoken) + bcryptjs        |
| Upload   | Multer + csv-parse                  |

---

## Project Structure

```
staffgraft/
├── server/
│   ├── index.js              # Express entry
│   ├── models/               # Mongoose schemas
│   │   ├── Employee.js
│   │   ├── Role.js
│   │   ├── Attendance.js
│   │   ├── Feedback.js
│   │   └── User.js
│   ├── routes/               # REST API routes
│   │   ├── auth.js
│   │   ├── employees.js      # Includes CSV upload
│   │   ├── roles.js          # Includes /matches endpoint
│   │   ├── attendance.js
│   │   ├── shifts.js
│   │   ├── feedback.js
│   │   └── dashboard.js
│   ├── middleware/
│   │   └── auth.js           # JWT middleware
│   └── seed/
│       └── seed.js           # Sample data seeder
└── client/
    └── src/
        ├── pages/            # Dashboard, Employees, Attendance, RoleMatching, Pipeline
        ├── components/UI.jsx # Shared design system components
        ├── context/          # AuthContext
        ├── hooks/            # useBreakpoint, useFetch
        └── utils/api.js      # All Axios API calls
```

---

## Local Development

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier works) OR local MongoDB

### 1. Clone & install
```bash
git clone <your-repo>
cd staffgraft
npm run install:all
```

### 2. Configure environment
```bash
cd server
cp .env.example .env
# Edit .env with your MongoDB URI and a JWT secret
```

**.env contents:**
```
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/staffgraft?retryWrites=true&w=majority
JWT_SECRET=change_this_to_something_random_and_long
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### 3. Seed the database
```bash
cd server
node seed/seed.js
```
This creates 8 sample employees, 4 roles, and a default admin user:
- **Email:** admin@staffgraft.com
- **Password:** admin123

### 4. Start development servers
```bash
# From root (runs both server + client):
npm run dev

# Or separately:
npm run server   # Express on :5000
npm run client   # Vite on :5173
```

Open http://localhost:5173

---

## Deployment

### Option A — Render.com (Recommended, Free)

1. **Create MongoDB Atlas cluster** at https://cloud.mongodb.com (free M0 tier)
   - Create a database user
   - Whitelist IP: `0.0.0.0/0`
   - Copy the connection string

2. **Push to GitHub**
```bash
git init && git add . && git commit -m "initial"
git remote add origin https://github.com/<you>/staffgraft.git
git push -u origin main
```

3. **Deploy Backend on Render**
   - Go to https://render.com → New → Web Service
   - Connect your GitHub repo
   - Root directory: `server`
   - Build: `npm install`
   - Start: `npm start`
   - Add environment variables:
     ```
     NODE_ENV=production
     MONGODB_URI=<your atlas URI>
     JWT_SECRET=<random string>
     CLIENT_URL=<your frontend URL (fill after frontend deploy)>
     ```

4. **Deploy Frontend on Render**
   - New → Static Site
   - Root directory: `client`
   - Build: `npm install && npm run build`
   - Publish: `dist`
   - Add environment variable:
     ```
     VITE_API_URL=https://<your-backend>.onrender.com
     ```
   - Add rewrite rule: `/* → /index.html` (for React Router)

5. **Update backend CLIENT_URL** with the frontend URL
6. Run seed: `node seed/seed.js` (or use Render Shell)

---

### Option B — Railway.app

1. Push to GitHub
2. Go to https://railway.app → New Project → Deploy from GitHub
3. Add MongoDB plugin (or use Atlas URI)
4. Set env vars: `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production`
5. For frontend: New Service → Static → `client/` folder

---

### Option C — VPS (DigitalOcean / AWS EC2)

```bash
# On your server:
git clone <repo> /var/www/staffgraft
cd /var/www/staffgraft/server && npm install
cd /var/www/staffgraft/client && npm install && npm run build

# Copy client build to server's static folder or use nginx
# PM2 for process management:
pm2 start server/index.js --name staffgraft
pm2 save && pm2 startup
```

Nginx config:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    location / {
        root /var/www/staffgraft/client/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

---

## API Reference

| Method | Endpoint                        | Description                      |
|--------|---------------------------------|----------------------------------|
| POST   | /api/auth/login                 | Login, get JWT                   |
| POST   | /api/auth/register              | Register user                    |
| GET    | /api/employees                  | List employees (filterable)      |
| POST   | /api/employees                  | Create employee                  |
| PUT    | /api/employees/:id              | Update employee                  |
| PATCH  | /api/employees/:id/skills       | Update/add a skill rating        |
| DELETE | /api/employees/:id              | Delete employee                  |
| POST   | /api/employees/upload/csv       | Bulk import from CSV             |
| GET    | /api/roles                      | List roles                       |
| POST   | /api/roles                      | Create role                      |
| PUT    | /api/roles/:id                  | Update role (assign/fill)        |
| GET    | /api/roles/:id/matches          | Get matched candidates           |
| GET    | /api/attendance?date=YYYY-MM-DD | Get attendance for date          |
| POST   | /api/attendance                 | Set attendance for one employee  |
| POST   | /api/attendance/bulk            | Bulk set attendance + shift      |
| GET    | /api/feedback                   | Get rejection feedback log       |
| POST   | /api/feedback                   | Log accept/reject decision       |
| GET    | /api/feedback/stats             | Rejection reason breakdown       |
| GET    | /api/dashboard                  | Aggregated dashboard stats       |

---

## CSV Upload Format

Upload `.csv` files from the Workers page. Required columns:
- `employee_id`, `name`

Optional: `department`, `role`, `gender`, `age`, `phone`, `join_date`, `shift_preference`, `attrition_risk`

Skill columns (value 0–10):
`skill_sewing_machine_operation`, `skill_fabric_cutting`, `skill_quality_inspection`,
`skill_embroidery`, `skill_screen_printing`, `skill_pattern_making`, `skill_overlock_serger`,
`skill_knitting`, `skill_dyeing_finishing`, `skill_packaging`, `skill_machine_maintenance`,
`skill_inventory_management`, `skill_supervisory`

If `employee_id` already exists → **updates** the record. Otherwise → **creates** new.

---

## Features

- 🔐 JWT authentication with role-based access
- 👷 Employee CRUD with 13 textile-specific skills (rated 1–10)
- 📤 CSV bulk import/update
- 📋 Daily attendance tracking (present/absent/assigned)
- 🕐 Shift assignment (Morning/Afternoon/Night) with bulk tools
- 🎯 Role matching engine — scans available workers by skill rating, ranks by score
- ✅ Accept/Reject candidates with reason capture (model training data)
- 📊 Attrition pipeline with skill gap alerts and backup identification
- 📱 Fully mobile-responsive (bottom tab nav on mobile)
- 📈 Dashboard with Recharts visualizations
