import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Btn } from "../components/UI";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email:"admin@staffgraft.com", password:"admin123" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await login(form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  const inp = {
    width:"100%", background:"#0d1225", border:"1px solid #1e2545",
    borderRadius:8, padding:"12px 14px", color:"#e8dcc8", fontSize:14,
    marginBottom:12,
  };

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#060c1a",padding:16}}>
      <div style={{width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{fontFamily:"'Playfair Display',serif",fontSize:36,fontWeight:800,color:"#e8dcc8"}}>StaffGraft</div>
          <div style={{color:"#3d5af1",fontSize:11,letterSpacing:3,marginTop:4}}>TEXTILE WORKFORCE OS</div>
        </div>

        <div style={{background:"#0d1225",border:"1px solid #1e2545",borderRadius:16,padding:32}}>
          <h2 style={{fontSize:20,fontWeight:700,color:"#e8dcc8",marginBottom:24}}>Sign In</h2>

          {error && (
            <div style={{background:"#1a0808",border:"1px solid #ff3b5c44",borderRadius:8,
              padding:"10px 14px",color:"#ff8c9e",fontSize:13,marginBottom:16}}>{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            <label style={{display:"block",color:"#6b7a9e",fontSize:11,marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Email</label>
            <input style={inp} type="email" value={form.email}
              onChange={e=>setForm(p=>({...p,email:e.target.value}))} required/>

            <label style={{display:"block",color:"#6b7a9e",fontSize:11,marginBottom:4,textTransform:"uppercase",letterSpacing:1}}>Password</label>
            <input style={{...inp,marginBottom:24}} type="password" value={form.password}
              onChange={e=>setForm(p=>({...p,password:e.target.value}))} required/>

            <Btn type="submit" disabled={loading} style={{width:"100%",padding:"12px"}}>
              {loading?"Signing in…":"Sign In"}
            </Btn>
          </form>

          <div style={{marginTop:20,padding:"12px",background:"#080f20",borderRadius:8,fontSize:12,color:"#6b7a9e"}}>
            <strong style={{color:"#c4b8a0"}}>Default credentials</strong><br/>
            Email: admin@staffgraft.com<br/>
            Password: admin123
          </div>
        </div>
      </div>
    </div>
  );
}
