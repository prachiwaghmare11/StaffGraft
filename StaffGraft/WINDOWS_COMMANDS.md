# ─── StaffGraft — Windows PowerShell Commands ────────────────────────────────

# 1. INSTALL everything
npm run install:all

# 2. START both servers (from project root)
npm run dev

# ─── If login fails ───────────────────────────────────────────────────────────

# 3. Check if backend is alive (open in browser OR run this):
Invoke-WebRequest -Uri "http://localhost:5000/api/health" -Method GET | Select-Object -ExpandProperty Content

# 4. Reset admin user (fixes "Invalid email or password")
Invoke-WebRequest -Uri "http://localhost:5000/api/auth/reset-admin" -Method POST | Select-Object -ExpandProperty Content

# ─── Alternative: use curl.exe (ships with Windows 10+) ─────────────────────
# PowerShell has a built-in "curl" alias that breaks — use curl.exe explicitly:

curl.exe http://localhost:5000/api/health
curl.exe -X POST http://localhost:5000/api/auth/reset-admin

# ─── Setup .env ───────────────────────────────────────────────────────────────
# In PowerShell, copy the example file:
Copy-Item server\.env.example server\.env

# Then edit it:
notepad server\.env

# Paste your MongoDB Atlas URI:
# MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/staffgraft?retryWrites=true&w=majority
# JWT_SECRET=any_random_string_here
# PORT=5000
# NODE_ENV=development
# CLIENT_URL=http://localhost:5173
