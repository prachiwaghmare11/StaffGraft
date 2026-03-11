import { useState } from "react";
import { useFetch, useBreakpoint } from "../hooks";
import { getDashboard, getRoles } from "../utils/api";
import { Card, SectionTitle, Chip, Spinner, PC, SHIFTS } from "../components/UI";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts";

const RANGES = [
  { label:"7D",  days:7  },
  { label:"14D", days:14 },
  { label:"30D", days:30 },
  { label:"90D", days:90 },
];

function fmtDate(d) { return d.toISOString().split("T")[0]; }

export default function Dashboard() {
  const mobile = useBreakpoint();
  const [rangeDays, setRangeDays] = useState(14);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo,   setCustomTo]   = useState("");
  const [metric, setMetric]         = useState("people"); // "people" | "hours"

  const today = fmtDate(new Date());
  const defFrom = fmtDate(new Date(Date.now() - (rangeDays - 1) * 86400000));
  const from = customFrom || defFrom;
  const to   = customTo   || today;

  const { data: stats, loading: l1 } = useFetch(
    () => getDashboard(from, to),
    [from, to]
  );
  const { data: roles, loading: l2 } = useFetch(getRoles, []);

  if (l1 || l2) return <Spinner />;

  const kpis = [
    { label:"Total Active",   value: stats?.totalEmployees ?? 0,  sub:"on payroll",         accent:"#4cde9f" },
    { label:"Present Today",  value: stats?.presentToday ?? 0,    sub:"clocked in today",   accent:"#60b3f5" },
    { label:"Open Roles",     value: stats?.openRoles ?? 0,       sub:"need staffing",      accent:"#f5c518" },
    { label:"High Risk",      value: stats?.highRisk ?? 0,        sub:"attrition risk",     accent:"#ff3b5c" },
    { label:"Exited",         value: stats?.exitedEmployees ?? 0, sub:"total departures",   accent:"#b48ef5" },
  ];

  const shiftMap = {};
  (stats?.shiftSummary ?? []).forEach(s => { shiftMap[s._id] = s.count; });

  const openRoles = (roles ?? []).filter(r => r.status === "open");
  const dailySeries = stats?.dailySeries ?? [];

  const metricKey   = metric === "people" ? "people" : "hours";
  const metricLabel = metric === "people" ? "People Present" : "Hours Clocked";
  const metricColor = metric === "people" ? "#60b3f5" : "#f5c518";

  const toggleStyle = (active) => ({
    padding:"5px 14px", borderRadius:20, fontSize:11, fontWeight:700, cursor:"pointer",
    border:`1px solid ${active?"#3d5af1":"#1e2545"}`,
    background: active ? "#3d5af133" : "transparent",
    color: active ? "#3d5af1" : "#6b7a9e",
  });

  const rangeStyle = (active) => ({
    padding:"4px 10px", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer",
    border:`1px solid ${active?"#3d5af155":"#1e2545"}`,
    background: active ? "#3d5af122" : "transparent",
    color: active ? "#3d5af1" : "#6b7a9e",
  });

  return (
    <div className="page-enter">

      {/* ── Date Range Bar ──────────────────────────────────────────────────── */}
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{color:"#6b7a9e",fontSize:11,marginRight:2}}>Range:</span>
        {RANGES.map(r => (
          <button key={r.label}
            onClick={()=>{ setRangeDays(r.days); setCustomFrom(""); setCustomTo(""); }}
            style={rangeStyle(!customFrom && rangeDays===r.days)}>{r.label}</button>
        ))}
        <div style={{display:"flex",gap:6,alignItems:"center",marginLeft:8}}>
          <input type="date" value={customFrom} max={customTo||today}
            onChange={e=>{ setCustomFrom(e.target.value); setRangeDays(0); }}
            style={{background:"#1a2040",border:"1px solid #2d3561",borderRadius:6,padding:"4px 8px",color:"#e8dcc8",fontSize:11}}/>
          <span style={{color:"#6b7a9e",fontSize:11}}>→</span>
          <input type="date" value={customTo} min={customFrom} max={today}
            onChange={e=>{ setCustomTo(e.target.value); setRangeDays(0); }}
            style={{background:"#1a2040",border:"1px solid #2d3561",borderRadius:6,padding:"4px 8px",color:"#e8dcc8",fontSize:11}}/>
          {customFrom && <button onClick={()=>{ setCustomFrom(""); setCustomTo(""); setRangeDays(14); }}
            style={{background:"none",border:"none",color:"#ff3b5c",cursor:"pointer",fontSize:16,lineHeight:1}}>×</button>}
        </div>
        <span style={{marginLeft:"auto",color:"#6b7a9e",fontSize:11}}>
          {from} → {to}
        </span>
      </div>

      {/* ── KPIs ────────────────────────────────────────────────────────────── */}
      <div style={{display:"grid",gridTemplateColumns:mobile?"1fr 1fr":"repeat(5,1fr)",gap:10,marginBottom:18}}>
        {kpis.map(k => (
          <Card key={k.label} style={{borderTop:`3px solid ${k.accent}`,padding:mobile?10:14}}>
            <div style={{fontSize:mobile?26:34,fontWeight:800,color:k.accent,fontFamily:"'Playfair Display',serif"}}>{k.value}</div>
            <div style={{fontSize:12,color:"#e8dcc8",fontWeight:600,marginTop:2}}>{k.label}</div>
            <div style={{fontSize:10,color:"#6b7a9e",marginTop:1}}>{k.sub}</div>
          </Card>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"1fr 1fr",gap:14,marginBottom:14}}>

        {/* ── Skill Averages Chart ─────────────────────────────────────────── */}
        <Card>
          <SectionTitle>Team Skill Averages</SectionTitle>
          {(stats?.skillAverages ?? []).length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.skillAverages} layout="vertical" margin={{left:0,right:10}}>
                <XAxis type="number" domain={[0,10]} tick={{fill:"#6b7a9e",fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="name" width={145} tick={{fill:"#c4b8a0",fontSize:11}} axisLine={false} tickLine={false}/>
                <Tooltip
                  contentStyle={{background:"#0d1225",border:"1px solid #1e2545",borderRadius:8,fontSize:12}}
                  labelStyle={{color:"#e8dcc8"}} itemStyle={{color:"#4cde9f"}}
                />
                <Bar dataKey="avg" radius={[0,4,4,0]}>
                  {(stats?.skillAverages ?? []).map((e,i) => (
                    <Cell key={i} fill={e.avg>=8?"#4cde9f":e.avg>=5?"#f5c518":"#ff3b5c"}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{color:"#6b7a9e",textAlign:"center",padding:40}}>No skill data</div>}
        </Card>

        {/* ── Shift + Dept ─────────────────────────────────────────────────── */}
        <Card>
          <SectionTitle>Today's Shift Allocation</SectionTitle>
          {SHIFTS.map(sh => (
            <div key={sh.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{width:9,height:9,borderRadius:"50%",background:sh.color,flexShrink:0}}/>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                  <span style={{color:"#e8dcc8",fontSize:13,fontWeight:600}}>{sh.label}</span>
                  <span style={{color:sh.color,fontWeight:700,fontSize:15}}>{shiftMap[sh.id] ?? 0}</span>
                </div>
                <div style={{fontSize:10,color:"#6b7a9e"}}>{sh.time}</div>
                <div style={{height:3,background:"#1e2545",borderRadius:2,marginTop:3,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${((shiftMap[sh.id]??0)/(stats?.totalEmployees||1))*100}%`,background:sh.color,borderRadius:2,transition:"width 0.5s"}}/>
                </div>
              </div>
            </div>
          ))}
          {(stats?.deptCounts ?? []).length > 0 && (
            <div style={{borderTop:"1px solid #1a2040",marginTop:12,paddingTop:12}}>
              <SectionTitle>By Department</SectionTitle>
              {stats.deptCounts.map(d => (
                <div key={d._id} style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{color:"#c4b8a0",fontSize:12}}>{d._id}</span>
                  <span style={{color:"#e8dcc8",fontWeight:700}}>{d.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Daily Attendance Series ──────────────────────────────────────────── */}
      <Card style={{marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
          <SectionTitle style={{margin:0}}>
            Daily {metric === "people" ? "Headcount" : "Hours Clocked"}
            <span style={{color:"#6b7a9e",fontWeight:400,fontSize:11,marginLeft:8}}>
              ({from} → {to})
            </span>
          </SectionTitle>
          <div style={{display:"flex",gap:6}}>
            <button style={toggleStyle(metric==="people")} onClick={()=>setMetric("people")}>👥 People</button>
            <button style={toggleStyle(metric==="hours")}  onClick={()=>setMetric("hours")}>⏱ Hours</button>
          </div>
        </div>

        {dailySeries.length === 0
          ? <div style={{color:"#6b7a9e",textAlign:"center",padding:30}}>No attendance data for this range</div>
          : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailySeries} margin={{left:0,right:10,top:5,bottom:0}}>
                <CartesianGrid stroke="#1e2545" strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="label" tick={{fill:"#6b7a9e",fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:"#6b7a9e",fontSize:10}} axisLine={false} tickLine={false} width={30}/>
                <Tooltip
                  contentStyle={{background:"#0d1225",border:"1px solid #1e2545",borderRadius:8,fontSize:12}}
                  labelStyle={{color:"#e8dcc8"}}
                  formatter={(v)=>[v, metricLabel]}
                />
                <Line type="monotone" dataKey={metricKey} stroke={metricColor} strokeWidth={2}
                  dot={{ fill: metricColor, r:3 }} activeDot={{r:5}}/>
              </LineChart>
            </ResponsiveContainer>
          )
        }

        {/* Summary row below chart */}
        {dailySeries.length > 0 && (
          <div style={{display:"flex",gap:20,marginTop:12,paddingTop:12,borderTop:"1px solid #1a2040",flexWrap:"wrap"}}>
            {[
              { label:"Total Days",  val: dailySeries.length },
              { label:"Avg People/Day", val: +(dailySeries.reduce((s,d)=>s+d.people,0)/dailySeries.length).toFixed(1) },
              { label:"Total Hours",    val: dailySeries.reduce((s,d)=>s+d.hours,0).toFixed(0)+"h" },
              { label:"Peak Day",       val: dailySeries.reduce((a,b)=>b[metricKey]>a[metricKey]?b:a,dailySeries[0]).label },
            ].map(({label,val}) => (
              <div key={label}>
                <div style={{color:"#e8dcc8",fontWeight:700,fontSize:16}}>{val}</div>
                <div style={{color:"#6b7a9e",fontSize:10,marginTop:1}}>{label}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Open Roles ──────────────────────────────────────────────────────── */}
      <Card>
        <SectionTitle>Open Roles</SectionTitle>
        {openRoles.length === 0
          ? <div style={{color:"#6b7a9e",textAlign:"center",padding:20}}>No open roles</div>
          : openRoles.map(r => (
            <div key={r._id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #0f1630"}}>
              <div>
                <div style={{color:"#e8dcc8",fontWeight:600,fontSize:14}}>{r.title}</div>
                <div style={{color:"#6b7a9e",fontSize:11,marginTop:2}}>
                  {r.dept} · Deadline: {r.deadline||"—"} ·&nbsp;
                  {r.requiredSkills.map(s=>`${s.name}≥${s.minRating}`).join(", ")}
                </div>
              </div>
              <Chip text={r.priority.toUpperCase()} color={PC[r.priority]}/>
            </div>
          ))}
      </Card>
    </div>
  );
}
