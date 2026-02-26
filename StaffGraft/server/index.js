require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

const app = express();

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      // In production, allow CLIENT_URL; in dev allow localhost
      const allowed =
        process.env.NODE_ENV === "production"
          ? [process.env.CLIENT_URL].filter(Boolean)
          : [
              "http://localhost:5173",
              "http://localhost:3000",
              "http://127.0.0.1:5173",
            ];
      if (allowed.length === 0 || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // permissive fallback — tighten after confirmed working
      }
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth"));
app.use("/api/employees", require("./routes/employees"));
app.use("/api/roles", require("./routes/roles"));
app.use("/api/attendance", require("./routes/attendance"));
app.use("/api/shifts", require("./routes/shifts"));
app.use("/api/feedback", require("./routes/feedback"));
app.use("/api/dashboard", require("./routes/dashboard"));

// ─── Serve React in production ───────────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/dist")));
  app.get("*", (req, res) =>
    res.sendFile(path.join(__dirname, "../client/dist/index.html")),
  );
}

// ─── Error handler ───────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(err.status || 500)
    .json({ message: err.message || "Server error" });
});

// ─── Auto-init: create default admin + seed data if DB is empty ──────────────
async function initDB() {
  const User = require("./models/User");
  const Employee = require("./models/Employee");
  const Role = require("./models/Role");

  // Always ensure default admin exists (fixes "invalid credentials" on fresh deploy)
  const adminEmail = "admin@staffgraft.com";
  const existing = await User.findOne({ email: adminEmail });
  if (!existing) {
    await User.create({
      name: "Admin",
      email: adminEmail,
      password: "admin123",
      role: "admin",
    });
    console.log("✅ Default admin created: admin@staffgraft.com / admin123");
  }

  // Seed sample employees + roles only if completely empty
  const empCount = await Employee.countDocuments();
  if (empCount === 0) {
    const employees = [
      {
        employee_id: "EMP001",
        name: "Ravi Kumar",
        gender: "Male",
        age: 34,
        phone: "9876543210",
        department: "Production",
        role: "Senior Operator",
        join_date: "2020-03-15",
        shift_preference: "morning",
        attritionRisk: "low",
        skills: [
          { name: "Sewing Machine Operation", rating: 9 },
          { name: "Fabric Cutting", rating: 7 },
          { name: "Quality Inspection", rating: 6 },
          { name: "Overlock / Serger", rating: 8 },
          { name: "Supervisory", rating: 7 },
        ],
      },
      {
        employee_id: "EMP002",
        name: "Sunita Devi",
        gender: "Female",
        age: 28,
        phone: "9123456780",
        department: "Quality",
        role: "Inspector",
        join_date: "2022-01-10",
        shift_preference: "afternoon",
        attritionRisk: "medium",
        skills: [
          { name: "Quality Inspection", rating: 10 },
          { name: "Fabric Cutting", rating: 8 },
          { name: "Sewing Machine Operation", rating: 6 },
          { name: "Overlock / Serger", rating: 7 },
          { name: "Packaging", rating: 4 },
        ],
      },
      {
        employee_id: "EMP003",
        name: "Mohan Lal",
        gender: "Male",
        age: 45,
        phone: "9988776655",
        department: "Cutting",
        role: "Cutter",
        join_date: "2018-06-01",
        shift_preference: "morning",
        attritionRisk: "high",
        skills: [
          { name: "Fabric Cutting", rating: 10 },
          { name: "Pattern Making", rating: 8 },
          { name: "Quality Inspection", rating: 7 },
          { name: "Supervisory", rating: 5 },
        ],
      },
      {
        employee_id: "EMP004",
        name: "Fatima Shaikh",
        gender: "Female",
        age: 31,
        phone: "9876501234",
        department: "Embroidery",
        role: "Embroidery Specialist",
        join_date: "2021-11-22",
        shift_preference: "flexible",
        attritionRisk: "low",
        skills: [
          { name: "Embroidery", rating: 10 },
          { name: "Sewing Machine Operation", rating: 7 },
          { name: "Pattern Making", rating: 6 },
          { name: "Quality Inspection", rating: 5 },
        ],
      },
      {
        employee_id: "EMP005",
        name: "Rajesh Yadav",
        gender: "Male",
        age: 38,
        phone: "9090909090",
        department: "Finishing",
        role: "Finishing Operator",
        join_date: "2019-08-14",
        shift_preference: "night",
        attritionRisk: "medium",
        skills: [
          { name: "Dyeing & Finishing", rating: 9 },
          { name: "Screen Printing", rating: 8 },
          { name: "Packaging", rating: 7 },
          { name: "Quality Inspection", rating: 6 },
        ],
      },
      {
        employee_id: "EMP006",
        name: "Lakshmi Naidu",
        gender: "Female",
        age: 26,
        phone: "9765432100",
        department: "Production",
        role: "Operator",
        join_date: "2023-05-10",
        shift_preference: "morning",
        attritionRisk: "low",
        skills: [
          { name: "Sewing Machine Operation", rating: 8 },
          { name: "Overlock / Serger", rating: 9 },
          { name: "Packaging", rating: 6 },
        ],
      },
      {
        employee_id: "EMP007",
        name: "Harish Patil",
        gender: "Male",
        age: 41,
        phone: "9811223344",
        department: "Maintenance",
        role: "Technician",
        join_date: "2017-02-20",
        shift_preference: "morning",
        attritionRisk: "low",
        skills: [
          { name: "Machine Maintenance", rating: 10 },
          { name: "Sewing Machine Operation", rating: 5 },
          { name: "Inventory Management", rating: 6 },
          { name: "Supervisory", rating: 4 },
        ],
      },
      {
        employee_id: "EMP008",
        name: "Meena Bai",
        gender: "Female",
        age: 35,
        phone: "9900112233",
        department: "Production",
        role: "Tailor",
        join_date: "2020-09-01",
        shift_preference: "afternoon",
        attritionRisk: "medium",
        skills: [
          { name: "Sewing Machine Operation", rating: 8 },
          { name: "Embroidery", rating: 6 },
          { name: "Pattern Making", rating: 7 },
          { name: "Fabric Cutting", rating: 5 },
        ],
      },
    ];
    const roles = [
      {
        title: "Floor Supervisor – Sewing",
        dept: "Production",
        priority: "high",
        status: "open",
        deadline: "2026-03-10",
        requiredSkills: [
          { name: "Sewing Machine Operation", minRating: 8 },
          { name: "Supervisory", minRating: 6 },
        ],
      },
      {
        title: "Senior Quality Inspector",
        dept: "Quality",
        priority: "critical",
        status: "open",
        deadline: "2026-02-28",
        requiredSkills: [
          { name: "Quality Inspection", minRating: 8 },
          { name: "Fabric Cutting", minRating: 5 },
        ],
      },
      {
        title: "Pattern Making Specialist",
        dept: "Cutting",
        priority: "medium",
        status: "filled",
        deadline: "2026-04-01",
        requiredSkills: [
          { name: "Pattern Making", minRating: 7 },
          { name: "Fabric Cutting", minRating: 7 },
        ],
      },
      {
        title: "Embroidery Machine Operator",
        dept: "Embroidery",
        priority: "high",
        status: "open",
        deadline: "2026-03-20",
        requiredSkills: [
          { name: "Embroidery", minRating: 8 },
          { name: "Sewing Machine Operation", minRating: 5 },
        ],
      },
    ];
    await Employee.insertMany(employees);
    await Role.insertMany(roles);
    console.log(
      `✅ Seeded ${employees.length} employees and ${roles.length} roles`,
    );
  }
}

// ─── DB + Start ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("✅ MongoDB connected");
    await initDB();
    app.listen(PORT, () =>
      console.log(`🚀 StaffGraft server running on port ${PORT}`),
    );
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });
