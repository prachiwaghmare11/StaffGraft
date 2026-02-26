const mongoose = require("mongoose");

const skillSchema = new mongoose.Schema({
  name:   { type: String, required: true },
  rating: { type: Number, min: 1, max: 10, required: true },
}, { _id: false });

const employeeSchema = new mongoose.Schema({
  employee_id:      { type: String, required: true, unique: true, trim: true },
  name:             { type: String, required: true, trim: true },
  gender:           { type: String, enum: ["Male", "Female", "Other", ""], default: "" },
  age:              { type: Number, default: null },
  phone:            { type: String, default: "" },
  department:       { type: String, required: true, default: "Production",
                      enum: ["Production","Quality","Cutting","Embroidery","Finishing","Maintenance","Logistics"] },
  role:             { type: String, required: true, default: "Operator" },
  join_date:        { type: String, default: "" },
  shift_preference: { type: String, enum: ["morning","afternoon","night","flexible"], default: "flexible" },
  attritionRisk:    { type: String, enum: ["low","medium","high"], default: "low" },
  skills:           { type: [skillSchema], default: [] },
}, { timestamps: true });

employeeSchema.index({ name: "text", employee_id: "text", role: "text" });

module.exports = mongoose.model("Employee", employeeSchema);
