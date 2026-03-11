const router = require("express").Router();
const multer = require("multer");
const { parse } = require("csv-parse/sync");
const { OvertimeRequest, OvertimeManager } = require("../models/Overtime");
const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");
const auth = require("../middleware/auth");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

// ─── Managers ────────────────────────────────────────────────────────────────

router.get("/managers", auth, async (req, res) => {
  try {
    const managers = await OvertimeManager.find().sort({ name: 1 });
    res.json(managers);
  } catch (err) {
    console.error("[overtime/managers GET]", err.message);
    res
      .status(500)
      .json({ message: "Failed to fetch managers: " + err.message });
  }
});

router.post("/managers", auth, async (req, res) => {
  try {
    const { name, email, department, phone } = req.body;
    if (!name?.trim())
      return res.status(400).json({ message: "Manager name is required" });
    if (!email?.trim())
      return res.status(400).json({ message: "Manager email is required" });
    const mgr = await OvertimeManager.create({
      name: name.trim(),
      email: email.trim(),
      department: department || "All",
      phone: phone || "",
    });
    res.status(201).json(mgr);
  } catch (err) {
    console.error("[overtime/managers POST]", err.message);
    res.status(400).json({ message: "Failed to add manager: " + err.message });
  }
});

router.delete("/managers/:id", auth, async (req, res) => {
  try {
    await OvertimeManager.findByIdAndDelete(req.params.id);
    res.json({ message: "Manager removed" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to remove manager: " + err.message });
  }
});

// POST /api/overtime/managers/import-csv
router.post(
  "/managers/import-csv",
  auth,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file)
        return res.status(400).json({ message: "No file uploaded" });
      const rows = parse(req.file.buffer.toString("utf-8"), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
      let added = 0;
      const errors = [];
      for (const row of rows) {
        if (!row.name || !row.email) {
          errors.push(`Missing name/email for row: ${JSON.stringify(row)}`);
          continue;
        }
        try {
          await OvertimeManager.findOneAndUpdate(
            { email: row.email.trim() },
            {
              name: row.name.trim(),
              email: row.email.trim(),
              department: row.department || "All",
              phone: row.phone || "",
            },
            { upsert: true, new: true },
          );
          added++;
        } catch (e) {
          errors.push(`${row.name}: ${e.message}`);
        }
      }
      res.json({ added, errors });
    } catch (err) {
      console.error("[overtime/managers/import-csv]", err.message);
      res.status(500).json({ message: "CSV import failed: " + err.message });
    }
  },
);

// ─── Present workers ──────────────────────────────────────────────────────────
// GET /api/overtime/present?date=YYYY-MM-DD
// Returns workers who are marked present, OR if none marked, all active employees
router.get("/present", auth, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split("T")[0];

    // Find all attendance records for this date that are present
    const records = await Attendance.find({
      date,
      status: { $in: ["present_ontime", "present_late", "assigned"] },
    }).populate(
      "employee",
      "name employee_id role department phone shift_preference",
    );

    // Filter out any with null employee (deleted)
    const valid = records.filter((r) => r.employee);

    if (valid.length > 0) {
      // Return workers with their attendance info
      return res.json(
        valid.map((r) => ({ ...r.employee.toObject(), attendance: r })),
      );
    }

    // Fallback: no attendance marked yet → return all active employees with empty attendance
    console.log(
      `[overtime/present] No attendance records for ${date}, returning all active employees as fallback`,
    );
    const allActive = await Employee.find({ status: { $ne: "exited" } })
      .select("name employee_id role department phone shift_preference")
      .sort({ name: 1 });

    res.json(
      allActive.map((e) => ({
        ...e.toObject(),
        attendance: {
          status: "unset",
          shift: "",
          checkIn: "",
          checkOut: "",
          overtimeHours: 0,
        },
        _isFallback: true,
      })),
    );
  } catch (err) {
    console.error("[overtime/present]", err.message);
    res
      .status(500)
      .json({ message: "Failed to fetch present workers: " + err.message });
  }
});

// ─── Requests ────────────────────────────────────────────────────────────────

router.get("/requests", auth, async (req, res) => {
  try {
    const requests = await OvertimeRequest.find()
      .populate("workers", "name employee_id department")
      .populate("manager")
      .populate("requestedBy", "name email")
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(requests);
  } catch (err) {
    console.error("[overtime/requests GET]", err.message);
    res
      .status(500)
      .json({ message: "Failed to fetch requests: " + err.message });
  }
});

router.post("/requests", auth, async (req, res) => {
  try {
    const { date, managerId, workerIds, hours, reason } = req.body;
    if (!workerIds?.length)
      return res
        .status(400)
        .json({ message: "At least one worker must be selected" });
    if (!hours || hours < 0.5)
      return res
        .status(400)
        .json({ message: "Overtime hours must be at least 0.5" });
    if (!date) return res.status(400).json({ message: "Date is required" });

    const request = await OvertimeRequest.create({
      date,
      requestedBy: req.user._id,
      manager: managerId || null,
      workers: workerIds,
      hours,
      reason: reason || "",
    });

    if (workerIds.length && hours) {
      await Attendance.updateMany(
        { employee: { $in: workerIds }, date },
        { $set: { overtimeHours: hours } },
      );
    }

    const populated = await request.populate([
      { path: "workers", select: "name employee_id department" },
      { path: "manager" },
      { path: "requestedBy", select: "name email" },
    ]);
    res.status(201).json(populated);
  } catch (err) {
    console.error("[overtime/requests POST]", err.message);
    res
      .status(400)
      .json({ message: "Failed to create request: " + err.message });
  }
});

router.patch("/requests/:id/status", auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["pending", "approved", "rejected"].includes(status))
      return res
        .status(400)
        .json({ message: "Invalid status. Use: pending, approved, rejected" });
    const r = await OvertimeRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    )
      .populate("workers", "name employee_id")
      .populate("manager")
      .populate("requestedBy", "name email");
    if (!r) return res.status(404).json({ message: "Request not found" });
    res.json(r);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Failed to update status: " + err.message });
  }
});

module.exports = router;
