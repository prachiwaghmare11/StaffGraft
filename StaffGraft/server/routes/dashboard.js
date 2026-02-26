const router = require("express").Router();
const Employee = require("../models/Employee");
const Role = require("../models/Role");
const Attendance = require("../models/Attendance");
const auth = require("../middleware/auth");

// GET /api/dashboard
router.get("/", auth, async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const [
      totalEmployees,
      highRisk,
      openRoles,
      todayAttendance,
      allEmployees,
      shiftSummary,
    ] = await Promise.all([
      Employee.countDocuments(),
      Employee.countDocuments({ attritionRisk: "high" }),
      Role.countDocuments({ status: "open" }),
      Attendance.find({ date: today }),
      Employee.find().select("skills department attritionRisk"),
      Attendance.aggregate([
        { $match: { date: today, shift: { $ne: "" } } },
        { $group: { _id: "$shift", count: { $sum: 1 } } },
      ]),
    ]);

    const presentToday = todayAttendance.filter(a => a.status === "present" || a.status === "unset").length
      + (totalEmployees - todayAttendance.length); // unset = available

    // Skill averages
    const skillMap = {};
    allEmployees.forEach(emp =>
      emp.skills.forEach(s => {
        if (!skillMap[s.name]) skillMap[s.name] = { total: 0, count: 0 };
        skillMap[s.name].total += s.rating;
        skillMap[s.name].count++;
      })
    );
    const skillAverages = Object.entries(skillMap)
      .map(([name, { total, count }]) => ({ name, avg: +(total / count).toFixed(1) }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 8);

    // Department breakdown
    const deptCounts = await Employee.aggregate([
      { $group: { _id: "$department", count: { $sum: 1 } } },
    ]);

    res.json({
      totalEmployees,
      presentToday,
      openRoles,
      highRisk,
      skillAverages,
      deptCounts,
      shiftSummary,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
