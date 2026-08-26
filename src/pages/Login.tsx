import React, { useState } from "react";
import { Hexagon, ArrowRight, Eye, EyeOff } from "lucide-react";
import { useSession } from "../auth/SessionContext";
import { useTransition } from "../components/TransitionContext";
import { COLOR, FONT_HEADING, FONT_BODY } from "../components/atlasTheme";

export default function Login() {
  const { login } = useSession();
  const { startTransition } = useTransition();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(username, password);
      startTransition(user.role === "admin" ? "/" : "/chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Node Authorization Failed");
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center relative overflow-hidden select-none"
      style={{ fontFamily: FONT_BODY, background: COLOR.bg }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Figtree:wght@300;400;500;600;700;800;900&display=swap');`}</style>

      {/* Ambient RYTAIL hub glow, matching HexagonHub's backdrop */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(1100px 900px at 88% 4%, rgba(59,130,246,.10) 0%, rgba(59,130,246,0) 60%),
            radial-gradient(900px 700px at 8% 96%, rgba(139,92,246,.06) 0%, rgba(139,92,246,0) 60%),
            ${COLOR.bg}
          `,
        }}
      />
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(circle at 50% 50%, black 50%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(circle at 50% 50%, black 50%, transparent 100%)",
        }}
      />

      <div className="relative w-full max-w-[860px] flex flex-col items-center justify-center p-6">
        {/* Central hub logo */}
        <div className="relative z-10 flex flex-col items-center mb-5">
          <div className="w-[84px] h-[74px] relative flex items-center justify-center mb-3">
            <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" fill="none">
              <polygon
                points="50,3 93,28 93,78 50,97 7,78 7,28"
                stroke={COLOR.accent500}
                strokeWidth="2.5"
                fill={COLOR.bg}
              />
            </svg>
            <div className="relative z-10 flex items-center justify-center">
              <Hexagon className="size-7" style={{ color: COLOR.accent500 }} />
            </div>
          </div>

          <div
            className="text-[26px] leading-none uppercase"
            style={{ fontFamily: FONT_HEADING, color: COLOR.neutral100 }}
          >
            AI HUB
          </div>
          <div
            className="text-[13px] font-semibold tracking-[0.3em] mt-2 uppercase"
            style={{ color: COLOR.accent500 }}
          >
            Orchestrator
          </div>
        </div>

        {/* Login card */}
        <div className="w-[330px] relative z-10">
          <form
            onSubmit={handleSubmit}
            className="relative flex flex-col gap-6 p-7 rounded-sm shadow-2xl"
            style={{ background: COLOR.panelBg, border: `1px solid ${COLOR.panelBorder}`, backdropFilter: "blur(6px)" }}
          >
            <div className="absolute top-0 left-0 w-2.5 h-2.5" style={{ borderTop: `2px solid ${COLOR.accent500}`, borderLeft: `2px solid ${COLOR.accent500}` }} />
            <div className="absolute top-0 right-0 w-2.5 h-2.5" style={{ borderTop: `2px solid ${COLOR.accent500}`, borderRight: `2px solid ${COLOR.accent500}` }} />
            <div className="absolute bottom-0 left-0 w-2.5 h-2.5" style={{ borderBottom: `2px solid ${COLOR.accent500}`, borderLeft: `2px solid ${COLOR.accent500}` }} />
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5" style={{ borderBottom: `2px solid ${COLOR.accent500}`, borderRight: `2px solid ${COLOR.accent500}` }} />

            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest font-mono font-medium" style={{ color: COLOR.neutral400 }}>
                Username
              </label>
              <div
                className="flex items-center h-11 px-3 rounded-sm transition-colors duration-300"
                style={{ background: "#f8fafc", border: `1px solid ${COLOR.hairline}` }}
              >
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  required
                  autoFocus
                  className="flex-1 bg-transparent border-none outline-none text-xs font-mono tracking-wide text-slate-900 placeholder:text-neutral-400 focus:ring-0 h-full p-0"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] uppercase tracking-widest font-mono font-medium" style={{ color: COLOR.neutral400 }}>
                Password
              </label>
              <div
                className="flex items-center h-11 px-3 rounded-sm transition-colors duration-300"
                style={{ background: "#f8fafc", border: `1px solid ${COLOR.hairline}` }}
              >
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="flex-1 bg-transparent border-none outline-none text-xs font-mono text-slate-900 placeholder:text-neutral-400 focus:ring-0 h-full p-0"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-neutral-400 hover:text-neutral-700 transition-colors focus:outline-none cursor-pointer flex items-center justify-center ml-2"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-[11px] font-mono text-red-600 bg-red-50 border border-red-200 rounded-sm p-2 text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-3 rounded-sm font-bold tracking-[0.18em] text-[11.5px] uppercase flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors duration-300"
              style={{ border: `1px solid ${COLOR.accent500}`, color: COLOR.accent600, background: "transparent" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = COLOR.accent500;
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = COLOR.accent600;
              }}
            >
              {loading ? (
                <span
                  className="size-4 border-2 rounded-full animate-spin"
                  style={{ borderColor: COLOR.accent500, borderTopColor: "transparent" }}
                />
              ) : (
                <>
                  Login
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
