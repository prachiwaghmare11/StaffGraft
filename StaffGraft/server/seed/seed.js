require("dotenv").config();
const mongoose = require("mongoose");
const Employee = require("./models/Employee");
const Role = require("./models/Role");
const User = require("./models/User");

const employees = [
  { employee_id:"EMP001", name:"Ravi Kumar",     gender:"Male",   age:34, phone:"9876543210", department:"Production",  role:"Senior Operator",       join_date:"2020-03-15", shift_preference:"morning",   attritionRisk:"low",
    skills:[{name:"Sewing Machine Operation",rating:9},{name:"Fabric Cutting",rating:7},{name:"Quality Inspection",rating:6},{name:"Overlock / Serger",rating:8},{name:"Supervisory",rating:7}] },
  { employee_id:"EMP002", name:"Sunita Devi",    gender:"Female", age:28, phone:"9123456780", department:"Quality",     role:"Inspector",             join_date:"2022-01-10", shift_preference:"afternoon", attritionRisk:"medium",
    skills:[{name:"Quality Inspection",rating:10},{name:"Fabric Cutting",rating:8},{name:"Sewing Machine Operation",rating:6},{name:"Overlock / Serger",rating:7},{name:"Packaging",rating:4}] },
  { employee_id:"EMP003", name:"Mohan Lal",      gender:"Male",   age:45, phone:"9988776655", department:"Cutting",     role:"Cutter",                join_date:"2018-06-01", shift_preference:"morning",   attritionRisk:"high",
    skills:[{name:"Fabric Cutting",rating:10},{name:"Pattern Making",rating:8},{name:"Quality Inspection",rating:7},{name:"Supervisory",rating:5}] },
  { employee_id:"EMP004", name:"Fatima Shaikh",  gender:"Female", age:31, phone:"9876501234", department:"Embroidery",  role:"Embroidery Specialist", join_date:"2021-11-22", shift_preference:"flexible",  attritionRisk:"low",
    skills:[{name:"Embroidery",rating:10},{name:"Sewing Machine Operation",rating:7},{name:"Pattern Making",rating:6},{name:"Quality Inspection",rating:5}] },
  { employee_id:"EMP005", name:"Rajesh Yadav",   gender:"Male",   age:38, phone:"9090909090", department:"Finishing",   role:"Finishing Operator",    join_date:"2019-08-14", shift_preference:"night",     attritionRisk:"medium",
    skills:[{name:"Dyeing & Finishing",rating:9},{name:"Screen Printing",rating:8},{name:"Packaging",rating:7},{name:"Quality Inspection",rating:6}] },
  { employee_id:"EMP006", name:"Lakshmi Naidu",  gender:"Female", age:26, phone:"9765432100", department:"Production",  role:"Operator",              join_date:"2023-05-10", shift_preference:"morning",   attritionRisk:"low",
    skills:[{name:"Sewing Machine Operation",rating:8},{name:"Overlock / Serger",rating:9},{name:"Packaging",rating:6}] },
  { employee_id:"EMP007", name:"Harish Patil",   gender:"Male",   age:41, phone:"9811223344", department:"Maintenance", role:"Technician",            join_date:"2017-02-20", shift_preference:"morning",   attritionRisk:"low",
    skills:[{name:"Machine Maintenance",rating:10},{name:"Sewing Machine Operation",rating:5},{name:"Inventory Management",rating:6},{name:"Supervisory",rating:4}] },
  { employee_id:"EMP008", name:"Meena Bai",      gender:"Female", age:35, phone:"9900112233", department:"Production",  role:"Tailor",                join_date:"2020-09-01", shift_preference:"afternoon", attritionRisk:"medium",
    skills:[{name:"Sewing Machine Operation",rating:8},{name:"Embroidery",rating:6},{name:"Pattern Making",rating:7},{name:"Fabric Cutting",rating:5}] },
];

const roles = [
  { title:"Floor Supervisor – Sewing", dept:"Production", priority:"high",     status:"open",   deadline:"2026-03-10",
    requiredSkills:[{name:"Sewing Machine Operation",minRating:8},{name:"Supervisory",minRating:6}] },
  { title:"Senior Quality Inspector",   dept:"Quality",    priority:"critical", status:"open",   deadline:"2026-02-28",
    requiredSkills:[{name:"Quality Inspection",minRating:8},{name:"Fabric Cutting",minRating:5}] },
  { title:"Pattern Making Specialist",  dept:"Cutting",    priority:"medium",   status:"filled", deadline:"2026-04-01",
    requiredSkills:[{name:"Pattern Making",minRating:7},{name:"Fabric Cutting",minRating:7}] },
  { title:"Embroidery Machine Operator",dept:"Embroidery", priority:"high",     status:"open",   deadline:"2026-03-20",
    requiredSkills:[{name:"Embroidery",minRating:8},{name:"Sewing Machine Operation",minRating:5}] },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  await Employee.deleteMany({});
  await Role.deleteMany({});

  await Employee.insertMany(employees);
  await Role.insertMany(roles);

  // Create default admin user
  const existing = await User.findOne({ email: "admin@staffgraft.com" });
  if (!existing) {
    await User.create({ name: "Admin", email: "admin@staffgraft.com", password: "admin123", role: "admin" });
    console.log("✅ Default user: admin@staffgraft.com / admin123");
  }

  console.log(`✅ Seeded ${employees.length} employees, ${roles.length} roles`);
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
