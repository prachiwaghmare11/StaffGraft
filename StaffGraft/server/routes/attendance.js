const router = require("express").Router();
const multer = require("multer");
const { parse } = require("csv-parse/sync");
const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");
const auth = require("../middleware/auth");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// shift schedule: if check-in is within 15 min grace = ontime, else late
const SHIFT_START = { morning: "06:00", afternoon: "14:00", night: "22:00" };
const GRACE_MIN = 15;

function timeToMin(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function deriveStatus(checkIn, shift) {
  if (!checkIn) return "present_ontime";
  const start = SHIFT_START[shift];
  if (!start) return "present_ontime";
  const diff = timeToMin(checkIn) - timeToMin(start);
  return diff <= GRACE_MIN ? "present_ontime" : "present_late";
}

// GET /api/attendance?date=YYYY-MM-DD&status=&shift=&dept=
router.get("/", auth, async (req, res) => {
  try {
    const { date, status, shift, dept } = req.query;
    if (!date) return res.status(400).json({ message: "date query param required" });

    let empQuery = {};
    if (dept && dept !== "All") empQuery.department = dept;
    const employees = await Employee.find(empQuery).sort({ name: 1 });
    const records = await Attendance.find({ date });

    const recordMap = {};
    records.forEach(r => { recordMap[r.employee.toString()] = r; });

    let result = employees.map(emp => ({
      ...emp.toObject(),
      attendance: recordMap[emp._id.toString()] || { status: "unset", shift: "", checkIn: "", checkOut: "", overtimeHours: 0 },
    }));

    if (status && status !== "all") {
      result = result.filter(e => e.attendance.status === status);
    }
    if (shift && shift !== "all") {
      result = result.filter(e => e.attendance.shift === shift);
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/attendance  — upsert one record
router.post("/", auth, async (req, res) => {
  try {
    const { employee, date, status, shift, checkIn, checkOut, overtimeHours, note } = req.body;

    // Auto-derive shift from employee preference if not provided
    let resolvedShift = shift;
    if (!resolvedShift) {
      const emp = await Employee.findById(employee);
      if (emp && emp.shift_preference !== "flexible") resolvedShift = emp.shift_preference;
    }

    // Auto-derive status from check-in time if not explicitly set
    let resolvedStatus = status;
    if (!resolvedStatus || resolvedStatus === "unset") {
      if (checkIn) resolvedStatus = deriveStatus(checkIn, resolvedShift);
    }

    const record = await Attendance.findOneAndUpdate(
      { employee, date },
      { $set: { status: resolvedStatus || "unset", shift: resolvedShift || "", checkIn: checkIn || "", checkOut: checkOut || "", overtimeHours: overtimeHours || 0, note: note || "" } },
      { upsert: true, new: true }
    );
    res.json(record);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /api/attendance/bulk
router.post("/bulk", auth, async (req, res) => {
  try {
    const { employeeIds, date, status, shift, checkIn, checkOut } = req.body;
    const ops = employeeIds.map(id => ({
      updateOne: {
        filter: { employee: id, date },
        update: { $set: { status: status || "present_ontime", shift: shift || "", checkIn: checkIn || "", checkOut: checkOut || "" } },
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
    const summary = { present_ontime: 0, present_late: 0, absent: 0, assigned: 0, unset: 0 };
    records.forEach(r => { summary[r.status] = (summary[r.status] || 0) + 1; });
    const total = await Employee.countDocuments();
    summary.unset += total - records.length;
    res.json({ ...summary, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/attendance/import-csv  — bulk import from CSV with auto shift assignment
router.post("/import-csv", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const text = req.file.buffer.toString("utf-8");
    const rows = parse(text, { columns: true, skip_empty_lines: true, trim: true });

    const results = { imported: 0, errors: [] };

    for (const row of rows) {
      try {
        // Identify employee by employee_id or name
        let emp = null;
        if (row.employee_id) emp = await Employee.findOne({ employee_id: row.employee_id.trim() });
        if (!emp && row.name) emp = await Employee.findOne({ name: new RegExp(`^${row.name.trim()}$`, "i") });
        if (!emp) { results.errors.push(`Not found: ${row.employee_id || row.name}`); continue; }

        const date = row.date || new Date().toISOString().split("T")[0];
        const checkIn = row.check_in || row.checkIn || row.checkin || "";
        const checkOut = row.check_out || row.checkOut || row.checkout || "";
        const overtimeHours = parseFloat(row.overtime_hours || row.overtimeHours || 0) || 0;

        // Auto-assign shift from preference if not in CSV
        let shift = row.shift || "";
        if (!shift && emp.shift_preference !== "flexible") shift = emp.shift_preference;

        // Auto-derive status from check-in
        let status = row.status || "";
        if (!status && checkIn) status = deriveStatus(checkIn, shift);
        if (!status) status = "present_ontime";

        await Attendance.findOneAndUpdate(
          { employee: emp._id, date },
          { $set: { status, shift, checkIn, checkOut, overtimeHours, note: row.note || "" } },
          { upsert: true, new: true }
        );
        results.imported++;
      } catch (e) {
        results.errors.push(e.message);
      }
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
