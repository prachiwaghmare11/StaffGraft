import { useFetch, useBreakpoint } from "../hooks";
import { getDashboard, getRoles } from "../utils/api";
import { Card, SectionTitle, Chip, Spinner, PC, SHIFTS } from "../components/UI";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function Dashboard() {
  const mobile = useBreakpoint();
  const { data: stats, loading: l1 } = useFetch(getDashboard, []);
  const { data: roles,  loading: l2 } = useFetch(getRoles, []);

  if (l1 || l2) return <Spinner />;

  const kpis = [
    { label:"Total Workers",   value: stats?.totalEmployees ?? 0,  sub:"on payroll",       accent:"#4cde9f" },
    { label:"Available Today", value: stats?.presentToday ?? 0,    sub:"ready to assign",  accent:"#60b3f5" },
    { label:"Open Roles",      value: stats?.openRoles ?? 0,       sub:"need staffing",    accent:"#f5c518" },
    { label:"Attrition Risk",  value: stats?.highRisk ?? 0,        sub:"high-risk workers",accent:"#ff3b5c" },
  ];

  const shiftMap = {};
  (stats?.shiftSummary ?? []).forEach(s => { shiftMap[s._id] = s.count; });

  const openRoles = (roles ?? []).filter(r => r.status === "open");

  return (
    <div className="page-enter">
      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:mobile?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {kpis.map(k => (
          <Card key={k.label} style={{borderTop:`3px solid ${k.accent}`,padding:mobile?12:16}}>
            <div style={{fontSize:mobile?28:36,fontWeight:800,color:k.accent,fontFamily:"'Playfair Display',serif"}}>{k.value}</div>
            <div style={{fontSize:13,color:"#e8dcc8",fontWeight:600,marginTop:2}}>{k.label}</div>
            <div style={{fontSize:11,color:"#6b7a9e",marginTop:2}}>{k.sub}</div>
          </Card>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"1fr 1fr",gap:14}}>
        {/* Skill averages chart */}
        <Card>
          <SectionTitle>Team Skill Averages</SectionTitle>
          {(stats?.skillAverages ?? []).length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.skillAverages} layout="vertical" margin={{left:0,right:10}}>
                <XAxis type="number" domain={[0,10]} tick={{fill:"#6b7a9e",fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="name" width={145} tick={{fill:"#c4b8a0",fontSize:11}} axisLine={false} tickLine={false}/>
                <Tooltip
                  contentStyle={{background:"#0d1225",border:"1px solid #1e2545",borderRadius:8,fontSize:12}}
                  labelStyle={{color:"#e8dcc8"}}
                  itemStyle={{color:"#4cde9f"}}
                />
                <Bar dataKey="avg" radius={[0,4,4,0]}>
                  {(stats?.skillAverages ?? []).map((entry, i) => (
                    <Cell key={i} fill={entry.avg >= 8 ? "#4cde9f" : entry.avg >= 5 ? "#f5c518" : "#ff3b5c"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div style={{color:"#6b7a9e",textAlign:"center",padding:40}}>No skill data</div>}
        </Card>

        {/* Shift summary */}
        <Card>
          <SectionTitle>Today's Shift Allocation</SectionTitle>
          {SHIFTS.map(sh => (
            <div key={sh.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:sh.color,flexShrink:0}}/>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{color:"#e8dcc8",fontSize:13,fontWeight:600}}>{sh.label}</span>
                  <span style={{color:sh.color,fontWeight:700,fontSize:16}}>{shiftMap[sh.id] ?? 0}</span>
                </div>
                <div style={{fontSize:11,color:"#6b7a9e"}}>{sh.time}</div>
                <div style={{height:4,background:"#1e2545",borderRadius:2,marginTop:4,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${((shiftMap[sh.id]??0)/(stats?.totalEmployees||1))*100}%`,background:sh.color,borderRadius:2,transition:"width 0.5s"}}/>
                </div>
              </div>
            </div>
          ))}

          {/* Dept breakdown */}
          {(stats?.deptCounts ?? []).length > 0 && (
            <>
              <div style={{borderTop:"1px solid #1a2040",marginTop:14,paddingTop:14}}>
                <SectionTitle>By Department</SectionTitle>
                {stats.deptCounts.map(d => (
                  <div key={d._id} style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                    <span style={{color:"#c4b8a0",fontSize:12}}>{d._id}</span>
                    <span style={{color:"#e8dcc8",fontWeight:700}}>{d.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        {/* Open Roles */}
        <Card style={{gridColumn:mobile?"auto":"1 / -1"}}>
          <SectionTitle>Open Roles</SectionTitle>
          {openRoles.length === 0
            ? <div style={{color:"#6b7a9e",textAlign:"center",padding:20}}>No open roles</div>
            : openRoles.map(r => (
              <div key={r._id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #0f1630"}}>
                <div>
                  <div style={{color:"#e8dcc8",fontWeight:600,fontSize:14}}>{r.title}</div>
                  <div style={{color:"#6b7a9e",fontSize:12,marginTop:2}}>
                    {r.dept} · Deadline: {r.deadline || "—"}
                    {" · "}Required: {r.requiredSkills.map(s=>`${s.name}≥${s.minRating}`).join(", ")}
                  </div>
                </div>
                <Chip text={r.priority.toUpperCase()} color={PC[r.priority]}/>
              </div>
            ))}
        </Card>
      </div>
    </div>
  );
}
