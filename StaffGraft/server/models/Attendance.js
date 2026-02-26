const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  employee:  { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  date:      { type: String, required: true },           // "YYYY-MM-DD"
  status:    { type: String, enum: ["present","absent","assigned","unset"], default: "unset" },
  shift:     { type: String, enum: ["morning","afternoon","night",""], default: "" },
}, { timestamps: true });

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
