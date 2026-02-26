const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema({
  employee:   { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  role:       { type: mongoose.Schema.Types.ObjectId, ref: "Role", required: true },
  action:     { type: String, enum: ["accept","reject"], required: true },
  reason:     { type: String, default: "" },
  note:       { type: String, default: "" },
  matchScore: { type: Number, default: 0 },
  skillsSnapshot: { type: Array, default: [] },
}, { timestamps: true });

module.exports = mongoose.model("Feedback", feedbackSchema);
