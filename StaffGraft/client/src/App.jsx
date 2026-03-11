import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useBreakpoint } from "./hooks";
import { ToastContainer } from "./components/UI";
import { useState } from "react";

import Login        from "./pages/Login";
import Dashboard    from "./pages/Dashboard";
import Employees    from "./pages/Employees";
import Attendance   from "./pages/Attendance";
import RoleMatching from "./pages/RoleMatching";
import Pipeline     from "./pages/Pipeline";
import Overtime     from "./pages/Overtime";
import Attrition    from "./pages/Attrition";

const NAV = [
  { to:"/",          label:"Dashboard",  icon:"◼",  end:true },
  { to:"/workers",   label:"Workers",    icon:"👤" },
  { to:"/attendance",label:"Attendance", icon:"📋" },
  { to:"/overtime",  label:"Overtime",   icon:"⏰" },
  { to:"/matching",  label:"Role Match", icon:"🎯" },
  { to:"/pipeline",  label:"Pipeline",   icon:"📊" },
  { to:"/attrition", label:"Attrition",  icon:"📉" },
];

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",color:"#6b7a9e"}}>Loading…</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function Layout() {
  const { user, logout } = useAuth();
  const mobile = useBreakpoint();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() { logout(); navigate("/login"); }

  const navLinkStyle = ({ isActive }) => ({
    display:"flex", alignItems:"center", gap:10, padding:"10px 18px",
    background: isActive ? "#111b3a" : "none",
    borderLeft: `3px solid ${isActive ? "#3d5af1" : "transparent"}`,
    color: isActive ? "#e8dcc8" : "#6b7a9e",
    fontSize:13, textDecoration:"none", transition:"all 0.15s",
    fontWeight: isActive ? 600 : 400,
  });

  const mobileNavStyle = ({ isActive }) => ({
    flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
    gap:2, background:"none", borderTop:`2px solid ${isActive?"#3d5af1":"transparent"}`,
    color: isActive ? "#3d5af1" : "#3a4060", textDecoration:"none",
    paddingTop:4,
  });

  return (
    <div style={{display:"flex",minHeight:"100vh"}}>
      {!mobile && (
        <aside style={{width:210,background:"#080f20",borderRight:"1px solid #1a2040",
          display:"flex",flexDirection:"column",position:"fixed",top:0,bottom:0,left:0,zIndex:10}}>
          <div style={{padding:"20px 18px",borderBottom:"1px solid #1a2040"}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:"#e8dcc8",fontWeight:800}}>StaffGraft</div>
            <div style={{color:"#3d5af1",fontSize:9,letterSpacing:3,marginTop:1}}>TEXTILE WORKFORCE OS</div>
          </div>
          <nav style={{flex:1,padding:"14px 0"}}>
            {NAV.map(n=>(
              <NavLink key={n.to} to={n.to} end={n.end} style={navLinkStyle}>
                <span style={{fontSize:15}}>{n.icon}</span>{n.label}
              </NavLink>
            ))}
          </nav>
          <div style={{padding:16,borderTop:"1px solid #1a2040"}}>
            <div style={{color:"#c4b8a0",fontSize:13,fontWeight:600,marginBottom:4}}>{user?.name}</div>
            <div style={{color:"#6b7a9e",fontSize:11,marginBottom:10}}>{user?.email}</div>
            <button onClick={handleLogout} style={{background:"#1a2040",border:"1px solid #2d3561",borderRadius:6,
              color:"#6b7a9e",cursor:"pointer",fontSize:12,padding:"5px 12px",width:"100%"}}>Sign Out</button>
          </div>
        </aside>
      )}

      <main style={{marginLeft:mobile?0:210,flex:1,minHeight:"100vh"}}>
        {mobile && (
          <div style={{position:"sticky",top:0,height:52,background:"#080f20",borderBottom:"1px solid #1a2040",
            display:"flex",alignItems:"center",padding:"0 16px",justifyContent:"space-between",zIndex:50}}>
            <div>
              <span style={{fontFamily:"'Playfair Display',serif",fontSize:18,fontWeight:800,color:"#e8dcc8"}}>StaffGraft</span>
              <span style={{color:"#3d5af1",fontSize:9,letterSpacing:2,marginLeft:6}}>TEXTILE</span>
            </div>
            <button onClick={handleLogout} style={{background:"none",border:"1px solid #2d3561",borderRadius:6,color:"#6b7a9e",cursor:"pointer",padding:"4px 10px",fontSize:12}}>Out</button>
          </div>
        )}

        <div style={{padding:mobile?"14px 14px 80px":"28px 28px"}}>
          <Routes>
            <Route path="/"          element={<><PageTitle title="Dashboard"/><Dashboard/></>}/>
            <Route path="/workers"   element={<><PageTitle title="Workers"/><Employees/></>}/>
            <Route path="/attendance"element={<><PageTitle title="Attendance & Shifts"/><Attendance/></>}/>
            <Route path="/overtime"  element={<><PageTitle title="Overtime"/><Overtime/></>}/>
            <Route path="/matching"  element={<><PageTitle title="Role Matching"/><RoleMatching/></>}/>
            <Route path="/pipeline"  element={<><PageTitle title="Skill Pipeline"/><Pipeline/></>}/>
            <Route path="/attrition" element={<><PageTitle title="Attrition Analysis"/><Attrition/></>}/>
          </Routes>
        </div>

        {mobile && (
          <nav style={{position:"fixed",bottom:0,left:0,right:0,height:58,background:"#080f20",
            borderTop:"1px solid #1a2040",display:"flex",zIndex:100}}>
            {NAV.map(n=>(
              <NavLink key={n.to} to={n.to} end={n.end} style={mobileNavStyle}>
                <span style={{fontSize:18}}>{n.icon}</span>
                <span style={{fontSize:9,fontWeight:600}}>{n.label}</span>
              </NavLink>
            ))}
          </nav>
        )}
      </main>

      <ToastContainer/>
    </div>
  );
}

function PageTitle({ title }) {
  return (
    <div style={{marginBottom:22}}>
      <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:800,color:"#e8dcc8"}}>{title}</h1>
      <div style={{color:"#6b7a9e",fontSize:12,marginTop:3}}>
        {new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login/>}/>
          <Route path="/*" element={
            <ProtectedRoute>
              <Layout/>
            </ProtectedRoute>
          }/>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
