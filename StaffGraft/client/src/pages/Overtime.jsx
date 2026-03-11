import { useState, useRef } from "react";
import {
  getPresentWorkers, getOvertimeManagers, createOvertimeManager, deleteOvertimeManager,
  getOvertimeRequests, createOvertimeRequest, updateOvertimeStatus, importManagersCSV,
} from "../utils/api";
import { useFetch, useBreakpoint } from "../hooks";
import { Card, SectionTitle, Chip, Btn, Avatar, Spinner, Empty, Field, inputStyle, SHIFTS, exportCSV, Tip, toast } from "../components/UI";

const STATUS_COLOR = { pending:"#f5c518", approved:"#4cde9f", rejected:"#ff3b5c" };

export default function Overtime() {
  const mobile = useBreakpoint();
  const [offset, setOffset]         = useState(0);
  const [selWorkers, setSelWorkers]  = useState([]);
  const [selManager, setSelManager]  = useState("");
  const [hours, setHours]            = useState(2);
  const [reason, setReason]          = useState("");
  const [submitting, setSubmitting]  = useState(false);
  const [addMgr, setAddMgr]          = useState(false);
  const [mgrForm, setMgrForm]        = useState({ name:"", email:"", department:"All", phone:"" });
  const [tab, setTab]                = useState("request");
  const [mgrUploading, setMgrUploading] = useState(false);
  const mgrCsvRef = useRef();

  const d = new Date(); d.setDate(d.getDate() + offset);
  const dateStr = d.toISOString().split("T")[0];

  const { data: presentWorkers, loading: lw, refetch: refetchWorkers } = useFetch(() => getPresentWorkers(dateStr), [dateStr]);
  const { data: managers,       loading: lm, refetch: refetchMgrs    } = useFetch(getOvertimeManagers, []);
  const { data: requests,       loading: lr, refetch: refetchReqs    } = useFetch(getOvertimeRequests, []);

  const hasFallback = (presentWorkers||[]).some(w => w._isFallback);

  async function submitRequest() {
    if (!selWorkers.length) { toast("Select at least one worker","error"); return; }
    if (!selManager)        { toast("Select a manager to notify","error"); return; }
    if (!hours || hours < 0.5) { toast("Enter valid overtime hours (min 0.5)","error"); return; }
    setSubmitting(true);
    try {
      await createOvertimeRequest({ date: dateStr, managerId: selManager, workerIds: selWorkers, hours, reason });
      refetchReqs(); refetchWorkers();
      setSelWorkers([]); setReason("");
      toast(`✓ Overtime request sent for ${selWorkers.length} worker(s)`);
    } catch (err) { toast(err.response?.data?.message || "Failed to send request","error"); }
    finally { setSubmitting(false); }
  }

  async function addManager(e) {
    e.preventDefault();
    if (!mgrForm.name.trim()) { toast("Manager name is required","error"); return; }
    if (!mgrForm.email.trim()) { toast("Manager email is required","error"); return; }
    try {
      await createOvertimeManager(mgrForm);
      refetchMgrs(); setAddMgr(false);
      setMgrForm({ name:"", email:"", department:"All", phone:"" });
      toast("Manager added");
    } catch (err) { toast(err.response?.data?.message || "Failed to add manager","error"); }
  }

  async function removeMgr(id, name) {
    if (!confirm(`Remove manager "${name}"?`)) return;
    try { await deleteOvertimeManager(id); refetchMgrs(); toast("Manager removed"); }
    catch { toast("Failed to remove","error"); }
  }

  async function handleMgrCSV(e) {
    const file = e.target.files[0]; if (!file) return;
    if (!file.name.match(/\.csv$/i)) { toast("Upload a .csv file","error"); e.target.value=""; return; }
    setMgrUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await importManagersCSV(fd);
      refetchMgrs();
      toast(`Imported ${res.data.added} managers${res.data.errors?.length?" — "+res.data.errors.length+" errors":""}`);
    } catch (err) { toast(err.response?.data?.message || "Import failed","error"); }
    finally { setMgrUploading(false); e.target.value=""; }
  }

  function exportRequestsCSV() {
    const rows = (requests||[]).map(r => ({
      date: r.date,
      status: r.status,
      hours: r.hours,
      worker_count: r.workers?.length||0,
      workers: (r.workers||[]).map(w=>w.name).join("; "),
      manager: r.manager?.name || "",
      manager_email: r.manager?.email || "",
      reason: r.reason || "",
      created: new Date(r.createdAt).toLocaleString("en-IN"),
    }));
    exportCSV(rows, `overtime-requests-export.csv`);
    toast(`Exported ${rows.length} requests`);
  }

  const selectedMgr = (managers||[]).find(m=>m._id===selManager);
  const totalOTHours = selWorkers.length * hours;

  const tabStyle = (active) => ({
    padding:"7px 16px", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:600,
    background: active ? "#3d5af133" : "transparent",
    color: active ? "#3d5af1" : "#6b7a9e",
    border: `1px solid ${active ? "#3d5af155" : "#1e2545"}`,
  });

  return (
    <div className="page-enter">
      {/* Date Nav */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,flexWrap:"wrap"}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <button onClick={()=>setOffset(o=>o-1)} style={{background:"#1a2040",border:"1px solid #2d3561",borderRadius:8,color:"#e8dcc8",cursor:"pointer",padding:"6px 12px",fontSize:18}}>‹</button>
          <div style={{textAlign:"center",minWidth:150}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:18,color:"#e8dcc8",fontWeight:700}}>
              {d.toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})}
            </div>
            {offset===0&&<div style={{color:"#4cde9f",fontSize:11,fontWeight:600}}>Today</div>}
          </div>
          <button onClick={()=>setOffset(o=>o+1)} style={{background:"#1a2040",border:"1px solid #2d3561",borderRadius:8,color:"#e8dcc8",cursor:"pointer",padding:"6px 12px",fontSize:18}}>›</button>
        </div>
        <div style={{display:"flex",gap:6,marginLeft:"auto",flexWrap:"wrap"}}>
          <button style={tabStyle(tab==="request")}  onClick={()=>setTab("request")}>📋 New Request</button>
          <button style={tabStyle(tab==="history")}  onClick={()=>setTab("history")}>📜 History</button>
          <button style={tabStyle(tab==="managers")} onClick={()=>setTab("managers")}>👔 Managers</button>
        </div>
      </div>

      {/* ── NEW REQUEST ─────────────────────────────────────────────────────── */}
      {tab === "request" && (
        <div style={{display:"grid",gridTemplateColumns:mobile?"1fr":"1fr 380px",gap:16,alignItems:"start"}}>
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <SectionTitle style={{margin:0}}>
                {hasFallback ? "All Workers (no attendance marked yet)" : `Present Workers — ${dateStr}`}
              </SectionTitle>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                {selWorkers.length>0&&<span style={{color:"#f5c518",fontSize:13,fontWeight:700}}>{selWorkers.length} selected</span>}
                {selWorkers.length>0&&<Btn small variant="ghost" onClick={()=>setSelWorkers([])}>Clear</Btn>}
                <Btn small variant="ghost" onClick={()=>setSelWorkers((presentWorkers||[]).map(e=>e._id))}>Select All</Btn>
              </div>
            </div>

            {hasFallback && (
              <div style={{background:"#1a1a08",border:"1px solid #f5c51844",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13,color:"#f5c518"}}>
                ⚠️ No workers marked present for this date yet. Showing all active workers so you can still submit an overtime request. Mark attendance first for accurate records.
              </div>
            )}

            {lw && <Spinner/>}
            {!lw && (presentWorkers||[]).length===0 && <Empty icon="🏭" text="No workers found"/>}

            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:10}}>
              {(presentWorkers||[]).map(emp=>{
                const sel = selWorkers.includes(emp._id);
                const shObj = SHIFTS.find(s=>s.id===emp.attendance?.shift);
                return (
                  <div key={emp._id} onClick={()=>setSelWorkers(p=>sel?p.filter(i=>i!==emp._id):[...p,emp._id])}
                    style={{
                      background:sel?"#111b3a":"#0d1225",
                      border:`1px solid ${sel?"#3d5af1":"#1e2545"}`,
                      borderRadius:10,padding:12,cursor:"pointer",transition:"all 0.15s",
                    }}>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <div style={{width:18,height:18,borderRadius:4,background:sel?"#3d5af1":"#1a2040",
                        border:`2px solid ${sel?"#3d5af1":"#2d3561"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {sel&&<span style={{color:"#fff",fontSize:11,fontWeight:700}}>✓</span>}
                      </div>
                      <Avatar name={emp.name} size={30}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{color:"#e8dcc8",fontWeight:600,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.name}</div>
                        <div style={{color:"#6b7a9e",fontSize:11}}>{emp.role} · {emp.department}</div>
                      </div>
                    </div>
                    <div style={{display:"flex",gap:6,marginTop:8,alignItems:"center",flexWrap:"wrap"}}>
                      {shObj&&<span style={{background:shObj.color+"22",color:shObj.color,borderRadius:4,padding:"2px 7px",fontSize:10,fontWeight:700}}>{shObj.label}</span>}
                      {emp.attendance?.checkIn&&<span style={{color:"#6b7a9e",fontSize:11}}>In: {emp.attendance.checkIn}</span>}
                      {emp.attendance?.overtimeHours>0&&<span style={{color:"#f5c518",fontSize:11}}>OT: {emp.attendance.overtimeHours}h</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Request form */}
          <div style={{position:mobile?"static":"sticky",top:20}}>
            <Card>
              <SectionTitle>Overtime Request Details</SectionTitle>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:16}}>
                <div style={{background:"#080f20",borderRadius:8,padding:"10px 14px",textAlign:"center"}}>
                  <div style={{fontSize:30,fontWeight:800,color:"#3d5af1"}}>{selWorkers.length}</div>
                  <div style={{fontSize:12,color:"#6b7a9e"}}>Workers Selected</div>
                </div>
                <div style={{background:"#080f20",borderRadius:8,padding:"10px 14px",textAlign:"center"}}>
                  <div style={{fontSize:30,fontWeight:800,color:"#f5c518"}}>{totalOTHours.toFixed(1)}</div>
                  <div style={{fontSize:12,color:"#6b7a9e"}}>Total OT Hours</div>
                </div>
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <Field label="Hours per Worker" tip="Overtime hours each selected worker will work">
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <input type="range" min={0.5} max={12} step={0.5} value={hours}
                      onChange={e=>setHours(+e.target.value)} style={{flex:1}}/>
                    <span style={{color:"#f5c518",fontWeight:800,fontSize:20,minWidth:38}}>{hours}h</span>
                  </div>
                </Field>

                <Field label="Notify Manager *" tip="The manager who will approve this overtime request. Add managers in the Managers tab.">
                  <select value={selManager} onChange={e=>setSelManager(e.target.value)} style={inputStyle}>
                    <option value="">Select manager…</option>
                    {(managers||[]).map(m=>(
                      <option key={m._id} value={m._id}>{m.name} — {m.email}</option>
                    ))}
                  </select>
                  {!(managers||[]).length&&(
                    <div style={{color:"#f5c518",fontSize:12,marginTop:4}}>⚠️ No managers added yet — go to the Managers tab to add one.</div>
                  )}
                </Field>

                {selectedMgr && (
                  <div style={{background:"#080f20",borderRadius:8,padding:12,border:"1px solid #3d5af133"}}>
                    <div style={{color:"#e8dcc8",fontWeight:700,fontSize:14}}>{selectedMgr.name}</div>
                    <div style={{color:"#60b3f5",fontSize:13,marginTop:2}}>📧 {selectedMgr.email}</div>
                    {selectedMgr.phone&&<div style={{color:"#6b7a9e",fontSize:12,marginTop:1}}>📞 {selectedMgr.phone}</div>}
                    <div style={{color:"#6b7a9e",fontSize:11,marginTop:6,borderTop:"1px solid #1a2040",paddingTop:6}}>
                      Request will list: {selWorkers.length} worker(s), {hours}h OT, date {dateStr}
                    </div>
                  </div>
                )}

                <Field label="Reason for Overtime" tip="Describe why overtime is needed — e.g. production deadline, urgent order, machine breakdown cover">
                  <textarea value={reason} onChange={e=>setReason(e.target.value)} rows={3}
                    placeholder="Production deadline, urgent bulk order…"
                    style={{...inputStyle,resize:"vertical"}}/>
                </Field>

                <Btn onClick={submitRequest} disabled={submitting||!selWorkers.length||!selManager} style={{width:"100%",padding:"12px"}}>
                  {submitting?"Sending Request…":"📤 Send Overtime Request"}
                </Btn>
                {!selWorkers.length&&<div style={{color:"#6b7a9e",fontSize:12,textAlign:"center"}}>← Select workers from the list</div>}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── HISTORY ─────────────────────────────────────────────────────────── */}
      {tab === "history" && (
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <span style={{color:"#6b7a9e",fontSize:13}}>{(requests||[]).length} requests total</span>
            <Btn small variant="ghost" onClick={exportRequestsCSV}>⬇ Export CSV</Btn>
          </div>
          {lr&&<Spinner/>}
          {!lr&&!(requests||[]).length&&<Empty icon="📋" text="No overtime requests yet"/>}
          {(requests||[]).map(req=>(
            <Card key={req._id} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"start",flexWrap:"wrap",gap:8,marginBottom:10}}>
                <div>
                  <div style={{color:"#e8dcc8",fontWeight:700,fontSize:15}}>
                    {new Date(req.date+"T00:00:00").toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"})}
                    &nbsp;· {req.hours}h OT · {req.workers?.length||0} workers
                  </div>
                  <div style={{color:"#6b7a9e",fontSize:12,marginTop:2}}>
                    Requested by {req.requestedBy?.name || "—"} · {new Date(req.createdAt).toLocaleString("en-IN")}
                  </div>
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                  <Chip text={req.status.toUpperCase()} color={STATUS_COLOR[req.status]}/>
                  {req.status==="pending"&&(
                    <>
                      <Btn small variant="success" onClick={()=>updateOvertimeStatus(req._id,"approved").then(()=>{refetchReqs();toast("Approved");}).catch(()=>toast("Failed","error"))}>✓ Approve</Btn>
                      <Btn small variant="danger"  onClick={()=>updateOvertimeStatus(req._id,"rejected").then(()=>{refetchReqs();toast("Rejected");}).catch(()=>toast("Failed","error"))}>✗ Reject</Btn>
                    </>
                  )}
                </div>
              </div>
              {req.manager&&(
                <div style={{background:"#080f20",borderRadius:8,padding:"8px 12px",marginBottom:8,border:"1px solid #3d5af133"}}>
                  <span style={{color:"#6b7a9e",fontSize:12}}>Manager: </span>
                  <span style={{color:"#e8dcc8",fontWeight:600,fontSize:13}}>{req.manager.name}</span>
                  <span style={{color:"#60b3f5",fontSize:12}}> · {req.manager.email}</span>
                </div>
              )}
              {req.reason&&<div style={{color:"#c4b8a0",fontSize:13,marginBottom:8,fontStyle:"italic"}}>"{req.reason}"</div>}
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {(req.workers||[]).map(w=>(
                  <div key={w._id} style={{background:"#1a2040",borderRadius:6,padding:"3px 10px",fontSize:12,color:"#c4b8a0"}}>
                    {w.name} <span style={{color:"#6b7a9e"}}>· {w.department}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── MANAGERS ────────────────────────────────────────────────────────── */}
      {tab === "managers" && (
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
            <p style={{color:"#6b7a9e",fontSize:13}}>
              Managers receive overtime requests. Add manually or upload CSV with columns: <code style={{color:"#60b3f5"}}>name, email, department, phone</code>
            </p>
            <div style={{display:"flex",gap:6}}>
              <Btn small variant="ghost" onClick={()=>mgrCsvRef.current.click()} disabled={mgrUploading}>
                {mgrUploading?"⏳":"📤"} Upload CSV
              </Btn>
              <input ref={mgrCsvRef} type="file" accept=".csv" style={{display:"none"}} onChange={handleMgrCSV}/>
              <Btn small onClick={()=>setAddMgr(!addMgr)}>+ Add Manager</Btn>
            </div>
          </div>

          {addMgr&&(
            <Card style={{marginBottom:16,borderColor:"#3d5af1"}}>
              <SectionTitle>New Manager</SectionTitle>
              <form onSubmit={addManager}>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10,marginBottom:12}}>
                  <Field label="Full Name *" tip="Manager's name as it should appear on requests">
                    <input required value={mgrForm.name} onChange={e=>setMgrForm(p=>({...p,name:e.target.value}))} style={inputStyle}/>
                  </Field>
                  <Field label="Email *" tip="Email address where overtime requests will be sent">
                    <input required type="email" value={mgrForm.email} onChange={e=>setMgrForm(p=>({...p,email:e.target.value}))} style={inputStyle}/>
                  </Field>
                  <Field label="Phone" tip="Optional contact number">
                    <input value={mgrForm.phone} onChange={e=>setMgrForm(p=>({...p,phone:e.target.value}))} style={inputStyle}/>
                  </Field>
                  <Field label="Department" tip="Department this manager oversees. Use 'All' for cross-department managers.">
                    <input value={mgrForm.department} onChange={e=>setMgrForm(p=>({...p,department:e.target.value}))} style={inputStyle} placeholder="All"/>
                  </Field>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <Btn type="submit" small>Save Manager</Btn>
                  <Btn type="button" small variant="ghost" onClick={()=>setAddMgr(false)}>Cancel</Btn>
                </div>
              </form>
            </Card>
          )}

          {lm&&<Spinner/>}
          {!lm&&!(managers||[]).length&&<Empty icon="👔" text="No managers added yet. Add one above or upload CSV."/>}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
            {(managers||[]).map(m=>(
              <Card key={m._id} style={{borderLeft:"3px solid #3d5af144"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"start"}}>
                  <div>
                    <div style={{color:"#e8dcc8",fontWeight:700,fontSize:15}}>{m.name}</div>
                    <div style={{color:"#60b3f5",fontSize:13,marginTop:3}}>📧 {m.email}</div>
                    {m.phone&&<div style={{color:"#6b7a9e",fontSize:12,marginTop:2}}>📞 {m.phone}</div>}
                    <div style={{color:"#6b7a9e",fontSize:12,marginTop:4}}>Dept: {m.department||"All"}</div>
                  </div>
                  <button onClick={()=>removeMgr(m._id,m.name)}
                    style={{background:"none",border:"none",color:"#ff3b5c",cursor:"pointer",fontSize:17,padding:2}}>🗑</button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
