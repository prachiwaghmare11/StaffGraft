const mongoose = require("mongoose");

const requiredSkillSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  minRating: { type: Number, min: 1, max: 10, required: true },
}, { _id: false });

const roleSchema = new mongoose.Schema({
  title:          { type: String, required: true, trim: true },
  dept:           { type: String, required: true },
  priority:       { type: String, enum: ["critical","high","medium","low"], default: "medium" },
  status:         { type: String, enum: ["open","filled"], default: "open" },
  deadline:       { type: String, default: "" },
  assignedTo:     { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
  requiredSkills: { type: [requiredSkillSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model("Role", roleSchema);
