import { useState, useRef } from "react";
import { getEmployees, updateEmployee, updateSkill, deleteEmployee, uploadCSV, createEmployee } from "../utils/api";
import { useFetch, useBreakpoint } from "../hooks";
import { Avatar, Card, SectionTitle, Chip, Btn, SkillBar, Field, inputStyle, Spinner, Empty, RC, DEPARTMENTS, TEXTILE_SKILLS, toast } from "../components/UI";

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
    return (deptF==="All" || e.department===deptF) &&
      (e.name.toLowerCase().includes(q) || e.employee_id.toLowerCase().includes(q) || e.role?.toLowerCase().includes(q));
  });

  async function saveSkillUpdate(empId, name, rating) {
    try {
      await updateSkill(empId, { name, rating });
      refetch();
      setSelected(prev => prev ? { ...prev, skills: prev.skills.map(s => s.name===name ? {...s,rating} : s) } : prev);
    } catch { toast("Failed to update skill", "error"); }
  }

  async function addSkill(empId) {
    if (!newSkill.name) return;
    await saveSkillUpdate(empId, newSkill.name, newSkill.rating);
    setNewSkill({ name:"", rating:5 });
  }

  async function removeSkill(emp, skillName) {
    const updated = emp.skills.filter(s => s.name !== skillName);
    try {
      await updateEmployee(emp._id, { skills: updated });
      refetch();
      setSelected(prev => prev ? { ...prev, skills: updated } : prev);
    } catch { toast("Failed to remove skill", "error"); }
  }

  async function saveAttrition(empId, risk) {
    try {
      await updateEmployee(empId, { attritionRisk: risk });
      refetch();
      setSelected(prev => prev ? { ...prev, attritionRisk: risk } : prev);
      toast("Attrition risk updated");
    } catch { toast("Failed to update", "error"); }
  }

  async function handleDelete(empId) {
    if (!confirm("Delete this employee?")) return;
    try {
      await deleteEmployee(empId);
      setSelected(null);
      refetch();
      toast("Employee deleted");
    } catch { toast("Failed to delete", "error"); }
  }

  async function handleAdd(e) {
    e.preventDefault(); setSaving(true);
    try {
      await createEmployee({ ...addForm, age: addForm.age ? +addForm.age : null, skills:[] });
      refetch(); setAddOpen(false); setAddForm(BLANK_EMP);
      toast("Employee added");
    } catch (err) {
      toast(err.response?.data?.message || "Failed to add", "error");
    } finally { setSaving(false); }
  }

  async function handleCSV(e) {
    const file = e.target.files[0]; if (!file) return;
    if (!file.name.match(/\.csv$/i)) { toast("Please upload a .csv file","error"); e.target.value=""; return; }
    setUploadStatus("reading");
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await uploadCSV(fd);
      setUploadStatus(res.data);
      refetch();
      toast(`Added ${res.data.added}, updated ${res.data.updated}`);
    } catch (err) {
      setUploadStatus({ error: err.response?.data?.message || err.message });
    }
    e.target.value="";
  }

  if (loading) return <Spinner />;

  return (
    <div className="page-enter">
      {/* Controls */}
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:14,alignItems:"center"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, ID, role…"
          style={{flex:"1 1 160px",background:"#0d1225",border:"1px solid #1e2545",borderRadius:8,
            padding:"9px 12px",color:"#e8dcc8",fontSize:13,minWidth:0}}/>
        <select value={deptF} onChange={e=>setDeptF(e.target.value)}
          style={{background:"#0d1225",border:"1px solid #1e2545",borderRadius:8,padding:"9px 12px",color:"#e8dcc8",fontSize:13}}>
          <option value="All">All Depts</option>
          {DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}
        </select>
        <Btn small onClick={()=>setAddOpen(true)}>+ Add Worker</Btn>
        <Btn small variant="ghost" onClick={()=>fileRef.current.click()}>📤 Upload CSV</Btn>
        <input ref={fileRef} type="file" accept=".csv" style={{display:"none"}} onChange={handleCSV}/>
      </div>

      {/* Upload status */}
      {uploadStatus && uploadStatus!=="reading" && (
        <div style={{background:uploadStatus.error?"#1a0808":"#0a1a0a",border:`1px solid ${uploadStatus.error?"#ff3b5c":"#4cde9f"}44`,
          borderRadius:8,padding:"10px 14px",marginBottom:12,display:"flex",justifyContent:"space-between"}}>
          {uploadStatus.error
            ? <span style={{color:"#ff8c9e",fontSize:13}}>❌ {uploadStatus.error}</span>
            : <span style={{color:"#4cde9f",fontSize:13}}>✅ Added {uploadStatus.added}, updated {uploadStatus.updated}</span>}
          <button onClick={()=>setUploadStatus(null)} style={{background:"none",border:"none",color:"#6b7a9e",cursor:"pointer",fontSize:18}}>×</button>
        </div>
      )}
      {uploadStatus==="reading" && (
        <div style={{background:"#0d1225",border:"1px solid #3d5af1",borderRadius:8,padding:"10px 14px",marginBottom:12,color:"#60b3f5",fontSize:13}}>⏳ Processing…</div>
      )}

      {/* Add Employee Modal */}
      {addOpen && (
        <div style={{position:"fixed",inset:0,background:"#000a",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16}}>
          <Card style={{width:"100%",maxWidth:540,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <h3 style={{color:"#e8dcc8",fontSize:18,fontWeight:700}}>Add New Worker</h3>
              <button onClick={()=>setAddOpen(false)} style={{background:"none",border:"none",color:"#6b7a9e",cursor:"pointer",fontSize:22}}>×</button>
            </div>
            <form onSubmit={handleAdd}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                {[
                  {l:"Employee ID",k:"employee_id"},{l:"Full Name *",k:"name",required:true},
                  {l:"Role *",k:"role",required:true},{l:"Phone",k:"phone"},
                  {l:"Age",k:"age",type:"number"},{l:"Join Date",k:"join_date",type:"date"},
                ].map(f=>(
                  <Field key={f.k} label={f.l}>
                    <input required={f.required} type={f.type||"text"} value={addForm[f.k]}
                      onChange={e=>setAddForm(p=>({...p,[f.k]:e.target.value}))}
                      style={inputStyle}/>
                  </Field>
                ))}
                <Field label="Department">
                  <select value={addForm.department} onChange={e=>setAddForm(p=>({...p,department:e.target.value}))} style={inputStyle}>
                    {DEPARTMENTS.map(d=><option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
                <Field label="Gender">
                  <select value={addForm.gender} onChange={e=>setAddForm(p=>({...p,gender:e.target.value}))} style={inputStyle}>
                    <option value="">—</option>
                    {["Male","Female","Other"].map(g=><option key={g} value={g}>{g}</option>)}
                  </select>
                </Field>
                <Field label="Shift Preference">
                  <select value={addForm.shift_preference} onChange={e=>setAddForm(p=>({...p,shift_preference:e.target.value}))} style={inputStyle}>
                    {["morning","afternoon","night","flexible"].map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Attrition Risk">
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

      <div style={{display:"grid",gridTemplateColumns:selected&&!mobile?"1fr 360px":"1fr",gap:16,alignItems:"start"}}>
        {/* Grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
          {filtered.length===0 && <Empty icon="👷" text="No workers found"/>}
          {filtered.map(emp=>(
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
                  <div style={{color:"#e8dcc8",fontWeight:700,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{emp.name}</div>
                  <div style={{color:"#6b7a9e",fontSize:11}}>{emp.employee_id} · {emp.department}</div>
                </div>
                <Chip text={emp.attritionRisk.toUpperCase()} color={RC[emp.attritionRisk]}/>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>
                {emp.skills.slice(0,4).map(s=>(
                  <div key={s.name} style={{background:"#1a2040",borderRadius:5,padding:"2px 7px",fontSize:10,display:"flex",gap:4}}>
                    <span style={{color:"#c4b8a0"}}>{s.name}</span>
                    <span style={{color:s.rating>=8?"#4cde9f":s.rating>=5?"#f5c518":"#ff3b5c",fontWeight:700}}>{s.rating}</span>
                  </div>
                ))}
                {emp.skills.length>4 && <div style={{background:"#1a2040",borderRadius:5,padding:"2px 7px",fontSize:10,color:"#6b7a9e"}}>+{emp.skills.length-4}</div>}
              </div>
              <Chip text={(emp.shift_preference||"flexible").toUpperCase()} color="#b48ef5"/>
            </Card>
          ))}
        </div>

        {/* Detail panel */}
        {selected && (
          <Card>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <Avatar name={selected.name} size={44}/>
                <div>
                  <div style={{color:"#e8dcc8",fontWeight:700,fontSize:16}}>{selected.name}</div>
                  <div style={{color:"#6b7a9e",fontSize:12}}>{selected.employee_id} · {selected.role}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>handleDelete(selected._id)}
                  style={{background:"none",border:"none",color:"#ff3b5c",cursor:"pointer",fontSize:16,padding:4}}>🗑</button>
                <button onClick={()=>setSelected(null)}
                  style={{background:"none",border:"none",color:"#6b7a9e",cursor:"pointer",fontSize:20,lineHeight:1}}>×</button>
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:14}}>
              {[["Dept",selected.department],["Gender",selected.gender],["Age",selected.age],["Phone",selected.phone],["Joined",selected.join_date],["Shift",selected.shift_preference]].map(([l,v])=>v?(
                <div key={l} style={{background:"#080f20",borderRadius:6,padding:"6px 10px"}}>
                  <div style={{color:"#6b7a9e",fontSize:10,textTransform:"uppercase",letterSpacing:1}}>{l}</div>
                  <div style={{color:"#e8dcc8",fontSize:12,marginTop:1}}>{v}</div>
                </div>
              ):null)}
            </div>

            <div style={{marginBottom:14}}>
              <SectionTitle>Attrition Risk</SectionTitle>
              <div style={{display:"flex",gap:6}}>
                {["low","medium","high"].map(r=>(
                  <button key={r} onClick={()=>saveAttrition(selected._id,r)} style={{
                    padding:"4px 12px",borderRadius:6,border:`1px solid ${RC[r]}55`,
                    background:selected.attritionRisk===r?RC[r]+"33":"transparent",
                    color:RC[r],cursor:"pointer",fontSize:12,fontWeight:600,
                  }}>{r.toUpperCase()}</button>
                ))}
              </div>
            </div>

            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <SectionTitle>Skills</SectionTitle>
                <Btn small variant={editSkill?"primary":"ghost"} onClick={()=>setEditSkill(!editSkill)}>
                  {editSkill?"✓ Done":"✎ Edit"}
                </Btn>
              </div>
              {selected.skills.map(s=>(
                <div key={s.name} style={{position:"relative"}}>
                  <SkillBar skill={s} editable={editSkill}
                    onUpdate={r=>saveSkillUpdate(selected._id, s.name, r)}/>
                  {editSkill && (
                    <button onClick={()=>removeSkill(selected,s.name)} style={{
                      position:"absolute",right:0,top:0,background:"none",border:"none",
                      color:"#ff3b5c",cursor:"pointer",fontSize:14,padding:0,
                    }}>✕</button>
                  )}
                </div>
              ))}

              {editSkill && (
                <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid #1a2040"}}>
                  <select value={newSkill.name} onChange={e=>setNewSkill(p=>({...p,name:e.target.value}))}
                    style={{width:"100%",background:"#1a2040",border:"1px solid #2d3561",borderRadius:6,
                      padding:"7px 10px",color:"#e8dcc8",fontSize:12,marginBottom:8}}>
                    <option value="">+ Select skill…</option>
                    {TEXTILE_SKILLS.filter(s=>!selected.skills.find(es=>es.name===s)).map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                  {newSkill.name && (
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <input type="range" min={1} max={10} value={newSkill.rating}
                        onChange={e=>setNewSkill(p=>({...p,rating:+e.target.value}))} style={{flex:1}}/>
                      <span style={{color:"#e8dcc8",width:20,textAlign:"center"}}>{newSkill.rating}</span>
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
