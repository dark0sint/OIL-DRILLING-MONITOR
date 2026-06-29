[drill_analysis_dashboard_preview.html](https://github.com/user-attachments/files/29450790/drill_analysis_dashboard_preview.html)[Uploading drill_analysis_dashboard_prev
<style>
  .dash { background: #020617; color: white; font-family: monospace; padding: 16px; border-radius: 12px; }
  .hdr { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  .hdr-left { display: flex; align-items: center; gap: 10px; }
  .spin { font-size: 24px; display: inline-block; }
  .title { font-size: 13px; font-weight: 700; letter-spacing: 1px; color: #fff; }
  .sub { font-size: 9px; color: #64748b; letter-spacing: 2px; }
  .live-dot { width: 8px; height: 8px; border-radius: 50%; background: #10b981; display: inline-block; margin-right: 5px; }
  .btn { background: transparent; border: 1px solid rgba(239,68,68,0.4); color: #f87171; font-family: monospace; font-size: 9px; padding: 4px 10px; border-radius: 6px; cursor: pointer; letter-spacing: 1px; }
  .depth-bar { background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 10px; margin-bottom: 10px; }
  .depth-val { font-size: 20px; font-weight: 700; color: #fff; }
  .depth-track { height: 6px; background: #334155; border-radius: 9px; overflow: hidden; margin-top: 6px; }
  .depth-fill { height: 100%; background: linear-gradient(90deg,#1d4ed8,#06b6d4); border-radius: 9px; transition: width 0.5s; }
  .gauges { display: grid; grid-template-columns: repeat(6,1fr); gap: 6px; margin-bottom: 10px; }
  .gauge-wrap { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 6px; display: flex; flex-direction: column; align-items: center; gap: 3px; }
  .gauge-val { font-size: 14px; font-weight: 700; color: #fff; }
  .gauge-label { font-size: 8px; color: #64748b; letter-spacing: 1px; }
  .main { display: grid; grid-template-columns: 2fr 1fr; gap: 10px; }
  .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .card { background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 10px; }
  .card.warn { border-color: rgba(245,158,11,0.4); background: rgba(120,53,15,0.2); }
  .card.crit { border-color: rgba(239,68,68,0.4); background: rgba(127,29,29,0.25); }
  .card-label { font-size: 9px; color: #64748b; letter-spacing: 2px; margin-bottom: 4px; }
  .card-val { font-size: 22px; font-weight: 700; color: #fff; }
  .card-val.warn { color: #fbbf24; }
  .card-val.crit { color: #f87171; }
  .card-unit { font-size: 10px; color: #475569; margin-left: 3px; }
  .sparkline { width: 100%; height: 32px; }
  .right-col { display: flex; flex-direction: column; gap: 8px; }
  .formation-panel { background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 10px; }
  .panel-label { font-size: 9px; color: #64748b; letter-spacing: 2px; margin-bottom: 8px; }
  .formation-track { position: relative; height: 200px; }
  .f-layer { position: absolute; left: 0; right: 0; display: flex; align-items: center; padding: 0 6px; overflow: hidden; border-bottom: 1px solid rgba(51,65,85,0.3); }
  .f-name { font-size: 9px; }
  .depth-line { position: absolute; left: 0; right: 0; height: 1px; background: #10b981; z-index: 10; }
  .depth-tag { position: absolute; right: 0; top: -12px; font-size: 8px; color: #10b981; background: #020617; padding: 0 3px; }
  .alert-panel { background: #1e293b; border: 1px solid #334155; border-radius: 10px; padding: 10px; }
  .alert { padding: 6px 8px; border-radius: 6px; margin-bottom: 5px; }
  .alert.crit { background: rgba(127,29,29,0.3); border: 1px solid rgba(239,68,68,0.3); }
  .alert.warn { background: rgba(120,53,15,0.2); border: 1px solid rgba(245,158,11,0.3); }
  .alert.info { background: rgba(6,78,59,0.2); border: 1px solid rgba(16,185,129,0.3); }
  .alert-msg { font-size: 9px; }
  .alert.crit .alert-msg { color: #fca5a5; }
  .alert.warn .alert-msg { color: #fcd34d; }
  .alert.info .alert-msg { color: #6ee7b7; }
  .footer { margin-top: 10px; display: flex; justify-content: space-between; font-size: 8px; color: #334155; }
</style>

<div class="dash" id="dashboard">
  <h2 class="sr-only">Real-time oil drilling analysis dashboard for well TXL-47A showing live sensor data including depth, pressure, temperature, gas levels, and formation information</h2>

  <div class="hdr">
    <div class="hdr-left">
      <span class="spin" id="drillBit">⚙</span>
      <div>
        <div class="title">OIL DRILLING MONITOR</div>
        <div class="sub">REAL-TIME ANALYSIS · WELL TXL-47A</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;">
      <span><span class="live-dot" id="liveDot"></span><span style="font-size:9px;color:#64748b" id="liveLabel">LIVE</span></span>
      <button class="btn" id="pauseBtn" onclick="togglePause()">⏸ PAUSE</button>
    </div>
  </div>

  <div class="depth-bar">
    <div style="display:flex;justify-content:space-between;align-items:baseline;">
      <div><span class="depth-val" id="depthVal">3840</span><span style="font-size:10px;color:#475569;margin-left:4px">ft</span></div>
      <span style="font-size:9px;color:#64748b" id="depthPct">45.2% of 8,500 ft TD</span>
    </div>
    <div class="depth-track"><div class="depth-fill" id="depthFill" style="width:45.2%"></div></div>
  </div>

  <div class="gauges" id="gaugeGrid"></div>

  <div class="main">
    <div class="cards" id="cardGrid"></div>
    <div class="right-col">
      <div class="formation-panel">
        <div class="panel-label">FORMATION LOG</div>
        <div class="formation-track" id="formationTrack"></div>
      </div>
      <div class="alert-panel">
        <div class="panel-label">SYSTEM ALERTS</div>
        <div id="alertList"></div>
      </div>
    </div>
  </div>

  <div class="footer">
    <span id="lastUpdate">LAST UPDATE: --:--:--</span>
    <span>PERMIAN BASIN · EXEMPLAR ENERGY INC.</span>
    <span>SYSTEM: ONLINE</span>
  </div>
</div>

<script>
const FORMATIONS = [
  { name: "Surface Casing", top: 0, bot: 1200, type: "shale", color: "#6B7280", por: 12 },
  { name: "Wilcox Sand", top: 1200, bot: 2800, type: "sandstone", color: "#F59E0B", por: 24 },
  { name: "Austin Chalk", top: 2800, bot: 4100, type: "limestone", color: "#3B82F6", por: 8 },
  { name: "Eagle Ford Shale", top: 4100, bot: 5600, type: "shale", color: "#6B7280", por: 6 },
  { name: "Buda Limestone", top: 5600, bot: 6800, type: "dolomite", color: "#8B5CF6", por: 14 },
  { name: "Edwards Lime", top: 6800, bot: 8500, type: "limestone", color: "#3B82F6", por: 18 },
];

let state = { wob:18, rop:55, rpm:120, torque:8500, pressure:2400, mw:12.2, temp:210, depth:3840, gas:12, vib:30 };
let history = { wob:[], rop:[], rpm:[], torque:[], pressure:[], mw:[], temp:[], depth:[], gas:[], vib:[] };
let running = true;
let MAX_H = 50;

function rw(v, d, mn, mx) { return Math.min(mx, Math.max(mn, v + (Math.random()-0.5)*d)); }

function tick() {
  state.wob = rw(state.wob, 2.5, 5, 35);
  state.rop = rw(state.rop, 8, 10, 120);
  state.rpm = rw(state.rpm, 5, 60, 200);
  state.torque = rw(state.torque, 800, 2000, 18000);
  state.pressure = rw(state.pressure, 120, 800, 4200);
  state.mw = rw(state.mw, 0.15, 8.5, 16.5);
  state.temp = rw(state.temp, 2, 140, 340);
  state.depth = state.depth + Math.random()*1.2 + 0.2;
  state.gas = rw(state.gas, 3, 0, 100);
  state.vib = rw(state.vib, 10, 0, 100);
  for (const k of Object.keys(history)) {
    history[k].push(state[k]);
    if (history[k].length > MAX_H) history[k].shift();
  }
}

function sparklineSVG(data, mn, mx, color, danger, warning) {
  if (data.length < 2) return '';
  const w = 130, h = 28, range = mx - mn || 1;
  const pts = data.map((v,i) => {
    const x = (i/(data.length-1))*w;
    const y = h - ((v-mn)/range)*h;
    return x.toFixed(1)+','+y.toFixed(1);
  }).join(' ');
  const last = data[data.length-1];
  const isDanger = danger && last >= danger, isWarn = warning && last >= warning && !isDanger;
  const c = isDanger ? '#EF4444' : isWarn ? '#F59E0B' : color;
  const lx = w, ly = h - ((data[data.length-1]-mn)/range)*h;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="width:100%">
    <polyline points="0,${h} ${pts} ${w},${h}" fill="${c}" fill-opacity="0.13" stroke="none"/>
    <polyline points="${pts}" fill="none" stroke="${c}" stroke-width="1.5" stroke-linejoin="round"/>
    <circle cx="${lx}" cy="${ly.toFixed(1)}" r="3" fill="${c}"/>
  </svg>`;
}

function gaugeArc(v, mn, mx, label, unit, color, danger, warning) {
  const pct = Math.min(1, Math.max(0, (v-mn)/(mx-mn)));
  const r=28, cx=32, cy=32, startA=-220, sweepA=260;
  const toRad = d => d*Math.PI/180;
  const arc = (start, sweep) => {
    const e = start+sweep;
    const sx=cx+r*Math.cos(toRad(start)), sy=cy+r*Math.sin(toRad(start));
    const ex=cx+r*Math.cos(toRad(e)), ey=cy+r*Math.sin(toRad(e));
    return `M${sx.toFixed(1)} ${sy.toFixed(1)} A${r} ${r} 0 ${Math.abs(sweep)>180?1:0} 1 ${ex.toFixed(1)} ${ey.toFixed(1)}`;
  };
  const isDanger = danger && v>=danger, isWarn = warning && v>=warning && !isDanger;
  const c = isDanger ? '#EF4444' : isWarn ? '#F59E0B' : color;
  return `<div class="gauge-wrap">
    <svg width="64" height="64" viewBox="0 0 64 64">
      <path d="${arc(startA,sweepA)}" fill="none" stroke="#1e293b" stroke-width="5" stroke-linecap="round"/>
      ${pct>0?`<path d="${arc(startA,sweepA*pct)}" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`:''}
      <text x="${cx}" y="${cy-1}" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="10" font-weight="700" font-family="monospace">${Math.round(v)}</text>
      <text x="${cx}" y="${cy+9}" text-anchor="middle" fill="#64748b" font-size="7" font-family="monospace">${unit}</text>
    </svg>
    <div class="gauge-label">${label}</div>
  </div>`;
}

function cardClass(v, danger, warning) {
  if (danger && v >= danger) return 'crit';
  if (warning && v >= warning) return 'warn';
  return '';
}
function valClass(v, danger, warning) {
  if (danger && v >= danger) return 'crit';
  if (warning && v >= warning) return 'warn';
  return '';
}

function renderAll() {
  const d = state;
  const pct = Math.min(100, (d.depth/8500)*100);
  document.getElementById('depthVal').textContent = Math.round(d.depth).toLocaleString();
  document.getElementById('depthPct').textContent = pct.toFixed(1)+'% of 8,500 ft TD';
  document.getElementById('depthFill').style.width = pct.toFixed(1)+'%';

  document.getElementById('gaugeGrid').innerHTML = [
    gaugeArc(d.wob,5,35,'WOB','klbs','#06B6D4',33,28),
    gaugeArc(d.rop,10,120,'ROP','ft/hr','#10B981'),
    gaugeArc(d.rpm,60,200,'RPM','rpm','#3B82F6',190,170),
    gaugeArc(d.torque,2000,18000,'TORQUE','ft-lb','#8B5CF6',16000,14000),
    gaugeArc(d.mw,8.5,16.5,'MUD WT','ppg','#F59E0B',16,15),
    gaugeArc(d.vib,0,100,'VIB','idx','#EF4444',80,60),
  ].join('');

  const cards = [
    { label:'STANDPIPE PRESSURE', key:'pressure', val:Math.round(d.pressure), unit:'psi', color:'#3B82F6', danger:3800, warning:3200, mn:800, mx:4200 },
    { label:'BOTTOM-HOLE TEMP', key:'temp', val:Math.round(d.temp), unit:'°F', color:'#F97316', danger:320, warning:280, mn:140, mx:340 },
    { label:'TOTAL GAS', key:'gas', val:d.gas.toFixed(1), unit:'%', color:'#A78BFA', danger:75, warning:45, mn:0, mx:100 },
    { label:'RATE OF PENETRATION', key:'rop', val:d.rop.toFixed(1), unit:'ft/hr', color:'#10B981', mn:10, mx:120 },
  ];
  document.getElementById('cardGrid').innerHTML = cards.map(c => `
    <div class="card ${cardClass(parseFloat(c.val),c.danger,c.warning)}">
      <div class="card-label">${c.label}</div>
      <div><span class="card-val ${valClass(parseFloat(c.val),c.danger,c.warning)}">${c.val}</span><span class="card-unit">${c.unit}</span></div>
      ${sparklineSVG(history[c.key], c.mn, c.mx, c.color, c.danger, c.warning)}
    </div>
  `).join('');

  // formation track
  const totalDepth = 8500, trackH = 200;
  let fHTML = FORMATIONS.map(f => {
    const top = (f.top/totalDepth)*trackH;
    const h = Math.max(((f.bot-f.top)/totalDepth)*trackH, 4);
    const isActive = d.depth>=f.top && d.depth<f.bot;
    const hexA = isActive ? '40' : '20';
    return `<div class="f-layer" style="top:${top.toFixed(1)}px;height:${h.toFixed(1)}px;background:${f.color}${hexA};border-left:3px solid ${isActive?f.color:'transparent'}">
      ${h>14?`<span class="f-name" style="color:${f.color};opacity:${isActive?1:0.7}">${f.name}${isActive?' ▶':''}</span>`:''}
    </div>`;
  }).join('');
  const lineY = (d.depth/totalDepth)*trackH;
  fHTML += `<div class="depth-line" style="top:${lineY.toFixed(1)}px"><span class="depth-tag">${Math.round(d.depth)}ft</span></div>`;
  document.getElementById('formationTrack').innerHTML = fHTML;

  // alerts
  const alerts = [];
  if (d.gas>75) alerts.push({cls:'crit',msg:`Total gas ${d.gas.toFixed(1)}% — possible kick detected`});
  else if (d.gas>45) alerts.push({cls:'warn',msg:`Total gas elevated at ${d.gas.toFixed(1)}%`});
  if (d.pressure>3800) alerts.push({cls:'crit',msg:`Standpipe pressure critical: ${Math.round(d.pressure)} psi`});
  else if (d.pressure>3200) alerts.push({cls:'warn',msg:`High standpipe pressure: ${Math.round(d.pressure)} psi`});
  if (d.vib>80) alerts.push({cls:'crit',msg:`Severe BHA vibration index ${Math.round(d.vib)}`});
  else if (d.vib>60) alerts.push({cls:'warn',msg:`BHA vibration elevated: ${Math.round(d.vib)}`});
  if (d.temp>300) alerts.push({cls:'warn',msg:`Bottom-hole temp ${Math.round(d.temp)}°F — monitor closely`});
  if (!alerts.length) alerts.push({cls:'info',msg:'All parameters within nominal range'});
  document.getElementById('alertList').innerHTML = alerts.slice(0,4).map(a=>`<div class="alert ${a.cls}"><div class="alert-msg">${a.msg}</div></div>`).join('');
  document.getElementById('lastUpdate').textContent = 'LAST UPDATE: '+new Date().toLocaleTimeString('en-US',{hour12:false});
}

let spinAngle = 0;
let lastTs = 0;
let tickTimer = 0;
let INTERVAL = 800;

function animate(ts) {
  if (!lastTs) lastTs = ts;
  const dt = ts - lastTs; lastTs = ts;
  if (running) {
    const rpm = state.rpm || 120;
    spinAngle = (spinAngle + rpm * dt * 0.006) % 360;
    document.getElementById('drillBit').style.transform = `rotate(${spinAngle.toFixed(1)}deg)`;
    tickTimer += dt;
    if (tickTimer >= INTERVAL) { tick(); renderAll(); tickTimer = 0; }
  }
  requestAnimationFrame(animate);
}

function togglePause() {
  running = !running;
  const btn = document.getElementById('pauseBtn');
  const dot = document.getElementById('liveDot');
  const lbl = document.getElementById('liveLabel');
  btn.textContent = running ? '⏸ PAUSE' : '▶ RESUME';
  btn.style.borderColor = running ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)';
  btn.style.color = running ? '#f87171' : '#6ee7b7';
  dot.style.background = running ? '#10b981' : '#ef4444';
  lbl.textContent = running ? 'LIVE' : 'PAUSED';
}

for (const k of Object.keys(history)) history[k].push(state[k]);
renderAll();
requestAnimationFrame(animate);
</script>
iew.html…]()
