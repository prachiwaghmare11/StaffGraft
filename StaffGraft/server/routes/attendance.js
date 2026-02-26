const router = require("express").Router();
const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");
const auth = require("../middleware/auth");

// GET /api/attendance?date=YYYY-MM-DD
router.get("/", auth, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: "date query param required" });

    const employees = await Employee.find().sort({ name: 1 });
    const records = await Attendance.find({ date });

    // Merge: return each employee with their attendance record for the date
    const recordMap = {};
    records.forEach(r => { recordMap[r.employee.toString()] = r; });

    const result = employees.map(emp => ({
      ...emp.toObject(),
      attendance: recordMap[emp._id.toString()] || { status: "unset", shift: "" },
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/attendance  — upsert one record
router.post("/", auth, async (req, res) => {
  try {
    const { employee, date, status, shift } = req.body;
    const record = await Attendance.findOneAndUpdate(
      { employee, date },
      { status, shift: shift || "" },
      { upsert: true, new: true }
    );
    res.json(record);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/attendance/bulk  — mark many employees at once
router.post("/bulk", auth, async (req, res) => {
  try {
    const { employeeIds, date, status, shift } = req.body;
    const ops = employeeIds.map(id => ({
      updateOne: {
        filter: { employee: id, date },
        update: { $set: { status, shift: shift || "" } },
        upsert: true,
      },
    }));
    await Attendance.bulkWrite(ops);
    res.json({ updated: employeeIds.length });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/attendance/summary?date=YYYY-MM-DD
router.get("/summary", auth, async (req, res) => {
  try {
    const { date } = req.query;
    const records = await Attendance.find({ date });
    const summary = { present: 0, absent: 0, assigned: 0, unset: 0 };
    records.forEach(r => { summary[r.status] = (summary[r.status] || 0) + 1; });
    const total = await Employee.countDocuments();
    summary.unset += total - records.length;
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
