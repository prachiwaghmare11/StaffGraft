# StaffGraft — Login Troubleshooting

## Credentials
Email:    admin@staffgraft.com
Password: admin123

---

## Step 1 — Is the backend running?
Open your browser and go to:
  http://localhost:5000/api/health

You should see:  {"status":"ok","db":"connected",...}

If you get "Cannot reach server" — the backend is not running.
Fix:  cd server && npm install && node index.js

If db is "disconnected" — check your MONGODB_URI in server/.env

---

## Step 2 — Does the admin user exist?
If the server started but login still fails, reset the admin by calling:

  curl -X POST http://localhost:5000/api/auth/reset-admin

Or in the browser console / Postman:
  POST http://localhost:5000/api/auth/reset-admin

This will delete and recreate the admin with password "admin123".

---

## Step 3 — Is the frontend proxying to the right port?
The frontend (Vite on :5173) proxies /api → http://localhost:5000
Make sure the backend is on port 5000 (default).

If you changed the port, update client/vite.config.js:
  target: "http://localhost:YOUR_PORT"

---

## Step 4 — Full reset (nuclear option)
cd server
node -e "
  require('dotenv').config();
  const mongoose = require('mongoose');
  mongoose.connect(process.env.MONGODB_URI).then(async () => {
    const User = require('./models/User');
    await User.deleteMany({});
    await User.create({ name:'Admin', email:'admin@staffgraft.com', password:'admin123', role:'admin' });
    console.log('Done'); process.exit(0);
  });
"

---

## Common mistakes
- Running `npm run dev` from the wrong folder (run from project ROOT)
- MONGODB_URI not set in server/.env (copy from .env.example)
- MongoDB Atlas IP whitelist — must include 0.0.0.0/0 or your current IP
- Port conflict — another process using 5000 (run: lsof -i :5000)
