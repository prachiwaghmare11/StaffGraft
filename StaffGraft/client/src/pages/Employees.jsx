import { useState, useRef } from "react";
import { getEmployees, updateEmployee, updateSkill, deleteEmployee, uploadCSV, createEmployee } from "../utils/api";
import { useFetch, useBreakpoint } from "../hooks";
import { Avatar, Card, SectionTitle, Chip, Btn, SkillBar, Field, inputStyle, Spinner, Empty, RC, DEPARTMENTS, TEXTILE_SKILLS, SHIFTS, getSkillLevel, exportCSV, Tip, toast } from "../components/UI";

const BLANK_EMP = {
  employee_id:"", name:"", gender:"", age:"", phone:"",
  department:"Production", role:"", join_date:"", shift_preference:"flexible",
  attritionRisk:"low", skills:[],
};

export default function Employees() {
  const mobile = useBreakpoint();
  const { data: employees, loading, refetch } = useFetch(() => getEmployees(), []);
  const [search, setSearch]       = useState("");
  const [deptF,  setDeptF]        = useState("All");
  const [skillF, setSkillF]       = useState(""); // skill search filter
  const [selected, setSelected]   = useState(null);
  const [editSkill, setEditSkill] = useState(false);
  const [newSkill,  setNewSkill]  = useState({ name:"", rating:5 });
  const [addOpen, setAddOpen]     = useState(false);
  const [addForm, setAddForm]     = useState(BLANK_EMP);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [saving, setSaving]       = useState(false);
  const fileRef = useRef();

  const filtered = (employees ?? []).filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.name.toLowerCase().includes(q) || e.employee_id.toLowerCase().includes(q) || e.role?.toLowerCase().includes(q);
    const matchDept   = deptF === "All" || e.department === deptF;
    const matchSkill  = !skillF || e.skills.some(s => s.name.toLowerCase().includes(skillF.toLowerCase()));
    return matchSearch && matchDept && matchSkill;
  });

  async function saveSkillUpdate(empId, name, rating) {
    // Check for duplicate before adding
    const emp = (employees ?? []).find(e => e._id === empId);
    const existing = emp?.skills.find(s => s.name === name);
    if (!existing && emp?.skills.find(s => s.name.toLowerCase() === name.toLowerCase())) {
      toast("Skill already exists for this worker (duplicate)", "error"); return;
    }
    try {
      await updateSkill(empId, { name, rating });
      refetch();
      setSelected(prev => prev ? { ...prev, skills: prev.skills.map(s => s.name===name ? {...s,rating} : s) } : prev);
    } catch (err) {
      toast(err.response?.data?.message || "Failed to update skill", "error");
    }
  }

  async function addSkill(empId) {
    if (!newSkill.name) { toast("Please select a skill", "error"); return; }
    const emp = (employees ?? []).find(e => e._id === empId);
    if (emp?.skills.find(s => s.name === newSkill.name)) {
      toast(`"${newSkill.name}" is already added for this worker`, "error"); return;
    }
    await saveSkillUpdate(empId, newSkill.name, newSkill.rating);
    setNewSkill({ name:"", rating:5 });
  }

  async function removeSkill(emp, skillName) {
    if (!confirm(`Remove skill "${skillName}" from ${emp.name}?`)) return;
    const updated = emp.skills.filter(s => s.name !== skillName);
    try {
      await updateEmployee(emp._id, { skills: updated });
      refetch();
      setSelected(prev => prev ? { ...prev, skills: updated } : prev);
      toast(`Removed "${skillName}"`);
    } catch (err) {
      toast(err.response?.data?.message || "Failed to remove skill", "error");
    }
  }

  async function saveAttrition(empId, risk) {
    try {
      await updateEmployee(empId, { attritionRisk: risk });
      refetch();
      setSelected(prev => prev ? { ...prev, attritionRisk: risk } : prev);
      toast("Attrition risk updated");
    } catch (err) { toast(err.response?.data?.message || "Failed to update", "error"); }
  }

  async function handleDelete(empId) {
    if (!confirm("Delete this employee permanently? This cannot be undone.")) return;
    try {
      await deleteEmployee(empId);
      setSelected(null); refetch();
      toast("Employee deleted");
    } catch (err) { toast(err.response?.data?.message || "Failed to delete", "error"); }
  }

  async function handleAdd(e) {
    e.preventDefault(); setSaving(true);
    try {
      if (!addForm.name.trim()) { toast("Worker name is required", "error"); setSaving(false); return; }
      if (!addForm.role.trim()) { toast("Role is required", "error"); setSaving(false); return; }
      await createEmployee({ ...addForm, age: addForm.age ? +addForm.age : null, skills:[] });
      refetch(); setAddOpen(false); setAddForm(BLANK_EMP);
      toast("Worker added successfully");
    } catch (err) {
      toast(err.response?.data?.message || "Failed to add worker", "error");
    } finally { setSaving(false); }
  }

  async function handleCSV(e) {
    const file = e.target.files[0]; if (!file) return;
    if (!file.name.match(/\.csv$/i)) { toast("Please upload a .csv file — other formats not supported","error"); e.target.value=""; return; }
    setUploadStatus("reading");
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await uploadCSV(fd);
      setUploadStatus(res.data); refetch();
      toast(`✓ Added ${res.data.added} workers, updated ${res.data.updated}`);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "CSV import failed";
      setUploadStatus({ error: msg });
      toast(msg, "error");
    }
    e.target.value="";
  }

  function handleExportCSV() {
    const rows = filtered.map(e => ({
      employee_id: e.employee_id,
      name: e.name,
      department: e.department,
      role: e.role,
      gender: e.gender || "",
      age: e.age || "",
      phone: e.phone || "",
      join_date: e.join_date || "",
      shift_preference: e.shift_preference,
      attrition_risk: e.attritionRisk,
      skill_level: getSkillLevel(e.skills).level,
      skill_count: e.skills.length,
      top_skills: e.skills.slice(0,3).map(s=>`${s.name}(${s.rating})`).join("; "),
    }));
    exportCSV(rows, `workers-export-${new Date().toISOString().split("T")[0]}.csv`);
    toast(`Exported ${rows.length} workers`);
  }

  if (loading) return <Spinner />;

  return (
    <div className="page-enter">
      {/* Controls */}
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:10,alignItems:"center"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, ID, role…"
          style={{flex:"1 1 150px",background:"#0d1225",border:"1px solid #1e2545",borderRadius:8,
            padding:"10px 12px",color:"#e8dcc8",fontSize:14,minWidth:0}}/>
        <input value={skillF} onChange={e=>setSkillF(e.target.value)} placeholder="🔍 Search by skill…"
          style={{flex:"1 1 140px",background:"#0d1225",border:"1px solid #3d5af133",borderRadius:8,
            padding:"10px 12px",color:"#e8dcc8",fontSize:14,minWidth:0}}/>
        <select value={deptF} onChange={e=>setDeptF(e.target.value)}
          style={{background:"#0d1225",border:"1px solid #1e2545",borderRadius:8,padding:"10px 12px",color:"#e8dcc8",fontSize:14}}>
          <option value="All">All Depts</option>
          {DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}
        </select>
        <Btn small onClick={()=>setAddOpen(true)}>+ Add Worker</Btn>
        <Btn small variant="ghost" onClick={()=>fileRef.current.click()}>📤 Upload CSV</Btn>
        <Btn small variant="ghost" onClick={handleExportCSV}>⬇ Export CSV</Btn>
        <input ref={fileRef} type="file" accept=".csv" style={{display:"none"}} onChange={handleCSV}/>
      </div>

      {/* Count bar */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12,fontSize:13,color:"#6b7a9e"}}>
        <span>Showing <strong style={{color:"#e8dcc8",fontSize:15}}>{filtered.length}</strong> of {(employees??[]).length} workers</span>
        {(skillF||deptF!=="All"||search) && (
          <button onClick={()=>{setSearch("");setDeptF("All");setSkillF("");}}
            style={{background:"#ff3b5c22",border:"1px solid #ff3b5c44",borderRadius:6,padding:"3px 10px",color:"#ff8c9e",fontSize:12,cursor:"pointer"}}>
            Clear filters ×
          </button>
        )}
      </div>

      {/* Upload status */}
      {uploadStatus && uploadStatus!=="reading" && (
        <div style={{background:uploadStatus.error?"#1a0808":"#0a1a0a",border:`1px solid ${uploadStatus.error?"#ff3b5c":"#4cde9f"}44`,
          borderRadius:8,padding:"10px 14px",marginBottom:12,display:"flex",justifyContent:"space-between"}}>
          {uploadStatus.error
            ? <span style={{color:"#ff8c9e",fontSize:13}}>❌ {uploadStatus.error}</span>
            : <span style={{color:"#4cde9f",fontSize:13}}>✅ Added {uploadStatus.added} · Updated {uploadStatus.updated}{uploadStatus.errors?.length?" · ⚠️ "+uploadStatus.errors.length+" errors":""}</span>}
          <button onClick={()=>setUploadStatus(null)} style={{background:"none",border:"none",color:"#6b7a9e",cursor:"pointer",fontSize:18}}>×</button>
        </div>
      )}
      {uploadStatus==="reading" && (
        <div style={{background:"#0d1225",border:"1px solid #3d5af1",borderRadius:8,padding:"10px 14px",marginBottom:12,color:"#60b3f5",fontSize:13}}>⏳ Processing CSV…</div>
      )}

      {/* Add Employee Modal */}
      {addOpen && (
        <div style={{position:"fixed",inset:0,background:"#000b",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16}}>
          <Card style={{width:"100%",maxWidth:560,maxHeight:"92vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h3 style={{color:"#e8dcc8",fontSize:20,fontWeight:700}}>Add New Worker</h3>
              <button onClick={()=>setAddOpen(false)} style={{background:"none",border:"none",color:"#6b7a9e",cursor:"pointer",fontSize:24}}>×</button>
            </div>
            <form onSubmit={handleAdd}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                <Field label="Employee ID" tip="Unique identifier like EMP001. Auto-generated if left blank.">
                  <input value={addForm.employee_id} onChange={e=>setAddForm(p=>({...p,employee_id:e.target.value}))} style={inputStyle} placeholder="EMP001"/>
                </Field>
                <Field label="Full Name *" tip="Worker's full name as it appears on documents.">
                  <input required value={addForm.name} onChange={e=>setAddForm(p=>({...p,name:e.target.value}))} style={inputStyle}/>
                </Field>
                <Field label="Role / Designation *" tip="Job title e.g. Senior Operator, QC Inspector">
                  <input required value={addForm.role} onChange={e=>setAddForm(p=>({...p,role:e.target.value}))} style={inputStyle}/>
                </Field>
                <Field label="Phone" tip="Mobile number for contact and emergency purposes.">
                  <input value={addForm.phone} onChange={e=>setAddForm(p=>({...p,phone:e.target.value}))} style={inputStyle}/>
                </Field>
                <Field label="Age" tip="Worker's age in years.">
                  <input type="number" value={addForm.age} onChange={e=>setAddForm(p=>({...p,age:e.target.value}))} style={inputStyle} min={14} max={70}/>
                </Field>
                <Field label="Join Date" tip="Date when the worker joined the organization.">
                  <input type="date" value={addForm.join_date} onChange={e=>setAddForm(p=>({...p,join_date:e.target.value}))} style={inputStyle}/>
                </Field>
                <Field label="Department" tip="The production unit or department this worker belongs to.">
                  <select value={addForm.department} onChange={e=>setAddForm(p=>({...p,department:e.target.value}))} style={inputStyle}>
                    {DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
                <Field label="Gender" tip="Worker's gender — used for workforce diversity reporting.">
                  <select value={addForm.gender} onChange={e=>setAddForm(p=>({...p,gender:e.target.value}))} style={inputStyle}>
                    <option value="">—</option>
                    {["Male","Female","Other"].map(g=><option key={g} value={g}>{g}</option>)}
                  </select>
                </Field>
                <Field label="Shift Preference" tip="Worker's preferred shift. Used to auto-assign shift in attendance.">
                  <select value={addForm.shift_preference} onChange={e=>setAddForm(p=>({...p,shift_preference:e.target.value}))} style={inputStyle}>
                    {["morning","afternoon","night","flexible"].map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Attrition Risk" tip="Likelihood of this worker leaving. High-risk workers appear in the Pipeline tab.">
                  <select value={addForm.attritionRisk} onChange={e=>setAddForm(p=>({...p,attritionRisk:e.target.value}))} style={inputStyle}>
                    {["low","medium","high"].map(r=><option key={r} value={r}>{r}</option>)}
                  </select>
                </Field>
              </div>
              <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:16}}>
                <Btn variant="ghost" onClick={()=>setAddOpen(false)}>Cancel</Btn>
                <Btn type="submit" disabled={saving}>{saving?"Saving…":"Add Worker"}</Btn>
              </div>
            </form>
          </Card>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:selected&&!mobile?"1fr 380px":"1fr",gap:16,alignItems:"start"}}>
        {/* Worker Grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:12}}>
          {filtered.length===0 && <Empty icon="👷" text="No workers match the current filters"/>}
          {filtered.map(emp=>{
            const sl = getSkillLevel(emp.skills);
            return (
              <Card key={emp._id}
                onClick={()=>{ setSelected(sel=>sel?._id===emp._id?null:emp); setEditSkill(false); }}
                style={{
                  background:selected?._id===emp._id?"#111b3a":"#0d1225",
                  border:`1px solid ${selected?._id===emp._id?"#3d5af1":"#1e2545"}`,
                  cursor:"pointer",transition:"all 0.15s",
                }}>
                <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
                  <Avatar name={emp.name}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{color:"#e8dcc8",fontWeight:700,fontSize:15,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.name}</div>
                    <div style={{color:"#6b7a9e",fontSize:12}}>{emp.employee_id} · {emp.department}</div>
                  </div>
                  <Chip text={emp.attritionRisk.toUpperCase()} color={RC[emp.attritionRisk]}/>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>
                  {emp.skills.slice(0,4).map(s=>(
                    <div key={s.name} style={{background:"#1a2040",borderRadius:5,padding:"3px 8px",fontSize:11,display:"flex",gap:4}}>
                      <span style={{color:"#c4b8a0"}}>{s.name}</span>
                      <span style={{color:s.rating>=8?"#4cde9f":s.rating>=5?"#f5c518":"#ff3b5c",fontWeight:700}}>{s.rating}</span>
                    </div>
                  ))}
                  {emp.skills.length>4 && <div style={{background:"#1a2040",borderRadius:5,padding:"3px 8px",fontSize:11,color:"#6b7a9e"}}>+{emp.skills.length-4}</div>}
                </div>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <Chip text={(emp.shift_preference||"flexible").toUpperCase()} color="#b48ef5"/>
                  <Chip text={sl.level} color={sl.color}/>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Detail panel */}
        {selected && (
          <Card style={{position:mobile?"static":"sticky",top:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <Avatar name={selected.name} size={46}/>
                <div>
                  <div style={{color:"#e8dcc8",fontWeight:700,fontSize:17}}>{selected.name}</div>
                  <div style={{color:"#6b7a9e",fontSize:12}}>{selected.employee_id} · {selected.role}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>handleDelete(selected._id)}
                  style={{background:"none",border:"none",color:"#ff3b5c",cursor:"pointer",fontSize:17,padding:4}}>🗑</button>
                <button onClick={()=>setSelected(null)}
                  style={{background:"none",border:"none",color:"#6b7a9e",cursor:"pointer",fontSize:22,lineHeight:1}}>×</button>
              </div>
            </div>

            {/* Skill Level Badge */}
            {(() => {
              const sl = getSkillLevel(selected.skills);
              return (
                <div style={{background:sl.color+"15",border:`1px solid ${sl.color}44`,borderRadius:8,padding:"10px 14px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{color:sl.color,fontWeight:800,fontSize:16}}>{sl.level}</div>
                    <div style={{color:"#6b7a9e",fontSize:11,marginTop:1}}>Based on avg of top 5 skills</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{color:sl.color,fontWeight:800,fontSize:24}}>{sl.avg}</div>
                    <div style={{color:"#6b7a9e",fontSize:10}}>avg score</div>
                  </div>
                </div>
              );
            })()}

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:14}}>
              {[["Dept",selected.department],["Gender",selected.gender],["Age",selected.age],["Phone",selected.phone],["Joined",selected.join_date]].map(([l,v])=>v?(
                <div key={l} style={{background:"#080f20",borderRadius:6,padding:"7px 10px"}}>
                  <div style={{color:"#6b7a9e",fontSize:10,textTransform:"uppercase",letterSpacing:1}}>{l}</div>
                  <div style={{color:"#e8dcc8",fontSize:13,marginTop:1}}>{v}</div>
                </div>
              ):null)}
            </div>

            {/* Shift Assignment */}
            <div style={{marginBottom:14}}>
              <SectionTitle>Shift Assignment</SectionTitle>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {[...SHIFTS.map(s=>({id:s.id,label:s.label,color:s.color})),{id:"flexible",label:"Flexible",color:"#b48ef5"}].map(s=>(
                  <button key={s.id} onClick={async()=>{
                    try {
                      await updateEmployee(selected._id,{shift_preference:s.id});
                      refetch(); setSelected(p=>({...p,shift_preference:s.id}));
                      toast("Shift preference updated");
                    } catch (err) { toast(err.response?.data?.message||"Failed","error"); }
                  }} style={{
                    padding:"6px 12px",borderRadius:6,border:`1px solid ${s.color}55`,
                    background:selected.shift_preference===s.id?s.color+"33":"transparent",
                    color:s.color,cursor:"pointer",fontSize:13,fontWeight:600,
                  }}>{s.label}</button>
                ))}
              </div>
            </div>

            <div style={{marginBottom:14}}>
              <SectionTitle>Attrition Risk</SectionTitle>
              <div style={{display:"flex",gap:6}}>
                {["low","medium","high"].map(r=>(
                  <button key={r} onClick={()=>saveAttrition(selected._id,r)} style={{
                    padding:"5px 14px",borderRadius:6,border:`1px solid ${RC[r]}55`,
                    background:selected.attritionRisk===r?RC[r]+"33":"transparent",
                    color:RC[r],cursor:"pointer",fontSize:13,fontWeight:600,
                  }}>{r.toUpperCase()}</button>
                ))}
              </div>
            </div>

            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <SectionTitle>Skills ({selected.skills.length})</SectionTitle>
                <Btn small variant={editSkill?"primary":"ghost"} onClick={()=>setEditSkill(!editSkill)}>
                  {editSkill?"✓ Done":"✎ Edit Skills"}
                </Btn>
              </div>

              {selected.skills.length === 0 && !editSkill && (
                <div style={{color:"#6b7a9e",fontSize:13,textAlign:"center",padding:"14px 0"}}>No skills added yet. Click "Edit Skills" to add.</div>
              )}

              {selected.skills.map(s=>(
                <div key={s.name} style={{position:"relative"}}>
                  <SkillBar skill={s} editable={editSkill}
                    onUpdate={r=>saveSkillUpdate(selected._id, s.name, r)}/>
                  {editSkill && (
                    <button onClick={()=>removeSkill(selected,s.name)} title={`Remove ${s.name}`} style={{
                      position:"absolute",right:0,top:2,background:"#ff3b5c22",border:"1px solid #ff3b5c44",
                      borderRadius:4,color:"#ff3b5c",cursor:"pointer",fontSize:11,padding:"1px 5px",
                    }}>✕ Remove</button>
                  )}
                </div>
              ))}

              {editSkill && (
                <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid #1a2040"}}>
                  <div style={{color:"#6b7a9e",fontSize:11,marginBottom:6}}>Add new skill (only skills not yet assigned are shown):</div>
                  <select value={newSkill.name} onChange={e=>setNewSkill(p=>({...p,name:e.target.value}))}
                    style={{width:"100%",background:"#1a2040",border:"1px solid #2d3561",borderRadius:6,
                      padding:"8px 10px",color:"#e8dcc8",fontSize:13,marginBottom:8}}>
                    <option value="">+ Select skill to add…</option>
                    {TEXTILE_SKILLS
                      .filter(s => !selected.skills.find(es => es.name === s))
                      .map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                  {newSkill.name && (
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                          <span style={{color:"#6b7a9e",fontSize:12}}>Rating</span>
                          <span style={{color:"#e8dcc8",fontWeight:700}}>{newSkill.rating}/10</span>
                        </div>
                        <input type="range" min={1} max={10} value={newSkill.rating}
                          onChange={e=>setNewSkill(p=>({...p,rating:+e.target.value}))} style={{width:"100%"}}/>
                      </div>
                      <Btn small onClick={()=>addSkill(selected._id)}>Add</Btn>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
