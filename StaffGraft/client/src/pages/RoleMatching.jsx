import { useState } from "react";
import { getRoles, createRole, updateRole, deleteRole, getRoleMatches, createFeedback, getFeedback } from "../utils/api";
import { useFetch, useBreakpoint } from "../hooks";
import { Card, SectionTitle, Chip, Btn, Avatar, Spinner, Empty, PC, DEPARTMENTS, TEXTILE_SKILLS, inputStyle, Field, toast } from "../components/UI";

const REJECT_REASONS = [
  "Already assigned elsewhere","Skill rating too low for this role",
  "Shift mismatch / unavailable hours","On leave / medical",
  "Needs more training first","Department conflict","Other (specify below)",
];

export default function RoleMatching() {
  const mobile = useBreakpoint();
  const { data: roles,    loading: l1, refetch: refetchRoles }    = useFetch(getRoles, []);
  const { data: feedback, loading: l2, refetch: refetchFeedback } = useFetch(getFeedback, []);

  const [selRole,    setSelRole]    = useState(null);
  const [matches,    setMatches]    = useState(null);
  const [loadingM,   setLoadingM]   = useState(false);
  const [decisions,  setDecisions]  = useState({});
  const [rejecting,  setRejecting]  = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectNote,   setRejectNote]   = useState("");
  const [showFB,     setShowFB]     = useState(false);
  const [newRole,    setNewRole]    = useState(null);
  const [saving,     setSaving]     = useState(false);

  async function selectRole(role) {
    if (selRole?._id === role._id) { setSelRole(null); setMatches(null); return; }
    setSelRole(role); setDecisions({}); setRejecting(null);
    setLoadingM(true);
    try {
      const res = await getRoleMatches(role._id);
      setMatches(res.data);
    } catch { toast("Failed to load matches","error"); }
    finally { setLoadingM(false); }
  }

  async function accept(emp) {
    try {
      await updateRole(selRole._id, { status:"filled", assignedTo: emp._id });
      await createFeedback({ employee: emp._id, role: selRole._id, action:"accept", matchScore: emp.matchScore, skillsSnapshot: emp.skills });
      setDecisions(p=>({...p,[emp._id]:"accept"}));
      refetchRoles(); refetchFeedback();
      toast(`${emp.name} accepted for ${selRole.title}`);
    } catch { toast("Failed","error"); }
  }

  async function confirmReject(emp) {
    if (!rejectReason) { toast("Please select a reason","error"); return; }
    try {
      await createFeedback({ employee: emp._id, role: selRole._id, action:"reject", reason: rejectReason, note: rejectNote, matchScore: emp.matchScore, skillsSnapshot: emp.skills });
      setDecisions(p=>({...p,[emp._id]:"reject"}));
      setRejecting(null);
      refetchFeedback();
      toast("Rejection logged");
    } catch { toast("Failed","error"); }
  }

  async function saveNewRole(e) {
    e.preventDefault(); setSaving(true);
    try {
      await createRole(newRole);
      setNewRole(null); refetchRoles();
      toast("Role created");
    } catch (err) { toast(err.response?.data?.message||"Failed","error"); }
    finally { setSaving(false); }
  }

  async function handleDeleteRole(id) {
    if (!confirm("Delete this role?")) return;
    try { await deleteRole(id); refetchRoles(); toast("Role deleted"); }
    catch { toast("Failed","error"); }
  }

  if (l1) return <Spinner />;

  const currentRoles = roles ?? [];

  return (
    <div className="page-enter">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:"#e8dcc8"}}>Role Matching Engine</h2>
        <div style={{display:"flex",gap:8}}>
          {(feedback?.length??0) > 0 && <Btn small variant="ghost" onClick={()=>setShowFB(!showFB)}>📊 Feedback ({feedback.length})</Btn>}
          <Btn small onClick={()=>setNewRole({title:"",dept:"Production",priority:"medium",deadline:"",requiredSkills:[{name:"",minRating:5}]})}>+ New Role</Btn>
        </div>
      </div>

      {/* Feedback log */}
      {showFB && (
        <Card style={{marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
            <SectionTitle>Rejection Feedback Log</SectionTitle>
            <button onClick={()=>setShowFB(false)} style={{background:"none",border:"none",color:"#6b7a9e",cursor:"pointer",fontSize:18}}>×</button>
          </div>
          {(feedback??[]).filter(f=>f.action==="reject").slice(0,10).map((fb,i)=>(
            <div key={i} style={{background:"#080f20",borderRadius:8,padding:10,marginBottom:8,borderLeft:"3px solid #ff3b5c"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                <span style={{color:"#e8dcc8",fontWeight:600,fontSize:13}}>{fb.employee?.name} → {fb.role?.title}</span>
                <span style={{color:"#6b7a9e",fontSize:10}}>{new Date(fb.createdAt).toLocaleString("en-IN")}</span>
              </div>
              <div style={{color:"#ff8c9e",fontSize:12}}>Reason: {fb.reason}</div>
              {fb.note&&<div style={{color:"#c4b8a0",fontSize:12,marginTop:2}}>Note: {fb.note}</div>}
            </div>
          ))}
        </Card>
      )}

      {/* New role form */}
      {newRole && (
        <Card style={{marginBottom:16,borderColor:"#3d5af1"}}>
          <SectionTitle>Create New Role</SectionTitle>
          <form onSubmit={saveNewRole}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10,marginBottom:12}}>
              <Field label="Title">
                <input required value={newRole.title} onChange={e=>setNewRole(p=>({...p,title:e.target.value}))} style={inputStyle}/>
              </Field>
              <Field label="Deadline">
                <input type="date" value={newRole.deadline} onChange={e=>setNewRole(p=>({...p,deadline:e.target.value}))} style={inputStyle}/>
              </Field>
              <Field label="Department">
                <select value={newRole.dept} onChange={e=>setNewRole(p=>({...p,dept:e.target.value}))} style={inputStyle}>
                  {DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Priority">
                <select value={newRole.priority} onChange={e=>setNewRole(p=>({...p,priority:e.target.value}))} style={inputStyle}>
                  {["critical","high","medium","low"].map(p=><option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
            </div>
            <SectionTitle>Required Skills</SectionTitle>
            {newRole.requiredSkills.map((rs,idx)=>(
              <div key={idx} style={{display:"flex",gap:8,marginBottom:8,alignItems:"center",flexWrap:"wrap"}}>
                <select value={rs.name}
                  onChange={e=>setNewRole(p=>({...p,requiredSkills:p.requiredSkills.map((r,i)=>i===idx?{...r,name:e.target.value}:r)}))}
                  style={{flex:2,minWidth:120,...inputStyle,width:"auto"}}>
                  <option value="">Select skill…</option>
                  {TEXTILE_SKILLS.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
                <span style={{color:"#6b7a9e",fontSize:12}}>Min:</span>
                <input type="number" min={1} max={10} value={rs.minRating}
                  onChange={e=>setNewRole(p=>({...p,requiredSkills:p.requiredSkills.map((r,i)=>i===idx?{...r,minRating:+e.target.value}:r)}))}
                  style={{...inputStyle,width:60,textAlign:"center"}}/>
                <button type="button" onClick={()=>setNewRole(p=>({...p,requiredSkills:p.requiredSkills.filter((_,i)=>i!==idx)}))}
                  style={{background:"none",border:"none",color:"#ff3b5c",cursor:"pointer",fontSize:18}}>×</button>
              </div>
            ))}
            <div style={{display:"flex",gap:8,marginTop:8,flexWrap:"wrap"}}>
              <Btn type="button" small variant="ghost" onClick={()=>setNewRole(p=>({...p,requiredSkills:[...p.requiredSkills,{name:"",minRating:5}]}))}>+ Add Skill Req</Btn>
              <Btn type="submit" small disabled={saving}>{saving?"Saving…":"Create Role"}</Btn>
              <Btn type="button" small variant="ghost" onClick={()=>setNewRole(null)}>Cancel</Btn>
            </div>
          </form>
        </Card>
      )}

      <div style={{display:"grid",gridTemplateColumns:selRole&&!mobile?"1fr 1fr":"1fr",gap:16}}>
        {/* Roles */}
        <div>
          {currentRoles.length===0 && <Empty icon="📋" text="No roles yet. Create one above."/>}
          {currentRoles.map(role=>(
            <div key={role._id}
              onClick={()=>selectRole(role)}
              style={{
                background:selRole?._id===role._id?"#111b3a":"#0d1225",
                border:`1px solid ${selRole?._id===role._id?"#3d5af1":"#1e2545"}`,
                borderLeft:selRole?._id===role._id?"3px solid #3d5af1":undefined,
                borderRadius:12,padding:14,marginBottom:10,cursor:"pointer",transition:"all 0.15s",
              }}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"start",marginBottom:8}}>
                <div>
                  <div style={{color:"#e8dcc8",fontWeight:700,fontSize:14}}>{role.title}</div>
                  <div style={{color:"#6b7a9e",fontSize:11,marginTop:2}}>{role.dept} · {role.deadline||"No deadline"}</div>
                </div>
                <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
                  <Chip text={role.priority.toUpperCase()} color={PC[role.priority]}/>
                  <Chip text={role.status.toUpperCase()} color={role.status==="open"?"#60b3f5":"#4cde9f"}/>
                  <button type="button" onClick={e=>{e.stopPropagation();handleDeleteRole(role._id);}}
                    style={{background:"none",border:"none",color:"#ff3b5c",cursor:"pointer",fontSize:14,padding:2}}>🗑</button>
                </div>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {role.requiredSkills.map(rs=>(
                  <div key={rs.name} style={{background:"#1a2040",borderRadius:5,padding:"2px 8px",fontSize:10,color:"#c4b8a0"}}>
                    {rs.name} ≥{rs.minRating}
                  </div>
                ))}
              </div>
              {selRole?._id===role._id && matches && (
                <div style={{marginTop:8,color:"#4cde9f",fontSize:12}}>{matches.length} candidate(s) found ↓</div>
              )}
            </div>
          ))}
        </div>

        {/* Candidates */}
        {selRole && (
          <div>
            <SectionTitle>Candidates for "{selRole.title}"</SectionTitle>
            {loadingM && <Spinner/>}
            {!loadingM && matches?.length===0 && <Card style={{textAlign:"center",padding:32,color:"#6b7a9e"}}><div style={{fontSize:28,marginBottom:8}}>⚠️</div>No available candidates today.</Card>}
            {!loadingM && (matches??[]).map((emp,rank)=>{
              const dec = decisions[emp._id];
              const isRej = rejecting===emp._id;
              return (
                <Card key={emp._id} style={{
                  marginBottom:12,
                  borderLeft: rank===0&&!dec?"3px solid #4cde9f30":dec==="accept"?"3px solid #4cde9f":dec==="reject"?"3px solid #ff3b5c":undefined,
                  opacity: dec==="reject"?0.55:1, transition:"all 0.2s",
                }}>
                  <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
                    {rank===0&&!dec&&<span>🏆</span>}
                    <Avatar name={emp.name} size={34}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{color:"#e8dcc8",fontWeight:700,fontSize:13}}>{emp.name}</div>
                      <div style={{color:"#6b7a9e",fontSize:11}}>{emp.role} · {emp.department}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{color:"#4cde9f",fontSize:20,fontWeight:800,lineHeight:1}}>{emp.matchScore}</div>
                      <div style={{color:"#6b7a9e",fontSize:10}}>score</div>
                    </div>
                  </div>

                  {selRole.requiredSkills.map(rs=>{
                    const sk = emp.skills.find(s=>s.name===rs.name);
                    return (
                      <div key={rs.name} style={{display:"flex",justifyContent:"space-between",marginBottom:3,fontSize:12}}>
                        <span style={{color:"#c4b8a0"}}>{rs.name}</span>
                        <span style={{color:sk?.rating>=8?"#4cde9f":sk?.rating>=rs.minRating?"#f5c518":"#ff3b5c"}}>
                          {sk?.rating??0}/10 (req ≥{rs.minRating})
                        </span>
                      </div>
                    );
                  })}

                  {!dec && !isRej && (
                    <div style={{display:"flex",gap:8,marginTop:10}}>
                      <Btn variant="success" small onClick={()=>accept(emp)} style={{flex:1}}>✓ Accept</Btn>
                      <Btn variant="danger" small onClick={()=>{setRejecting(emp._id);setRejectReason("");setRejectNote("");}} style={{flex:1}}>✗ Reject</Btn>
                    </div>
                  )}

                  {isRej && (
                    <div style={{marginTop:10,background:"#0a0f1a",borderRadius:8,padding:12,border:"1px solid #ff3b5c33"}}>
                      <div style={{color:"#ff8c9e",fontSize:12,fontWeight:600,marginBottom:8}}>Why reject {emp.name}?</div>
                      {REJECT_REASONS.map(r=>(
                        <label key={r} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:5}}>
                          <input type="radio" name={`rej-${emp._id}`} value={r} checked={rejectReason===r} onChange={()=>setRejectReason(r)}/>
                          <span style={{color:"#c4b8a0",fontSize:12}}>{r}</span>
                        </label>
                      ))}
                      <textarea placeholder="Additional notes…" value={rejectNote} onChange={e=>setRejectNote(e.target.value)}
                        rows={2} style={{width:"100%",background:"#1a2040",border:"1px solid #2d3561",borderRadius:6,
                          padding:"7px 10px",color:"#e8dcc8",fontSize:12,resize:"vertical",marginTop:8}}/>
                      <div style={{display:"flex",gap:8,marginTop:8}}>
                        <Btn variant="danger" small onClick={()=>confirmReject(emp)} style={{flex:1}}>Confirm</Btn>
                        <Btn variant="ghost" small onClick={()=>setRejecting(null)} style={{flex:1}}>Cancel</Btn>
                      </div>
                    </div>
                  )}

                  {dec && (
                    <div style={{marginTop:10}}>
                      <Chip text={dec==="accept"?"✓ ACCEPTED":"✗ REJECTED"} color={dec==="accept"?"#4cde9f":"#ff3b5c"}/>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
