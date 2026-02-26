const router = require("express").Router();
const Attendance = require("../models/Attendance");
const auth = require("../middleware/auth");

// GET /api/shifts/summary?date=YYYY-MM-DD
router.get("/summary", auth, async (req, res) => {
  try {
    const { date } = req.query;
    const records = await Attendance.find({ date, shift: { $ne: "" } })
      .populate("employee", "name employee_id department role");
    const summary = { morning: [], afternoon: [], night: [] };
    records.forEach(r => {
      if (summary[r.shift]) summary[r.shift].push(r.employee);
    });
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
