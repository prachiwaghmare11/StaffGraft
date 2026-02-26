const router = require("express").Router();
const Feedback = require("../models/Feedback");
const auth = require("../middleware/auth");

// GET /api/feedback
router.get("/", auth, async (req, res) => {
  try {
    const feedback = await Feedback.find()
      .populate("employee", "name employee_id skills")
      .populate("role", "title dept")
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/feedback
router.post("/", auth, async (req, res) => {
  try {
    const fb = await Feedback.create(req.body);
    const populated = await fb.populate([
      { path: "employee", select: "name employee_id skills" },
      { path: "role", select: "title dept" },
    ]);
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/feedback/stats  — rejection reason breakdown
router.get("/stats", auth, async (req, res) => {
  try {
    const reasonCounts = await Feedback.aggregate([
      { $match: { action: "reject" } },
      { $group: { _id: "$reason", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    const total = await Feedback.countDocuments();
    const accepts = await Feedback.countDocuments({ action: "accept" });
    res.json({ reasonCounts, total, accepts, rejects: total - accepts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
