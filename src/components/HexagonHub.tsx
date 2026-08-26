import React, { useState, useRef, useEffect } from "react";
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
  Server,
  Network,
  HardDrive,
  Database,
  Terminal,
  MapPin,
  Zap,
  Sun,
  Moon,
  type LucideIcon,
} from "lucide-react";
import { IndiaMap } from "india-map-react";
import { geoMercator } from "d3-geo";
import { COLOR, SECTOR_COLOR, FONT_HEADING, FONT_BODY, type SectorTone } from "./atlasTheme";
import { useTheme } from "./AppNavbar";

// Matches india-map-react's internal ComposableMap projection exactly (geoMercator,
// scale 1000, center [82.8, 22.5], 800x600 viewBox) so overlay callouts land on the
// same point as the rendered marker instead of drifting.
const INDIA_PROJECTION = geoMercator().center([82.8, 22.5]).scale(1000).translate([400, 300]);

const HSR_LNG = 77.8326;
const HSR_LAT = 12.7365;
const HSR_POINT = INDIA_PROJECTION([HSR_LNG, HSR_LAT]) ?? [400, 300];
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
/*  On-Premises Server Details — right-side panel on the landing hub   */
/* ------------------------------------------------------------------ */

const ONPREM_TONE = SECTOR_COLOR.violet;

const ONPREM_DETAILS: { label: string; value: string; icon: LucideIcon; mono: boolean }[] = [
  { label: "Hostname", value: "gwc-onprem-node-01.hosur.internal", icon: Server, mono: true },
  { label: "IP Address", value: "10.142.48.12", icon: Network, mono: true },
  { label: "Operating System", value: "AlmaLinux OS 9.4", icon: Cpu, mono: false },
  { label: "Compute CPU", value: "2× Xeon Gold 6430 (64c)", icon: Cpu, mono: false },
  { label: "System RAM", value: "512 GB DDR5 ECC", icon: Zap, mono: false },
  { label: "NVMe Storage", value: "4× 3.84TB RAID 10", icon: HardDrive, mono: false },
  { label: "Local Database", value: "SQLite v3.45", icon: Database, mono: true },
];

const ONPREM_TELEMETRY = [
  { text: "ZFS POOL STATUS: HEALTHY (RAID 10)", color: "#22c55e" },
  { text: "INTRANET GATEWAY: SECURED", color: "#22c55e" },
  { text: "OS UPDATE: ALMALINUX 9.4 UP-TO-DATE", color: "#a78bfa" },
  { text: "LATENCY CHECK: 1.15ms (LAN)", color: "#a78bfa" },
  { text: "BACKUP DAEMON: STANDBY", color: "#f59e0b" },
];

function OnPremContent() {
  const mapBoxRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const [leaderLine, setLeaderLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  // Measure the dot's and badge's REAL rendered screen positions (accounting for the
  // map's zoom/pan transform and the panel's responsive width) rather than guessing
  // coordinates by hand — guarantees the connector always actually touches both ends.
  useEffect(() => {
    function measure() {
      const box = mapBoxRef.current;
      const dot = dotRef.current;
      const badge = badgeRef.current;
      if (!box || !dot || !badge) return;
      const boxRect = box.getBoundingClientRect();
      const dotRect = dot.getBoundingClientRect();
      const badgeRect = badge.getBoundingClientRect();
      setLeaderLine({
        x1: dotRect.left + dotRect.width / 2 - boxRect.left,
        y1: dotRect.top + dotRect.height / 2 - boxRect.top,
        x2: badgeRect.left + badgeRect.width / 2 - boxRect.left,
        y2: badgeRect.top - boxRect.top,
      });
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (mapBoxRef.current) ro.observe(mapBoxRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <div className="p-6 space-y-4">
        {/* Header */}
        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div
                className="rounded-full flex items-center justify-center flex-none"
                style={{ width: 34, height: 34, background: `${ONPREM_TONE.ring}18`, border: `1.5px solid ${ONPREM_TONE.ring}55` }}
              >
                <Server size={16} color={ONPREM_TONE.ink} />
              </div>
              <div style={{ fontFamily: FONT_HEADING, fontSize: 17, color: COLOR.neutral100 }}>On-Prem Server</div>
            </div>
            <span
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-extrabold uppercase"
              style={{ color: "#16a34a", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.4)" }}
            >
              <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
              Active
            </span>
          </div>
          <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: COLOR.neutral400 }}>
            Private compute node for the local intelligence pipeline — runs strictly inside the intranet.
          </p>
        </div>

        {/* Top: compact detail rows */}
        <div className="space-y-2 pt-1">
          {ONPREM_DETAILS.map(({ label, value, icon: Icon, mono }) => (
            <div key={label} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="flex items-center gap-1.5 font-bold flex-none" style={{ color: COLOR.neutral400 }}>
                <Icon className="size-3 flex-none" style={{ color: ONPREM_TONE.ink }} />
                {label}
              </span>
              <span
                className="text-right truncate max-w-[190px]"
                style={mono
                  ? { fontFamily: "monospace", color: COLOR.neutral200, background: `${ONPREM_TONE.ring}12`, border: `1px solid ${ONPREM_TONE.ring}30`, borderRadius: 6, padding: "2px 6px" }
                  : { color: COLOR.neutral200, fontWeight: 700 }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Middle: real India state-boundary map with node telemetry marker */}
        <div
          ref={mapBoxRef}
          className="relative rounded-xl overflow-hidden"
          style={{
            height: 250,
            background: `radial-gradient(circle at 50% 30%, ${ONPREM_TONE.ring}14, transparent 70%), var(--panel-2)`,
            border: `1px solid ${ONPREM_TONE.ring}30`,
          }}
        >
          {/* Zoomed/cropped inner layer — keeps the map's 4:3 projection aspect
              intact so overlay percentages line up, then scales+crops via the
              parent's overflow-hidden for the "zoomed in" look. Origin is pulled
              down from center so the host marker (south India) stays fully
              in frame instead of being pushed past the bottom edge. */}
          <div className="absolute left-0 right-0 top-0" style={{ aspectRatio: "4 / 3", transform: "scale(1.15)", transformOrigin: "50% 52%" }}>
            <IndiaMap
              style={{ width: "100%" }}
              disabled
              showTooltip={false}
              fillColor={`${ONPREM_TONE.ring}22`}
              hoverColor={`${ONPREM_TONE.ring}22`}
              strokeColor={`${ONPREM_TONE.ring}55`}
              strokeWidth={0.6}
              markers={[
                { id: "del", label: "Delhi", lat: 28.61, lng: 77.2, color: ONPREM_TONE.ring },
                { id: "mum", label: "Mumbai", lat: 19.08, lng: 72.88, color: ONPREM_TONE.ring },
                { id: "kol", label: "Kolkata", lat: 22.57, lng: 88.36, color: ONPREM_TONE.ring },
                { id: "hsr-city", label: "Hosur", lat: HSR_LAT, lng: HSR_LNG, color: ONPREM_TONE.ring },
              ]}
            />

            {/* Host node dot — drawn ourselves instead of via the library's marker
                renderer, whose internal pin offset never quite lined up with a
                separately-computed leader line. */}
            <svg viewBox="0 0 800 600" className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%" }}>
              <circle
                cx={HSR_POINT[0]} cy={HSR_POINT[1]} r={14}
                fill="#ec4899" opacity={0.35} className="animate-ping"
                style={{ transformOrigin: `${HSR_POINT[0]}px ${HSR_POINT[1]}px` }}
              />
              <circle ref={dotRef} cx={HSR_POINT[0]} cy={HSR_POINT[1]} r={7} fill="#ec4899" stroke="#fff" strokeWidth={2} />
            </svg>
          </div>

          {/* Leader line — drawn in the OUTER box's real pixel space from the dot's and
              badge's measured on-screen rects (see useEffect above), so it always
              actually touches both ends regardless of zoom/pan or panel width. */}
          {leaderLine && (
            <svg className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%" }}>
              <line
                x1={leaderLine.x1} y1={leaderLine.y1}
                x2={leaderLine.x2} y2={leaderLine.y2}
                stroke="#ec4899" strokeWidth={2.2} strokeDasharray="5 5" opacity={0.85}
              />
            </svg>
          )}

          {/* Two-badge callout: node name + coordinates. Pinned to a fixed corner of the
              OUTER (un-scaled, clipped) box — never affected by the zoom transform or the
              projection math above, so it can never get pushed off-panel. */}
          <div ref={badgeRef} className="absolute bottom-6.5 right-2.5 flex flex-col items-start gap-1 pointer-events-none max-w-[calc(100%-20px)]">
            <span
              className="px-2 py-0.5 rounded-full text-[8.5px] font-extrabold text-white whitespace-nowrap shadow-md"
              style={{ background: "#ec4899" }}
            >
              HSR-NODE-01 (HOST)
            </span>
            <span
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[8.5px] font-extrabold whitespace-nowrap shadow-md"
              style={{ fontFamily: "monospace", color: "#ec4899", background: "var(--card)", border: "1px solid #ec4899" }}
            >
              <MapPin className="size-2.5" />
              12.7365°N, 77.8326°E
            </span>
          </div>
        </div>

        {/* Bottom: terminal-style telemetry log */}
        <div className="rounded-xl p-3 space-y-1.5" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">
            <Terminal className="size-3" />
            Telemetry
          </div>
          {ONPREM_TELEMETRY.map((line) => (
            <p key={line.text} className="text-[9.5px] leading-relaxed truncate" style={{ fontFamily: "monospace", color: line.color }}>
              &gt; {line.text}
            </p>
          ))}
        </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Desktop / mobile wrappers for OnPremContent                        */
/* ------------------------------------------------------------------ */

function OnPremSidePanel() {
  return (
    <div
      className="hidden xl:block flex-none h-full overflow-y-auto overflow-x-hidden custom-scrollbar xl:w-[320px] 2xl:w-[380px]"
      style={{ borderLeft: `1px solid ${COLOR.hairline}`, background: COLOR.panelBg }}
    >
      <OnPremContent />
    </div>
  );
}

function OnPremMobileDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Trigger tab — only shown below the xl breakpoint where the fixed sidebar is hidden */}
      <button
        onClick={() => setOpen(true)}
        className="xl:hidden fixed z-40 flex items-center gap-1.5 px-3 py-2 rounded-l-full text-[11px] font-extrabold uppercase shadow-lg cursor-pointer transition-transform hover:-translate-x-1"
        style={{ right: 0, top: "50%", transform: "translateY(-50%)", background: ONPREM_TONE.ring, color: "#fff", letterSpacing: ".04em" }}
      >
        <Server size={14} />
        On-Prem
      </button>

      {/* Backdrop — blurs/dims the rest of the app while the drawer is open */}
      <div
        onClick={() => setOpen(false)}
        className={`xl:hidden fixed inset-0 z-40 transition-opacity duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
      />

      {/* Sliding panel */}
      <div
        className="xl:hidden fixed right-0 top-0 z-50 h-full w-[85vw] max-w-[360px] overflow-y-auto overflow-x-hidden custom-scrollbar shadow-2xl transition-transform duration-300"
        style={{
          borderLeft: `1px solid ${COLOR.hairline}`,
          background: COLOR.panelBg,
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Drawer header — its own row, so the close button never overlaps the
            content's own title/badge below it. */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3" style={{ background: COLOR.panelBg, borderBottom: `1px solid ${COLOR.hairline}` }}>
          <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: COLOR.neutral400, letterSpacing: ".08em" }}>
            On-Prem Details
          </span>
          <button
            onClick={() => setOpen(false)}
            className="flex items-center justify-center size-8 rounded-full flex-none cursor-pointer transition-colors hover:bg-black/5"
            style={{ background: "var(--panel-2)", color: COLOR.neutral300 }}
            title="Close"
          >
            <ArrowLeft size={16} />
          </button>
        </div>
        <OnPremContent />
      </div>
    </>
  );
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
  const [theme, toggleTheme] = useTheme();
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
      const branchToPanel = "M 364 530 L 424 530 L 424 120 L 444 120";
      traces.push({ d: trunk, color: tone.trace, w: 2.4, op: 0.95, transition: "opacity .3s ease .05s" });
      traces.push({ d: branchToPanel, color: tone.ring, w: 2.4, op: 0.95, transition: "opacity .3s ease .05s" });
      flows.push({ d: trunk, color: tone.ring, dur: 4.5 });
      flows.push({ d: branchToPanel, color: tone.ring, dur: 3.5 });
      pads.push({ x: 296.5, y: 526.5, color: tone.ring, op: 1, transition: "opacity .3s ease .05s" });
      pads.push({ x: 420.5, y: 116.5, color: tone.ring, op: 1, transition: "opacity .3s ease .05s" });
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
        @keyframes atlas-pulse-glow { 0%, 100% { opacity: 0.45; stroke-width: 2px; } 50% { opacity: 1; stroke-width: 4px; filter: drop-shadow(0 0 10px currentColor); } }
        @keyframes atlas-pop { from { transform: scale(.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>

      <div className="flex w-full h-full flex-1 min-h-0">
      <div ref={fitRef} className="flex justify-center items-center flex-1 min-w-0 h-full">
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
                "linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />

          <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="absolute inset-0 w-full h-full">
            <defs>
              <filter id="circuit-neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Soft Neon Background Glow Traces */}
            {traces.map((tr, i) => (
              <path
                key={`glow-${i}`}
                d={tr.d}
                fill="none"
                stroke={tr.color}
                strokeWidth={tr.w * 3}
                strokeLinecap="round"
                opacity={tr.op * 0.45}
                style={{ filter: "blur(5px)", transition: tr.transition }}
              />
            ))}

            {/* Sharp Core Circuit Traces */}
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

            {/* Terminal Junction Pads with Soft Glow Aura */}
            {pads.map((p, i) => (
              <g key={i}>
                <rect
                  x={p.x - 2}
                  y={p.y - 2}
                  width={11}
                  height={11}
                  fill={p.color}
                  opacity={p.op * 0.35}
                  rx={2}
                  style={{ filter: "blur(3px)" }}
                />
                <rect
                  x={p.x}
                  y={p.y}
                  width={7}
                  height={7}
                  fill={p.color}
                  opacity={p.op}
                  style={{ transition: p.transition }}
                />
              </g>
            ))}

            {/* Animated Dashed Data Pulse Streams */}
            {animateTraces &&
              flows.map((f, i) => (
                <path
                  key={`flow-stream-${i}`}
                  d={f.d}
                  fill="none"
                  stroke={f.color}
                  strokeWidth={2.8}
                  strokeDasharray="12 18"
                  opacity={0.85}
                  style={{ animation: "atlas-flow 3.5s linear infinite" }}
                />
              ))}

            {/* Live Traveling Energy Orbs / Comets */}
            {animateTraces &&
              flows.map((f, i) => (
                <g key={`dot-group-${i}`}>
                  {/* Glowing Energy Aura */}
                  <circle r={6} fill={f.color} opacity={0.65} style={{ filter: "blur(2px)" }}>
                    <animateMotion path={f.d} dur={`${f.dur}s`} repeatCount="indefinite" rotate="auto" />
                  </circle>
                  {/* Core Bright Energy Bead */}
                  <circle r={3.6} fill="#ffffff" stroke={f.color} strokeWidth={1.8}>
                    <animateMotion path={f.d} dur={`${f.dur}s`} repeatCount="indefinite" rotate="auto" />
                  </circle>
                </g>
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
            {/* ── 1. Outermost soft blur glow aura ── */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                left: -280, top: -280, width: 560, height: 560,
                background: "radial-gradient(circle, rgba(59,130,246,0.08) 60%, transparent 100%)",
                filter: "blur(18px)",
              }}
            />

            {/* ── 2. Outermost spinning dashed orbit — brighter ── */}
            <div
              className="absolute rounded-full"
              style={{
                left: -270, top: -270, width: 540, height: 540,
                border: "1.5px dashed rgba(59,130,246,.55)",
                animation: "atlas-spin 70s linear infinite",
                filter: "drop-shadow(0 0 6px rgba(59,130,246,0.4))",
              }}
            />

            {/* ── 3. Conic tick-mark ring — brighter with blur glow ── */}
            <div
              className="absolute rounded-full pointer-events-none"
              style={{
                left: -228, top: -228, width: 456, height: 456,
                background: "repeating-conic-gradient(from 0deg, rgba(59,130,246,.75) 0deg 1.3deg, transparent 1.3deg 7.5deg)",
                WebkitMask: "radial-gradient(circle, transparent 0 68%, #000 68% 78%, transparent 78%)",
                mask: "radial-gradient(circle, transparent 0 68%, #000 68% 78%, transparent 78%)",
                animation: "atlas-spinback 95s linear infinite",
                filter: "blur(0.6px) drop-shadow(0 0 5px rgba(59,130,246,0.5))",
              }}
            />

            {/* ── 4. Inner solid glow ring ── */}
            <div
              className="absolute rounded-full"
              style={{
                left: -196, top: -196, width: 392, height: 392,
                border: "2px solid rgba(59,130,246,.40)",
                boxShadow: "0 0 28px rgba(59,130,246,.20) inset, 0 0 18px rgba(59,130,246,.15)",
              }}
            />

            {/* ── 5. Hub card — reduced bg, glassmorphism ── */}
            <div
              className="absolute rounded-full flex flex-col items-center justify-center gap-2"
              style={{
                left: -148,
                top: -148,
                width: 296,
                height: 296,
                background: "radial-gradient(circle at 50% 34%, rgba(255,255,255,0.82) 0%, rgba(219,234,254,0.60) 72%)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "2px dashed rgba(59,130,246,.45)",
                boxShadow: "0 4px 40px rgba(59,130,246,.22), 0 0 0 14px rgba(59,130,246,0.06), 0 0 0 16px var(--background)",
              }}
            >
              <Cpu size={34} color="#3b82f6" style={{ filter: "drop-shadow(0 0 6px rgba(59,130,246,0.5))" } as React.CSSProperties} />
              <div style={{ fontFamily: FONT_HEADING, fontSize: 34, color: "#0f172a", textAlign: "center", lineHeight: 1.05 }}>
                {hubLabel}
              </div>
              <div className="text-[12px] uppercase font-semibold" style={{ letterSpacing: ".18em", color: "#3b82f6" }}>
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
                background: "var(--card)",
                border: h.border,
                boxShadow: "0 1px 4px rgba(0,0,0,.06)",
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
                style={{ left: 24, top: 24, letterSpacing: ".06em", background: "var(--card)", border: "2px solid var(--border)", color: "var(--foreground)" }}
              >
                <ArrowLeft size={16} className="stroke-[2.5] text-foreground" />
                All
              </button>

              <div
                className="absolute flex flex-col gap-5"
                style={{ left: 402, top: 90, width: 1530, height: VB_H - 120, animation: "atlas-pop 1.2s cubic-bezier(.22,1,.36,1) both" }}
              >
                <div className="flex items-center gap-4 flex-none" style={{ paddingLeft: 42 }}>
                  <div className="relative flex items-center justify-center flex-none">
                    {/* Shockwave expanding aura triggered upon connector arrival */}
                    <span
                      className="absolute z-[5] rounded-full arrival-ripple-ring pointer-events-none"
                      style={{
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        margin: "auto",
                        width: 70,
                        height: 70,
                        background: focusTone.ring,
                      }}
                    />

                    {/* Spinning dashed orbit ring */}
                    <svg
                      width="72" height="72"
                      className="absolute -rotate-90 pointer-events-none"
                      style={{ top: 0, left: 0, right: 0, bottom: 0, margin: "auto" }}
                    >
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
                        background: "var(--card)",
                        border: `2.5px solid ${focusTone.ring}`,
                        '--burst-glow': focusTone.ring,
                        boxShadow: `0 0 24px ${focusTone.ring}88, 0 2px 12px rgba(0,0,0,.15)`
                      } as React.CSSProperties}
                    >
                      <focusSec.icon size={26} color={focusTone.ink} className="animate-pulse" style={{ filter: `drop-shadow(0 0 8px ${focusTone.ring})` }} />
                    </div>
                  </div>
                  <div style={{ fontFamily: FONT_HEADING, fontSize: 28, color: COLOR.neutral100 }}>{panelTitle}</div>
                </div>

                <div className="text-[17px] leading-relaxed flex-none" style={{ paddingLeft: 42, maxWidth: 780, color: COLOR.neutral300 }}>
                  {panelBody}
                </div>

                {/* Fixed-size sector card container with sleek internal scrollbar */}
                <div
                  className="rounded-2xl transition-all overflow-y-auto custom-scrollbar flex-1 p-6"
                  style={{
                    marginLeft: 26,
                    marginRight: 12,
                    maxHeight: VB_H - 250,
                    background: "transparent",
                    border: "none",
                    boxShadow: "none"
                  }}
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

          <div className="absolute z-10 flex items-center gap-2" style={{ right: 24, top: 48 }}>
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center size-9 rounded-full transition-colors border border-border bg-card text-muted-foreground hover:text-foreground cursor-pointer"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <button
              onClick={() => logout()}
              className="flex items-center gap-2 px-4 py-[9px] rounded-full text-[12px] uppercase transition-colors border border-border bg-card text-muted-foreground hover:text-foreground cursor-pointer"
              style={{ letterSpacing: ".06em", boxShadow: "0 1px 4px rgba(0,0,0,.06)" }}
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </div>
      </div>

      {!isFocus && (
        <>
          <OnPremSidePanel />
          <OnPremMobileDrawer />
        </>
      )}
      </div>
    </div>
  );
}
