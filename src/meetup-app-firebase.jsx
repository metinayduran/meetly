// ============================================================
//  meetup-app-firebase.jsx
//
//  SETUP BEFORE RUNNING:
//  1. npm install firebase
//  2. Fill in firebaseConfig.js with your project credentials
//  3. Deploy firestore.rules + storage.rules via Firebase CLI
//  4. Enable Email/Password auth in Firebase Console →
//     Authentication → Sign-in method
//  5. Enable Firestore + Storage in Firebase Console
// ============================================================

import { useState, useRef, useEffect, useCallback } from "react";
import {
  registerUser,
  loginUser,
  logoutUser,
  onAuthChange,
  getUserProfile,
  createEvent,
  updateEvent,
  deleteEvent,
  subscribeToEvents,
  toggleRsvp,
  getUserRsvps,
} from "./firebaseService";

// ── constants ──────────────────────────────────────────────

const CATEGORIES = ["All","Tech","Art & Culture","Sports","Music","Food & Drink","Business","Wellness","Outdoors","Social"];

const COLORS = {
  "Tech":"#4f46e5","Art & Culture":"#ec4899","Sports":"#10b981",
  "Music":"#f59e0b","Food & Drink":"#ef4444","Business":"#3b82f6",
  "Wellness":"#8b5cf6","Outdoors":"#22c55e","Social":"#f97316","All":"#6b7280",
};

const EMOJI = {
  "Tech":"💻","Art & Culture":"🎨","Sports":"🏃","Music":"🎵",
  "Food & Drink":"🍽️","Business":"💼","Wellness":"🧘","Outdoors":"🌿","Social":"🎉",
};

// ── tiny UI components ─────────────────────────────────────

function Avatar({ initials, size = 40, color = "#4f46e5", photo }) {
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:photo?"none":color+"22", border:`2px solid ${color}33`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.35, fontWeight:600, color, overflow:"hidden", flexShrink:0 }}>
      {photo ? <img src={photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : initials}
    </div>
  );
}

function Badge({ label }) {
  const c = COLORS[label]||"#6b7280";
  return <span style={{ background:c+"18",color:c,border:`1px solid ${c}33`,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:600,letterSpacing:"0.03em" }}>{label}</span>;
}

function Spinner() {
  return <div style={{ width:20,height:20,border:"2px solid var(--color-border-tertiary)",borderTopColor:"#4f46e5",borderRadius:"50%",animation:"spin 0.7s linear infinite" }}/>;
}

function Toast({ msg, type = "success" }) {
  return (
    <div style={{ position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:type==="error"?"#ef4444":"#22c55e",color:"white",borderRadius:10,padding:"10px 20px",fontSize:14,fontWeight:600,zIndex:9999,boxShadow:"0 4px 20px rgba(0,0,0,0.2)" }}>
      {msg}
    </div>
  );
}

function Modal({ children, onClose }) {
  useEffect(() => {
    const esc = e => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div style={{ position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",padding:20 }} onClick={onClose}>
      <div style={{ background:"#ffffff",borderRadius:20,width:"100%",maxWidth:560,maxHeight:"88vh",overflowY:"auto",position:"relative" }} onClick={e=>e.stopPropagation()}>
        <button onClick={onClose} style={{ position:"absolute",top:14,right:14,width:30,height:30,borderRadius:"50%",border:"1px solid #e5e7eb",background:"#f9fafb",cursor:"pointer",fontSize:16,zIndex:10,display:"flex",alignItems:"center",justifyContent:"center",color:"#374151" }}>×</button>
        {children}
      </div>
    </div>
  );
}

// ── EventCard ──────────────────────────────────────────────

function EventCard({ event, onClick }) {
  const pct = Math.round((event.attendees / event.maxAttendees) * 100);
  const soon = (event.date - Date.now()) < 86400000;
  return (
    <div onClick={onClick} style={{ background:"var(--color-background-primary)",border:"1px solid var(--color-border-tertiary)",borderRadius:16,overflow:"hidden",cursor:"pointer",transition:"transform 0.15s,box-shadow 0.15s" }}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 12px 32px rgba(0,0,0,0.08)";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}>
      <div style={{ height:120,background:`linear-gradient(135deg,${COLORS[event.category]}22,${COLORS[event.category]}44)`,display:"flex",alignItems:"center",justifyContent:"center",position:"relative" }}>
        {event.photoURL ? <img src={event.photoURL} alt="" style={{ width:"100%",height:"100%",objectFit:"cover",position:"absolute",inset:0 }}/> : null}
        <div style={{ fontSize:36,position:"relative",zIndex:1 }}>{EMOJI[event.category]||"📍"}</div>
        <div style={{ position:"absolute",top:10,right:10 }}><Badge label={event.category}/></div>
        {soon && <div style={{ position:"absolute",top:10,left:10,background:"#ef4444",color:"white",borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:700 }}>SOON</div>}
      </div>
      <div style={{ padding:"14px 16px" }}>
        <div style={{ fontSize:13,color:"var(--color-text-secondary)",marginBottom:4 }}>
          {event.date.toLocaleDateString("en-DE",{weekday:"short",month:"short",day:"numeric"})} · {event.date.toLocaleTimeString("en-DE",{hour:"2-digit",minute:"2-digit"})}
        </div>
        <div style={{ fontSize:15,fontWeight:600,color:"var(--color-text-primary)",marginBottom:6,lineHeight:1.3 }}>{event.title}</div>
        <div style={{ fontSize:12,color:"var(--color-text-secondary)",marginBottom:10 }}>📍 {event.location}</div>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <div style={{ flex:1,height:4,background:"var(--color-border-tertiary)",borderRadius:4,overflow:"hidden" }}>
            <div style={{ height:"100%",width:`${Math.min(pct,100)}%`,background:pct>80?"#ef4444":COLORS[event.category],borderRadius:4 }}/>
          </div>
          <span style={{ fontSize:11,color:"var(--color-text-secondary)",whiteSpace:"nowrap" }}>{event.attendees}/{event.maxAttendees}</span>
        </div>
      </div>
    </div>
  );
}

// ── main App ───────────────────────────────────────────────

export default function App() {
  // auth state
  const [user,       setUser]       = useState(null);
  const [userProfile,setUserProfile]= useState(null);
  const [authLoading,setAuthLoading]= useState(true);

  // events state
  const [events,    setEvents]    = useState([]);
  const [evtLoading,setEvtLoading]= useState(true);
  const [rsvpd,     setRsvpd]     = useState([]);

  // ui state
  const [view,           setView]           = useState("events");
  const [category,       setCategory]       = useState("All");
  const [dateFilter,     setDateFilter]     = useState("all");
  const [customDate,     setCustomDate]     = useState("");
  const [search,         setSearch]         = useState("");
  const [selectedEvent,  setSelectedEvent]  = useState(null);
  const [activeMapEvent, setActiveMapEvent] = useState(null);
  const [toast,          setToast]          = useState(null);
  const [loading,        setLoading]        = useState(false);

  // modals
  const [showLogin,       setShowLogin]       = useState(false);
  const [showRegister,    setShowRegister]    = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showEditEvent,   setShowEditEvent]   = useState(false);
  const [editingEvent,    setEditingEvent]    = useState(null);
  const [editForm,        setEditForm]        = useState({ title:"", category:"Tech", date:"", time:"18:00", location:"", description:"", maxAttendees:30, tags:"", photoFile:null, photoPreview:null });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // forms
  const [loginForm,  setLoginForm]  = useState({ email:"", password:"", error:"" });
  const [regForm,    setRegForm]    = useState({ name:"", email:"", password:"", bio:"", photoFile:null, photoPreview:null, error:"" });
  const [createForm, setCreateForm] = useState({ title:"", category:"Tech", date:"", time:"18:00", location:"", description:"", maxAttendees:30, tags:"", photoFile:null, photoPreview:null });

  const loginPhotoRef  = useRef();
  const regPhotoRef    = useRef();
  const eventPhotoRef  = useRef();

  // ── helpers ──────────────────────────────────────────────

  function showToast(msg, type="success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function handlePhotoUpload(e, setter) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setter(p => ({ ...p, photoFile:file, photoPreview:ev.target.result }));
    reader.readAsDataURL(file);
  }

  // ── Firebase: auth listener ───────────────────────────────

  useEffect(() => {
    const unsub = onAuthChange(async firebaseUser => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const profile = await getUserProfile(firebaseUser.uid);
        setUserProfile(profile);
        const userRsvps = await getUserRsvps(firebaseUser.uid);
        setRsvpd(userRsvps);
      } else {
        setUserProfile(null);
        setRsvpd([]);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // ── Firebase: real-time events listener ──────────────────

  useEffect(() => {
    setEvtLoading(true);
    const unsub = subscribeToEvents(incoming => {
      setEvents(incoming);
      setEvtLoading(false);
    });
    return unsub;
  }, []);

  // ── auth handlers ─────────────────────────────────────────

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await loginUser(loginForm.email, loginForm.password);
      setShowLogin(false);
      setLoginForm({ email:"", password:"", error:"" });
      showToast("Welcome back!");
    } catch (err) {
      setLoginForm(p => ({ ...p, error: err.message }));
    } finally { setLoading(false); }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await registerUser({ name:regForm.name, email:regForm.email, password:regForm.password, bio:regForm.bio, photoFile:regForm.photoFile });
      setShowRegister(false);
      setRegForm({ name:"",email:"",password:"",bio:"",photoFile:null,photoPreview:null,error:"" });
      showToast("Account created! Welcome to meetly 🎉");
    } catch (err) {
      setRegForm(p => ({ ...p, error: err.message }));
    } finally { setLoading(false); }
  }

  async function handleLogout() {
    await logoutUser();
    showToast("Signed out", "success");
  }

  // ── event handlers ────────────────────────────────────────

  async function handleCreateEvent(e) {
    e.preventDefault();
    if (!user) { setShowCreateEvent(false); setShowLogin(true); return; }
    if (!createForm.title || !createForm.date || !createForm.location) {
      showToast("Please fill in title, date and location", "error"); return;
    }
    setLoading(true);
    try {
      const newEvt = await createEvent({
        title:       createForm.title,
        category:    createForm.category,
        date:        new Date(createForm.date),
        time:        createForm.time,
        location:    createForm.location,
        description: createForm.description,
        maxAttendees:parseInt(createForm.maxAttendees) || 30,
        tags:        createForm.tags.split(",").map(t=>t.trim()).filter(Boolean),
        city:        "Frankfurt",
        lat:         50.1109 + (Math.random()-0.5)*0.03,
        lng:         8.6821  + (Math.random()-0.5)*0.06,
        photoFile:   createForm.photoFile,
      }, user);
      setShowCreateEvent(false);
      setCreateForm({ title:"",category:"Tech",date:"",time:"18:00",location:"",description:"",maxAttendees:30,tags:"",photoFile:null,photoPreview:null });
      showToast("Event published! 🎉");
    } catch (err) {
      showToast(err.message, "error");
    } finally { setLoading(false); }
  }

  function openEditModal(event) {
    const d = event.date;
    const dateStr = d.toISOString().split('T')[0];
    const timeStr = d.toTimeString().slice(0,5);
    setEditForm({
      title:       event.title,
      category:    event.category,
      date:        dateStr,
      time:        timeStr,
      location:    event.location,
      description: event.description || "",
      maxAttendees:event.maxAttendees,
      tags:        (event.tags||[]).join(", "),
      photoFile:   null,
      photoPreview:event.photoURL || null,
    });
    setEditingEvent(event);
    setSelectedEvent(null);
    setShowEditEvent(true);
  }

  async function handleEditEvent(e) {
    e.preventDefault();
    if (!editForm.title || !editForm.date || !editForm.location) {
      showToast("Please fill in title, date and location", "error"); return;
    }
    setLoading(true);
    try {
      await updateEvent(editingEvent.id, {
        title:       editForm.title,
        category:    editForm.category,
        date:        new Date(editForm.date),
        time:        editForm.time,
        location:    editForm.location,
        description: editForm.description,
        maxAttendees:parseInt(editForm.maxAttendees) || 30,
        tags:        editForm.tags.split(",").map(t=>t.trim()).filter(Boolean),
        photoFile:   editForm.photoFile,
        existingPhotoURL: editingEvent.photoURL || null,
      });
      setShowEditEvent(false);
      setEditingEvent(null);
      showToast("Event updated!");
    } catch (err) {
      showToast(err.message, "error");
    } finally { setLoading(false); }
  }

  async function handleDeleteEvent() {
    setLoading(true);
    try {
      await deleteEvent(editingEvent.id);
      setShowDeleteConfirm(false);
      setShowEditEvent(false);
      setEditingEvent(null);
      showToast("Event deleted");
    } catch (err) {
      showToast(err.message, "error");
    } finally { setLoading(false); }
  }

  async function handleToggleRsvp(eventId) {
    if (!user) { setShowLogin(true); return; }
    try {
      const attending = await toggleRsvp(eventId, user.uid);
      setRsvpd(prev => attending ? [...prev, eventId] : prev.filter(id => id !== eventId));
      showToast(attending ? "You're going! 🎉" : "RSVP cancelled");
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  // ── filtering ─────────────────────────────────────────────

  const now = new Date();
  const filtered = events.filter(e => {
    if (category !== "All" && e.category !== category) return false;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase()) && !e.location.toLowerCase().includes(search.toLowerCase())) return false;
    if (dateFilter === "today")   { return e.date.toDateString() === now.toDateString(); }
    if (dateFilter === "tomorrow"){ const t=new Date(now);t.setDate(t.getDate()+1);return e.date.toDateString()===t.toDateString(); }
    if (dateFilter === "week")    { const w=new Date(now);w.setDate(w.getDate()+7);return e.date>=now&&e.date<=w; }
    if (dateFilter === "weekend") { const d=e.date.getDay();return(d===0||d===6)&&e.date>=now; }
    if (dateFilter === "custom" && customDate){ return e.date.toDateString()===new Date(customDate).toDateString(); }
    return true;
  });

  const mapEvents = filtered.map(e => ({
    ...e,
    _x: Math.min(88, Math.max(8, 25 + ((e.lng - 8.64)/0.08)*50)),
    _y: Math.min(88, Math.max(8, 15 + ((50.135 - e.lat)/0.04)*70)),
  }));

  // ── styles ────────────────────────────────────────────────

  const inputStyle = { width:"100%",padding:"10px 14px",borderRadius:10,border:"1px solid #d1d5db",background:"#ffffff",color:"#111827",fontSize:14,boxSizing:"border-box",outline:"none" };
  const labelStyle = { fontSize:11,fontWeight:700,color:"#6b7280",marginBottom:4,display:"block",letterSpacing:"0.06em",textTransform:"uppercase" };
  const btnPrimary = { background:"#4f46e5",color:"white",border:"none",borderRadius:10,padding:"11px 22px",fontWeight:600,fontSize:14,cursor:"pointer",width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:8 };
  const errStyle   = { fontSize:12,color:"#ef4444",marginTop:-8 };

  if (authLoading) return <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",gap:12 }}><Spinner/><span style={{ color:"var(--color-text-secondary)" }}>Loading meetly…</span></div>;

  return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif",minHeight:"100vh",background:"var(--color-background-tertiary)" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── Header ── */}
      <header style={{ background:"var(--color-background-primary)",borderBottom:"1px solid var(--color-border-tertiary)",position:"sticky",top:0,zIndex:100 }}>
        <div style={{ maxWidth:1100,margin:"0 auto",padding:"0 20px",height:60,display:"flex",alignItems:"center",gap:14 }}>
          <div style={{ fontSize:20,fontWeight:800,color:"#4f46e5",letterSpacing:"-0.5px",flexShrink:0 }}>🗓 meetly</div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search events…" style={{ ...inputStyle,flex:1,maxWidth:300,height:36,padding:"0 12px",borderRadius:8 }}/>
          <nav style={{ display:"flex",gap:4,marginLeft:"auto" }}>
            {["events","map"].map(v=>(
              <button key={v} onClick={()=>setView(v)} style={{ background:view===v?"#4f46e5":"transparent",color:view===v?"white":"var(--color-text-secondary)",border:view===v?"none":"1px solid var(--color-border-tertiary)",borderRadius:8,padding:"6px 14px",fontWeight:500,fontSize:13,cursor:"pointer" }}>
                {v==="events"?"📋 Events":"🗺 Map"}
              </button>
            ))}
          </nav>
          <button onClick={()=>setShowCreateEvent(true)} style={{ background:"#4f46e5",color:"white",border:"none",borderRadius:8,padding:"7px 14px",fontWeight:600,fontSize:13,cursor:"pointer",flexShrink:0 }}>+ Host</button>
          {user ? (
            <div style={{ display:"flex",alignItems:"center",gap:8,cursor:"pointer" }} onClick={handleLogout} title="Click to sign out">
              <Avatar initials={(userProfile?.name||user.displayName||"U").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()} size={34} photo={userProfile?.photoURL||user.photoURL}/>
              <span style={{ fontSize:13,fontWeight:500,color:"var(--color-text-primary)" }}>{(userProfile?.name||user.displayName||"User").split(" ")[0]}</span>
            </div>
          ) : (
            <button onClick={()=>setShowLogin(true)} style={{ background:"transparent",border:"1px solid var(--color-border-secondary)",borderRadius:8,padding:"6px 14px",fontWeight:500,fontSize:13,cursor:"pointer",color:"var(--color-text-primary)",flexShrink:0 }}>Sign in</button>
          )}
        </div>
      </header>

      {/* ── Filters ── */}
      <div style={{ background:"var(--color-background-primary)",borderBottom:"1px solid var(--color-border-tertiary)",position:"sticky",top:60,zIndex:99 }}>
        <div style={{ maxWidth:1100,margin:"0 auto",padding:"8px 20px",display:"flex",gap:8,overflowX:"auto",alignItems:"center" }}>
          <div style={{ display:"flex",gap:4,flexShrink:0 }}>
            {["all","today","tomorrow","week","weekend","custom"].map(f=>(
              <button key={f} onClick={()=>setDateFilter(f)} style={{ background:dateFilter===f?"#4f46e5":"var(--color-background-secondary)",color:dateFilter===f?"white":"var(--color-text-secondary)",border:"1px solid "+(dateFilter===f?"#4f46e5":"var(--color-border-tertiary)"),borderRadius:20,padding:"4px 12px",fontSize:12,fontWeight:500,cursor:"pointer",whiteSpace:"nowrap" }}>
                {f==="all"?"Any date":f==="today"?"Today":f==="tomorrow"?"Tomorrow":f==="week"?"This week":f==="weekend"?"Weekend":"Pick date"}
              </button>
            ))}
            {dateFilter==="custom"&&<input type="date" value={customDate} onChange={e=>setCustomDate(e.target.value)} style={{ ...inputStyle,width:140,height:30,padding:"0 10px",fontSize:12 }}/>}
          </div>
          <div style={{ width:1,height:20,background:"var(--color-border-tertiary)",flexShrink:0 }}/>
          <div style={{ display:"flex",gap:4 }}>
            {CATEGORIES.map(c=>(
              <button key={c} onClick={()=>setCategory(c)} style={{ background:category===c?(COLORS[c]||"#4f46e5"):"var(--color-background-secondary)",color:category===c?"white":"var(--color-text-secondary)",border:"1px solid "+(category===c?(COLORS[c]||"#4f46e5"):"var(--color-border-tertiary)"),borderRadius:20,padding:"4px 12px",fontSize:12,fontWeight:500,cursor:"pointer",whiteSpace:"nowrap" }}>{c}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      <main style={{ maxWidth:1100,margin:"0 auto",padding:"24px 20px" }}>

        {/* Events grid */}
        {view==="events"&&(
          evtLoading ? (
            <div style={{ display:"flex",alignItems:"center",gap:12,padding:40,justifyContent:"center" }}><Spinner/><span style={{ color:"var(--color-text-secondary)" }}>Loading events…</span></div>
          ) : filtered.length===0 ? (
            <div style={{ textAlign:"center",padding:"60px 20px",color:"var(--color-text-secondary)" }}>
              <div style={{ fontSize:48,marginBottom:12 }}>🔍</div>
              <div style={{ fontSize:16,fontWeight:500 }}>No events match your filters</div>
              <div style={{ fontSize:13,marginTop:6 }}>Try adjusting the date or category filters</div>
            </div>
          ) : (
            <>
              <div style={{ fontSize:13,color:"var(--color-text-secondary)",marginBottom:16 }}>{filtered.length} upcoming event{filtered.length!==1?"s":""}</div>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:16 }}>
                {filtered.map(e=><EventCard key={e.id} event={e} onClick={()=>setSelectedEvent(e)}/>)}
              </div>
            </>
          )
        )}

        {/* Map view */}
        {view==="map"&&(
          <div style={{ display:"grid",gridTemplateColumns:"1fr 300px",gap:20,height:"70vh" }}>
            <div style={{ background:"var(--color-background-primary)",border:"1px solid var(--color-border-tertiary)",borderRadius:16,overflow:"hidden",position:"relative" }}>
              <div style={{ position:"absolute",inset:0,background:"linear-gradient(135deg,#e8f4e8,#c8dfc8)" }}>
                <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style={{ position:"absolute",inset:0,opacity:0.25 }}>
                  <defs><pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="#4f46e5" strokeWidth="0.5"/></pattern></defs>
                  <rect width="100%" height="100%" fill="url(#g)"/>
                  <text x="50%" y="35%" textAnchor="middle" fill="#4f46e5" fontSize="13" fontWeight="600" opacity="0.5">Frankfurt am Main</text>
                  <path d="M 5% 52% Q 30% 54% 50% 50% Q 70% 46% 95% 48%" stroke="#87ceeb" strokeWidth="8" fill="none" opacity="0.4"/>
                  <text x="30%" y="55%" textAnchor="middle" fill="#3b82f6" fontSize="10" opacity="0.5">Main River</text>
                </svg>
              </div>
              {mapEvents.map(e=>(
                <div key={e.id} onClick={()=>setActiveMapEvent(activeMapEvent?.id===e.id?null:e)} title={e.title} style={{ position:"absolute",left:`${e._x}%`,top:`${e._y}%`,transform:"translate(-50%,-50%)",zIndex:activeMapEvent?.id===e.id?10:2,cursor:"pointer" }}>
                  <div style={{ width:activeMapEvent?.id===e.id?18:13,height:activeMapEvent?.id===e.id?18:13,borderRadius:"50%",background:COLORS[e.category],border:activeMapEvent?.id===e.id?"3px solid white":"2px solid white",boxShadow:activeMapEvent?.id===e.id?"0 0 0 3px "+COLORS[e.category]:"0 2px 6px rgba(0,0,0,0.25)",transition:"all 0.2s" }}/>
                </div>
              ))}
              {activeMapEvent&&(
                <div style={{ position:"absolute",bottom:16,left:"50%",transform:"translateX(-50%)",background:"var(--color-background-primary)",borderRadius:12,padding:"12px 16px",border:"1px solid var(--color-border-tertiary)",boxShadow:"0 8px 24px rgba(0,0,0,0.12)",width:260,cursor:"pointer" }} onClick={()=>{setSelectedEvent(activeMapEvent);setActiveMapEvent(null);}}>
                  <Badge label={activeMapEvent.category}/>
                  <div style={{ fontSize:14,fontWeight:600,marginTop:6 }}>{activeMapEvent.title}</div>
                  <div style={{ fontSize:12,color:"var(--color-text-secondary)",marginTop:2 }}>📍 {activeMapEvent.location}</div>
                  <div style={{ fontSize:12,color:"var(--color-text-secondary)" }}>👤 {activeMapEvent.attendees} attending</div>
                </div>
              )}
            </div>
            <div style={{ overflow:"auto",display:"flex",flexDirection:"column",gap:8 }}>
              <div style={{ fontSize:12,fontWeight:700,color:"var(--color-text-secondary)",letterSpacing:"0.06em",marginBottom:4 }}>{filtered.length} EVENTS</div>
              {filtered.map(e=>(
                <div key={e.id} onClick={()=>setActiveMapEvent(e)} style={{ background:"var(--color-background-primary)",border:`1px solid ${activeMapEvent?.id===e.id?"#4f46e5":"var(--color-border-tertiary)"}`,borderRadius:12,padding:"10px 12px",cursor:"pointer",transition:"all 0.15s" }}>
                  <div style={{ display:"flex",gap:10,alignItems:"flex-start" }}>
                    <div style={{ width:34,height:34,borderRadius:8,background:COLORS[e.category]+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0 }}>{EMOJI[e.category]||"📍"}</div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:13,fontWeight:600,color:"var(--color-text-primary)",lineHeight:1.3 }}>{e.title}</div>
                      <div style={{ fontSize:11,color:"var(--color-text-secondary)",marginTop:2 }}>{e.date.toLocaleDateString("en-DE",{month:"short",day:"numeric"})} · {e.attendees} going</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── Event Detail Modal ── */}
      {selectedEvent&&(
        <Modal onClose={()=>setSelectedEvent(null)}>
          <div>
            <div style={{ height:200,background:`linear-gradient(135deg,${COLORS[selectedEvent.category]}22,${COLORS[selectedEvent.category]}55)`,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",borderRadius:"20px 20px 0 0",overflow:"hidden" }}>
              {selectedEvent.photoURL?<img src={selectedEvent.photoURL} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>:<div style={{ fontSize:64 }}>{EMOJI[selectedEvent.category]||"📍"}</div>}
            </div>
            <div style={{ padding:"20px 24px 24px" }}>
              <div style={{ display:"flex",gap:8,marginBottom:10,flexWrap:"wrap" }}>
                <Badge label={selectedEvent.category}/>
                {(selectedEvent.tags||[]).map(t=><span key={t} style={{ background:"var(--color-background-secondary)",color:"var(--color-text-secondary)",borderRadius:20,padding:"2px 10px",fontSize:11 }}>{t}</span>)}
              </div>
              <h2 style={{ fontSize:22,fontWeight:700,margin:"0 0 8px",lineHeight:1.2 }}>{selectedEvent.title}</h2>
              <div style={{ display:"flex",gap:16,marginBottom:14,flexWrap:"wrap" }}>
                <span style={{ fontSize:13,color:"var(--color-text-secondary)" }}>📅 {selectedEvent.date.toLocaleDateString("en-DE",{weekday:"long",year:"numeric",month:"long",day:"numeric"})} · {selectedEvent.date.toLocaleTimeString("en-DE",{hour:"2-digit",minute:"2-digit"})}</span>
                <span style={{ fontSize:13,color:"var(--color-text-secondary)" }}>📍 {selectedEvent.location}</span>
              </div>
              <p style={{ fontSize:14,lineHeight:1.7,color:"var(--color-text-primary)",marginBottom:16 }}>{selectedEvent.description}</p>
              <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:16,padding:"12px 14px",background:"var(--color-background-secondary)",borderRadius:12 }}>
                <Avatar initials={(selectedEvent.hostName||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()} size={40} photo={selectedEvent.hostAvatar} color={COLORS[selectedEvent.category]}/>
                <div>
                  <div style={{ fontSize:11,color:"var(--color-text-secondary)",fontWeight:600 }}>HOSTED BY</div>
                  <div style={{ fontSize:14,fontWeight:600 }}>{selectedEvent.hostName}</div>
                </div>
                <div style={{ marginLeft:"auto",textAlign:"right" }}>
                  <div style={{ fontSize:20,fontWeight:700,color:COLORS[selectedEvent.category] }}>{selectedEvent.attendees}</div>
                  <div style={{ fontSize:11,color:"var(--color-text-secondary)" }}>of {selectedEvent.maxAttendees}</div>
                </div>
              </div>
              {user && user.uid === selectedEvent.hostUid ? (
                <div style={{ display:"flex",gap:10 }}>
                  <button onClick={()=>openEditModal(selectedEvent)} style={{ ...btnPrimary,background:"#4f46e5" }}>✏️ Edit event</button>
                  <button onClick={()=>{setEditingEvent(selectedEvent);setShowDeleteConfirm(true);}} style={{ ...btnPrimary,background:"#ef4444",width:"auto",padding:"11px 20px" }}>🗑</button>
                </div>
              ) : (
                <button onClick={()=>handleToggleRsvp(selectedEvent.id)} style={{ ...btnPrimary,background:rsvpd.includes(selectedEvent.id)?"#22c55e":"#4f46e5" }}>
                  {rsvpd.includes(selectedEvent.id)?"✓ You're going! (click to cancel)":"RSVP — Join this event"}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* ── Login Modal ── */}
      {showLogin&&(
        <Modal onClose={()=>setShowLogin(false)}>
          <div style={{ padding:"32px 28px" }}>
            <h2 style={{ fontSize:22,fontWeight:700,margin:"0 0 6px" }}>Welcome back</h2>
            <p style={{ fontSize:14,color:"var(--color-text-secondary)",marginBottom:24 }}>Sign in to RSVP and create events</p>
            <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
              <div><label style={labelStyle}>Email</label><input type="email" value={loginForm.email} onChange={e=>setLoginForm(p=>({...p,email:e.target.value}))} placeholder="you@example.com" style={inputStyle}/></div>
              <div><label style={labelStyle}>Password</label><input type="password" value={loginForm.password} onChange={e=>setLoginForm(p=>({...p,password:e.target.value}))} placeholder="••••••••" style={inputStyle}/></div>
              {loginForm.error&&<p style={errStyle}>{loginForm.error}</p>}
              <button onClick={handleLogin} style={btnPrimary} disabled={loading}>{loading?<Spinner/>:"Sign in"}</button>
              <p style={{ textAlign:"center",fontSize:13,color:"var(--color-text-secondary)" }}>New here? <span onClick={()=>{setShowLogin(false);setShowRegister(true);}} style={{ color:"#4f46e5",cursor:"pointer",fontWeight:600 }}>Create account</span></p>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Register Modal ── */}
      {showRegister&&(
        <Modal onClose={()=>setShowRegister(false)}>
          <div style={{ padding:"32px 28px" }}>
            <h2 style={{ fontSize:22,fontWeight:700,margin:"0 0 6px" }}>Join meetly</h2>
            <p style={{ fontSize:14,color:"var(--color-text-secondary)",marginBottom:24 }}>Connect with people in your city</p>
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              <div>
                <label style={labelStyle}>Profile photo</label>
                <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                  <div onClick={()=>regPhotoRef.current.click()} style={{ width:64,height:64,borderRadius:"50%",border:"2px dashed var(--color-border-secondary)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden",background:"var(--color-background-secondary)" }}>
                    {regForm.photoPreview?<img src={regForm.photoPreview} style={{ width:"100%",height:"100%",objectFit:"cover" }}/>:<span style={{ fontSize:26 }}>📷</span>}
                  </div>
                  <span style={{ fontSize:12,color:"var(--color-text-secondary)" }}>Click to upload photo (max 5 MB)</span>
                  <input ref={regPhotoRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>handlePhotoUpload(e,setRegForm)}/>
                </div>
              </div>
              <div><label style={labelStyle}>Full name</label><input value={regForm.name} onChange={e=>setRegForm(p=>({...p,name:e.target.value}))} placeholder="Your name" style={inputStyle}/></div>
              <div><label style={labelStyle}>Email</label><input type="email" value={regForm.email} onChange={e=>setRegForm(p=>({...p,email:e.target.value}))} placeholder="you@example.com" style={inputStyle}/></div>
              <div><label style={labelStyle}>Password</label><input type="password" value={regForm.password} onChange={e=>setRegForm(p=>({...p,password:e.target.value}))} placeholder="Min 6 characters" style={inputStyle}/></div>
              <div><label style={labelStyle}>Bio (optional)</label><textarea value={regForm.bio} onChange={e=>setRegForm(p=>({...p,bio:e.target.value}))} placeholder="Tell others about yourself…" style={{ ...inputStyle,height:70,resize:"vertical" }}/></div>
              {regForm.error&&<p style={errStyle}>{regForm.error}</p>}
              <button onClick={handleRegister} style={btnPrimary} disabled={loading}>{loading?<Spinner/>:"Create account"}</button>
              <p style={{ textAlign:"center",fontSize:13,color:"var(--color-text-secondary)" }}>Already have one? <span onClick={()=>{setShowRegister(false);setShowLogin(true);}} style={{ color:"#4f46e5",cursor:"pointer",fontWeight:600 }}>Sign in</span></p>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Create Event Modal ── */}
      {showCreateEvent&&(
        <Modal onClose={()=>setShowCreateEvent(false)}>
          <div style={{ padding:"32px 28px" }}>
            <h2 style={{ fontSize:22,fontWeight:700,margin:"0 0 6px" }}>Host an event</h2>
            <p style={{ fontSize:14,color:"var(--color-text-secondary)",marginBottom:24 }}>Share something great with your community</p>
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              <div>
                <label style={labelStyle}>Cover photo</label>
                <div onClick={()=>eventPhotoRef.current.click()} style={{ height:120,borderRadius:12,border:"2px dashed var(--color-border-secondary)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden",background:"var(--color-background-secondary)" }}>
                  {createForm.photoPreview?<img src={createForm.photoPreview} style={{ width:"100%",height:"100%",objectFit:"cover" }}/>:<div style={{ textAlign:"center" }}><div style={{ fontSize:28 }}>🖼</div><div style={{ fontSize:12,color:"var(--color-text-secondary)",marginTop:6 }}>Click to upload (max 10 MB)</div></div>}
                </div>
                <input ref={eventPhotoRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>handlePhotoUpload(e,setCreateForm)}/>
              </div>
              <div><label style={labelStyle}>Title *</label><input value={createForm.title} onChange={e=>setCreateForm(p=>({...p,title:e.target.value}))} placeholder="Give your event a great name" style={inputStyle}/></div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                <div><label style={labelStyle}>Category</label>
                  <select value={createForm.category} onChange={e=>setCreateForm(p=>({...p,category:e.target.value}))} style={{ ...inputStyle }}>
                    {CATEGORIES.filter(c=>c!=="All").map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Max attendees</label><input type="number" value={createForm.maxAttendees} onChange={e=>setCreateForm(p=>({...p,maxAttendees:e.target.value}))} min={1} style={inputStyle}/></div>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                <div><label style={labelStyle}>Date *</label><input type="date" value={createForm.date} onChange={e=>setCreateForm(p=>({...p,date:e.target.value}))} style={inputStyle}/></div>
                <div><label style={labelStyle}>Time</label><input type="time" value={createForm.time} onChange={e=>setCreateForm(p=>({...p,time:e.target.value}))} style={inputStyle}/></div>
              </div>
              <div><label style={labelStyle}>Location *</label><input value={createForm.location} onChange={e=>setCreateForm(p=>({...p,location:e.target.value}))} placeholder="Venue name or address" style={inputStyle}/></div>
              <div><label style={labelStyle}>Description</label><textarea value={createForm.description} onChange={e=>setCreateForm(p=>({...p,description:e.target.value}))} placeholder="What can attendees expect?" style={{ ...inputStyle,height:80,resize:"vertical" }}/></div>
              <div><label style={labelStyle}>Tags (comma-separated)</label><input value={createForm.tags} onChange={e=>setCreateForm(p=>({...p,tags:e.target.value}))} placeholder="React, Networking, Beginner-friendly" style={inputStyle}/></div>
              <button onClick={handleCreateEvent} style={btnPrimary} disabled={loading}>{loading?<Spinner/>:(user?"Publish event":"Sign in to publish")}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Edit Event Modal ── */}
      {showEditEvent&&(
        <Modal onClose={()=>setShowEditEvent(false)}>
          <div style={{ padding:"32px 28px" }}>
            <h2 style={{ fontSize:22,fontWeight:700,margin:"0 0 6px",color:"#111827" }}>Edit event</h2>
            <p style={{ fontSize:14,color:"#6b7280",marginBottom:24 }}>Update your event details</p>
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              <div>
                <label style={labelStyle}>Cover photo</label>
                <div onClick={()=>eventPhotoRef.current.click()} style={{ height:100,borderRadius:12,border:"2px dashed #d1d5db",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",overflow:"hidden",background:"#f9fafb" }}>
                  {editForm.photoPreview?<img src={editForm.photoPreview} style={{ width:"100%",height:"100%",objectFit:"cover" }}/>:<div style={{ textAlign:"center" }}><div style={{ fontSize:24 }}>🖼</div><div style={{ fontSize:12,color:"#6b7280",marginTop:4 }}>Click to change photo</div></div>}
                </div>
                <input ref={eventPhotoRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>handlePhotoUpload(e,setEditForm)}/>
              </div>
              <div><label style={labelStyle}>Title *</label><input value={editForm.title} onChange={e=>setEditForm(p=>({...p,title:e.target.value}))} style={inputStyle}/></div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                <div><label style={labelStyle}>Category</label>
                  <select value={editForm.category} onChange={e=>setEditForm(p=>({...p,category:e.target.value}))} style={{...inputStyle}}>
                    {CATEGORIES.filter(c=>c!=="All").map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label style={labelStyle}>Max attendees</label><input type="number" value={editForm.maxAttendees} onChange={e=>setEditForm(p=>({...p,maxAttendees:e.target.value}))} min={1} style={inputStyle}/></div>
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                <div><label style={labelStyle}>Date *</label><input type="date" value={editForm.date} onChange={e=>setEditForm(p=>({...p,date:e.target.value}))} style={inputStyle}/></div>
                <div><label style={labelStyle}>Time</label><input type="time" value={editForm.time} onChange={e=>setEditForm(p=>({...p,time:e.target.value}))} style={inputStyle}/></div>
              </div>
              <div><label style={labelStyle}>Location *</label><input value={editForm.location} onChange={e=>setEditForm(p=>({...p,location:e.target.value}))} style={inputStyle}/></div>
              <div><label style={labelStyle}>Description</label><textarea value={editForm.description} onChange={e=>setEditForm(p=>({...p,description:e.target.value}))} style={{...inputStyle,height:80,resize:"vertical"}}/></div>
              <div><label style={labelStyle}>Tags (comma-separated)</label><input value={editForm.tags} onChange={e=>setEditForm(p=>({...p,tags:e.target.value}))} style={inputStyle}/></div>
              <div style={{ display:"flex",gap:10 }}>
                <button onClick={handleEditEvent} style={{...btnPrimary,background:"#4f46e5"}} disabled={loading}>{loading?<Spinner/>:"Save changes"}</button>
                <button onClick={()=>{setShowDeleteConfirm(true);}} style={{...btnPrimary,background:"#ef4444",width:"auto",padding:"11px 20px",flexShrink:0}} disabled={loading}>🗑</button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirm Modal ── */}
      {showDeleteConfirm&&(
        <Modal onClose={()=>setShowDeleteConfirm(false)}>
          <div style={{ padding:"32px 28px",textAlign:"center" }}>
            <div style={{ fontSize:48,marginBottom:16 }}>🗑️</div>
            <h2 style={{ fontSize:20,fontWeight:700,margin:"0 0 8px",color:"#111827" }}>Delete this event?</h2>
            <p style={{ fontSize:14,color:"#6b7280",marginBottom:24 }}>This can't be undone. All RSVPs will be lost.</p>
            <div style={{ display:"flex",gap:10 }}>
              <button onClick={()=>setShowDeleteConfirm(false)} style={{...btnPrimary,background:"#f3f4f6",color:"#374151"}}>Cancel</button>
              <button onClick={handleDeleteEvent} style={{...btnPrimary,background:"#ef4444"}} disabled={loading}>{loading?<Spinner/>:"Yes, delete"}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Toast ── */}
      {toast&&<Toast msg={toast.msg} type={toast.type}/>}
    </div>
  );
}
