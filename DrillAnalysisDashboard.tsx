import { useState, useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DrillMetric {
  timestamp: number;
  wob: number;       // Weight on Bit (klbs)
  rop: number;       // Rate of Penetration (ft/hr)
  rpm: number;       // Rotary Speed (RPM)
  torque: number;    // Torque (ft-lbs)
  pressure: number;  // Standpipe Pressure (psi)
  mw: number;        // Mud Weight (ppg)
  temp: number;      // Bottom-hole Temperature (°F)
  depth: number;     // Current Depth (ft)
  gas: number;       // Total Gas (%)
  vibration: number; // Vibration Index (0–100)
}

interface Alert {
  id: string;
  level: "critical" | "warning" | "info";
  message: string;
  timestamp: number;
}

interface FormationLayer {
  name: string;
  topDepth: number;
  bottomDepth: number;
  lithology: "sandstone" | "shale" | "limestone" | "dolomite";
  porosity: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_HISTORY = 60;

const FORMATIONS: FormationLayer[] = [
  { name: "Surface Casing", topDepth: 0, bottomDepth: 1200, lithology: "shale", porosity: 12 },
  { name: "Wilcox Sand", topDepth: 1200, bottomDepth: 2800, lithology: "sandstone", porosity: 24 },
  { name: "Austin Chalk", topDepth: 2800, bottomDepth: 4100, lithology: "limestone", porosity: 8 },
  { name: "Eagle Ford Shale", topDepth: 4100, bottomDepth: 5600, lithology: "shale", porosity: 6 },
  { name: "Buda Limestone", topDepth: 5600, bottomDepth: 6800, lithology: "dolomite", porosity: 14 },
  { name: "Edwards Lime", topDepth: 6800, bottomDepth: 8500, lithology: "limestone", porosity: 18 },
];

const LITHOLOGY_COLORS: Record<FormationLayer["lithology"], string> = {
  sandstone: "#F59E0B",
  shale: "#6B7280",
  limestone: "#3B82F6",
  dolomite: "#8B5CF6",
};

const LITHOLOGY_PATTERNS: Record<FormationLayer["lithology"], string> = {
  sandstone: "⠒⠒",
  shale: "─",
  limestone: "≈",
  dolomite: "◇",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const randomWalk = (prev: number, delta: number, min: number, max: number) =>
  clamp(prev + (Math.random() - 0.5) * delta, min, max);

function generateNext(prev: DrillMetric): DrillMetric {
  const depth = prev.depth + (Math.random() * 1.2 + 0.2);
  return {
    timestamp: Date.now(),
    wob: randomWalk(prev.wob, 2.5, 5, 35),
    rop: randomWalk(prev.rop, 8, 10, 120),
    rpm: randomWalk(prev.rpm, 5, 60, 200),
    torque: randomWalk(prev.torque, 800, 2000, 18000),
    pressure: randomWalk(prev.pressure, 120, 800, 4200),
    mw: randomWalk(prev.mw, 0.15, 8.5, 16.5),
    temp: randomWalk(prev.temp, 2, 140, 340),
    depth,
    gas: randomWalk(prev.gas, 3, 0, 100),
    vibration: randomWalk(prev.vibration, 10, 0, 100),
  };
}

function getInitialMetric(): DrillMetric {
  return {
    timestamp: Date.now(),
    wob: 18,
    rop: 55,
    rpm: 120,
    torque: 8500,
    pressure: 2400,
    mw: 12.2,
    temp: 210,
    depth: 3840,
    gas: 12,
    vibration: 30,
  };
}

function getCurrentFormation(depth: number): FormationLayer {
  return (
    FORMATIONS.find((f) => depth >= f.topDepth && depth < f.bottomDepth) ??
    FORMATIONS[FORMATIONS.length - 1]
  );
}

function getAlerts(metric: DrillMetric): Alert[] {
  const alerts: Alert[] = [];
  if (metric.gas > 75)
    alerts.push({ id: "gas-crit", level: "critical", message: `Total gas ${metric.gas.toFixed(1)}% — possible kick detected`, timestamp: metric.timestamp });
  else if (metric.gas > 45)
    alerts.push({ id: "gas-warn", level: "warning", message: `Total gas elevated at ${metric.gas.toFixed(1)}%`, timestamp: metric.timestamp });

  if (metric.pressure > 3800)
    alerts.push({ id: "pres-crit", level: "critical", message: `Standpipe pressure critical: ${metric.pressure.toFixed(0)} psi`, timestamp: metric.timestamp });
  else if (metric.pressure > 3200)
    alerts.push({ id: "pres-warn", level: "warning", message: `High standpipe pressure: ${metric.pressure.toFixed(0)} psi`, timestamp: metric.timestamp });

  if (metric.vibration > 80)
    alerts.push({ id: "vib-crit", level: "critical", message: `Severe BHA vibration index ${metric.vibration.toFixed(0)}`, timestamp: metric.timestamp });
  else if (metric.vibration > 60)
    alerts.push({ id: "vib-warn", level: "warning", message: `BHA vibration elevated: ${metric.vibration.toFixed(0)}`, timestamp: metric.timestamp });

  if (metric.temp > 300)
    alerts.push({ id: "temp-warn", level: "warning", message: `Bottom-hole temp ${metric.temp.toFixed(0)}°F — monitor closely`, timestamp: metric.timestamp });

  if (alerts.length === 0)
    alerts.push({ id: "nominal", level: "info", message: "All parameters within nominal range", timestamp: metric.timestamp });

  return alerts;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", { hour12: false });
}

// ─── Sparkline SVG ────────────────────────────────────────────────────────────

interface SparklineProps {
  data: number[];
  min: number;
  max: number;
  color: string;
  width?: number;
  height?: number;
  danger?: number;
  warning?: number;
  current: number;
}

function Sparkline({ data, min, max, color, width = 120, height = 36, danger, warning, current }: SparklineProps) {
  if (data.length < 2) return null;
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const isWarning = warning !== undefined && current >= warning;
  const isDanger = danger !== undefined && current >= danger;
  const lineColor = isDanger ? "#EF4444" : isWarning ? "#F59E0B" : color;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      {/* area fill */}
      <polyline
        points={`0,${height} ${pts} ${width},${height}`}
        fill={lineColor}
        fillOpacity={0.12}
        stroke="none"
      />
      {/* line */}
      <polyline points={pts} fill="none" stroke={lineColor} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      {/* last dot */}
      {data.length > 0 && (() => {
        const last = data[data.length - 1];
        const lx = width;
        const ly = height - ((last - min) / range) * height;
        return <circle cx={lx} cy={ly} r={3} fill={lineColor} />;
      })()}
    </svg>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string;
  unit: string;
  history: number[];
  min: number;
  max: number;
  color: string;
  danger?: number;
  warning?: number;
  current: number;
  trend: "up" | "down" | "stable";
}

function MetricCard({ label, value, unit, history, min, max, color, danger, warning, current, trend }: MetricCardProps) {
  const isDanger = danger !== undefined && current >= danger;
  const isWarning = warning !== undefined && current >= warning && !isDanger;

  const statusBg = isDanger
    ? "bg-red-950/40 border-red-500/30"
    : isWarning
    ? "bg-amber-950/30 border-amber-500/30"
    : "bg-slate-800/50 border-slate-700/40";

  const valueColor = isDanger ? "text-red-400" : isWarning ? "text-amber-400" : "text-white";

  const trendIcon = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
  const trendColor = trend === "up" ? "text-emerald-400" : trend === "down" ? "text-sky-400" : "text-slate-400";

  return (
    <div className={`rounded-xl border p-3 flex flex-col gap-2 transition-colors duration-300 ${statusBg}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400">{label}</span>
        {(isDanger || isWarning) && (
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isDanger ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"}`}>
            {isDanger ? "CRIT" : "WARN"}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <span className={`text-2xl font-mono font-bold tabular-nums ${valueColor}`}>{value}</span>
          <span className="text-xs text-slate-500 ml-1 font-mono">{unit}</span>
        </div>
        <span className={`text-sm font-mono ${trendColor}`}>{trendIcon}</span>
      </div>
      <Sparkline data={history} min={min} max={max} color={color} current={current} danger={danger} warning={warning} />
    </div>
  );
}

// ─── Gauge ────────────────────────────────────────────────────────────────────

interface GaugeProps {
  value: number;
  min: number;
  max: number;
  label: string;
  unit: string;
  color: string;
  size?: number;
  danger?: number;
  warning?: number;
}

function Gauge({ value, min, max, label, unit, color, size = 90, danger, warning }: GaugeProps) {
  const pct = clamp((value - min) / (max - min), 0, 1);
  const r = (size - 12) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const startAngle = -220;
  const sweepAngle = 260;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arcPath = (start: number, sweep: number) => {
    const end = start + sweep;
    const sx = cx + r * Math.cos(toRad(start));
    const sy = cy + r * Math.sin(toRad(start));
    const ex = cx + r * Math.cos(toRad(end));
    const ey = cy + r * Math.sin(toRad(end));
    const large = Math.abs(sweep) > 180 ? 1 : 0;
    return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
  };

  const fillAngle = sweepAngle * pct;
  const isDanger = danger !== undefined && value >= danger;
  const isWarning = warning !== undefined && value >= warning && !isDanger;
  const activeColor = isDanger ? "#EF4444" : isWarning ? "#F59E0B" : color;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* track */}
        <path d={arcPath(startAngle, sweepAngle)} fill="none" stroke="#1e293b" strokeWidth={6} strokeLinecap="round" />
        {/* fill */}
        {pct > 0 && (
          <path d={arcPath(startAngle, fillAngle)} fill="none" stroke={activeColor} strokeWidth={6} strokeLinecap="round" />
        )}
        {/* center value */}
        <text x={cx} y={cy - 2} textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={12} fontWeight={700} fontFamily="monospace">
          {Math.round(value)}
        </text>
        <text x={cx} y={cy + 11} textAnchor="middle" fill="#64748b" fontSize={8} fontFamily="monospace">
          {unit}
        </text>
      </svg>
      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">{label}</span>
    </div>
  );
}

// ─── Formation Track ──────────────────────────────────────────────────────────

function FormationTrack({ currentDepth }: { currentDepth: number }) {
  const maxDepth = FORMATIONS[FORMATIONS.length - 1].bottomDepth;
  const trackH = 280;

  return (
    <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-3">
      <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 block mb-3">Formation Log</span>
      <div className="relative" style={{ height: trackH }}>
        {FORMATIONS.map((f) => {
          const top = (f.topDepth / maxDepth) * trackH;
          const h = Math.max(((f.bottomDepth - f.topDepth) / maxDepth) * trackH, 4);
          const isActive = currentDepth >= f.topDepth && currentDepth < f.bottomDepth;

          return (
            <div
              key={f.name}
              className={`absolute left-0 right-0 border-b border-slate-600/30 flex items-center px-2 overflow-hidden transition-all duration-300 ${isActive ? "opacity-100" : "opacity-60"}`}
              style={{
                top,
                height: h,
                backgroundColor: LITHOLOGY_COLORS[f.lithology] + (isActive ? "30" : "18"),
                borderLeft: isActive ? `3px solid ${LITHOLOGY_COLORS[f.lithology]}` : "3px solid transparent",
              }}
            >
              {h > 18 && (
                <div className="flex items-center gap-2 w-full min-w-0">
                  <span className="text-[10px] font-mono" style={{ color: LITHOLOGY_COLORS[f.lithology] }}>
                    {LITHOLOGY_PATTERNS[f.lithology]}
                  </span>
                  <span className="text-[10px] font-mono text-slate-300 truncate">{f.name}</span>
                  {isActive && (
                    <span className="ml-auto text-[9px] font-mono text-emerald-400 shrink-0">▶ ACTIVE</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {/* depth indicator */}
        <div
          className="absolute left-0 right-0 h-px bg-emerald-400 z-10 transition-all duration-500"
          style={{ top: (currentDepth / maxDepth) * trackH }}
        >
          <div className="absolute right-0 -top-3 text-[9px] font-mono text-emerald-400 bg-slate-900 px-1">
            {currentDepth.toFixed(0)} ft
          </div>
        </div>
      </div>
      {/* legend */}
      <div className="mt-3 grid grid-cols-2 gap-1">
        {Object.entries(LITHOLOGY_COLORS).map(([k, c]) => (
          <div key={k} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c + "80" }} />
            <span className="text-[10px] font-mono text-slate-500 capitalize">{k}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Alert Panel ──────────────────────────────────────────────────────────────

function AlertPanel({ alerts }: { alerts: Alert[] }) {
  const iconMap = { critical: "🔴", warning: "🟡", info: "🟢" };
  const bgMap = {
    critical: "border-red-500/30 bg-red-950/30",
    warning: "border-amber-500/30 bg-amber-950/20",
    info: "border-emerald-500/20 bg-emerald-950/10",
  };
  const textMap = { critical: "text-red-300", warning: "text-amber-300", info: "text-emerald-300" };

  return (
    <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-3 flex flex-col gap-2">
      <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400">System Alerts</span>
      <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
        {alerts.slice(0, 6).map((a) => (
          <div key={a.id} className={`rounded-lg border px-3 py-2 flex items-start gap-2 ${bgMap[a.level]}`}>
            <span className="text-sm shrink-0">{iconMap[a.level]}</span>
            <div className="min-w-0">
              <p className={`text-[11px] font-mono ${textMap[a.level]} leading-snug`}>{a.message}</p>
              <p className="text-[10px] font-mono text-slate-600 mt-0.5">{formatTime(a.timestamp)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Drill-bit Animator ───────────────────────────────────────────────────────

function DrillBitIcon({ rpm, isRunning }: { rpm: number; isRunning: boolean }) {
  const duration = isRunning ? Math.max(0.3, 3 - (rpm / 200) * 2.5) : 0;
  return (
    <div
      className="w-10 h-10 flex items-center justify-center text-2xl select-none"
      style={{
        animation: isRunning ? `spin ${duration}s linear infinite` : "none",
        filter: isRunning ? "drop-shadow(0 0 6px #1E8BFF)" : "none",
      }}
    >
      ⚙
    </div>
  );
}

// ─── Depth Progress ───────────────────────────────────────────────────────────

function DepthProgress({ current, target = 8500 }: { current: number; target?: number }) {
  const pct = clamp(current / target, 0, 1) * 100;
  return (
    <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400">Well Depth Progress</span>
        <span className="text-[11px] font-mono text-slate-400">{pct.toFixed(1)}%</span>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl font-mono font-bold text-white tabular-nums">{current.toFixed(0)}</span>
        <span className="text-xs font-mono text-slate-500">ft / {target.toLocaleString()} ft TD</span>
      </div>
      <div className="h-2.5 bg-slate-700/60 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg,#1d4ed8,#06b6d4)" }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] font-mono text-slate-600">0 ft</span>
        <span className="text-[10px] font-mono text-slate-600">{target.toLocaleString()} ft TD</span>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DrillAnalysisDashboard() {
  const [metrics, setMetrics] = useState<DrillMetric[]>(() => [getInitialMetric()]);
  const [running, setRunning] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const current = metrics[metrics.length - 1];
  const formation = getCurrentFormation(current.depth);

  // rolling history helper
  const hist = useCallback(
    (key: keyof DrillMetric) => metrics.map((m) => m[key] as number),
    [metrics]
  );

  // trend helper
  const trend = (key: keyof DrillMetric): "up" | "down" | "stable" => {
    if (metrics.length < 4) return "stable";
    const prev = metrics[metrics.length - 4][key] as number;
    const curr = metrics[metrics.length - 1][key] as number;
    const delta = curr - prev;
    const threshold = (prev || 1) * 0.02;
    if (delta > threshold) return "up";
    if (delta < -threshold) return "down";
    return "stable";
  };

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setMetrics((prev) => {
        const next = generateNext(prev[prev.length - 1]);
        const updated = [...prev.slice(-MAX_HISTORY + 1), next];
        setAlerts(getAlerts(next));
        return updated;
      });
    }, 800);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  // animate drill-bit CSS keyframes once
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-6 font-mono">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <DrillBitIcon rpm={current.rpm} isRunning={running} />
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">OIL DRILLING MONITOR</h1>
            <p className="text-[11px] text-slate-500 tracking-widest uppercase">
              Real-Time Analysis · Well TXL-47A · {formation.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${running ? "bg-emerald-400 animate-pulse" : "bg-red-500"}`} />
            <span className="text-[11px] text-slate-400 uppercase">{running ? "Live" : "Paused"}</span>
          </div>
          <button
            onClick={() => setRunning((r) => !r)}
            className={`px-4 py-1.5 text-[11px] font-mono uppercase tracking-widest rounded-lg border transition-all ${
              running
                ? "border-red-500/50 text-red-400 hover:bg-red-500/10"
                : "border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
            }`}
          >
            {running ? "⏸ Pause" : "▶ Resume"}
          </button>
        </div>
      </div>

      {/* ── Depth Progress ── */}
      <div className="mb-4">
        <DepthProgress current={current.depth} />
      </div>

      {/* ── Top Gauges ── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-4">
        <Gauge value={current.wob} min={5} max={35} label="WOB" unit="klbs" color="#06B6D4" warning={28} danger={33} />
        <Gauge value={current.rop} min={10} max={120} label="ROP" unit="ft/hr" color="#10B981" />
        <Gauge value={current.rpm} min={60} max={200} label="RPM" unit="rpm" color="#3B82F6" warning={170} danger={190} />
        <Gauge value={current.torque} min={2000} max={18000} label="Torque" unit="ft-lb" color="#8B5CF6" warning={14000} danger={16000} />
        <Gauge value={current.mw} min={8.5} max={16.5} label="Mud Wt" unit="ppg" color="#F59E0B" warning={15} danger={16} />
        <Gauge value={current.vibration} min={0} max={100} label="Vibration" unit="idx" color="#EF4444" warning={60} danger={80} />
      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: metric cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <MetricCard
            label="Standpipe Pressure"
            value={current.pressure.toFixed(0)}
            unit="psi"
            history={hist("pressure")}
            min={800}
            max={4200}
            color="#3B82F6"
            warning={3200}
            danger={3800}
            current={current.pressure}
            trend={trend("pressure")}
          />
          <MetricCard
            label="Bottom-hole Temp"
            value={current.temp.toFixed(0)}
            unit="°F"
            history={hist("temp")}
            min={140}
            max={340}
            color="#F97316"
            warning={280}
            danger={320}
            current={current.temp}
            trend={trend("temp")}
          />
          <MetricCard
            label="Total Gas"
            value={current.gas.toFixed(1)}
            unit="%"
            history={hist("gas")}
            min={0}
            max={100}
            color="#A78BFA"
            warning={45}
            danger={75}
            current={current.gas}
            trend={trend("gas")}
          />
          <MetricCard
            label="Rate of Penetration"
            value={current.rop.toFixed(1)}
            unit="ft/hr"
            history={hist("rop")}
            min={10}
            max={120}
            color="#10B981"
            current={current.rop}
            trend={trend("rop")}
          />
          <MetricCard
            label="Weight on Bit"
            value={current.wob.toFixed(1)}
            unit="klbs"
            history={hist("wob")}
            min={5}
            max={35}
            color="#06B6D4"
            warning={28}
            danger={33}
            current={current.wob}
            trend={trend("wob")}
          />
          <MetricCard
            label="Rotary Torque"
            value={current.torque.toFixed(0)}
            unit="ft-lb"
            history={hist("torque")}
            min={2000}
            max={18000}
            color="#8B5CF6"
            warning={14000}
            danger={16000}
            current={current.torque}
            trend={trend("torque")}
          />

          {/* ── Formation Info ── */}
          <div className="sm:col-span-2 bg-slate-800/50 border border-slate-700/40 rounded-xl p-3">
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 block mb-3">
              Current Formation Analysis
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Formation</p>
                <p className="text-sm text-white font-medium mt-0.5">{formation.name}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Lithology</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: LITHOLOGY_COLORS[formation.lithology] }}
                  />
                  <p className="text-sm text-white font-medium capitalize">{formation.lithology}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Porosity</p>
                <p className="text-sm font-medium mt-0.5" style={{ color: LITHOLOGY_COLORS[formation.lithology] }}>
                  {formation.porosity}%
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Interval</p>
                <p className="text-sm text-white font-medium mt-0.5">
                  {formation.topDepth.toLocaleString()}–{formation.bottomDepth.toLocaleString()} ft
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: formation track + alerts */}
        <div className="flex flex-col gap-3">
          <FormationTrack currentDepth={current.depth} />
          <AlertPanel alerts={alerts} />

          {/* live stats footer */}
          <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-3">
            <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400 block mb-2">Session</span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {[
                ["Samples", metrics.length.toLocaleString()],
                ["Update Rate", "0.8 s"],
                ["Mud Wt", `${current.mw.toFixed(1)} ppg`],
                ["Drill Floor", "TX Gulf Coast"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-[10px] text-slate-500">{k}</span>
                  <span className="text-[10px] text-slate-300">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] font-mono text-slate-600">
        <span>LAST UPDATE: {formatTime(current.timestamp)}</span>
        <span>WELL TXL-47A · PERMIAN BASIN · OPERATOR: EXEMPLAR ENERGY INC.</span>
        <span>SYSTEM: ONLINE</span>
      </div>
    </div>
  );
}
