const router = require("express").Router();
const Employee = require("../models/Employee");
const Role = require("../models/Role");
const Attendance = require("../models/Attendance");
const auth = require("../middleware/auth");

// Helper: generate array of YYYY-MM-DD strings between two dates inclusive
function dateRange(from, to) {
  const dates = [];
  const cur = new Date(from);
  const end = new Date(to);
  while (cur <= end) {
    dates.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// GET /api/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/", auth, async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const to   = req.query.to   || today;
    const from = req.query.from || (() => {
      const d = new Date(to); d.setDate(d.getDate() - 13); return d.toISOString().split("T")[0];
    })();

    const [
      totalEmployees,
      exitedEmployees,
      highRisk,
      mediumRisk,
      openRoles,
      todayAttendance,
      allEmployees,
      shiftSummary,
    ] = await Promise.all([
      Employee.countDocuments({ status: { $ne: "exited" } }),
      Employee.countDocuments({ status: "exited" }),
      Employee.countDocuments({ attritionRisk: "high", status: { $ne: "exited" } }),
      Employee.countDocuments({ attritionRisk: "medium", status: { $ne: "exited" } }),
      Role.countDocuments({ status: "open" }),
      Attendance.find({ date: today }),
      Employee.find({ status: { $ne: "exited" } }).select("skills department attritionRisk"),
      Attendance.aggregate([
        { $match: { date: today, shift: { $ne: "" } } },
        { $group: { _id: "$shift", count: { $sum: 1 } } },
      ]),
    ]);

    const presentToday = todayAttendance.filter(a =>
      a.status === "present_ontime" || a.status === "present_late" || a.status === "assigned"
    ).length;

    // ── Skill averages ────────────────────────────────────────────────────────
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

    // ── Department breakdown ──────────────────────────────────────────────────
    const deptCounts = await Employee.aggregate([
      { $match: { status: { $ne: "exited" } } },
      { $group: { _id: "$department", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // ── Daily attendance series for the date range ────────────────────────────
    const dates = dateRange(from, to);
    const rangeRecords = await Attendance.find({
      date: { $gte: from, $lte: to },
    });

    // Group by date
    const byDate = {};
    rangeRecords.forEach(r => {
      if (!byDate[r.date]) byDate[r.date] = { people: 0, hours: 0 };
      const isPresent = r.status === "present_ontime" || r.status === "present_late" || r.status === "assigned";
      if (isPresent) {
        byDate[r.date].people++;
        // Estimate hours: overtime + 8 base if present
        byDate[r.date].hours += 8 + (r.overtimeHours || 0);
      }
    });

    const dailySeries = dates.map(d => ({
      date: d,
      label: new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      people: byDate[d]?.people ?? 0,
      hours:  +(byDate[d]?.hours ?? 0).toFixed(1),
    }));

    // ── Exited by month (last 6 months) ──────────────────────────────────────
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    const exitedWorkers = await Employee.find({
      status: "exited",
      exit_date: { $gte: sixMonthsAgo.toISOString().split("T")[0] },
    }).select("exit_date exit_reason department");

    const exitByMonth = {};
    exitedWorkers.forEach(e => {
      if (!e.exit_date) return;
      const key = e.exit_date.slice(0, 7); // "YYYY-MM"
      if (!exitByMonth[key]) exitByMonth[key] = 0;
      exitByMonth[key]++;
    });

    res.json({
      totalEmployees,
      exitedEmployees,
      presentToday,
      openRoles,
      highRisk,
      mediumRisk,
      skillAverages,
      deptCounts,
      shiftSummary,
      dailySeries,
      dateRange: { from, to },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
