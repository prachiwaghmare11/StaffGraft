// StaffGraft Unit Tests — run with: node tests/unit.test.js
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); console.log(`  ✅ ${name}`); passed++; }
  catch (e) { console.log(`  ❌ ${name}: ${e.message}`); failed++; }
}
function assert(cond, msg) { if (!cond) throw new Error(msg||"Assertion failed"); }
function assertEqual(a, b, msg) {
  if (JSON.stringify(a)!==JSON.stringify(b)) throw new Error(`${msg||""} Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

// ─── Skill Level ──────────────────────────────────────────────────────────────
console.log("\n── Skill Level Calculator ──");
function getSkillLevel(skills=[]) {
  if (!skills.length) return { level:"Unskilled",avg:0 };
  const top5=[...skills].sort((a,b)=>b.rating-a.rating).slice(0,5);
  const avg=top5.reduce((s,sk)=>s+sk.rating,0)/top5.length;
  if (skills.length>=5&&avg>=7) return { level:"Multi-Skill",avg:+avg.toFixed(1) };
  if (avg>=7) return { level:"Skilled",avg:+avg.toFixed(1) };
  if (avg>=4) return { level:"Semi-Skilled",avg:+avg.toFixed(1) };
  return { level:"Unskilled",avg:+avg.toFixed(1) };
}
test("Unskilled — empty skills",    ()=>assertEqual(getSkillLevel([]).level,"Unskilled"));
test("Unskilled — low ratings",     ()=>assert(getSkillLevel([{rating:1},{rating:2}]).level==="Unskilled"));
test("Semi-Skilled — avg 4-6.9",    ()=>assert(getSkillLevel([{rating:5},{rating:6},{rating:4}]).level==="Semi-Skilled"));
test("Skilled — avg ≥7, <5 skills", ()=>assert(getSkillLevel([{rating:8},{rating:7}]).level==="Skilled"));
test("Multi-Skill — 5+ skills ≥7",  ()=>assert(getSkillLevel([{rating:8},{rating:9},{rating:7},{rating:8},{rating:7}]).level==="Multi-Skill"));
test("Multi-Skill ignores low 6th", ()=>{
  const s=[{rating:9},{rating:9},{rating:9},{rating:9},{rating:9},{rating:1}];
  assertEqual(getSkillLevel(s).level,"Multi-Skill");
  assertEqual(getSkillLevel(s).avg,9.0);
});

// ─── Attendance Status Derivation ────────────────────────────────────────────
console.log("\n── Attendance Status Derivation ──");
const SHIFT_START={morning:"06:00",afternoon:"14:00",night:"22:00"};
function timeToMin(t){const[h,m]=t.split(":").map(Number);return h*60+m;}
function deriveStatus(checkIn,shift){
  if(!checkIn)return"present_ontime";
  const start=SHIFT_START[shift];if(!start)return"present_ontime";
  return timeToMin(checkIn)-timeToMin(start)<=15?"present_ontime":"present_late";
}
test("On time — exact start",        ()=>assertEqual(deriveStatus("06:00","morning"),"present_ontime"));
test("On time — within 15min grace", ()=>assertEqual(deriveStatus("06:14","morning"),"present_ontime"));
test("Late — past grace",            ()=>assertEqual(deriveStatus("06:16","morning"),"present_late"));
test("Afternoon on time",            ()=>assertEqual(deriveStatus("14:10","afternoon"),"present_ontime"));
test("No check-in → on time",        ()=>assertEqual(deriveStatus("","morning"),"present_ontime"));
test("Unknown shift → on time",      ()=>assertEqual(deriveStatus("09:00","unknown"),"present_ontime"));

// ─── CSV Builder ──────────────────────────────────────────────────────────────
console.log("\n── CSV Export ──");
function buildCSV(rows){
  const h=Object.keys(rows[0]);
  return[h.join(","),...rows.map(r=>h.map(k=>{
    const v=String(r[k]??"").replace(/"/g,'""');
    return v.includes(",")||v.includes('"')||v.includes("\n")?`"${v}"`:v;
  }).join(","))].join("\n");
}
test("Headers present",        ()=>assert(buildCSV([{name:"x",dept:"y"}]).includes("name,dept")));
test("Comma escaped",          ()=>assert(buildCSV([{name:"Kumar, Ravi"}]).includes('"Kumar, Ravi"')));
test("Quote escaped",          ()=>assert(buildCSV([{name:'Say "hi"'}]).includes('""hi""')));
test("Normal value unquoted",  ()=>assert(!buildCSV([{name:"Ravi"}]).includes('"')));

// ─── Duplicate Skill ─────────────────────────────────────────────────────────
console.log("\n── Duplicate Skill Prevention ──");
const isDup=(skills,name)=>skills.some(s=>s.name.toLowerCase()===name.toLowerCase());
test("Exact duplicate",             ()=>assert(isDup([{name:"Embroidery"}],"Embroidery")));
test("Case-insensitive duplicate",  ()=>assert(isDup([{name:"Embroidery"}],"embroidery")));
test("Different skill allowed",     ()=>assert(!isDup([{name:"Embroidery"}],"Knitting")));
test("Empty list — no duplicate",   ()=>assert(!isDup([],"Sewing Machine Operation")));

// ─── Date Range ──────────────────────────────────────────────────────────────
console.log("\n── Date Range Generator ──");
function dateRange(from,to){
  const d=[];const c=new Date(from);const e=new Date(to);
  while(c<=e){d.push(c.toISOString().split("T")[0]);c.setDate(c.getDate()+1);}
  return d;
}
test("7-day range = 7 dates",       ()=>assertEqual(dateRange("2024-01-01","2024-01-07").length,7));
test("Same day = 1 date",           ()=>assertEqual(dateRange("2024-03-15","2024-03-15").length,1));
test("Correct first date",          ()=>assertEqual(dateRange("2024-06-01","2024-06-03")[0],"2024-06-01"));
test("Correct last date",           ()=>assertEqual(dateRange("2024-06-01","2024-06-03")[2],"2024-06-03"));

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(44)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if(failed>0){console.log("\n⚠️  Tests failed — review errors above.");process.exit(1);}
else console.log("\n🎉  All tests passed!");
