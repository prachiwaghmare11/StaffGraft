const router = require("express").Router();
const multer = require("multer");
const { parse } = require("csv-parse/sync");
const Employee = require("../models/Employee");
const auth = require("../middleware/auth");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const SKILL_KEY_MAP = {
  skill_sewing_machine_operation: "Sewing Machine Operation",
  skill_fabric_cutting:           "Fabric Cutting",
  skill_quality_inspection:       "Quality Inspection",
  skill_embroidery:               "Embroidery",
  skill_screen_printing:          "Screen Printing",
  skill_pattern_making:           "Pattern Making",
  skill_overlock_serger:          "Overlock / Serger",
  skill_knitting:                 "Knitting",
  skill_dyeing_finishing:         "Dyeing & Finishing",
  skill_packaging:                "Packaging",
  skill_machine_maintenance:      "Machine Maintenance",
  skill_inventory_management:     "Inventory Management",
  skill_supervisory:              "Supervisory",
};

// GET /api/employees
router.get("/", auth, async (req, res) => {
  try {
    const { search, department, attritionRisk } = req.query;
    const filter = {};
    if (department && department !== "All") filter.department = department;
    if (attritionRisk) filter.attritionRisk = attritionRisk;
    if (search) filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { employee_id: { $regex: search, $options: "i" } },
      { role: { $regex: search, $options: "i" } },
    ];
    const employees = await Employee.find(filter).sort({ name: 1 });
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/employees/:id
router.get("/:id", auth, async (req, res) => {
  try {
    const emp = await Employee.findById(req.params.id);
    if (!emp) return res.status(404).json({ message: "Employee not found" });
    res.json(emp);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/employees
router.post("/", auth, async (req, res) => {
  try {
    const emp = await Employee.create(req.body);
    res.status(201).json(emp);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/employees/:id
router.put("/:id", auth, async (req, res) => {
  try {
    const emp = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!emp) return res.status(404).json({ message: "Employee not found" });
    res.json(emp);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/employees/:id/skills  — update a single skill rating
router.patch("/:id/skills", auth, async (req, res) => {
  try {
    const { name, rating } = req.body;
    const emp = await Employee.findById(req.params.id);
    if (!emp) return res.status(404).json({ message: "Employee not found" });

    const existing = emp.skills.find(s => s.name === name);
    if (existing) {
      existing.rating = rating;
    } else {
      emp.skills.push({ name, rating });
    }
    await emp.save();
    res.json(emp);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/employees/:id
router.delete("/:id", auth, async (req, res) => {
  try {
    await Employee.findByIdAndDelete(req.params.id);
    res.json({ message: "Employee deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/employees/upload/csv  — bulk import
router.post("/upload/csv", auth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const text = req.file.buffer.toString("utf-8");
    // Skip hint/instruction rows by finding the actual header
    const lines = text.split(/\r?\n/);
    const headerIdx = lines.findIndex(l =>
      l.toLowerCase().includes("employee_id") && l.toLowerCase().includes("name")
    );
    if (headerIdx === -1) return res.status(400).json({ message: "Could not find header row with employee_id and name columns" });

    const csvText = lines.slice(headerIdx).join("\n");
    const rows = parse(csvText, { columns: true, skip_empty_lines: true, trim: true });

    const added = [], updated = [], errors = [];

    for (const row of rows) {
      if (!row.name || !row.name.trim()) continue;
      const name = row.name.trim();
      if (name.toLowerCase().includes("e.g.") || name.toLowerCase().includes("full name")) continue;

      const skills = Object.entries(SKILL_KEY_MAP)
        .filter(([k]) => row[k] && +row[k] > 0)
        .map(([k, v]) => ({ name: v, rating: Math.min(10, Math.max(1, +row[k])) }));

      const empId = row.employee_id?.trim();
      try {
        if (empId) {
          const result = await Employee.findOneAndUpdate(
            { employee_id: empId },
            {
              $set: {
                ...(name && { name }),
                ...(row.department && { department: row.department }),
                ...(row.role && { role: row.role }),
                ...(row.gender && { gender: row.gender }),
                ...(row.age && { age: +row.age }),
                ...(row.phone && { phone: row.phone.toString() }),
                ...(row.join_date && { join_date: row.join_date }),
                ...(row.shift_preference && { shift_preference: row.shift_preference.toLowerCase() }),
                ...(row.attrition_risk && { attritionRisk: row.attrition_risk }),
              },
              ...(skills.length && {
                $push: {
                  skills: {
                    $each: skills,
                    // Avoid duplicates by removing existing first — handled below
                  }
                }
              }),
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          // Update skills properly (avoid duplicates)
          if (skills.length) {
            for (const sk of skills) {
              await Employee.findOneAndUpdate(
                { employee_id: empId, "skills.name": sk.name },
                { $set: { "skills.$.rating": sk.rating } }
              );
              await Employee.findOneAndUpdate(
                { employee_id: empId, "skills.name": { $ne: sk.name } },
                { $push: { skills: sk } }
              );
            }
          }
          updated.push(name);
        } else {
          await Employee.create({
            employee_id: `EMP${Date.now()}`,
            name,
            gender: row.gender || "",
            age: row.age ? +row.age : null,
            phone: row.phone?.toString() || "",
            department: row.department || "Production",
            role: row.role || "Operator",
            join_date: row.join_date || "",
            shift_preference: row.shift_preference?.toLowerCase() || "flexible",
            attritionRisk: row.attrition_risk || "low",
            skills,
          });
          added.push(name);
        }
      } catch (e) {
        errors.push(`${name}: ${e.message}`);
      }
    }

    res.json({ added: added.length, updated: updated.length, errors });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
