import { useState } from "react";
import { useFetch, useBreakpoint } from "../hooks";
import { getAttritionAnalytics, getEmployees, updateEmployee } from "../utils/api";
import { exportCSV } from "../components/UI";
import { Card, SectionTitle, Chip, Avatar, Btn, Spinner, Empty, RC, DEPARTMENTS, inputStyle, Field, toast } from "../components/UI";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid, PieChart, Pie, Legend,
} from "recharts";

const EXIT_REASONS = ["resigned","terminated","retired","contract_end","other"];
const EXIT_COLORS  = { resigned:"#ff3b5c", terminated:"#f5a623", retired:"#4cde9f", contract_end:"#60b3f5", other:"#b48ef5" };
const PIE_COLORS   = ["#3d5af1","#4cde9f","#f5c518","#ff3b5c","#60b3f5","#b48ef5","#f5a623"];

export default function Attrition() {
  const mobile = useBreakpoint();
  const today = new Date().toISOString().split("T")[0];
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const { data: analytics, loading: la, refetch: refetchAnalytics } = useFetch(
    () => getAttritionAnalytics(dateFrom||undefined, dateTo||undefined),
    [dateFrom, dateTo]
  );
  const { data: employees, loading: le, refetch: refetchEmps } = useFetch(getEmployees, []);
  const [tab, setTab]             = useState("overview");
  const [exitForm, setExitForm]   = useState(null);
  const [exitData, setExitData]   = useState({ exit_date:"", exit_reason:"resigned" });
  const [saving, setSaving]       = useState(false);

  function handleExportExits() {
    const rows = (employees||[]).filter(e=>e.status==="exited").map(e=>({
      employee_id: e.employee_id,
      name: e.name,
      department: e.department,
      role: e.role,
      exit_date: e.exit_date||"",
      exit_reason: e.exit_reason||"",
      join_date: e.join_date||"",
    }));
    exportCSV(rows, `attrition-exits-${today}.csv`);
    toast(`Exported ${rows.length} exit records`);
  }

  async function markExited(empId) {
    if (!exitData.exit_date) { toast("Select exit date","error"); return; }
    setSaving(true);
    try {
      await updateEmployee(empId, { status:"exited", ...exitData });
      refetchAnalytics(); refetchEmps();
      setExitForm(null); setExitData({ exit_date:"", exit_reason:"resigned" });
      toast("Worker marked as exited");
    } catch { toast("Failed","error"); }
    finally { setSaving(false); }
  }

  async function markActive(empId) {
    try {
      await updateEmployee(empId, { status:"active", exit_date:"", exit_reason:"" });
      refetchAnalytics(); refetchEmps();
      toast("Worker marked active");
    } catch { toast("Failed","error"); }
  }

  if (la || le) return <Spinner />;

  const s = analytics?.summary ?? {};
  const riskByDept  = analytics?.riskByDeptArr ?? [];
  const exitReasons = analytics?.exitReasons ?? [];
  const trend       = analytics?.monthlyTrend ?? [];
  const tenureData  = analytics?.tenureData   ?? [];
  const lostSkills  = analytics?.lostSkills   ?? [];
  const highRisk    = analytics?.highRiskWorkers ?? [];

  const activeEmps = (employees ?? []).filter(e => e.status !== "exited");
  const exitedEmps = (employees ?? []).filter(e => e.status === "exited");

  const tabStyle = (active) => ({
    padding:"7px 14px", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:600,
    background: active ? "#3d5af133" : "transparent",
    color: active ? "#3d5af1" : "#6b7a9e",
    border:`1px solid ${active?"#3d5af155":"#1e2545"}`,
    whiteSpace:"nowrap",
  });

  return (
    <div className="page-enter">

      {/* Date Range */}
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{color:"#6b7a9e",fontSize:12}}>Filter exits by date:</span>
        <input type="date" value={dateFrom} max={dateTo||today}
          onChange={e=>setDateFrom(e.target.value)}
          style={{background:"#1a2040",border:"1px solid #2d3561",borderRadius:6,padding:"5px 8px",color:"#e8dcc8",fontSize:12}}/>
        <span style={{color:"#6b7a9e",fontSize:12}}>→</span>
        <input type="date" value={dateTo} min={dateFrom} max={today}
          onChange={e=>setDateTo(e.target.value)}
          style={{background:"#1a2040",border:"1px solid #2d3561",borderRadius:6,padding:"5px 8px",color:"#e8dcc8",fontSize:12}}/>
        {(dateFrom||dateTo)&&<button onClick={()=>{setDateFrom("");setDateTo("");}}
          style={{background:"#ff3b5c22",border:"1px solid #ff3b5c44",borderRadius:6,padding:"3px 10px",color:"#ff8c9e",fontSize:12,cursor:"pointer"}}>Clear ×</button>}
        <button onClick={handleExportExits}
          style={{marginLeft:"auto",background:"#1a2040",border:"1px solid #2d3561",borderRadius:6,padding:"5px 12px",color:"#6b7a9e",fontSize:12,cursor:"pointer"}}>⬇ Export Exits CSV</button>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:6,marginBottom:18,flexWrap:"wrap"}}>
        {[["overview","📊 Overview"],["trends","📈 Trends"],["risk","⚠️ At Risk"],["exits","🚪 Exits"]].map(([id,label])=>(
          <button key={id} style={tabStyle(tab===id)} onClick={()=>setTab(id)}>{label}</button>
        ))}
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <>
          {/* Summary KPIs */}
          <div style={{display:"grid",gridTemplateColumns:mobile?"1fr 1fr":"repeat(5,1fr)",gap:10,marginBottom:18}}>
            {[
              { label:"Total Ever",      val:s.totalEver??0,      accent:"#e8dcc8" },
              { label:"Active",          val:s.active??0,         accent:"#4cde9f" },
              { label:"Exited",          val:s.exited??0,         accent:"#b48ef5" },
              { label:"Attrition Rate",  val:`${s.attritionRate??0}%`, accent:"#ff3b5c" },
              { label:"High Risk Now",   val:s.riskBreakdown?.high??0, accent:"#f5c518" },
            ].map(k=>(
              <Card key={k.label} style={{borderTop:`3px solid ${k.accent}`,padding:mobile?10:14}}>
                <div style={{fontSize:mobile?24:32,fontWeight:800,color:k.accent,fontFamily:"'Playfair Display',serif"}}>{k.val}</div>
                <div style={{fontSize:11,color:"#e8dcc8",fontWeight:600,marginTop:2}}>{k.label}</div>
              </Card>
            ))}
          </div>

          <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"1fr 1fr",gap:14}}>

            {/* Risk funnel */}
            <Card>
              <SectionTitle>Current Risk Funnel</SectionTitle>
              {[
                { label:"Low Risk",    val:s.riskBreakdown?.low??0,    color:"#4cde9f", pct: s.active ? +(((s.riskBreakdown?.low??0)/s.active)*100).toFixed(0):0 },
                { label:"Medium Risk", val:s.riskBreakdown?.medium??0, color:"#f5c518", pct: s.active ? +(((s.riskBreakdown?.medium??0)/s.active)*100).toFixed(0):0 },
                { label:"High Risk",   val:s.riskBreakdown?.high??0,   color:"#ff3b5c", pct: s.active ? +(((s.riskBreakdown?.high??0)/s.active)*100).toFixed(0):0 },
              ].map(r=>(
                <div key={r.label} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{color:r.color,fontWeight:600,fontSize:13}}>{r.label}</span>
                    <span style={{color:r.color,fontWeight:800,fontSize:15}}>{r.val} <span style={{color:"#6b7a9e",fontSize:11,fontWeight:400}}>({r.pct}%)</span></span>
                  </div>
                  <div style={{height:8,background:"#1e2545",borderRadius:4,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${r.pct}%`,background:r.color,borderRadius:4,transition:"width 0.6s"}}/>
                  </div>
                </div>
              ))}
            </Card>

            {/* Exit reasons pie */}
            <Card>
              <SectionTitle>Exit Reasons</SectionTitle>
              {exitReasons.length === 0
                ? <Empty icon="🚪" text="No exits recorded yet"/>
                : (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={exitReasons} dataKey="count" nameKey="reason" cx="50%" cy="50%"
                          outerRadius={60} innerRadius={30} paddingAngle={3}>
                          {exitReasons.map((e,i)=>(
                            <Cell key={i} fill={EXIT_COLORS[e.reason]||PIE_COLORS[i%PIE_COLORS.length]}/>
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{background:"#0d1225",border:"1px solid #1e2545",borderRadius:8,fontSize:12}}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center"}}>
                      {exitReasons.map((e,i)=>(
                        <div key={e.reason} style={{display:"flex",alignItems:"center",gap:4}}>
                          <div style={{width:8,height:8,borderRadius:"50%",background:EXIT_COLORS[e.reason]||PIE_COLORS[i%PIE_COLORS.length]}}/>
                          <span style={{color:"#c4b8a0",fontSize:11,textTransform:"capitalize"}}>{e.reason.replace("_"," ")} ({e.count})</span>
                        </div>
                      ))}
                    </div>
                  </>
                )
              }
            </Card>

            {/* Risk by department */}
            <Card style={{gridColumn:mobile?"auto":"1 / -1"}}>
              <SectionTitle>Risk by Department</SectionTitle>
              {riskByDept.length === 0
                ? <Empty icon="🏭" text="No data"/>
                : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={riskByDept} margin={{left:0,right:10}}>
                      <CartesianGrid stroke="#1e2545" strokeDasharray="3 3" vertical={false}/>
                      <XAxis dataKey="dept" tick={{fill:"#c4b8a0",fontSize:10}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fill:"#6b7a9e",fontSize:10}} axisLine={false} tickLine={false} width={25}/>
                      <Tooltip contentStyle={{background:"#0d1225",border:"1px solid #1e2545",borderRadius:8,fontSize:12}}/>
                      <Legend wrapperStyle={{fontSize:11,color:"#6b7a9e"}}/>
                      <Bar dataKey="high"   name="High"   stackId="a" fill="#ff3b5c" radius={[0,0,0,0]}/>
                      <Bar dataKey="medium" name="Medium" stackId="a" fill="#f5c518"/>
                      <Bar dataKey="low"    name="Low"    stackId="a" fill="#4cde9f" radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                )
              }
            </Card>
          </div>
        </>
      )}

      {/* ── TRENDS ───────────────────────────────────────────────────────────── */}
      {tab === "trends" && (
        <div style={{display:"grid",gap:14}}>
          {/* Monthly join vs exit */}
          <Card>
            <SectionTitle>Monthly Join vs Exit (Last 12 Months)</SectionTitle>
            {trend.length === 0
              ? <Empty icon="📈" text="No data"/>
              : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={trend} margin={{left:0,right:10}}>
                    <CartesianGrid stroke="#1e2545" strokeDasharray="3 3" vertical={false}/>
                    <XAxis dataKey="label" tick={{fill:"#6b7a9e",fontSize:10}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:"#6b7a9e",fontSize:10}} axisLine={false} tickLine={false} width={25}/>
                    <Tooltip contentStyle={{background:"#0d1225",border:"1px solid #1e2545",borderRadius:8,fontSize:12}}/>
                    <Legend wrapperStyle={{fontSize:11,color:"#6b7a9e"}}/>
                    <Bar dataKey="joined" name="Joined" fill="#4cde9f" radius={[4,4,0,0]}/>
                    <Bar dataKey="exits"  name="Exited" fill="#ff3b5c" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              )
            }
          </Card>

          {/* Tenure at exit */}
          <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"1fr 1fr",gap:14}}>
            <Card>
              <SectionTitle>Tenure at Exit</SectionTitle>
              <p style={{color:"#6b7a9e",fontSize:11,marginBottom:12}}>How long workers stayed before leaving</p>
              {tenureData.every(t=>t.exits===0)
                ? <Empty icon="📅" text="No exit data yet"/>
                : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={tenureData} margin={{left:0,right:10}}>
                      <XAxis dataKey="range" tick={{fill:"#c4b8a0",fontSize:11}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fill:"#6b7a9e",fontSize:10}} axisLine={false} tickLine={false} width={25}/>
                      <Tooltip contentStyle={{background:"#0d1225",border:"1px solid #1e2545",borderRadius:8,fontSize:12}}/>
                      <Bar dataKey="exits" name="Exits" fill="#b48ef5" radius={[4,4,0,0]}>
                        {tenureData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )
              }
            </Card>

            {/* Skills lost */}
            <Card>
              <SectionTitle>Skills Lost to Attrition</SectionTitle>
              <p style={{color:"#6b7a9e",fontSize:11,marginBottom:12}}>High-rated skills (≥7) that left with exited workers</p>
              {lostSkills.length === 0
                ? <Empty icon="💡" text="No skills lost yet"/>
                : lostSkills.map((sk,i)=>(
                  <div key={sk.name} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                    <span style={{color:"#c4b8a0",fontSize:12,width:155,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{sk.name}</span>
                    <div style={{flex:1,height:6,background:"#1e2545",borderRadius:3,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${(sk.count/(lostSkills[0]?.count||1))*100}%`,background:PIE_COLORS[i%PIE_COLORS.length],borderRadius:3}}/>
                    </div>
                    <span style={{color:PIE_COLORS[i%PIE_COLORS.length],fontWeight:700,fontSize:13,width:16,textAlign:"right"}}>{sk.count}</span>
                  </div>
                ))
              }
            </Card>
          </div>
        </div>
      )}

      {/* ── AT RISK ──────────────────────────────────────────────────────────── */}
      {tab === "risk" && (
        <div>
          <p style={{color:"#6b7a9e",fontSize:13,marginBottom:16}}>
            {highRisk.length} workers currently at high attrition risk.
          </p>
          {highRisk.length === 0
            ? <Empty icon="🎉" text="No high-risk workers right now!"/>
            : (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
                {highRisk.map(emp=>(
                  <Card key={emp._id} style={{borderLeft:"3px solid #ff3b5c44"}}>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
                      <Avatar name={emp.name} size={34}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{color:"#e8dcc8",fontWeight:700,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.name}</div>
                        <div style={{color:"#6b7a9e",fontSize:11}}>{emp.role} · {emp.department}</div>
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:10}}>
                      {[
                        ["Tenure",    `${emp.tenureMonths < 12 ? emp.tenureMonths+"mo" : (emp.tenureMonths/12).toFixed(1)+"yr"}`],
                        ["Top Skill", emp.topSkill],
                        ["Joined",    emp.join_date || "—"],
                      ].map(([l,v])=>(
                        <div key={l} style={{background:"#080f20",borderRadius:6,padding:"5px 8px"}}>
                          <div style={{color:"#6b7a9e",fontSize:9,textTransform:"uppercase",letterSpacing:1}}>{l}</div>
                          <div style={{color:"#e8dcc8",fontSize:11,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <Btn small variant="danger" onClick={()=>{ setExitForm({empId:emp._id,name:emp.name}); setTab("exits"); }}>
                        Mark Exited
                      </Btn>
                      <Btn small variant="ghost" onClick={async()=>{
                        try { await updateEmployee(emp._id,{attritionRisk:"low"}); refetchAnalytics(); refetchEmps(); toast("Risk updated"); }
                        catch { toast("Failed","error"); }
                      }}>↓ Lower Risk</Btn>
                    </div>
                  </Card>
                ))}
              </div>
            )
          }
        </div>
      )}

      {/* ── EXITS ────────────────────────────────────────────────────────────── */}
      {tab === "exits" && (
        <div>
          {/* Mark exit form */}
          <Card style={{marginBottom:16,borderColor:"#b48ef5"}}>
            <SectionTitle>Record Worker Exit</SectionTitle>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10,marginBottom:12}}>
              <Field label="Worker">
                <select value={exitForm?.empId||""} onChange={e=>{
                  const emp = activeEmps.find(x=>x._id===e.target.value);
                  setExitForm(emp ? {empId:emp._id,name:emp.name} : null);
                }} style={inputStyle}>
                  <option value="">Select active worker…</option>
                  {activeEmps.map(e=>(
                    <option key={e._id} value={e._id}>{e.name} — {e.department}</option>
                  ))}
                </select>
              </Field>
              <Field label="Exit Date">
                <input type="date" value={exitData.exit_date} max={new Date().toISOString().split("T")[0]}
                  onChange={e=>setExitData(p=>({...p,exit_date:e.target.value}))} style={inputStyle}/>
              </Field>
              <Field label="Reason">
                <select value={exitData.exit_reason} onChange={e=>setExitData(p=>({...p,exit_reason:e.target.value}))} style={inputStyle}>
                  {EXIT_REASONS.map(r=><option key={r} value={r}>{r.replace("_"," ").replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
                </select>
              </Field>
            </div>
            <Btn small onClick={()=>exitForm&&markExited(exitForm.empId)} disabled={saving||!exitForm||!exitData.exit_date}>
              {saving?"Saving…":"Confirm Exit"}
            </Btn>
          </Card>

          {/* Exited workers list */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <SectionTitle>Exited Workers ({exitedEmps.length})</SectionTitle>
          </div>
          {exitedEmps.length === 0
            ? <Empty icon="👋" text="No exited workers recorded"/>
            : (
              <Card style={{padding:0,overflow:"hidden"}}>
                <table>
                  <thead>
                    <tr style={{background:"#080f20",borderBottom:"1px solid #1e2545"}}>
                      {["Worker","Department","Exit Date","Reason","Action"].map(h=>(
                        <th key={h} style={{padding:"10px 14px",textAlign:"left",color:"#6b7a9e",fontSize:10,letterSpacing:1.2,textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {exitedEmps.map((emp,i)=>(
                      <tr key={emp._id} style={{borderBottom:"1px solid #0f1630",background:i%2?"#0a1020":"transparent"}}>
                        <td style={{padding:"10px 14px"}}>
                          <div style={{display:"flex",gap:8,alignItems:"center"}}>
                            <Avatar name={emp.name} size={28}/>
                            <div>
                              <div style={{color:"#e8dcc8",fontWeight:600,fontSize:13}}>{emp.name}</div>
                              <div style={{color:"#6b7a9e",fontSize:10}}>{emp.role}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{padding:"10px 14px",color:"#c4b8a0",fontSize:12}}>{emp.department}</td>
                        <td style={{padding:"10px 14px",color:"#c4b8a0",fontSize:12}}>{emp.exit_date||"—"}</td>
                        <td style={{padding:"10px 14px"}}>
                          <span style={{background:(EXIT_COLORS[emp.exit_reason]||"#6b7a9e")+"22",color:EXIT_COLORS[emp.exit_reason]||"#6b7a9e",borderRadius:4,padding:"2px 8px",fontSize:11,textTransform:"capitalize"}}>
                            {(emp.exit_reason||"other").replace("_"," ")}
                          </span>
                        </td>
                        <td style={{padding:"10px 14px"}}>
                          <Btn small variant="ghost" onClick={()=>markActive(emp._id)}>Reinstate</Btn>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )
          }
        </div>
      )}
    </div>
  );
}
