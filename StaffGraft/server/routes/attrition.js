const router = require("express").Router();
const Employee = require("../models/Employee");
const auth = require("../middleware/auth");

// GET /api/attrition/analytics
router.get("/analytics", auth, async (req, res) => {
  try {
    const all = await Employee.find().select(
      "name department role gender age attritionRisk status join_date exit_date exit_reason skills"
    );

    const active  = all.filter(e => e.status !== "exited");
    const exited  = all.filter(e => e.status === "exited");

    // ── Risk breakdown ────────────────────────────────────────────────────────
    const riskBreakdown = {
      high:   active.filter(e => e.attritionRisk === "high").length,
      medium: active.filter(e => e.attritionRisk === "medium").length,
      low:    active.filter(e => e.attritionRisk === "low").length,
    };

    // ── Risk by department ────────────────────────────────────────────────────
    const riskByDept = {};
    active.forEach(e => {
      if (!riskByDept[e.department]) riskByDept[e.department] = { high:0, medium:0, low:0, total:0 };
      riskByDept[e.department][e.attritionRisk]++;
      riskByDept[e.department].total++;
    });
    const riskByDeptArr = Object.entries(riskByDept).map(([dept, v]) => ({
      dept, ...v,
      highPct: +((v.high / v.total) * 100).toFixed(0),
    })).sort((a, b) => b.high - a.high);

    // ── Exit reasons ─────────────────────────────────────────────────────────
    const exitReasonMap = {};
    exited.forEach(e => {
      const r = e.exit_reason || "other";
      exitReasonMap[r] = (exitReasonMap[r] || 0) + 1;
    });
    const exitReasons = Object.entries(exitReasonMap)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    // ── Exits by month (last 12 months) ──────────────────────────────────────
    const exitsByMonth = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      exitsByMonth[key] = { key, label: d.toLocaleDateString("en-IN",{month:"short",year:"2-digit"}), exits: 0, joined: 0 };
    }
    exited.forEach(e => {
      if (!e.exit_date) return;
      const key = e.exit_date.slice(0,7);
      if (exitsByMonth[key]) exitsByMonth[key].exits++;
    });
    all.forEach(e => {
      if (!e.join_date) return;
      const key = e.join_date.slice(0,7);
      if (exitsByMonth[key]) exitsByMonth[key].joined++;
    });
    const monthlyTrend = Object.values(exitsByMonth);

    // ── Tenure analysis ───────────────────────────────────────────────────────
    // Bucket workers by how long they've been (or were) at the company
    const tenureBuckets = { "<6m":0, "6-12m":0, "1-2y":0, "2-5y":0, "5y+":0 };
    const calcTenureMonths = e => {
      if (!e.join_date) return null;
      const start = new Date(e.join_date);
      const end   = e.exit_date ? new Date(e.exit_date) : new Date();
      return (end - start) / (1000 * 60 * 60 * 24 * 30.44);
    };
    exited.forEach(e => {
      const m = calcTenureMonths(e);
      if (m === null) return;
      if (m < 6)        tenureBuckets["<6m"]++;
      else if (m < 12)  tenureBuckets["6-12m"]++;
      else if (m < 24)  tenureBuckets["1-2y"]++;
      else if (m < 60)  tenureBuckets["2-5y"]++;
      else              tenureBuckets["5y+"]++;
    });
    const tenureData = Object.entries(tenureBuckets).map(([range, exits]) => ({ range, exits }));

    // ── Gender breakdown of active high-risk ─────────────────────────────────
    const genderRisk = {};
    active.filter(e => e.attritionRisk === "high").forEach(e => {
      const g = e.gender || "Unknown";
      genderRisk[g] = (genderRisk[g] || 0) + 1;
    });

    // ── Skills lost to attrition ──────────────────────────────────────────────
    const lostSkillMap = {};
    exited.forEach(e => {
      e.skills.filter(s => s.rating >= 7).forEach(s => {
        lostSkillMap[s.name] = (lostSkillMap[s.name] || 0) + 1;
      });
    });
    const lostSkills = Object.entries(lostSkillMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // ── High-risk workers list ────────────────────────────────────────────────
    const highRiskWorkers = active
      .filter(e => e.attritionRisk === "high")
      .map(e => ({
        _id: e._id,
        name: e.name,
        department: e.department,
        role: e.role,
        join_date: e.join_date,
        tenureMonths: Math.round(calcTenureMonths(e) ?? 0),
        topSkill: e.skills.sort((a,b)=>b.rating-a.rating)[0]?.name || "—",
      }));

    // ── Attrition rate (exited / total ever) ─────────────────────────────────
    const attritionRate = all.length > 0
      ? +((exited.length / all.length) * 100).toFixed(1)
      : 0;

    res.json({
      summary: {
        totalEver: all.length,
        active: active.length,
        exited: exited.length,
        attritionRate,
        riskBreakdown,
      },
      riskByDeptArr,
      exitReasons,
      monthlyTrend,
      tenureData,
      lostSkills,
      highRiskWorkers,
      genderRisk,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
