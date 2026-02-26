import { useState } from "react";
import { getEmployees, updateEmployee } from "../utils/api";
import { useFetch } from "../hooks";
import { Card, SectionTitle, Chip, Avatar, Btn, Spinner, Empty, RC, toast } from "../components/UI";

export default function Pipeline() {
  const { data: employees, loading, refetch } = useFetch(getEmployees, []);

  async function setRisk(empId, risk) {
    try {
      await updateEmployee(empId, { attritionRisk: risk });
      refetch();
      toast("Risk updated");
    } catch { toast("Failed","error"); }
  }

  if (loading) return <Spinner />;

  const all  = employees ?? [];
  const high = all.filter(e => e.attritionRisk === "high");
  const med  = all.filter(e => e.attritionRisk === "medium");

  // Skills that will be critically lost
  const lostSkills = {};
  high.forEach(e => e.skills.forEach(s => {
    const backups = all.filter(x => x._id !== e._id && x.skills.find(sk => sk.name===s.name && sk.rating >= s.rating-2));
    if (backups.length === 0) lostSkills[s.name] = (lostSkills[s.name]||0)+1;
  }));

  function findBackups(emp) {
    return all.filter(e => e._id !== emp._id).map(e => {
      const covered = emp.skills.filter(s => e.skills.find(sk => sk.name===s.name && sk.rating>=s.rating-1)).length;
      return { ...e, covered, total: emp.skills.length };
    }).filter(e => e.covered > 0).sort((a,b) => b.covered-a.covered).slice(0,3);
  }

  return (
    <div className="page-enter">
      <p style={{color:"#6b7a9e",marginBottom:20,fontSize:13}}>
        Track workers at risk of leaving. Identify skill gaps before they happen.
      </p>

      {Object.keys(lostSkills).length > 0 && (
        <div style={{background:"#1a0808",border:"1px solid #ff3b5c44",borderRadius:12,padding:14,marginBottom:20}}>
          <div style={{color:"#ff3b5c",fontWeight:700,marginBottom:8}}>⚠️ Critical Skill Gaps — No Backup Available</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {Object.keys(lostSkills).map(sk=>(
              <div key={sk} style={{background:"#ff3b5c22",border:"1px solid #ff3b5c44",borderRadius:8,padding:"5px 12px"}}>
                <span style={{color:"#ff8c9e",fontWeight:600,fontSize:13}}>{sk}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {[{label:"🔴 High Risk",color:"#ff3b5c",list:high},{label:"🟡 Medium Risk",color:"#f5c518",list:med}].map(({label,color,list})=>(
          <div key={label}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <span style={{color,fontWeight:700}}>{label}</span>
              <span style={{background:color+"22",color,borderRadius:20,padding:"2px 10px",fontSize:12,fontWeight:700}}>{list.length}</span>
            </div>
            {list.length===0
              ? <div style={{color:"#6b7a9e",textAlign:"center",padding:24,background:"#0d1225",borderRadius:12,border:"1px solid #1e2545"}}>None 🎉</div>
              : list.map(emp=>{
                const backups = findBackups(emp);
                return (
                  <Card key={emp._id} style={{marginBottom:12,borderLeft:`3px solid ${color}44`}}>
                    <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
                      <Avatar name={emp.name} size={34}/>
                      <div style={{flex:1}}>
                        <div style={{color:"#e8dcc8",fontWeight:700}}>{emp.name}</div>
                        <div style={{color:"#6b7a9e",fontSize:11}}>{emp.role} · {emp.department}</div>
                      </div>
                      <div style={{display:"flex",gap:4}}>
                        {["low","medium","high"].map(r=>(
                          <button key={r} onClick={()=>setRisk(emp._id,r)} style={{
                            padding:"2px 7px",borderRadius:5,border:`1px solid ${RC[r]}55`,
                            background:emp.attritionRisk===r?RC[r]+"33":"transparent",
                            color:RC[r],cursor:"pointer",fontSize:10,
                          }}>{r[0].toUpperCase()}</button>
                        ))}
                      </div>
                    </div>

                    <div style={{marginBottom:8}}>
                      <div style={{color:"#6b7a9e",fontSize:10,textTransform:"uppercase",letterSpacing:1,marginBottom:5}}>High-Value Skills at Risk</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                        {emp.skills.filter(s=>s.rating>=7).map(s=>(
                          <div key={s.name} style={{background:"#1a2040",borderRadius:4,padding:"2px 8px",fontSize:10,color:"#f5c518"}}>
                            {s.name} ({s.rating})
                          </div>
                        ))}
                        {emp.skills.filter(s=>s.rating>=7).length===0&&<span style={{color:"#6b7a9e",fontSize:12}}>No high-rated skills</span>}
                      </div>
                    </div>

                    {backups.length > 0 ? (
                      <div>
                        <div style={{color:"#6b7a9e",fontSize:10,textTransform:"uppercase",letterSpacing:1,marginBottom:5}}>Potential Backups</div>
                        {backups.map(b=>(
                          <div key={b._id} style={{display:"flex",justifyContent:"space-between",background:"#080f20",borderRadius:6,padding:"5px 10px",marginBottom:4}}>
                            <span style={{color:"#c4b8a0",fontSize:12}}>{b.name}</span>
                            <span style={{color:"#4cde9f",fontSize:12}}>{b.covered}/{b.total} skills covered</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{color:"#ff3b5c",fontSize:12}}>⚠️ No suitable backup!</div>
                    )}
                  </Card>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
}
