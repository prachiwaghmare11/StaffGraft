const router = require("express").Router();
const Role = require("../models/Role");
const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const auth = require("../middleware/auth");

// GET /api/roles
router.get("/", auth, async (req, res) => {
  try {
    const roles = await Role.find().populate("assignedTo", "name employee_id").sort({ createdAt: -1 });
    res.json(roles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/roles
router.post("/", auth, async (req, res) => {
  try {
    const role = await Role.create(req.body);
    res.status(201).json(role);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/roles/:id
router.put("/:id", auth, async (req, res) => {
  try {
    const role = await Role.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate("assignedTo", "name employee_id");
    if (!role) return res.status(404).json({ message: "Role not found" });
    res.json(role);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/roles/:id
router.delete("/:id", auth, async (req, res) => {
  try {
    await Role.findByIdAndDelete(req.params.id);
    res.json({ message: "Role deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/roles/:id/matches  — find candidates for a role
router.get("/:id/matches", auth, async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ message: "Role not found" });

    const today = new Date().toISOString().split("T")[0];

    // Get employees absent or already assigned today
    const blockedAttendance = await Attendance.find({
      date: today,
      status: { $in: ["absent", "assigned"] },
    }).select("employee");
    const blockedIds = blockedAttendance.map(a => a.employee.toString());

    // Build skill filter — employee must have ALL required skills >= minRating
    const employees = await Employee.find({
      _id: { $nin: blockedIds },
    });

    const matched = employees
      .filter(emp =>
        role.requiredSkills.every(rs => {
          const sk = emp.skills.find(s => s.name === rs.name);
          return sk && sk.rating >= rs.minRating;
        })
      )
      .map(emp => {
        const score = role.requiredSkills.reduce((acc, rs) => {
          const sk = emp.skills.find(s => s.name === rs.name);
          return acc + (sk?.rating ?? 0);
        }, 0);
        return { ...emp.toObject(), matchScore: score };
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    res.json(matched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
