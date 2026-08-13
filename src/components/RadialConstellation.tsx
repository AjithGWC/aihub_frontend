/**
 * RadialConstellation3D — "scattered collage" version
 * ----------------------------------------------------------------------
 * Matches the meech213.com homepage pattern from your screenshot:
 *   - Cards (dashboards) are scattered across the screen at random
 *     positions/depths, each with its own static tilt (rotateX/Y/Z) —
 *     like photos dropped on a table, not cards arranged on a dial.
 *   - Scrolling drifts the camera through the depth field: cards drift
 *     toward you and loop back around behind once they pass — this is
 *     the real 3D-depth equivalent of meech213's scroll-cycling stack.
 *   - A minimal compass nav replaces the old rotation dial: category
 *     names sit at fixed positions around a center "HOME", with a
 *     needle that swings to point at whichever one is active — a direct
 *     analogue of meech213's PHOTO / VIDEO / ABOUT / BOOK compass.
 *   - Mouse position still drives a subtle whole-field tilt (parallax),
 *     same idea as before, just applied to the scattered field instead
 *     of a spinning ring.
 *
 * Install (same as before):
 *   npm install three @react-three/fiber@8 @react-three/drei@9
 *
 * Design note: I kept the dark dashboard palette (matches the rest of
 * your app) rather than meech213's cream background — say the word if
 * you want the light/cream look too, it's a small token swap.
 * ----------------------------------------------------------------------
 */

import React, {
  useState,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { DashboardMeta } from '@/api';
import {
  Crown,
  TrendingUp,
  Package,
  CircleDollarSign,
  Layers,
  Search,
  X,
  Activity,
  BarChart3,
  PieChart,
} from 'lucide-react';

export interface RadialConstellationProps {
  dashboards: DashboardMeta[];
}

const PALETTES = [
  { color: '#00a896', lightColor: '#02c39a', icon: Layers },
  { color: '#0284c7', lightColor: '#38bdf8', icon: TrendingUp },
  { color: '#e11d48', lightColor: '#fb7185', icon: Activity },
  { color: '#d97706', lightColor: '#fbbf24', icon: CircleDollarSign },
  { color: '#7c3aed', lightColor: '#a78bfa', icon: Crown },
  { color: '#059669', lightColor: '#34d399', icon: Package },
  { color: '#db2777', lightColor: '#f472b6', icon: PieChart },
  { color: '#4f46e5', lightColor: '#818cf8', icon: BarChart3 },
];

interface DynamicCategory {
  id: string;
  name: string;
  subtitle: string;
  color: string;
  lightColor: string;
  icon: any;
  dashboards: DashboardMeta[];
}

// ---------------------------------------------------------------------
// Grouping logic — unchanged from the original component.
// ---------------------------------------------------------------------
function useDynamicCategories(dashboards: DashboardMeta[]): DynamicCategory[] {
  return useMemo(() => {
    if (!dashboards || dashboards.length === 0) return [];

    const groups: Record<string, DashboardMeta[]> = {};

    dashboards.forEach((dash) => {
      const nameLower = (dash.name + ' ' + dash.id).toLowerCase();
      let key = 'GENERAL';

      if (nameLower.includes('exec') || nameLower.includes('ceo') || nameLower.includes('overview')) {
        key = 'EXECUTIVE';
      } else if (nameLower.includes('sale') || nameLower.includes('store') || nameLower.includes('retail')) {
        key = 'SALES & RETAIL';
      } else if (
        nameLower.includes('invent') ||
        nameLower.includes('stock') ||
        nameLower.includes('buy') ||
        nameLower.includes('supplier')
      ) {
        key = 'OPERATIONS & INVENTORY';
      } else if (nameLower.includes('finance') || nameLower.includes('margin') || nameLower.includes('merchandis')) {
        key = 'FINANCE & MERCHANDISING';
      } else {
        key = dash.name.toUpperCase();
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(dash);
    });

    return Object.keys(groups).map((catKey, index) => {
      const palette = PALETTES[index % PALETTES.length];
      const catDashboards = groups[catKey];
      const subtitle = catDashboards.map((d) => d.name.toLowerCase().split(' ')[0]).join(' · ');

      return {
        id: `cat-${index}`,
        name: catKey,
        subtitle: subtitle || 'analytics · dashboards',
        color: palette.color,
        lightColor: palette.lightColor,
        icon: palette.icon,
        dashboards: catDashboards,
      } as DynamicCategory;
    });
  }, [dashboards]);
}

// ---------------------------------------------------------------------
// Deterministic per-card "randomness" — seeded by dashboard id so the
// scatter layout doesn't reshuffle on every re-render.
// ---------------------------------------------------------------------
function seededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 1 | h);
    h = (h + Math.imul(h ^ (h >>> 7), 61 | h)) ^ h;
    return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
  };
}

interface ScatterItem {
  dash: DashboardMeta;
  x: number;
  y: number;
  z0: number; // 0..depth, seed position along the scroll axis
  rotX: number; // degrees
  rotY: number;
  rotZ: number;
  scale: number;
  floatSeed: number;
}

function useScatterLayout(dashboards: DashboardMeta[], depth: number): ScatterItem[] {
  return useMemo(() => {
    return dashboards.map((dash) => {
      const rand = seededRandom(dash.id);
      return {
        dash,
        x: (rand() - 0.5) * 11,
        y: (rand() - 0.5) * 5.2,
        z0: rand() * depth,
        rotX: (rand() - 0.5) * 8,
        rotY: (rand() - 0.5) * 8,
        rotZ: (rand() - 0.5) * 24, // the visible "scattered photo" tilt
        scale: 0.8 + rand() * 0.45,
        floatSeed: rand() * Math.PI * 2,
      };
    });
  }, [dashboards, depth]);
}

// ---------------------------------------------------------------------
// A single scattered card. Reads the shared "smooth scroll" ref every
// frame to compute its wrapped depth position, so scrolling drifts the
// whole field without any React re-render.
// ---------------------------------------------------------------------
function ScatterCard({
  item,
  color,
  lightColor,
  scrollSmooth,
  depth,
  hoveredId,
  setHoveredId,
  navigate,
}: {
  item: ScatterItem;
  color: string;
  lightColor: string;
  scrollSmooth: React.MutableRefObject<number>;
  depth: number;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  navigate: (path: string) => void;
}) {
  const groupRef = useRef<any>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;

    // Wrap the card's depth position around the scroll offset so it
    // loops seamlessly instead of running out of cards.
    let z = item.z0 - scrollSmooth.current;
    z = ((z % depth) + depth) % depth;
    const worldZ = depth / 2 - z;

    const bob = Math.sin(clock.elapsedTime * 0.5 + item.floatSeed) * 0.06;
    groupRef.current.position.set(item.x, item.y + bob, worldZ);

    // Fade/shrink near the near/far wrap edges so the loop is invisible.
    const edgeFade = Math.min(1, Math.min(z, depth - z) / 2.2);
    groupRef.current.scale.setScalar(item.scale * (0.55 + 0.45 * edgeFade));
  });

  const isHovered = hoveredId === item.dash.id;

  return (
    <group ref={groupRef}>
      <Html
        transform
        occlude={false}
        distanceFactor={6}
        zIndexRange={[60, 0]}
        style={{ pointerEvents: 'auto' }}
        rotation={[
          (item.rotX * Math.PI) / 180,
          (item.rotY * Math.PI) / 180,
          (item.rotZ * Math.PI) / 180,
        ]}
      >
        <div
          onMouseEnter={() => setHoveredId(item.dash.id)}
          onMouseLeave={() => setHoveredId(null)}
          onClick={() => navigate(`/dashboards/${item.dash.id}`)}
          className="cursor-pointer select-none rounded-lg overflow-hidden transition-transform duration-200"
          style={{
            width: 168,
            height: 210,
            background: `linear-gradient(160deg, ${color}33, #0b0f1a 78%)`,
            border: `1.5px solid ${isHovered ? lightColor : '#1e293b'}`,
            boxShadow: isHovered
              ? `0 16px 44px ${color}66, 0 0 0 1px ${color}33`
              : '0 10px 28px rgba(0,0,0,0.55)',
            transform: isHovered ? 'scale(1.07)' : 'scale(1)',
          }}
        >
          <div className="h-full w-full flex flex-col justify-end p-3">
            <div
              className="text-[10px] uppercase tracking-[0.2em] mb-1"
              style={{ color: lightColor }}
            >
              {item.dash.name.split(' ')[0]}
            </div>
            <div className="text-[13px] font-bold text-white leading-tight">
              {item.dash.name}
            </div>
          </div>
        </div>
      </Html>
    </group>
  );
}

// ---------------------------------------------------------------------
// Runs once inside the Canvas purely to damp scrollTarget -> scrollSmooth
// every frame (a shared ref, so no React re-render is needed).
// ---------------------------------------------------------------------
function ScrollDamper({
  target,
  smooth,
}: {
  target: React.MutableRefObject<number>;
  smooth: React.MutableRefObject<number>;
}) {
  useFrame(() => {
    smooth.current += (target.current - smooth.current) * 0.08;
  });
  return null;
}

// ---------------------------------------------------------------------
// The 3D scene: lighting, the scattered field, and the whole-field
// mouse-parallax tilt (the "3D tilt" feel from meech213).
// ---------------------------------------------------------------------
function Scene({
  items,
  colorFor,
  scrollTarget,
  scrollSmooth,
  depth,
  mouseTilt,
  hoveredId,
  setHoveredId,
  navigate,
}: {
  items: ScatterItem[];
  colorFor: (dash: DashboardMeta) => { color: string; lightColor: string };
  scrollTarget: React.MutableRefObject<number>;
  scrollSmooth: React.MutableRefObject<number>;
  depth: number;
  mouseTilt: React.MutableRefObject<{ x: number; y: number }>;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  navigate: (path: string) => void;
}) {
  const fieldRef = useRef<any>(null);

  useFrame(() => {
    if (fieldRef.current) {
      fieldRef.current.rotation.x += (mouseTilt.current.y * -0.14 - fieldRef.current.rotation.x) * 0.06;
      fieldRef.current.rotation.y += (mouseTilt.current.x * 0.18 - fieldRef.current.rotation.y) * 0.06;
    }
  });

  return (
    <>
      <ambientLight intensity={0.75} />
      <pointLight position={[0, 4, 6]} intensity={1} color="#ffffff" />
      <pointLight position={[0, -3, -6]} intensity={0.3} color="#6366f1" />

      <ScrollDamper target={scrollTarget} smooth={scrollSmooth} />

      <group ref={fieldRef}>
        {items.map((item) => {
          const c = colorFor(item.dash);
          return (
            <ScatterCard
              key={item.dash.id}
              item={item}
              color={c.color}
              lightColor={c.lightColor}
              scrollSmooth={scrollSmooth}
              depth={depth}
              hoveredId={hoveredId}
              setHoveredId={setHoveredId}
              navigate={navigate}
            />
          );
        })}
      </group>
    </>
  );
}

// ---------------------------------------------------------------------
// Compass nav — replaces the old rotation dial. A center "HOME" resets
// the filter; category names sit around it; a needle swings to point
// at whichever is active. Pure DOM/CSS, laid over the canvas.
// ---------------------------------------------------------------------
function CompassNav({
  categories,
  activeId,
  setActiveId,
}: {
  categories: DynamicCategory[];
  activeId: string | null;
  setActiveId: (id: string | null) => void;
}) {
  const SIZE = 460;
  const CENTER = SIZE / 2;
  const RING_R = 200;
  const angleStep = 360 / Math.max(1, categories.length);

  const activeIndex = categories.findIndex((c) => c.id === activeId);
  // Neutral resting angle (down-left) when nothing is active, echoing
  // the meech213 screenshot's needle default position.
  const needleDeg = activeIndex >= 0 ? activeIndex * angleStep - 90 : 145;
  const needleRad = (needleDeg * Math.PI) / 180;
  const needleLen = 140;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg className="absolute inset-0" width={SIZE} height={SIZE}>
          <line
            x1={CENTER}
            y1={CENTER}
            x2={CENTER + needleLen * Math.cos(needleRad)}
            y2={CENTER + needleLen * Math.sin(needleRad)}
            stroke="#475569"
            strokeWidth="1"
            style={{ transition: 'x2 0.5s ease, y2 0.5s ease' }}
          />
          <circle cx={CENTER} cy={CENTER} r="3" fill="#64748b" />
        </svg>

        <button
          onClick={() => setActiveId(null)}
          className="pointer-events-auto absolute font-light tracking-[0.3em] uppercase text-2xl transition-colors duration-200"
          style={{
            left: CENTER,
            top: CENTER,
            transform: 'translate(-50%, -50%)',
            color: activeId === null ? '#f8fafc' : '#475569',
          }}
        >
          HOME
        </button>

        {categories.map((cat, i) => {
          const angle = (i * angleStep - 90) * (Math.PI / 180);
          const x = CENTER + RING_R * Math.cos(angle);
          const y = CENTER + RING_R * Math.sin(angle);
          const isActive = cat.id === activeId;

          return (
            <button
              key={cat.id}
              onClick={() => setActiveId(isActive ? null : cat.id)}
              className="pointer-events-auto absolute text-sm font-light tracking-[0.2em] uppercase transition-colors duration-200 whitespace-nowrap"
              style={{
                left: x,
                top: y,
                transform: 'translate(-50%, -50%)',
                color: isActive ? cat.lightColor : '#475569',
              }}
            >
              {cat.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Top-level component.
// ---------------------------------------------------------------------
export default function RadialConstellation3D({ dashboards }: RadialConstellationProps) {
  const navigate = useNavigate();
  const dynamicCategories = useDynamicCategories(dashboards);

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const visibleDashboards = useMemo(() => {
    const base = activeCategoryId
      ? dynamicCategories.find((c) => c.id === activeCategoryId)?.dashboards ?? []
      : dashboards;

    const q = searchQuery.toLowerCase().trim();
    if (!q) return base;
    return base.filter(
      (d) => d.name.toLowerCase().includes(q) || (d.description ? d.description.toLowerCase().includes(q) : false),
    );
  }, [activeCategoryId, dynamicCategories, dashboards, searchQuery]);

  const DEPTH = 22;
  const items = useScatterLayout(visibleDashboards, DEPTH);

  const colorFor = useCallback(
    (dash: DashboardMeta) => {
      const cat = dynamicCategories.find((c) => c.dashboards.some((d) => d.id === dash.id));
      return cat ? { color: cat.color, lightColor: cat.lightColor } : { color: '#818cf8', lightColor: '#a5b4fc' };
    },
    [dynamicCategories],
  );

  const scrollTarget = useRef(0);
  const scrollSmooth = useRef(0);
  const mouseTilt = useRef({ x: 0, y: 0 });

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    scrollTarget.current += e.deltaY * 0.012;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const bounds = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    mouseTilt.current = {
      x: (e.clientX - bounds.left - bounds.width / 2) / (bounds.width / 2),
      y: (e.clientY - bounds.top - bounds.height / 2) / (bounds.height / 2),
    };
  }, []);

  return (
    <div
      onWheel={handleWheel}
      onPointerMove={handlePointerMove}
      className="relative h-[calc(100vh-3rem)] w-full overflow-hidden bg-[#080b11] text-slate-100 select-none"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950/30 via-[#080b11] to-[#04060a] pointer-events-none" />

      {/* Header / search */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between gap-4 p-4 max-w-xl mx-auto">
        <div className="text-xs text-slate-500 tracking-widest uppercase">Scroll to drift · Click a label to filter</div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search dashboards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900/80 border border-slate-800 rounded-full text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 backdrop-blur-md"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* The 3D scattered field */}
      <Canvas camera={{ position: [0, 0.3, 9], fov: 42 }} className="!absolute inset-0 z-10">
        <Scene
          items={items}
          colorFor={colorFor}
          scrollTarget={scrollTarget}
          scrollSmooth={scrollSmooth}
          depth={DEPTH}
          mouseTilt={mouseTilt}
          hoveredId={hoveredId}
          setHoveredId={setHoveredId}
          navigate={navigate}
        />
      </Canvas>

      {/* Compass nav overlay, sits above the canvas but below cards visually
          since cards render nearer camera; z-30 only affects the nav's own
          hit-testing, not the WebGL depth. */}
      <CompassNav categories={dynamicCategories} activeId={activeCategoryId} setActiveId={setActiveCategoryId} />
    </div>
  );
}