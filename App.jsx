import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

const TEAM_LEADERS = [
  "Anoop Nandan","Ansari Arief SI","Radhakrishnan Sankaran","Revathi Nallathambi",
  "Suresh CR","Aswin Jaganathan","Rajesh Balaji","Sundaravadivel Paranjothi",
  "Vaideeshwar Gopal","Karthikeyan L R","Madhu Shah","Sushim Dey",
  "Thimmaiah AH","Vignesh Kumar"
]

const SHIFTS = [
  "05:30–14:30","06:30–15:30","12:30–21:30","14:30–23:30",
  "17:30–02:30","18:30–03:30","20:30–05:30","21:30–06:30"
]

// SIMPLE flat lookup — emails handled in the 1-hour contest window → flat incentive
function getIncentive(n) {
  const c = Number(n) || 0
  if (c >= 15) return 250
  if (c >= 12) return 200
  if (c >= 10) return 150
  if (c >= 8)  return 100
  return 0
}

function nextSlab(n) {
  const c = Number(n) || 0
  if (c < 8)  return { need: 8  - c, amt: 100 }
  if (c < 10) return { need: 10 - c, amt: 150 }
  if (c < 12) return { need: 12 - c, amt: 200 }
  if (c < 15) return { need: 15 - c, amt: 250 }
  return null
}

const blankForm = () => ({
  agent_name: '', agent_email: '', shift: '', team_leader: '',
  date: new Date().toISOString().split('T')[0],
  regular_hours: '', ot_hours: '', contest_emails: '', case_ids: ''
})

const ADMIN_PASSWORD = 'admin123'

export default function App() {
  const [view, setView]               = useState('agent')
  const [form, setForm]               = useState(blankForm())
  const [entries, setEntries]         = useState([])
  const [loading, setLoading]         = useState(false)
  const [flash, setFlash]             = useState('')
  const [adminPass, setAdminPass]     = useState('')
  const [adminUnlocked, setAdminUnlocked] = useState(false)
  const [adminError, setAdminError]       = useState(false)
  const [filterTL, setFilterTL]           = useState('')
  const [filterAgent, setFilterAgent]     = useState('')
  const [summaryView, setSummaryView]     = useState('daily')
  const [expandedEntry, setExpandedEntry] = useState(null)

  useEffect(() => { if (adminUnlocked) fetchEntries() }, [adminUnlocked])

  async function fetchEntries() {
    setLoading(true)
    const { data, error } = await supabase.from('ot_entries').select('*').order('created_at', { ascending: false })
    if (!error) setEntries(data || [])
    setLoading(false)
  }

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setFlash('') }

  async function submitEntry() {
    if (!form.agent_name||!form.agent_email||!form.shift||!form.team_leader||!form.contest_emails) { setFlash('error'); return }
    setLoading(true)
    const { error } = await supabase.from('ot_entries').insert([{
      agent_name: form.agent_name, agent_email: form.agent_email,
      shift: form.shift, team_leader: form.team_leader, date: form.date,
      regular_hours: Number(form.regular_hours)||0, ot_hours: Number(form.ot_hours)||0,
      contest_emails: Number(form.contest_emails)||0, case_ids: form.case_ids||''
    }])
    setLoading(false)
    if (error) { setFlash('supaerror'); return }
    setFlash('ok'); setForm(blankForm()); setTimeout(() => setFlash(''), 4000)
  }

  function unlockAdmin() {
    if (adminPass === ADMIN_PASSWORD) { setAdminUnlocked(true); setAdminError(false) }
    else setAdminError(true)
  }

  const inc       = getIncentive(form.contest_emails)
  const ns        = nextSlab(form.contest_emails)
  const count     = Number(form.contest_emails) || 0
  const ot        = Number(form.ot_hours) || 0
  const parsedIds = form.case_ids.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)

  const filtered   = entries.filter(e => (!filterTL||e.team_leader===filterTL)&&(!filterAgent||e.agent_name===filterAgent))
  const agentNames = [...new Set(entries.map(e => e.agent_name))].filter(Boolean).sort()
  const byDate     = filtered.reduce((a,e) => { (a[e.date]=a[e.date]||[]).push(e); return a }, {})
  const totEmails  = filtered.reduce((s,e) => s+(e.contest_emails||0), 0)
  const totOT      = filtered.reduce((s,e) => s+(e.ot_hours||0), 0)
  const totInc     = filtered.reduce((s,e) => s+getIncentive(e.contest_emails), 0)

  const byTL = TEAM_LEADERS.map(tl => {
    const rows = filtered.filter(e => e.team_leader===tl)
    return { tl, count:rows.length, emails:rows.reduce((s,e)=>s+(e.contest_emails||0),0), inc:rows.reduce((s,e)=>s+getIncentive(e.contest_emails),0), ot:rows.reduce((s,e)=>s+(e.ot_hours||0),0) }
  }).filter(r => r.count>0)

  const byShift = SHIFTS.map(sh => {
    const rows = filtered.filter(e => e.shift===sh)
    return { sh, count:rows.length, emails:rows.reduce((s,e)=>s+(e.contest_emails||0),0), inc:rows.reduce((s,e)=>s+getIncentive(e.contest_emails),0) }
  }).filter(r => r.count>0)

  const GCOLS  = "2fr 1.1fr 1.3fr 0.6fr 0.6fr 0.9fr 0.9fr"
  const GHEADS = ["Agent","Shift","Team leader","Reg hrs","OT hrs","Contest emails","Incentive"]

  const s = {
    page:     { minHeight:'100vh', background:'#f5f5f0', paddingBottom:'4rem' },
    topBar:   { background:'#085041', padding:'12px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' },
    topTitle: { color:'#fff', fontSize:16, fontWeight:600 },
    topSub:   { color:'rgba(255,255,255,0.7)', fontSize:12, marginTop:2 },
    vtBtn: a => ({ padding:'6px 14px', borderRadius:20, border:'none', cursor:'pointer', fontSize:12, fontWeight:500, background:a?'#fff':'transparent', color:a?'#085041':'rgba(255,255,255,0.8)' }),
    wrap:     { maxWidth:860, margin:'0 auto', padding:'1.25rem 1rem' },
    card:     { background:'#fff', border:'1px solid #e0ded6', borderRadius:12, padding:'1.25rem', marginBottom:'1rem' },
    sec:      { fontSize:11, fontWeight:600, color:'#0F6E56', letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:14 },
    g2:       { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 },
    lbl:      { display:'block', fontSize:12, color:'#5f5e5a', marginBottom:5, fontWeight:500 },
    req:      { color:'#D85A30' },
    inp:      { width:'100%' },
    sel:      { width:'100%' },
    ta:       { width:'100%', minHeight:80, resize:'vertical' },
    flash: ok => ({ background:ok?'#E1F5EE':'#FAECE7', color:ok?'#085041':'#993C1D', border:`1px solid ${ok?'#5DCAA5':'#F0997B'}`, borderRadius:8, padding:'10px 14px', fontSize:13, fontWeight:500, marginBottom:14 }),
    submitBtn:{ background:'#1D9E75', color:'#fff', border:'none', borderRadius:8, padding:'11px 30px', fontSize:14, fontWeight:600, cursor:'pointer', marginRight:8 },
    resetBtn: { background:'transparent', color:'#5f5e5a', border:'1px solid #d3d1c7', borderRadius:8, padding:'11px 18px', fontSize:14, cursor:'pointer' },
    tabBar:   { display:'flex', marginBottom:'1.25rem', borderBottom:'1px solid #e0ded6' },
    tBtn:  a => ({ padding:'9px 18px', border:'none', background:'transparent', cursor:'pointer', fontSize:13, fontWeight:a?600:400, color:a?'#1D9E75':'#888780', borderBottom:a?'2px solid #1D9E75':'2px solid transparent', marginBottom:-1 }),
    metricGrid:{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:'1rem' },
    metric:   { background:'#f1efe8', borderRadius:10, padding:'14px 16px', textAlign:'center' },
    mVal:     { fontSize:22, fontWeight:700, color:'#1a1a18', display:'block' },
    mLbl:     { fontSize:11, color:'#888780', marginTop:3, display:'block' },
    thRow: cols => ({ display:'grid', gridTemplateColumns:cols, gap:8, fontSize:11, fontWeight:600, color:'#888780', textTransform:'uppercase', padding:'6px 0', borderBottom:'1px solid #d3d1c7', letterSpacing:'0.04em' }),
    tr:    cols => ({ display:'grid', gridTemplateColumns:cols, gap:8, fontSize:13, padding:'9px 0', borderBottom:'1px solid #e0ded6', alignItems:'center' }),
    totRow:cols => ({ display:'grid', gridTemplateColumns:cols, gap:8, fontSize:12, padding:'8px 10px', background:'#f1efe8', borderRadius:8, marginTop:6, alignItems:'center', fontWeight:600 }),
    stBtn: a => ({ padding:'6px 14px', border:`1px solid ${a?'#1D9E75':'#d3d1c7'}`, background:a?'#E1F5EE':'transparent', color:a?'#085041':'#888780', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:a?600:400 }),
    caseTag:  { fontSize:11, background:'#f1efe8', border:'1px solid #d3d1c7', borderRadius:4, padding:'2px 8px', display:'inline-block', marginBottom:2 },
    expandBtn:{ fontSize:11, color:'#0F6E56', background:'transparent', border:'none', cursor:'pointer', padding:0, marginTop:3 },
    spinner:  { textAlign:'center', padding:'2rem', color:'#888780', fontSize:14 },
  }

  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <div>
          <div style={s.topTitle}>Agent Contest &amp; OT Tracker</div>
          <div style={s.topSub}>OS Shift · Chat / Email · 1-hour contest window</div>
        </div>
        <div style={{display:'flex',gap:4}}>
          <button style={s.vtBtn(view==='agent')} onClick={()=>setView('agent')}>Agent view</button>
          <button style={s.vtBtn(view==='admin')} onClick={()=>setView('admin')}>Admin / TL view</button>
        </div>
      </div>

      {view==='agent' && (
        <div style={s.wrap}>
          {flash==='ok'        && <div style={s.flash(true)}>✓ Entry submitted successfully!</div>}
          {flash==='error'     && <div style={s.flash(false)}>Please fill in all required fields marked *</div>}
          {flash==='supaerror' && <div style={s.flash(false)}>Submission failed — please check your connection and try again.</div>}

          <div style={s.card}>
            <p style={s.sec}>Agent details</p>
            <div style={s.g2}>
              <div><label style={s.lbl}>Agent name <span style={s.req}>*</span></label><input style={s.inp} value={form.agent_name} onChange={e=>set('agent_name',e.target.value)} placeholder="Full name"/></div>
              <div><label style={s.lbl}>Email ID <span style={s.req}>*</span></label><input style={s.inp} type="email" value={form.agent_email} onChange={e=>set('agent_email',e.target.value)} placeholder="work@company.com"/></div>
              <div>
                <label style={s.lbl}>Shift <span style={s.req}>*</span></label>
                <select style={s.sel} value={form.shift} onChange={e=>set('shift',e.target.value)}>
                  <option value="">Select shift…</option>
                  {SHIFTS.map(sh=><option key={sh}>{sh}</option>)}
                </select>
              </div>
              <div>
                <label style={s.lbl}>Team leader <span style={s.req}>*</span></label>
                <select style={s.sel} value={form.team_leader} onChange={e=>set('team_leader',e.target.value)}>
                  <option value="">Select TL…</option>
                  {TEAM_LEADERS.map(tl=><option key={tl}>{tl}</option>)}
                </select>
              </div>
            </div>
            <div><label style={s.lbl}>Date</label><input style={{...s.inp,maxWidth:190}} type="date" value={form.date} onChange={e=>set('date',e.target.value)}/></div>
          </div>

          <div style={s.card}>
            <p style={s.sec}>Hours worked</p>
            <div style={s.g2}>
              <div><label style={s.lbl}>Regular hours</label><input style={s.inp} type="number" min="0" max="12" step="0.5" value={form.regular_hours} onChange={e=>set('regular_hours',e.target.value)} placeholder="e.g. 8"/></div>
              <div>
                <label style={s.lbl}>OT hours</label>
                <input style={s.inp} type="number" min="0" max="12" step="0.5" value={form.ot_hours} onChange={e=>set('ot_hours',e.target.value)} placeholder="e.g. 2"/>
                {ot>0 && <span style={{fontSize:11,color:'#0F6E56',marginTop:4,display:'block'}}>OT will be paid extra</span>}
              </div>
            </div>
          </div>

          <div style={s.card}>
            <p style={s.sec}>Contest — emails handled in the 1-hour window</p>
            <p style={{fontSize:12,color:'#5f5e5a',marginBottom:16,marginTop:-8}}>Enter only the emails / chats you handled during the specific contest hour.</p>
            <div style={{maxWidth:220,marginBottom:16}}>
              <label style={s.lbl}>Emails / chats handled <span style={s.req}>*</span></label>
              <input style={s.inp} type="number" min="0" value={form.contest_emails} onChange={e=>set('contest_emails',e.target.value)} placeholder="e.g. 12"/>
            </div>

            <div style={{background:'#f1efe8',border:'1px solid #e0ded6',borderRadius:10,padding:'14px 16px',marginBottom:count>0?12:0}}>
              <div style={{fontSize:11,color:'#888780',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10}}>Incentive slabs — 1 hour window</div>
              {[[8,100],[10,150],[12,200],[15,250]].map(([n,amt])=>{
                const reached  = count>=n
                const isActive = inc===amt && inc>0
                return (
                  <div key={n} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',borderRadius:6,marginBottom:3,background:isActive?'#1D9E75':reached?'#E1F5EE':'transparent'}}>
                    <span style={{fontSize:13,fontWeight:reached?600:400,color:isActive?'#fff':reached?'#085041':'#5f5e5a'}}>{isActive||reached?'✓ ':'○ '}{n} emails in the hour</span>
                    <span style={{fontSize:14,fontWeight:600,color:isActive?'#fff':reached?'#085041':'#b4b2a9'}}>₹{amt}</span>
                  </div>
                )
              })}
            </div>

            {count>0 && (
              <div style={{background:inc>0?'#E1F5EE':'#FAECE7',border:`1px solid ${inc>0?'#5DCAA5':'#F0997B'}`,borderRadius:10,padding:'16px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
                <div>
                  <div style={{fontSize:12,color:inc>0?'#0F6E56':'#993C1D',marginBottom:4}}>{inc>0?'Contest incentive earned':'Does not qualify yet'}</div>
                  <div style={{fontSize:40,fontWeight:700,lineHeight:1,color:inc>0?'#085041':'#993C1D'}}>{inc>0?`₹${inc}`:'₹0'}</div>
                  {inc>0&&ot>0&&<div style={{fontSize:12,color:'#085041',marginTop:6}}>+ OT pay for {ot}h (paid separately)</div>}
                  {inc===0&&ns&&<div style={{fontSize:12,color:'#993C1D',marginTop:6}}>{ns.need} more email{ns.need!==1?'s':''} needed to earn ₹{ns.amt}</div>}
                  {inc>0&&ns&&<div style={{fontSize:12,color:'#085041',marginTop:6}}>{ns.need} more → next slab ₹{ns.amt}</div>}
                  {inc>0&&!ns&&<div style={{fontSize:12,color:'#085041',marginTop:6}}>Maximum slab reached!</div>}
                </div>
                <div style={{fontSize:14,fontWeight:600,background:'rgba(255,255,255,0.8)',borderRadius:8,padding:'10px 16px',color:inc>0?'#085041':'#993C1D'}}>
                  {count} emails → {inc>0?`₹${inc}`:'₹0'}
                </div>
              </div>
            )}
          </div>

          <div style={s.card}>
            <p style={s.sec}>Case IDs handled during OT hours</p>
            <p style={{fontSize:12,color:'#5f5e5a',marginBottom:10,marginTop:-8}}>One per line or comma-separated.</p>
            <textarea style={s.ta} value={form.case_ids} onChange={e=>set('case_ids',e.target.value)} placeholder={"CASE-001\nCASE-002\nor: CASE-001, CASE-002"}/>
            {parsedIds.length>0&&(
              <div style={{marginTop:10}}>
                <span style={{fontSize:12,color:'#5f5e5a',marginBottom:6,display:'block'}}>{parsedIds.length} case {parsedIds.length===1?'ID':'IDs'} entered</span>
                <div style={{display:'flex',flexWrap:'wrap',gap:4,marginTop:4}}>{parsedIds.map((c,i)=><span key={i} style={s.caseTag}>{c}</span>)}</div>
              </div>
            )}
          </div>

          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <button style={s.submitBtn} onClick={submitEntry} disabled={loading}>{loading?'Submitting…':'Submit entry'}</button>
            <button style={s.resetBtn} onClick={()=>{setForm(blankForm());setFlash('')}}>Reset</button>
          </div>
        </div>
      )}

      {view==='admin' && !adminUnlocked && (
        <div style={{...s.wrap,maxWidth:400,paddingTop:'3rem'}}>
          <div style={s.card}>
            <p style={{fontSize:16,fontWeight:600,color:'#1a1a18',marginBottom:6}}>Admin / TL access</p>
            <p style={{fontSize:13,color:'#5f5e5a',marginBottom:16}}>Enter the admin password to view all submissions and summaries.</p>
            <label style={s.lbl}>Password</label>
            <input style={{...s.inp,marginBottom:10}} type="password" value={adminPass} onChange={e=>setAdminPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&unlockAdmin()} placeholder="Enter password…"/>
            {adminError&&<p style={{fontSize:12,color:'#993C1D',marginBottom:8}}>Incorrect password.</p>}
            <button style={s.submitBtn} onClick={unlockAdmin}>Unlock</button>
          </div>
        </div>
      )}

      {view==='admin' && adminUnlocked && (
        <div style={s.wrap}>
          <div style={s.tabBar}>
            <span style={{...s.tBtn(true),cursor:'default'}}>
              Summary
              {entries.length>0&&<span style={{marginLeft:6,background:'#1D9E75',color:'#fff',borderRadius:99,fontSize:10,padding:'1px 5px'}}>{entries.length}</span>}
            </span>
            <button style={{marginLeft:'auto',fontSize:12,padding:'8px 14px',border:'1px solid #d3d1c7',borderRadius:8,background:'transparent',cursor:'pointer',color:'#5f5e5a'}} onClick={fetchEntries}>↻ Refresh</button>
          </div>
          {loading&&<div style={s.spinner}>Loading entries…</div>}
          {!loading&&(
            <>
              <div style={s.metricGrid}>
                {[['Total entries',entries.length],['Contest emails',totEmails],['Total OT hours',totOT.toFixed(1)+'h'],['Total incentive','₹'+totInc.toLocaleString()]].map(([l,v])=>(
                  <div key={l} style={s.metric}><span style={s.mVal}>{v}</span><span style={s.mLbl}>{l}</span></div>
                ))}
              </div>
              <div style={{display:'flex',gap:8,marginBottom:'1rem',flexWrap:'wrap',alignItems:'center'}}>
                <div style={{display:'flex',gap:4}}>
                  {[['daily','Day-wise'],['overall','Overall']].map(([id,lbl])=>(
                    <button key={id} style={s.stBtn(summaryView===id)} onClick={()=>setSummaryView(id)}>{lbl}</button>
                  ))}
                </div>
                <select style={{fontSize:13}} value={filterTL} onChange={e=>setFilterTL(e.target.value)}>
                  <option value="">All team leaders</option>
                  {TEAM_LEADERS.map(tl=><option key={tl}>{tl}</option>)}
                </select>
                <select style={{fontSize:13}} value={filterAgent} onChange={e=>setFilterAgent(e.target.value)}>
                  <option value="">All agents</option>
                  {agentNames.map(n=><option key={n}>{n}</option>)}
                </select>
              </div>

              {summaryView==='daily'&&(
                <div>
                  {filtered.length===0&&<div style={s.spinner}>No entries found.</div>}
                  {Object.keys(byDate).sort((a,b)=>b.localeCompare(a)).map(date=>{
                    const rows=byDate[date]
                    const dEmails=rows.reduce((s,e)=>s+(e.contest_emails||0),0)
                    const dOT=rows.reduce((s,e)=>s+(e.ot_hours||0),0)
                    const dReg=rows.reduce((s,e)=>s+(e.regular_hours||0),0)
                    const dInc=rows.reduce((s,e)=>s+getIncentive(e.contest_emails),0)
                    const qual=rows.filter(e=>getIncentive(e.contest_emails)>0).length
                    return (
                      <div key={date} style={s.card}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
                          <div>
                            <div style={{fontSize:15,fontWeight:600,color:'#1a1a18'}}>{new Date(date+'T12:00:00').toLocaleDateString('en-IN',{weekday:'long',day:'2-digit',month:'long',year:'numeric'})}</div>
                            <div style={{fontSize:12,color:'#5f5e5a',marginTop:3}}>{rows.length} {rows.length===1?'entry':'entries'} · {qual} qualified · {dReg.toFixed(1)} reg hrs · {dOT.toFixed(1)} OT hrs</div>
                          </div>
                          <div style={{textAlign:'right',flexShrink:0}}>
                            <div style={{fontSize:11,color:'#5f5e5a'}}>Day incentive</div>
                            <div style={{fontSize:20,fontWeight:700,color:'#085041'}}>₹{dInc}</div>
                          </div>
                        </div>
                        <div style={s.thRow(GCOLS)}>{GHEADS.map(h=><span key={h}>{h}</span>)}</div>
                        {rows.sort((a,b)=>getIncentive(b.contest_emails)-getIncentive(a.contest_emails)).map(e=>{
                          const einc=getIncentive(e.contest_emails)
                          const cids=e.case_ids?e.case_ids.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean):[]
                          const expanded=expandedEntry===e.id
                          return (
                            <div key={e.id}>
                              <div style={s.tr(GCOLS)}>
                                <div>
                                  <div style={{fontWeight:600,fontSize:13}}>{e.agent_name}</div>
                                  <div style={{fontSize:11,color:'#5f5e5a'}}>{e.agent_email}</div>
                                  {cids.length>0&&<button style={s.expandBtn} onClick={()=>setExpandedEntry(expanded?null:e.id)}>{expanded?'▲ Hide':'▼ Show'} {cids.length} case {cids.length===1?'ID':'IDs'}</button>}
                                </div>
                                <span style={{fontSize:12,color:'#5f5e5a'}}>{e.shift}</span>
                                <span style={{fontSize:12,color:'#5f5e5a'}}>{e.team_leader}</span>
                                <span style={{fontSize:13}}>{e.regular_hours||'—'}h</span>
                                <span style={{fontSize:13}}>{e.ot_hours||0}h</span>
                                <span style={{fontSize:13,fontWeight:600}}>{e.contest_emails||0}</span>
                                <span style={{fontSize:13,fontWeight:600,color:einc>0?'#085041':'#b4b2a9'}}>{einc>0?`₹${einc}`:'—'}</span>
                              </div>
                              {expanded&&cids.length>0&&(
                                <div style={{padding:'8px',borderBottom:'1px solid #e0ded6',background:'#f5f5f0',borderRadius:4,marginBottom:2}}>
                                  <div style={{fontSize:11,color:'#5f5e5a',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.05em'}}>Case IDs · {cids.length} total</div>
                                  <div style={{display:'flex',flexWrap:'wrap',gap:4}}>{cids.map((c,i)=><span key={i} style={s.caseTag}>{c}</span>)}</div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                        <div style={s.totRow(GCOLS)}>
                          <span>Day total</span><span></span><span></span>
                          <span>{dReg.toFixed(1)}h</span><span>{dOT.toFixed(1)}h</span>
                          <span>{dEmails}</span><span style={{color:'#085041'}}>₹{dInc}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {summaryView==='overall'&&(
                <div>
                  <div style={s.card}>
                    <p style={s.sec}>By team leader</p>
                    <div style={s.thRow('2fr 1fr 1fr 1fr 1fr')}>{['Team leader','Agents','Contest emails','OT hrs','Incentive'].map(h=><span key={h}>{h}</span>)}</div>
                    {byTL.length===0&&<p style={{fontSize:13,color:'#888780',marginTop:10}}>No data.</p>}
                    {byTL.sort((a,b)=>b.inc-a.inc).map(r=>(
                      <div key={r.tl} style={s.tr('2fr 1fr 1fr 1fr 1fr')}>
                        <span style={{fontWeight:600,fontSize:13}}>{r.tl}</span>
                        <span style={{fontSize:13}}>{r.count}</span><span style={{fontSize:13}}>{r.emails}</span>
                        <span style={{fontSize:13}}>{r.ot.toFixed(1)}h</span>
                        <span style={{fontSize:13,fontWeight:600,color:r.inc>0?'#085041':'#b4b2a9'}}>{r.inc>0?`₹${r.inc}`:'—'}</span>
                      </div>
                    ))}
                    {byTL.length>0&&(
                      <div style={s.totRow('2fr 1fr 1fr 1fr 1fr')}>
                        <span>Grand total</span><span>{entries.length}</span><span>{totEmails}</span>
                        <span>{totOT.toFixed(1)}h</span><span style={{color:'#085041'}}>₹{totInc}</span>
                      </div>
                    )}
                  </div>
                  <div style={s.card}>
                    <p style={s.sec}>By shift</p>
                    <div style={s.thRow('1.5fr 1fr 1fr 1fr')}>{['Shift','Entries','Contest emails','Incentive'].map(h=><span key={h}>{h}</span>)}</div>
                    {byShift.length===0&&<p style={{fontSize:13,color:'#888780',marginTop:10}}>No data.</p>}
                    {byShift.map(r=>(
                      <div key={r.sh} style={s.tr('1.5fr 1fr 1fr 1fr')}>
                        <span style={{fontWeight:600,fontSize:13}}>{r.sh}</span>
                        <span style={{fontSize:13}}>{r.count}</span><span style={{fontSize:13}}>{r.emails}</span>
                        <span style={{fontSize:13,fontWeight:600,color:r.inc>0?'#085041':'#b4b2a9'}}>{r.inc>0?`₹${r.inc}`:'—'}</span>
                      </div>
                    ))}
                  </div>
                  <div style={s.card}>
                    <p style={s.sec}>Agent leaderboard</p>
                    <div style={s.thRow('0.4fr 2fr 1.2fr 1fr 0.6fr 0.9fr 0.9fr')}>{['#','Agent','Team leader','Shift','OT hrs','Contest emails','Incentive'].map(h=><span key={h}>{h}</span>)}</div>
                    {filtered.length===0&&<p style={{fontSize:13,color:'#888780',marginTop:10}}>No data.</p>}
                    {[...filtered].sort((a,b)=>getIncentive(b.contest_emails)-getIncentive(a.contest_emails)||(b.contest_emails||0)-(a.contest_emails||0)).map((e,i)=>{
                      const einc=getIncentive(e.contest_emails)
                      return (
                        <div key={e.id} style={s.tr('0.4fr 2fr 1.2fr 1fr 0.6fr 0.9fr 0.9fr')}>
                          <span style={{fontSize:i<3?16:12,color:i<3?'#085041':'#888780'}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1}</span>
                          <div><div style={{fontWeight:600,fontSize:13}}>{e.agent_name}</div><div style={{fontSize:11,color:'#5f5e5a'}}>{e.date}</div></div>
                          <span style={{fontSize:12,color:'#5f5e5a'}}>{e.team_leader}</span>
                          <span style={{fontSize:12,color:'#5f5e5a'}}>{e.shift}</span>
                          <span style={{fontSize:13}}>{e.ot_hours||0}h</span>
                          <span style={{fontSize:13,fontWeight:600}}>{e.contest_emails||0}</span>
                          <span style={{fontSize:13,fontWeight:600,color:einc>0?'#085041':'#b4b2a9'}}>{einc>0?`₹${einc}`:'—'}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
