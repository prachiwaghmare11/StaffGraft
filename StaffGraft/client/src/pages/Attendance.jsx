import { useState } from "react";
import { getAttendance, upsertAttendance, bulkAttendance } from "../utils/api";
import { useFetch, useBreakpoint } from "../hooks";
import { Card, Chip, Btn, Avatar, Spinner, Empty, SC, SHIFTS, DEPARTMENTS, toast } from "../components/UI";

export default function Attendance() {
  const mobile = useBreakpoint();
  const [offset, setOffset]   = useState(0);
  const [selected, setSelected] = useState([]);
  const [bulkShift, setBulkShift] = useState("");
  const [deptF, setDeptF]     = useState("All");

  const d = new Date(); d.setDate(d.getDate() + offset);
  const dateStr = d.toISOString().split("T")[0];

  const { data: records, loading, refetch } = useFetch(() => getAttendance(dateStr), [dateStr]);

  const shown = (records ?? []).filter(e => deptF === "All" || e.department === deptF);

  async function setStatus(empId, status) {
    try {
      await upsertAttendance({ employee: empId, date: dateStr, status });
      refetch();
    } catch { toast("Failed to update attendance","error"); }
  }

  async function setShift(empId, shift, currentStatus) {
    try {
      await upsertAttendance({ employee: empId, date: dateStr, status: currentStatus || "present", shift });
      refetch();
    } catch { toast("Failed to update shift","error"); }
  }

  async function markAll(status) {
    const ids = shown.map(e => e._id);
    try {
      await bulkAttendance({ employeeIds: ids, date: dateStr, status });
      refetch();
      toast(`Marked ${ids.length} as ${status}`);
    } catch { toast("Bulk update failed","error"); }
  }

  async function applyBulkShift() {
    if (!bulkShift || selected.length === 0) return;
    try {
      await bulkAttendance({ employeeIds: selected, date: dateStr, status: "present", shift: bulkShift });
      refetch(); setSelected([]); setBulkShift("");
      toast(`Shift assigned to ${selected.length} workers`);
    } catch { toast("Failed","error"); }
  }

  const summary = { present:0, absent:0, assigned:0, unset:0 };
  (records ?? []).forEach(e => { summary[e.attendance?.status || "unset"]++; });
  const shiftCounts = {};
  (records ?? []).forEach(e => { if (e.attendance?.shift) shiftCounts[e.attendance.shift] = (shiftCounts[e.attendance.shift]||0)+1; });

  if (loading) return <Spinner />;

  return (
    <div className="page-enter">
      {/* Date Nav */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={()=>setOffset(o=>o-1)} style={{background:"#1a2040",border:"1px solid #2d3561",borderRadius:8,color:"#e8dcc8",cursor:"pointer",padding:"7px 12px",fontSize:16}}>‹</button>
          <div style={{textAlign:"center",minWidth:mobile?140:200}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:mobile?16:20,color:"#e8dcc8",fontWeight:700}}>
              {d.toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"})}
            </div>
            {offset===0&&<div style={{color:"#4cde9f",fontSize:11}}>Today</div>}
          </div>
          <button onClick={()=>setOffset(o=>o+1)} style={{background:"#1a2040",border:"1px solid #2d3561",borderRadius:8,color:"#e8dcc8",cursor:"pointer",padding:"7px 12px",fontSize:16}}>›</button>
        </div>
        <div style={{display:"flex",gap:14,marginLeft:"auto",flexWrap:"wrap"}}>
          {Object.entries(summary).map(([k,v])=>(
            <div key={k} style={{textAlign:"center"}}>
              <div style={{fontSize:20,fontWeight:800,color:SC[k]}}>{v}</div>
              <div style={{fontSize:10,color:"#6b7a9e",textTransform:"capitalize"}}>{k}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Shift summary */}
      <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {SHIFTS.map(sh=>(
          <div key={sh.id} style={{background:"#0d1225",border:`1px solid ${sh.color}44`,borderRadius:8,padding:"8px 14px",display:"flex",gap:8,alignItems:"center"}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:sh.color}}/>
            <span style={{color:"#c4b8a0",fontSize:12}}>{sh.label}</span>
            <span style={{color:sh.color,fontWeight:700,fontSize:16}}>{shiftCounts[sh.id]||0}</span>
          </div>
        ))}
      </div>

      {/* Bulk controls */}
      <Card style={{marginBottom:14,padding:12}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{color:"#6b7a9e",fontSize:12,whiteSpace:"nowrap"}}>Quick:</span>
          <Btn small variant="success" onClick={()=>markAll("present")}>✓ All Present</Btn>
          <Btn small variant="danger" onClick={()=>markAll("absent")}>✗ All Absent</Btn>
          <select value={deptF} onChange={e=>setDeptF(e.target.value)}
            style={{background:"#1a2040",border:"1px solid #2d3561",borderRadius:6,padding:"5px 8px",color:"#e8dcc8",fontSize:12}}>
            <option value="All">All Depts</option>
            {DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}
          </select>
          {selected.length > 0 && (
            <>
              <select value={bulkShift} onChange={e=>setBulkShift(e.target.value)}
                style={{background:"#1a2040",border:"1px solid #2d3561",borderRadius:6,padding:"5px 8px",color:"#e8dcc8",fontSize:12}}>
                <option value="">Assign shift…</option>
                {SHIFTS.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <Btn small onClick={applyBulkShift}>Apply to {selected.length}</Btn>
              <Btn small variant="ghost" onClick={()=>setSelected([])}>Clear</Btn>
            </>
          )}
        </div>
      </Card>

      {/* Table (desktop) / Cards (mobile) */}
      {mobile ? (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {shown.length===0 && <Empty icon="📋" text="No workers"/>}
          {shown.map(emp => {
            const att = emp.attendance || {};
            return (
              <Card key={emp._id} style={{padding:12}}>
                <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
                  <input type="checkbox" checked={selected.includes(emp._id)}
                    onChange={e=>setSelected(p=>e.target.checked?[...p,emp._id]:p.filter(i=>i!==emp._id))}/>
                  <Avatar name={emp.name} size={34}/>
                  <div style={{flex:1}}>
                    <div style={{color:"#e8dcc8",fontWeight:600,fontSize:13}}>{emp.name}</div>
                    <div style={{color:"#6b7a9e",fontSize:11}}>{emp.department}</div>
                  </div>
                  <div style={{width:8,height:8,borderRadius:"50%",background:SC[att.status||"unset"]}}/>
                </div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {["present","absent","assigned"].map(s=>(
                    <button key={s} onClick={()=>setStatus(emp._id,s)} style={{
                      padding:"4px 8px",borderRadius:5,fontSize:11,cursor:"pointer",
                      border:`1px solid ${SC[s]}55`,
                      background:(att.status||"unset")===s?SC[s]+"33":"transparent",color:SC[s],
                    }}>{s}</button>
                  ))}
                  <select value={att.shift||""} onChange={e=>setShift(emp._id,e.target.value,att.status)}
                    style={{flex:1,background:"#1a2040",border:"1px solid #2d3561",borderRadius:5,padding:"4px 6px",color:"#e8dcc8",fontSize:11}}>
                    <option value="">No shift</option>
                    {SHIFTS.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card style={{padding:0,overflow:"hidden"}}>
          <table>
            <thead>
              <tr style={{background:"#080f20",borderBottom:"1px solid #1e2545"}}>
                <th style={{padding:"10px 14px",width:32}}>
                  <input type="checkbox" onChange={e=>setSelected(e.target.checked?shown.map(e=>e._id):[])}/>
                </th>
                {["Worker","Department","Shift Pref","Status","Mark Attendance","Assign Shift"].map(h=>(
                  <th key={h} style={{padding:"10px 14px",textAlign:"left",color:"#6b7a9e",fontSize:11,letterSpacing:1.5,textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.length===0 && <tr><td colSpan={7} style={{padding:30,textAlign:"center",color:"#6b7a9e"}}>No workers found</td></tr>}
              {shown.map((emp,i)=>{
                const att = emp.attendance || {};
                const shObj = SHIFTS.find(s=>s.id===att.shift);
                return (
                  <tr key={emp._id} style={{borderBottom:"1px solid #0f1630",background:i%2?"#0a1020":"transparent"}}>
                    <td style={{padding:"10px 14px"}}>
                      <input type="checkbox" checked={selected.includes(emp._id)}
                        onChange={e=>setSelected(p=>e.target.checked?[...p,emp._id]:p.filter(i=>i!==emp._id))}/>
                    </td>
                    <td style={{padding:"10px 14px"}}>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <Avatar name={emp.name} size={30}/>
                        <div>
                          <div style={{color:"#e8dcc8",fontWeight:600,fontSize:13}}>{emp.name}</div>
                          <div style={{color:"#6b7a9e",fontSize:10}}>{emp.employee_id} · {emp.role}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{padding:"10px 14px",color:"#c4b8a0",fontSize:12}}>{emp.department}</td>
                    <td style={{padding:"10px 14px"}}>
                      <Chip text={(emp.shift_preference||"flexible").toUpperCase()} color="#b48ef5"/>
                    </td>
                    <td style={{padding:"10px 14px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:5}}>
                        <div style={{width:7,height:7,borderRadius:"50%",background:SC[att.status||"unset"]}}/>
                        <span style={{color:SC[att.status||"unset"],fontSize:12,textTransform:"capitalize"}}>{att.status||"unset"}</span>
                      </div>
                    </td>
                    <td style={{padding:"10px 14px"}}>
                      <div style={{display:"flex",gap:4}}>
                        {["present","absent","assigned"].map(s=>(
                          <button key={s} onClick={()=>setStatus(emp._id,s)} style={{
                            padding:"3px 8px",borderRadius:5,fontSize:10,cursor:"pointer",
                            border:`1px solid ${SC[s]}55`,
                            background:(att.status||"unset")===s?SC[s]+"33":"transparent",color:SC[s],
                          }}>{s}</button>
                        ))}
                      </div>
                    </td>
                    <td style={{padding:"10px 14px"}}>
                      <select value={att.shift||""} onChange={e=>setShift(emp._id,e.target.value,att.status)}
                        style={{background:"#1a2040",border:`1px solid ${shObj?.color||"#2d3561"}55`,borderRadius:6,
                          padding:"4px 8px",color:shObj?.color||"#e8dcc8",fontSize:12}}>
                        <option value="">No shift</option>
                        {SHIFTS.map(s=><option key={s.id} value={s.id}>{s.label} ({s.time})</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
