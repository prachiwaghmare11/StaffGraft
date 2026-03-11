import { useState, useRef } from "react";
import { getAttendance, upsertAttendance, bulkAttendance, importAttendanceCSV } from "../utils/api";
import { useFetch, useBreakpoint } from "../hooks";
import { Card, Btn, Avatar, Spinner, Empty, SC, STATUS_LABELS, SHIFTS, DEPARTMENTS, exportCSV, Tip, toast } from "../components/UI";

export default function Attendance() {
  const mobile = useBreakpoint();
  const [offset, setOffset]     = useState(0);
  const [selected, setSelected] = useState([]);
  const [bulkShift, setBulkShift] = useState("");
  const [deptF, setDeptF]       = useState("All");
  const [statusF, setStatusF]   = useState("all");
  const [shiftF, setShiftF]     = useState("all");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  const d = new Date(); d.setDate(d.getDate() + offset);
  const dateStr = d.toISOString().split("T")[0];

  const { data: records, loading, refetch } = useFetch(
    () => getAttendance(dateStr), [dateStr]
  );

  const shown = (records ?? []).filter(e => {
    const s  = e.attendance?.status || "unset";
    const sh = e.attendance?.shift  || "";
    return (statusF === "all" || s === statusF)
        && (shiftF  === "all" || sh === shiftF)
        && (deptF   === "All" || e.department === deptF);
  });

  const summary = { present_ontime:0, present_late:0, absent:0, assigned:0, unset:0 };
  (records ?? []).forEach(e => { const s = e.attendance?.status||"unset"; summary[s]=(summary[s]||0)+1; });
  const shiftCounts = {};
  (records ?? []).forEach(e => { if (e.attendance?.shift) shiftCounts[e.attendance.shift] = (shiftCounts[e.attendance.shift]||0)+1; });

  async function upsert(empId, patch) {
    try {
      const emp = (records??[]).find(r=>r._id===empId);
      const att = emp?.attendance || {};
      await upsertAttendance({
        employee: empId, date: dateStr,
        status:   patch.status   ?? att.status   ?? "present_ontime",
        shift:    patch.shift    !== undefined ? patch.shift    : (att.shift    || (emp?.shift_preference!=="flexible"?emp?.shift_preference:"")||""),
        checkIn:  patch.checkIn  !== undefined ? patch.checkIn  : (att.checkIn  || ""),
        checkOut: patch.checkOut !== undefined ? patch.checkOut : (att.checkOut || ""),
        overtimeHours: patch.overtimeHours !== undefined ? patch.overtimeHours : (att.overtimeHours || 0),
      });
      refetch();
    } catch (err) { toast(err.response?.data?.message || "Failed to update", "error"); }
  }

  async function markAll(status) {
    const ids = shown.map(e => e._id);
    if (!ids.length) { toast("No workers visible to mark","error"); return; }
    try {
      await bulkAttendance({ employeeIds: ids, date: dateStr, status });
      refetch(); toast(`Marked ${ids.length} workers as ${STATUS_LABELS[status]}`);
    } catch (err) { toast(err.response?.data?.message || "Bulk update failed","error"); }
  }

  async function applyBulkShift() {
    if (!bulkShift) { toast("Select a shift first","error"); return; }
    if (!selected.length) { toast("Select workers first","error"); return; }
    try {
      await bulkAttendance({ employeeIds: selected, date: dateStr, status:"present_ontime", shift: bulkShift });
      refetch(); setSelected([]); setBulkShift("");
      toast(`Shift assigned to ${selected.length} workers`);
    } catch (err) { toast("Failed to assign shift","error"); }
  }

  async function handleCSVImport(e) {
    const file = e.target.files[0]; if (!file) return;
    if (!file.name.match(/\.csv$/i)) { toast("Upload a .csv file only","error"); e.target.value=""; return; }
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await importAttendanceCSV(fd);
      refetch();
      toast(`Imported ${res.data.imported} records${res.data.errors?.length?" — "+res.data.errors.length+" errors":""}`);
    } catch (err) { toast(err.response?.data?.message||"Import failed","error"); }
    finally { setUploading(false); e.target.value=""; }
  }

  function handleExportCSV() {
    const rows = shown.map(e => ({
      employee_id: e.employee_id,
      name: e.name,
      department: e.department,
      shift_preference: e.shift_preference,
      date: dateStr,
      status: e.attendance?.status || "unset",
      shift: e.attendance?.shift || "",
      check_in: e.attendance?.checkIn || "",
      check_out: e.attendance?.checkOut || "",
      overtime_hours: e.attendance?.overtimeHours || 0,
    }));
    exportCSV(rows, `attendance-${dateStr}.csv`);
    toast(`Exported ${rows.length} records`);
  }

  if (loading) return <Spinner />;

  // ── Mobile dropdown selects (compact) ──────────────────────────────────────
  const selStyle = { background:"#1a2040", border:"1px solid #2d3561", borderRadius:6,
    padding:"7px 8px", color:"#e8dcc8", fontSize:13, flex:1 };

  const dotColor = (s) => SC[s] || "#3a4060";

  return (
    <div className="page-enter">

      {/* Date Nav */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <button onClick={()=>setOffset(o=>o-1)} style={{background:"#1a2040",border:"1px solid #2d3561",borderRadius:8,color:"#e8dcc8",cursor:"pointer",padding:"7px 12px",fontSize:18}}>‹</button>
          <div style={{textAlign:"center",minWidth:mobile?120:190}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:mobile?14:20,color:"#e8dcc8",fontWeight:700}}>
              {d.toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"})}
            </div>
            {offset===0&&<div style={{color:"#4cde9f",fontSize:11,fontWeight:600}}>Today</div>}
          </div>
          <button onClick={()=>setOffset(o=>o+1)} style={{background:"#1a2040",border:"1px solid #2d3561",borderRadius:8,color:"#e8dcc8",cursor:"pointer",padding:"7px 12px",fontSize:18}}>›</button>
        </div>
        {/* Summary pills — click to filter */}
        <div style={{display:"flex",gap:8,marginLeft:"auto",flexWrap:"wrap"}}>
          {Object.entries(summary).filter(([,v])=>v>0).map(([k,v])=>(
            <div key={k} style={{textAlign:"center",cursor:"pointer",padding:"2px 6px",borderRadius:6,
              background:statusF===k?SC[k]+"22":"transparent",border:`1px solid ${statusF===k?SC[k]+"55":"transparent"}`}}
              onClick={()=>setStatusF(statusF===k?"all":k)}>
              <div style={{fontSize:mobile?17:21,fontWeight:800,color:SC[k]}}>{v}</div>
              <div style={{fontSize:9,color:SC[k],fontWeight:700}}>{STATUS_LABELS[k]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: compact dropdowns for status + shift + dept */}
      {mobile ? (
        <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
          <select value={statusF} onChange={e=>setStatusF(e.target.value)} style={selStyle}>
            <option value="all">All Status</option>
            {["present_ontime","present_late","absent","assigned","unset"].map(s=>(
              <option key={s} value={s}>{STATUS_LABELS[s]}{summary[s]>0?` (${summary[s]})`:"" }</option>
            ))}
          </select>
          <select value={shiftF} onChange={e=>setShiftF(e.target.value)} style={selStyle}>
            <option value="all">All Shifts</option>
            {SHIFTS.map(s=><option key={s.id} value={s.id}>{s.label}{shiftCounts[s.id]?` (${shiftCounts[s.id]})`:""}</option>)}
          </select>
          <select value={deptF} onChange={e=>setDeptF(e.target.value)} style={selStyle}>
            <option value="All">All Depts</option>
            {DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      ) : (
        /* Desktop: pill filter rows */
        <>
          <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{color:"#6b7a9e",fontSize:12,whiteSpace:"nowrap",minWidth:50}}>Status:</span>
            {[{id:"all",label:"All",color:"#6b7a9e"},"present_ontime","present_late","absent","assigned","unset"].map(s=>{
              const id = typeof s==="string"?s:s.id;
              const label = typeof s==="string"?STATUS_LABELS[id]:s.label;
              const color = typeof s==="string"?SC[id]:"#6b7a9e";
              return (
                <button key={id} onClick={()=>setStatusF(id)} style={{
                  padding:"5px 12px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",border:`1px solid ${color}55`,
                  background:statusF===id?color+"33":"transparent",color:statusF===id?color:"#6b7a9e",
                }}>
                  {label}{id!=="all"&&summary[id]>0?` (${summary[id]})` :""}
                </button>
              );
            })}
          </div>
          <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{color:"#6b7a9e",fontSize:12,whiteSpace:"nowrap",minWidth:50}}>Shift:</span>
            <button onClick={()=>setShiftF("all")} style={{padding:"5px 12px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",border:"1px solid #6b7a9e55",background:shiftF==="all"?"#6b7a9e33":"transparent",color:shiftF==="all"?"#6b7a9e":"#555e80"}}>All</button>
            {SHIFTS.map(s=>(
              <button key={s.id} onClick={()=>setShiftF(s.id)} style={{
                padding:"5px 12px",borderRadius:20,fontSize:12,fontWeight:700,cursor:"pointer",
                border:`1px solid ${s.color}55`,background:shiftF===s.id?s.color+"33":"transparent",color:shiftF===s.id?s.color:"#555e80",
              }}>{s.label}{shiftCounts[s.id]?` (${shiftCounts[s.id]})`:""}</button>
            ))}
          </div>
        </>
      )}

      {/* Controls row */}
      <Card style={{marginBottom:12,padding:10}}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <Btn small variant="success" onClick={()=>markAll("present_ontime")}>✓ On Time</Btn>
          <Btn small variant="ghost"   onClick={()=>markAll("present_late")}>⏰ Late</Btn>
          <Btn small variant="danger"  onClick={()=>markAll("absent")}>✗ Absent</Btn>
          {!mobile && (
            <select value={deptF} onChange={e=>setDeptF(e.target.value)}
              style={{background:"#1a2040",border:"1px solid #2d3561",borderRadius:6,padding:"6px 8px",color:"#e8dcc8",fontSize:13}}>
              <option value="All">All Depts</option>
              {DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}
            </select>
          )}
          {selected.length > 0 && (
            <>
              <select value={bulkShift} onChange={e=>setBulkShift(e.target.value)}
                style={{background:"#1a2040",border:"1px solid #2d3561",borderRadius:6,padding:"6px 8px",color:"#e8dcc8",fontSize:13}}>
                <option value="">Bulk shift…</option>
                {SHIFTS.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
              <Btn small onClick={applyBulkShift}>Apply to {selected.length}</Btn>
              <Btn small variant="ghost" onClick={()=>setSelected([])}>Clear sel.</Btn>
            </>
          )}
          <div style={{marginLeft:"auto",display:"flex",gap:6}}>
            <Btn small variant="ghost" onClick={handleExportCSV}>⬇ Export</Btn>
            <Btn small variant="ghost" onClick={()=>fileRef.current.click()} disabled={uploading}>
              {uploading?"⏳":"📤"} Import
            </Btn>
            <input ref={fileRef} type="file" accept=".csv" style={{display:"none"}} onChange={handleCSVImport}/>
          </div>
        </div>
        <div style={{marginTop:6,fontSize:11,color:"#6b7a9e"}}>
          Showing <strong style={{color:"#e8dcc8"}}>{shown.length}</strong> workers ·
          CSV: <code style={{color:"#60b3f5"}}>employee_id, date, check_in (HH:MM), check_out, shift, overtime_hours</code>
        </div>
      </Card>

      {/* Mobile cards */}
      {mobile ? (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {shown.length===0 && <Empty icon="📋" text="No workers match filter"/>}
          {shown.map(emp => {
            const att = emp.attendance || {};
            const isSel = selected.includes(emp._id);
            return (
              <Card key={emp._id} style={{padding:12,border:`1px solid ${isSel?"#3d5af1":"#1e2545"}`}}>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
                  <input type="checkbox" checked={isSel}
                    onChange={e=>setSelected(p=>e.target.checked?[...p,emp._id]:p.filter(i=>i!==emp._id))}/>
                  <Avatar name={emp.name} size={32}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{color:"#e8dcc8",fontWeight:700,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.name}</div>
                    <div style={{color:"#6b7a9e",fontSize:11}}>{emp.department}</div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2}}>
                    <div style={{width:9,height:9,borderRadius:"50%",background:dotColor(att.status||"unset")}}/>
                    <span style={{color:dotColor(att.status||"unset"),fontSize:10,fontWeight:700}}>{STATUS_LABELS[att.status||"unset"]}</span>
                  </div>
                </div>
                {/* Status buttons */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,marginBottom:8}}>
                  {["present_ontime","present_late","absent","assigned"].map(s=>(
                    <button key={s} onClick={()=>upsert(emp._id,{status:s})} style={{
                      padding:"5px 4px",borderRadius:5,fontSize:11,cursor:"pointer",textAlign:"center",
                      border:`1px solid ${SC[s]}55`,
                      background:(att.status||"unset")===s?SC[s]+"33":"transparent",color:SC[s],fontWeight:600,
                    }}>{STATUS_LABELS[s]}</button>
                  ))}
                </div>
                {/* Shift + Check-in + Check-out */}
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  <select value={att.shift||""} onChange={e=>upsert(emp._id,{shift:e.target.value})} style={{...selStyle,flex:"1 1 90px"}}>
                    <option value="">Shift</option>
                    {SHIFTS.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                  <div style={{display:"flex",flexDirection:"column",gap:2,flex:"1 1 80px"}}>
                    <Tip text="Check-in time (HH:MM)">
                      <input type="time" value={att.checkIn||""} onChange={e=>upsert(emp._id,{checkIn:e.target.value})}
                        style={{background:"#1a2040",border:"1px solid #4cde9f44",borderRadius:5,padding:"5px 6px",color:"#4cde9f",fontSize:12,width:"100%"}}/>
                    </Tip>
                    <Tip text="Check-out time (HH:MM)">
                      <input type="time" value={att.checkOut||""} onChange={e=>upsert(emp._id,{checkOut:e.target.value})}
                        style={{background:"#1a2040",border:"1px solid #ff3b5c44",borderRadius:5,padding:"5px 6px",color:"#ff8c9e",fontSize:12,width:"100%"}}/>
                    </Tip>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Desktop table */
        <Card style={{padding:0,overflow:"hidden"}}>
          <table>
            <thead>
              <tr style={{background:"#080f20",borderBottom:"1px solid #1e2545"}}>
                <th style={{padding:"10px 12px",width:32}}>
                  <input type="checkbox" onChange={e=>setSelected(e.target.checked?shown.map(e=>e._id):[])}/>
                </th>
                {[
                  ["Worker","Worker name and ID"],
                  ["Dept","Department"],
                  ["Shift Pref","Preferred shift from worker profile"],
                  ["Status","Current attendance status"],
                  ["Mark Status","Click to set attendance status"],
                  ["Assign Shift","Set shift for today"],
                  ["Check In","Time worker arrived (HH:MM)"],
                  ["Check Out","Time worker left (HH:MM)"],
                  ["OT Hrs","Overtime hours worked today"],
                ].map(([h,tip])=>(
                  <th key={h} style={{padding:"10px 11px",textAlign:"left",color:"#6b7a9e",fontSize:11,letterSpacing:1.2,textTransform:"uppercase",whiteSpace:"nowrap"}}>
                    <Tip text={tip}>{h}</Tip>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.length===0 && <tr><td colSpan={10} style={{padding:30,textAlign:"center",color:"#6b7a9e",fontSize:14}}>No workers match current filter</td></tr>}
              {shown.map((emp,i)=>{
                const att = emp.attendance || {};
                const shObj = SHIFTS.find(s=>s.id===att.shift);
                return (
                  <tr key={emp._id} style={{borderBottom:"1px solid #0f1630",background:i%2?"#0a1020":"transparent"}}>
                    <td style={{padding:"8px 12px"}}>
                      <input type="checkbox" checked={selected.includes(emp._id)}
                        onChange={e=>setSelected(p=>e.target.checked?[...p,emp._id]:p.filter(i=>i!==emp._id))}/>
                    </td>
                    <td style={{padding:"8px 11px"}}>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <Avatar name={emp.name} size={28}/>
                        <div>
                          <div style={{color:"#e8dcc8",fontWeight:600,fontSize:14}}>{emp.name}</div>
                          <div style={{color:"#6b7a9e",fontSize:11}}>{emp.employee_id} · {emp.role}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{padding:"8px 11px",color:"#c4b8a0",fontSize:13}}>{emp.department}</td>
                    <td style={{padding:"8px 11px"}}>
                      <span style={{background:"#b48ef522",color:"#b48ef5",borderRadius:4,padding:"2px 8px",fontSize:11,fontWeight:700}}>
                        {(emp.shift_preference||"flexible").toUpperCase()}
                      </span>
                    </td>
                    <td style={{padding:"8px 11px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:5}}>
                        <div style={{width:8,height:8,borderRadius:"50%",background:dotColor(att.status||"unset")}}/>
                        <span style={{color:dotColor(att.status||"unset"),fontSize:13,fontWeight:600}}>{STATUS_LABELS[att.status||"unset"]}</span>
                      </div>
                    </td>
                    <td style={{padding:"8px 11px"}}>
                      <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                        {["present_ontime","present_late","absent","assigned"].map(s=>(
                          <button key={s} onClick={()=>upsert(emp._id,{status:s})} style={{
                            padding:"3px 7px",borderRadius:4,fontSize:10,cursor:"pointer",whiteSpace:"nowrap",fontWeight:700,
                            border:`1px solid ${SC[s]}55`,
                            background:(att.status||"unset")===s?SC[s]+"33":"transparent",color:SC[s],
                          }}>{STATUS_LABELS[s]}</button>
                        ))}
                      </div>
                    </td>
                    <td style={{padding:"8px 11px"}}>
                      <select value={att.shift||""} onChange={e=>upsert(emp._id,{shift:e.target.value})}
                        style={{background:"#1a2040",border:`1px solid ${shObj?.color||"#2d3561"}55`,borderRadius:6,
                          padding:"5px 8px",color:shObj?.color||"#e8dcc8",fontSize:12}}>
                        <option value="">No shift</option>
                        {SHIFTS.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
                      </select>
                    </td>
                    <td style={{padding:"8px 11px"}}>
                      <Tip text="Worker's arrival time — auto-derives On Time vs Late status">
                        <input type="time" value={att.checkIn||""} onChange={e=>upsert(emp._id,{checkIn:e.target.value})}
                          style={{background:"#1a2040",border:"1px solid #4cde9f44",borderRadius:6,padding:"5px 8px",color:"#4cde9f",fontSize:12,width:100}}/>
                      </Tip>
                    </td>
                    <td style={{padding:"8px 11px"}}>
                      <Tip text="Worker's departure time — used to calculate total hours worked">
                        <input type="time" value={att.checkOut||""} onChange={e=>upsert(emp._id,{checkOut:e.target.value})}
                          style={{background:"#1a2040",border:"1px solid #ff3b5c44",borderRadius:6,padding:"5px 8px",color:"#ff8c9e",fontSize:12,width:100}}/>
                      </Tip>
                    </td>
                    <td style={{padding:"8px 11px",color:att.overtimeHours>0?"#f5c518":"#3a4060",fontWeight:700,fontSize:14}}>
                      {att.overtimeHours>0?`${att.overtimeHours}h`:"—"}
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
