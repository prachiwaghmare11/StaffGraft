import { useState } from "react";

// ─── Constants ───────────────────────────────────────────────────────────────
export const TEXTILE_SKILLS = [
  "Sewing Machine Operation","Fabric Cutting","Quality Inspection","Embroidery",
  "Screen Printing","Pattern Making","Overlock / Serger","Knitting",
  "Dyeing & Finishing","Packaging","Machine Maintenance","Inventory Management","Supervisory",
];
export const DEPARTMENTS = ["Production","Quality","Cutting","Embroidery","Finishing","Maintenance","Logistics"];
export const SHIFTS = [
  { id:"morning",   label:"Morning",   time:"6:00 AM – 2:00 PM",   color:"#f5c518" },
  { id:"afternoon", label:"Afternoon", time:"2:00 PM – 10:00 PM",  color:"#60b3f5" },
  { id:"night",     label:"Night",     time:"10:00 PM – 6:00 AM",  color:"#b48ef5" },
];
export const PC = { critical:"#ff3b5c", high:"#ff8c42", medium:"#f5c518", low:"#4cde9f" };
export const RC = { high:"#ff3b5c", medium:"#f5c518", low:"#4cde9f" };
export const SC = { present_ontime:"#4cde9f", present_late:"#f5c518", absent:"#ff3b5c", assigned:"#60b3f5", unset:"#3a4060" };
export const STATUS_LABELS = { present_ontime:"On Time", present_late:"Late", absent:"Absent", assigned:"Assigned", unset:"Unset" };

// ─── Skill Level Calculator ───────────────────────────────────────────────────
export function getSkillLevel(skills = []) {
  if (!skills.length) return { level: "Unskilled", color: "#6b7a9e", avg: 0 };
  const top5 = [...skills].sort((a,b) => b.rating - a.rating).slice(0, 5);
  const avg = top5.reduce((s, sk) => s + sk.rating, 0) / top5.length;
  if (skills.length >= 5 && avg >= 7) return { level: "Multi-Skill", color: "#b48ef5", avg: +avg.toFixed(1) };
  if (avg >= 7) return { level: "Skilled", color: "#4cde9f", avg: +avg.toFixed(1) };
  if (avg >= 4) return { level: "Semi-Skilled", color: "#f5c518", avg: +avg.toFixed(1) };
  return { level: "Unskilled", color: "#ff3b5c", avg: +avg.toFixed(1) };
}

export function initials(name="") {
  return name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase();
}

// ─── Tooltip wrapper ─────────────────────────────────────────────────────────
export function Tip({ text, children }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position:"relative", display:"inline-flex", alignItems:"center" }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && text && (
        <span style={{
          position:"absolute", bottom:"calc(100% + 6px)", left:"50%", transform:"translateX(-50%)",
          background:"#1a2040", border:"1px solid #3d5af1", borderRadius:6,
          padding:"5px 10px", fontSize:11, color:"#c4b8a0", whiteSpace:"nowrap",
          zIndex:999, pointerEvents:"none", boxShadow:"0 4px 16px #0008",
        }}>{text}</span>
      )}
    </span>
  );
}

// ─── Avatar ──────────────────────────────────────────────────────────────────
export function Avatar({ name, size = 38 }) {
  const colors = ["#1a3a5c","#2d1a5c","#1a3a2d","#5c2d1a","#1a2d5c"];
  const c = colors[(name?.charCodeAt(0) ?? 0) % colors.length];
  return (
    <div style={{
      width:size, height:size, borderRadius:"50%",
      background:`linear-gradient(135deg,${c},#0d1b4b)`,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size*0.33, fontWeight:700, color:"#e8dcc8",
      flexShrink:0, border:"2px solid #2d3561", letterSpacing:0.5,
    }}>{initials(name)}</div>
  );
}

// ─── Chip ────────────────────────────────────────────────────────────────────
export function Chip({ text, color }) {
  return (
    <span style={{
      background:color+"22", color, border:`1px solid ${color}44`,
      borderRadius:4, padding:"3px 8px", fontSize:11, fontWeight:700,
      fontFamily:"monospace", letterSpacing:0.5, whiteSpace:"nowrap",
    }}>{text}</span>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────────
export function Card({ children, style={}, onClick }) {
  return (
    <div onClick={onClick} style={{
      background:"#0d1225", border:"1px solid #1e2545",
      borderRadius:12, padding:16, ...style,
      cursor:onClick?"pointer":"default",
    }}>{children}</div>
  );
}

// ─── Section title ────────────────────────────────────────────────────────────
export function SectionTitle({ children, style={} }) {
  return (
    <div style={{color:"#6b7a9e",fontSize:11,letterSpacing:2,
      textTransform:"uppercase",marginBottom:12,fontWeight:700,...style}}>{children}</div>
  );
}

// ─── Button ──────────────────────────────────────────────────────────────────
export function Btn({ children, onClick, variant="primary", small, style={}, disabled, type="button" }) {
  const base = {
    primary: { background:"#3d5af1", color:"#fff", border:"none" },
    ghost:   { background:"transparent", color:"#6b7a9e", border:"1px solid #2d3561" },
    danger:  { background:"#ff3b5c22", color:"#ff3b5c", border:"1px solid #ff3b5c44" },
    success: { background:"#4cde9f22", color:"#4cde9f", border:"1px solid #4cde9f44" },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      ...base[variant], borderRadius:8, cursor:disabled?"not-allowed":"pointer",
      padding:small?"6px 14px":"10px 20px", fontSize:small?13:15, fontWeight:600,
      opacity:disabled?0.5:1, transition:"opacity 0.15s", ...style,
    }}>{children}</button>
  );
}

// ─── Skill bar ────────────────────────────────────────────────────────────────
export function SkillBar({ skill, editable, onUpdate }) {
  const [hov, setHov] = useState(null);
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
        <span style={{ fontSize:13, color:"#c4b8a0" }}>{skill.name}</span>
        <span style={{ fontSize:13, fontWeight:700, color:"#e8dcc8" }}>{skill.rating}/10</span>
      </div>
      <div style={{ display:"flex", gap:2 }}>
        {Array.from({length:10},(_,i)=>(
          <div key={i}
            onClick={()=>editable&&onUpdate(i+1)}
            onMouseEnter={()=>editable&&setHov(i)}
            onMouseLeave={()=>editable&&setHov(null)}
            style={{
              flex:1, height:8, borderRadius:2, cursor:editable?"pointer":"default",
              background: i<(hov!=null?hov+1:skill.rating)
                ?(i<3?"#ff3b5c":i<6?"#f5c518":"#4cde9f"):"#1e2545",
              transition:"background 0.1s",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Input field with tooltip ──────────────────────────────────────────────────
export function Field({ label, children, tip }) {
  return (
    <div>
      {label && (
        <label style={{display:"flex",alignItems:"center",gap:4,color:"#6b7a9e",fontSize:11,textTransform:"uppercase",letterSpacing:1,marginBottom:5,fontWeight:700}}>
          {label}
          {tip && (
            <Tip text={tip}>
              <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:14,height:14,borderRadius:"50%",background:"#1a2040",border:"1px solid #3d5af1",color:"#3d5af1",fontSize:9,cursor:"help",fontWeight:700}}>?</span>
            </Tip>
          )}
        </label>
      )}
      {children}
    </div>
  );
}

export const inputStyle = {
  width:"100%", background:"#1a2040", border:"1px solid #2d3561",
  borderRadius:6, padding:"9px 11px", color:"#e8dcc8", fontSize:14,
};

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner() {
  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:40}}>
      <div style={{
        width:32,height:32,borderRadius:"50%",
        border:"3px solid #1e2545",borderTop:"3px solid #3d5af1",
        animation:"spin 0.8s linear infinite",
      }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
export function Empty({ icon="📭", text="No data found" }) {
  return (
    <div style={{textAlign:"center",padding:"40px 20px",color:"#6b7a9e"}}>
      <div style={{fontSize:40,marginBottom:10}}>{icon}</div>
      <div style={{fontSize:15}}>{text}</div>
    </div>
  );
}

// ─── CSV Export helper ────────────────────────────────────────────────────────
export function exportCSV(rows, filename) {
  if (!rows || !rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(","), ...rows.map(r =>
    headers.map(h => {
      const val = r[h] ?? "";
      const str = String(val).replace(/"/g, '""');
      return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str}"` : str;
    }).join(",")
  )].join("\n");
  const blob = new Blob([csv], { type:"text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Toast ────────────────────────────────────────────────────────────────────
let toastFn = null;
export function setToastFn(fn) { toastFn = fn; }
export function toast(msg, type="success") { toastFn?.(msg, type); }

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  setToastFn((msg, type) => {
    const id = Date.now();
    setToasts(p => [...p, {id, msg, type}]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  });
  return (
    <div style={{position:"fixed",bottom:80,right:16,zIndex:9999,display:"flex",flexDirection:"column",gap:8}}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type==="error"?"#1a0808":"#0a1a0a",
          border:`1px solid ${t.type==="error"?"#ff3b5c":"#4cde9f"}44`,
          color: t.type==="error"?"#ff8c9e":"#4cde9f",
          borderRadius:8, padding:"12px 16px", fontSize:14, maxWidth:320,
          animation:"fadeIn 0.2s ease", fontWeight:500,
        }}>{t.type==="error"?"❌":"✅"} {t.msg}</div>
      ))}</div>
  );
}
