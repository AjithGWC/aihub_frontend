import React, { useState } from "react";
import {
  Cpu,
  ArrowLeft,
  LayoutDashboard,
  Users,
  KeyRound,
  ShieldCheck,
  Boxes,
  ScrollText,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { COLOR, SECTOR_COLOR, FONT_HEADING, FONT_BODY, type SectorTone } from "./atlasTheme";
import { useSession } from "../auth/SessionContext";
import AihDashboard from "../ai-access-hub/pages/Dashboard";
import AihUsersRoles from "../ai-access-hub/pages/UsersRoles";
import AihApiKeys from "../ai-access-hub/pages/ApiKeys";
import AihModelRegistry from "../ai-access-hub/pages/ModelRegistry";
import AihPermissions from "../ai-access-hub/pages/Permissions";
import AihAuditLog from "../ai-access-hub/pages/AuditLog";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/*                                                                      */
/*  Each sector hex is one AI-Access-Hub admin section — opening the    */
/*  panel renders that section's real page (Component) in place.       */
/* ------------------------------------------------------------------ */

interface Sector {
  key: string;
  name: string;
  icon: LucideIcon;
  tone: SectorTone;
  body: string;
  Component: React.ComponentType;
  /** Short phrases shown as satellite chips around the hex. */
  highlights: string[];
}

const SECTORS: Sector[] = [
  {
    key: "dashboard",
    name: "Dashboard",
    icon: LayoutDashboard,
    tone: "blue",
    body: "Platform overview — live status across the gateway, routing, and inference layers, plus the most recent audit events.",
    Component: AihDashboard,
    highlights: ["Overview", "Audit feed"],
  },
  {
    key: "users",
    name: "Users & Roles",
    icon: Users,
    tone: "cyan",
    body: "Directory of everyone with portal access, and the roles that determine what they can do. Roles are enforced server-side.",
    Component: AihUsersRoles,
    highlights: ["Directory", "Roles", "Status"],
  },
  {
    key: "apikeys",
    name: "API Keys",
    icon: KeyRound,
    tone: "orange",
    body: "Per-user LLM provider keys, encrypted server-side — the raw value is never shown again after saving.",
    Component: AihApiKeys,
    highlights: ["Active", "Expiring", "Revoked"],
  },
  {
    key: "models",
    name: "Model Registry",
    icon: Boxes,
    tone: "amber",
    body: "Models available for routing. Provider API keys are encrypted at rest and never returned by the API.",
    Component: AihModelRegistry,
    highlights: ["Cloud", "On-Prem", "Staging"],
  },
  {
    key: "permissions",
    name: "Permissions",
    icon: ShieldCheck,
    tone: "violet",
    body: "Roles are managed here — toggle a cell to change access, enforced server-side on every protected route.",
    Component: AihPermissions,
    highlights: ["Roles", "Actions"],
  },
  {
    key: "audit",
    name: "Audit Log",
    icon: ScrollText,
    tone: "green",
    body: "Every login, admin action, and policy decision — queryable by user and event.",
    Component: AihAuditLog,
    highlights: ["Passed", "Denied", "Errors"],
  },
];

/* ------------------------------------------------------------------ */
/*  Geometry helpers (ported 1:1 from the source)                      */
/* ------------------------------------------------------------------ */

const VB_W = 1950;
const VB_H = 1200;
const CX = 975;
const CY = 600;
const R_HUB = 160;
const R_CAT = 330;
const R_HL = 480;
const HL_W = 122;
const HL_H = 34;

const hlFan = (n: number) => (n === 3 ? [-16, 0, 16] : n === 2 ? [-11, 11] : [0]);

const rad = (d: number) => (d * Math.PI) / 180;
const pt = (a: number, r: number) => ({ x: CX + Math.cos(rad(a)) * r, y: CY + Math.sin(rad(a)) * r });
const r1 = (n: number) => Math.round(n * 10) / 10;

function circuit(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  if (Math.abs(dx) >= Math.abs(dy)) {
    const k = Math.abs(dy);
    return `M ${r1(a.x)} ${r1(a.y)} L ${r1(a.x + sx * (Math.abs(dx) - k))} ${r1(a.y)} L ${r1(b.x)} ${r1(b.y)}`;
  }
  const k = Math.abs(dx);
  return `M ${r1(a.x)} ${r1(a.y)} L ${r1(a.x)} ${r1(a.y + sy * (Math.abs(dy) - k))} L ${r1(b.x)} ${r1(b.y)}`;
}

const HEX_CLIP = "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)";

/* ------------------------------------------------------------------ */
/*  Render-model types                                                 */
/* ------------------------------------------------------------------ */

interface TraceItem { d: string; color: string; w: number; op: number; transition: string }
interface PadItem { x: number; y: number; color: string; op: number; transition: string }
interface FlowItem { d: string; color: string; dur: number }
interface CatItem {
  left: number; top: number; name: string; Icon: LucideIcon; ring: string; bg: string; ink: string;
  op: number; show: number; hit: boolean; scale: number; transition: string; onClick: () => void;
}
interface HighlightItem {
  left: number; top: number; label: string; border: string; ink: string;
  op: number; scale: number; transition: string;
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface AtlasHubProps {
  hubLabel?: string;
  showApps?: boolean;
  animateTraces?: boolean;
  dashboards?: any;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

// How long the hub's left/top "return to center" transition takes.
const HUB_RETURN_MS = 1200;

export default function AtlasHub({ hubLabel = "AI HUB", animateTraces = true }: AtlasHubProps) {
  const { logout } = useSession();
  const fitRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  React.useEffect(() => {
    const el = fitRef.current;
    if (!el) return;
    const compute = () => {
      const s = Math.min(el.clientWidth / VB_W, el.clientHeight / VB_H);
      setScale(s > 0 ? s : 1);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  const [sel, setSel] = useState(0);
  const [focus, setFocus] = useState<number | null>(null);
  const [closing, setClosing] = useState(false);
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const playSFX = (type: 'category' | 'app' | 'back') => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      // Ensure context is running (browser autoplay policies)
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      if (type === 'category') {
        // Ascending Success Chime (three rapid rising notes)
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        notes.forEach((freq, index) => {
          const timeOffset = index * 0.05;
          const osc = ctx.createOscillator();
          const gainNode = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + timeOffset);

          gainNode.gain.setValueAtTime(0.0, ctx.currentTime + timeOffset);
          gainNode.gain.linearRampToValueAtTime(0.18, ctx.currentTime + timeOffset + 0.01);
          gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + timeOffset + 0.08);

          osc.connect(gainNode);
          gainNode.connect(ctx.destination);

          osc.start(ctx.currentTime + timeOffset);
          osc.stop(ctx.currentTime + timeOffset + 0.1);
        });
      } else if (type === 'app') {
        // Metallic Resonant Pluck/Click
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(750, ctx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.06);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1500, ctx.currentTime);

        filter.type = 'bandpass';
        filter.Q.setValueAtTime(12, ctx.currentTime);
        filter.frequency.setValueAtTime(1000, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.06);

        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc1.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.08);
        osc2.stop(ctx.currentTime + 0.08);
      } else if (type === 'back') {
        // Descending chime tone
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.2);

        gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      }

      // Close the context after playing to free hardware resources
      setTimeout(() => {
        ctx.close();
      }, 500);

    } catch (e) {
      console.warn("Web Audio SFX blocked or unsupported:", e);
    }
  };

  const isFocus = focus !== null;
  const FOCUS_HEX = { x: 300, y: 530 };

  // Leaving focus mode: hide every branch element (other sector hexes,
  // connecting traces/pads) until the hub finishes travelling back to
  // the center. Only the previously-focused sector's own hex stays
  // visible while it moves.
  const goingHome = closing && !isFocus;

  const returnToOverview = () => {
    playSFX('back');
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setClosing(true);
    setFocus(null);
    closeTimerRef.current = setTimeout(() => setClosing(false), HUB_RETURN_MS);
  };

  React.useEffect(() => {
    const handleBack = () => returnToOverview()
    window.addEventListener('hexagon-hub-back', handleBack)
    return () => {
      window.removeEventListener('hexagon-hub-back', handleBack)
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    }
  }, [])

  const cats: CatItem[] = [];
  const highlights: HighlightItem[] = [];
  const traces: TraceItem[] = [];
  const pads: PadItem[] = [];
  const flows: FlowItem[] = [];

  SECTORS.forEach((sec, i) => {
    const tone = SECTOR_COLOR[sec.tone];
    const active = i === sel;
    const catA = -90 + i * 60;
    const focused = focus === i;
    const c = focused ? FOCUS_HEX : pt(catA, R_CAT);
    const hideBranch = isFocus;

    if (!isFocus || !focused) {
      const hubEdge = pt(catA, R_HUB);
      const trunk = circuit(hubEdge, c);

      const transTrace = goingHome
        ? (active
            ? "opacity 0.4s ease"
            : "opacity 2.5s ease 0.3s")
        : "opacity .3s ease .05s";

      traces.push({
        d: trunk,
        color: tone.trace,
        w: 2.4,
        op: hideBranch ? 0 : active ? 0.95 : 0.45,
        transition: transTrace
      });

      if (!hideBranch) flows.push({ d: trunk, color: active ? tone.ring : tone.trace, dur: 4.5 + i * 0.6 });

      const transPad = goingHome
        ? (active
            ? "opacity 0.4s ease"
            : "opacity 2.5s ease 0.3s")
        : "opacity .3s ease .05s";

      pads.push({
        x: r1(c.x - 3.5),
        y: r1(c.y - 3.5),
        color: tone.ring,
        op: hideBranch ? 0 : active ? 1 : 0.5,
        transition: transPad
      });
    } else if (focused) {
      const trunk = "M 160 530 L 236 530";
      const branchToPanel = "M 364 530 L 424 530 L 424 140 L 444 140";
      traces.push({ d: trunk, color: tone.trace, w: 2.4, op: 0.95, transition: "opacity .3s ease .05s" });
      traces.push({ d: branchToPanel, color: tone.ring, w: 2.4, op: 0.95, transition: "opacity .3s ease .05s" });
      flows.push({ d: trunk, color: tone.ring, dur: 4.5 });
      flows.push({ d: branchToPanel, color: tone.ring, dur: 3.5 });
      pads.push({ x: 296.5, y: 526.5, color: tone.ring, op: 1, transition: "opacity .3s ease .05s" });
      pads.push({ x: 420.5, y: 136.5, color: tone.ring, op: 1, transition: "opacity .3s ease .05s" });
    }

    // While going home, other sector hexes should animate in slowly, not be hidden instantly.
    // They are only hidden when in active focus mode.
    const showCat = isFocus ? (focused ? 1 : 0) : 1;
    const hitCat = !(isFocus && !focused) && !goingHome;
    const scaleCat = focused ? 1.18 : (isFocus || goingHome) && !focused ? 0.75 : 1;

    let transCat = "left 1.2s cubic-bezier(.22,1,.36,1), top 1.2s cubic-bezier(.22,1,.36,1), opacity .4s ease, transform .4s ease";
    if (goingHome) {
      if (active) {
        // Selected sector returns fast/first
        transCat = "left 0.45s cubic-bezier(.25,1,.5,1), top 0.45s cubic-bezier(.25,1,.5,1), opacity 0.4s ease, transform 0.4s ease";
      } else {
        // Other sectors remain completely hidden during selected sector travel, then fade in slowly
        transCat = "left 2.5s cubic-bezier(.25,1,.5,1) 0.3s, top 2.5s cubic-bezier(.25,1,.5,1) 0.3s, opacity 2.5s ease 0.3s, transform 2.5s ease 0.3s";
      }
    }

    cats.push({
      left: r1(c.x - 98),
      top: r1(c.y - 85),
      name: sec.name,
      Icon: sec.icon,
      ring: tone.ring,
      bg: tone.bg,
      ink: tone.ink,
      op: active || focused ? 1 : 0.75,
      show: showCat,
      hit: hitCat,
      scale: scaleCat,
      transition: transCat,
      onClick: () => {
        playSFX('category');
        setSel(i);
        setFocus(i);
      },
    });

    const c_orbit = pt(catA, R_CAT);
    const offs = hlFan(sec.highlights.length);
    sec.highlights.forEach((label, j) => {
      const hlA = catA + offs[j];
      const s_orbit = pt(hlA, R_HL);
      const s = { x: c.x + (s_orbit.x - c_orbit.x), y: c.y + (s_orbit.y - c_orbit.y) };

      const transHLTrace = goingHome
        ? (active ? "opacity 0.4s ease" : "opacity 2.5s ease 0.3s")
        : "opacity .3s ease .05s";

      const hlTrunk = circuit(c, s);
      traces.push({
        d: hlTrunk,
        color: tone.trace,
        w: 1.4,
        op: hideBranch ? 0 : active ? 0.75 : 0.3,
        transition: transHLTrace,
      });

      if (!hideBranch) flows.push({ d: hlTrunk, color: tone.ring, dur: 3 + j * 0.4 });

      pads.push({
        x: r1(s.x - 3),
        y: r1(s.y - 3),
        color: tone.ring,
        op: hideBranch ? 0 : active ? 0.9 : 0.35,
        transition: transHLTrace,
      });

      let transHL = "left 0.5s cubic-bezier(.25,1,.5,1), top 0.5s cubic-bezier(.25,1,.5,1), opacity .25s ease .03s, transform .25s ease .03s";
      if (goingHome) {
        transHL = active
          ? "left 0.45s cubic-bezier(.25,1,.5,1), top 0.45s cubic-bezier(.25,1,.5,1), opacity 0.4s ease, transform 0.4s ease"
          : "left 2.5s cubic-bezier(.25,1,.5,1) 0.3s, top 2.5s cubic-bezier(.25,1,.5,1) 0.3s, opacity 2.5s ease 0.3s, transform 2.5s ease 0.3s";
      }

      highlights.push({
        left: r1(s.x - HL_W / 2),
        top: r1(s.y - HL_H / 2),
        label,
        border: `1.5px solid ${tone.ring}`,
        ink: tone.ink,
        op: hideBranch ? 0 : active ? 1 : 0.55,
        scale: hideBranch ? 0.8 : 1,
        transition: transHL,
      });
    });
  });

  const sec = SECTORS[sel];
  const focusSecIdx = isFocus ? (focus as number) : sel;
  const focusSec = SECTORS[focusSecIdx];
  const focusTone = SECTOR_COLOR[focusSec.tone];
  const panelTitle = isFocus ? focusSec.name : sec.name;
  const panelBody = isFocus ? focusSec.body : sec.body;

  const hubLeft = isFocus ? 0 : CX;
  const hubTop = isFocus ? 530 : CY;

  return (
    <div
      className="h-screen w-full flex flex-col overflow-hidden"
      style={{
        background:
          "radial-gradient(1100px 900px at 88% 4%, rgba(59,130,246,.10) 0%, rgba(59,130,246,0) 60%)," +
          "radial-gradient(900px 700px at 8% 96%, rgba(139,92,246,.06) 0%, rgba(139,92,246,0) 60%)," +
          COLOR.bg,
        color: COLOR.neutral300,
        fontFamily: FONT_BODY,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Figtree:wght@300;400;500;600;700;800;900&display=swap');
        @keyframes atlas-spin { to { transform: rotate(360deg); } }
        @keyframes atlas-spinback { to { transform: rotate(-360deg); } }
        @keyframes atlas-flow { to { stroke-dashoffset: -320; } }
        @keyframes atlas-pop { from { transform: scale(.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>

      <div ref={fitRef} className="flex justify-center items-center w-full h-full flex-1 min-h-0">
        {/* ---------------- Graph canvas ---------------- */}
        <div
          className="relative flex-none overflow-hidden origin-center"
          style={{
            width: VB_W,
            height: VB_H,
            transform: `scale(${scale})`,
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              opacity: 0.6,
              backgroundImage:
                "linear-gradient(rgba(15,23,42,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,.04) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />

          <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="absolute inset-0 w-full h-full">
            {traces.map((tr, i) => (
              <path
                key={i}
                d={tr.d}
                fill="none"
                stroke={tr.color}
                strokeWidth={tr.w}
                strokeLinecap="square"
                opacity={tr.op}
                style={{ transition: tr.transition }}
              />
            ))}
            {pads.map((p, i) => (
              <rect
                key={i}
                x={p.x}
                y={p.y}
                width={7}
                height={7}
                fill={p.color}
                opacity={p.op}
                style={{ transition: p.transition }}
              />
            ))}
            {animateTraces &&
              flows.map((f, i) => (
                <path
                  key={i}
                  d={f.d}
                  fill="none"
                  stroke={f.color}
                  strokeWidth={2.2}
                  strokeDasharray="9 15"
                  opacity={0.55}
                  style={{ animation: "atlas-flow 5s linear infinite" }}
                />
              ))}
            {animateTraces &&
              flows.map((f, i) => (
                <circle key={`dot-${i}`} r={3.4} fill={f.color}>
                  <animateMotion path={f.d} dur={`${f.dur}s`} repeatCount="indefinite" rotate="auto" />
                </circle>
              ))}
          </svg>

          {/* Hub */}
          <div
            className="absolute"
            style={{
              width: 0,
              height: 0,
              left: hubLeft,
              top: hubTop,
              transition: "left 1.2s cubic-bezier(.22,1,.36,1), top 1.2s cubic-bezier(.22,1,.36,1)",
            }}
          >
            <div
              className="absolute rounded-full"
              style={{ left: -270, top: -270, width: 540, height: 540, border: "1px dashed rgba(37,99,235,.30)", animation: "atlas-spin 70s linear infinite" }}
            />
            <div
              className="absolute rounded-full"
              style={{
                left: -222,
                top: -222,
                width: 444,
                height: 444,
                background: `repeating-conic-gradient(from 0deg, ${COLOR.accent400} 0deg 1.3deg, transparent 1.3deg 7.5deg)`,
                WebkitMask: "radial-gradient(circle, transparent 0 68%, #000 68% 78%, transparent 78%)",
                mask: "radial-gradient(circle, transparent 0 68%, #000 68% 78%, transparent 78%)",
                opacity: 0.55,
                animation: "atlas-spinback 95s linear infinite",
              }}
            />
            <div
              className="absolute rounded-full"
              style={{ left: -196, top: -196, width: 392, height: 392, border: "2px solid rgba(37,99,235,.22)", boxShadow: "0 0 70px rgba(37,99,235,.12) inset" }}
            />
            <div
              className="absolute rounded-full flex flex-col items-center justify-center gap-2"
              style={{
                left: -148,
                top: -148,
                width: 296,
                height: 296,
                background: "radial-gradient(circle at 50% 34%, #ffffff 0%, #eaf1ff 72%)",
                border: `3px dashed ${COLOR.accent400}`,
                boxShadow: `0 4px 32px rgba(37,99,235,.16), 0 0 0 16px ${COLOR.bg}`,
              }}
            >
              <Cpu size={34} color={COLOR.accent500} />
              <div style={{ fontFamily: FONT_HEADING, fontSize: 34, color: COLOR.neutral100, textAlign: "center", lineHeight: 1.05 }}>
                {hubLabel}
              </div>
              <div className="text-[12px] uppercase font-semibold" style={{ letterSpacing: ".18em", color: COLOR.accent500 }}>
                orchestrator
              </div>
            </div>
          </div>

          {/* Sectors */}
          {cats.map((c, i) => (
            <div
              key={i}
              onClick={c.onClick}
              className="absolute cursor-pointer"
              style={{
                width: 196,
                height: 170,
                left: c.left,
                top: c.top,
                opacity: c.show,
                pointerEvents: c.hit ? "auto" : "none",
                transform: `scale(${c.scale})`,
                transition: c.transition,
              }}
            >
              <div className="absolute inset-0" style={{ clipPath: HEX_CLIP, background: c.ring, opacity: c.op }} />
              <div
                className="absolute flex flex-col items-center justify-center gap-2 transition-shadow hover:shadow-[0_0_0_3px_rgba(37,99,235,.12)]"
                style={{ inset: 3, clipPath: HEX_CLIP, background: c.bg }}
              >
                <c.Icon size={32} color={c.ink} />
                <div
                  className="text-center text-[14px] font-bold uppercase leading-tight px-3.5"
                  style={{ letterSpacing: ".07em", color: COLOR.neutral200 }}
                >
                  {c.name}
                </div>
              </div>
            </div>
          ))}

          {/* Highlight chips: short phrases pulled from each team's description */}
          {highlights.map((h, i) => (
            <div
              key={i}
              className="absolute rounded-full flex items-center justify-center text-center px-2"
              style={{
                left: h.left,
                top: h.top,
                width: HL_W,
                height: HL_H,
                opacity: h.op,
                background: "#ffffff",
                border: h.border,
                boxShadow: "0 1px 4px rgba(15,23,42,.06)",
                transform: `scale(${h.scale})`,
                transition: h.transition,
                pointerEvents: "none",
              }}
            >
              <span className="text-[9.5px] font-bold uppercase leading-tight" style={{ letterSpacing: ".04em", color: h.ink }}>
                {h.label}
              </span>
            </div>
          ))}

          {/* Focus mode: back button + detail panel */}
          {isFocus && (
            <>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  returnToOverview();
                }}
                className="fixed z-[9999] flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-black uppercase transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 shadow-xl"
                style={{ left: 24, top: 24, letterSpacing: ".06em", background: "#ffffff", border: "2px solid rgba(15,23,42,.25)", color: "#0f172a" }}
              >
                <ArrowLeft size={16} className="stroke-[2.5] text-slate-900" />
                All
              </button>

              <div
                className="absolute flex flex-col gap-6 overflow-y-auto"
                style={{ left: 402, top: 100, width: 1500, height: VB_H - 140, paddingRight: 10, paddingBottom: 40, animation: "atlas-pop 1.2s cubic-bezier(.22,1,.36,1) both" }}
              >
                <div className="flex items-center gap-4" style={{ paddingLeft: 42 }}>
                  <div className="relative flex items-center justify-center flex-none">
                    {/* Shockwave expanding aura triggered upon connector arrival */}
                    <span
                      className="absolute rounded-full arrival-ripple-ring pointer-events-none"
                      style={{
                        width: 70,
                        height: 70,
                        background: focusTone.ring,
                      }}
                    />

                    {/* Spinning dashed orbit ring */}
                    <svg width="72" height="72" className="absolute -rotate-90 pointer-events-none">
                      <circle
                        cx="36" cy="36" r="33"
                        fill="none"
                        stroke={focusTone.ring}
                        strokeWidth="2"
                        strokeDasharray="4 6"
                        opacity="0.8"
                        className="animate-spin"
                        style={{ animationDuration: '8s' }}
                      />
                    </svg>

                    {/* Icon container badge with sequential arrival burst animation */}
                    <div
                      className="relative z-10 rounded-full flex items-center justify-center arrival-burst-container transition-all duration-500 hover:scale-110 shadow-lg"
                      style={{
                        width: 56,
                        height: 56,
                        background: "#ffffff",
                        border: `2.5px solid ${focusTone.ring}`,
                        '--burst-glow': focusTone.ring,
                        boxShadow: `0 0 24px ${focusTone.ring}88, 0 2px 12px rgba(15,23,42,.15)`
                      } as React.CSSProperties}
                    >
                      <focusSec.icon size={26} color={focusTone.ink} className="animate-pulse" style={{ filter: `drop-shadow(0 0 8px ${focusTone.ring})` }} />
                    </div>
                  </div>
                  <div style={{ fontFamily: FONT_HEADING, fontSize: 28, color: COLOR.neutral100 }}>{panelTitle}</div>
                </div>

                <div className="text-[19px] leading-relaxed" style={{ paddingLeft: 42, maxWidth: 720, color: COLOR.neutral300 }}>
                  {panelBody}
                </div>

                <div
                  className="rounded-2xl transition-all"
                  style={{ marginLeft: 26, marginRight: 4, background: COLOR.panelBg, border: `2px solid ${focusTone.ring}`, boxShadow: `0 4px 24px ${focusTone.ring}33` }}
                >
                  <focusSec.Component />
                </div>
              </div>
            </>
          )}

          {/* Legend */}
          <div className="absolute flex items-center gap-4 text-[11px]" style={{ left: 24, bottom: 20, color: COLOR.neutral400 }}>
            <div className="flex items-center gap-1.5">
              <span style={{ width: 12, height: 12, clipPath: HEX_CLIP, background: COLOR.accent500 }} />
              Team
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="absolute z-10 flex items-center gap-2 px-4 py-[9px] rounded-full text-[12px] uppercase transition-colors"
            style={{ right: 24, top: 48, letterSpacing: ".06em", background: "#ffffff", border: "1px solid rgba(15,23,42,.12)", color: COLOR.neutral300, boxShadow: "0 1px 4px rgba(15,23,42,.06)" }}
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
