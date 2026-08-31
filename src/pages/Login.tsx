import React, { useState } from "react";
import { ArrowRight, Eye, EyeOff, Lock, User as UserIcon, AlertCircle } from "lucide-react";
import { useSession } from "../auth/SessionContext";
import { useTransition } from "../components/TransitionContext";
import { COLOR, FONT_HEADING, FONT_BODY, SECTOR_COLOR } from "../components/atlasTheme";
import AiHubLogo from "../components/AiHubLogo";

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
      className="min-h-screen w-full flex items-center justify-center relative overflow-hidden select-none p-4 sm:p-6"
      style={{ fontFamily: FONT_BODY, background: COLOR.bg }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Figtree:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');

        @keyframes orbit-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes orbit-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; filter: drop-shadow(0 0 10px ${COLOR.accent500}); }
          50% { opacity: 0.9; filter: drop-shadow(0 0 20px ${COLOR.accent500}); }
        }
        @keyframes shake-fade-in {
          0% { opacity: 0; transform: translateY(-6px); }
          50% { transform: translateY(2px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .animate-orbit-slow {
          animation: orbit-slow 50s linear infinite;
        }
        .animate-orbit-reverse {
          animation: orbit-reverse 35s linear infinite;
        }
        .animate-pulse-glow {
          animation: pulse-glow 3.5s ease-in-out infinite;
        }
        .animate-alert-in {
          animation: shake-fade-in 0.3s ease-out forwards;
        }

        /* Slide & shimmer hover button */
        .login-submit-btn {
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1);
        }
        .login-submit-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25), transparent);
          transition: transform 0.6s ease;
        }
        .login-submit-btn:hover::before {
          transform: translateX(200%);
        }
        .login-submit-btn:hover {
          box-shadow: 0 0 20px -2px ${COLOR.accent500}88;
        }

        /* Complete reset for inner input to prevent any inner border/outline/ring */
        .tech-input-field,
        .tech-input-field:focus,
        .tech-input-field:focus-visible,
        .tech-input-field:active,
        .tech-input-box input,
        .tech-input-box input:focus,
        .tech-input-box input:focus-visible,
        .tech-input-box input:active {
          outline: none !important;
          box-shadow: none !important;
          border: none !important;
          border-width: 0 !important;
          ring: 0 !important;
          --tw-ring-shadow: 0 0 #0000 !important;
          --tw-ring-offset-shadow: 0 0 #0000 !important;
          --tw-ring-color: transparent !important;
          background-color: transparent !important;
        }

        /* Clean autofill handling so it doesn't create inner colored boxes */
        .tech-input-box input:-webkit-autofill,
        .tech-input-box input:-webkit-autofill:hover, 
        .tech-input-box input:-webkit-autofill:focus, 
        .tech-input-box input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px var(--card) inset !important;
          -webkit-text-fill-color: var(--foreground) !important;
          caret-color: var(--foreground) !important;
          transition: background-color 5000s ease-in-out 0s;
        }

        /* Outer Full Input Border Highlight */
        .tech-input-box {
          border: 1px solid var(--border);
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
        }
        .tech-input-box:focus-within {
          border-color: ${COLOR.accent500} !important;
          box-shadow: 0 0 0 1.5px ${COLOR.accent500}, 0 0 16px -2px ${COLOR.accent500}44 !important;
          background-color: var(--card) !important;
        }
      `}</style>

      {/* Ambient RYTAIL hub glow, matching HexagonHub's backdrop */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(1100px 900px at 88% 4%, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0) 60%),
            radial-gradient(900px 700px at 8% 96%, rgba(139,92,246,0.08) 0%, rgba(139,92,246,0) 60%),
            ${COLOR.bg}
          `,
        }}
      />

      {/* Fine grid backdrop */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-45 dark:opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(circle at 50% 50%, black 55%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(circle at 50% 50%, black 55%, transparent 100%)",
        }}
      />

      {/* Ambient Orbital Rings with Particle Nodes */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden opacity-35 dark:opacity-25">
        <div className="absolute w-[680px] h-[680px] rounded-full border border-border/40 animate-orbit-slow">
          <div
            className="absolute top-0 left-1/2 -ml-1.5 -mt-1.5 size-3 rounded-full"
            style={{ background: COLOR.accent500, boxShadow: `0 0 10px ${COLOR.accent500}` }}
          />
          <div
            className="absolute bottom-12 right-12 size-2 rounded-full"
            style={{ background: SECTOR_COLOR.cyan.ring, boxShadow: `0 0 8px ${SECTOR_COLOR.cyan.ring}` }}
          />
        </div>
        <div className="absolute w-[460px] h-[460px] rounded-full border border-dashed border-border/50 animate-orbit-reverse">
          <div
            className="absolute bottom-4 left-16 size-2.5 rounded-full"
            style={{ background: SECTOR_COLOR.violet.ring, boxShadow: `0 0 10px ${SECTOR_COLOR.violet.ring}` }}
          />
        </div>
      </div>

      <div className="relative z-10 w-full max-w-[400px] flex flex-col items-center justify-center my-auto">
        {/* Central hub logo */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="size-20 relative flex items-center justify-center mb-3 group cursor-pointer transition-transform duration-300 hover:scale-105">
            <AiHubLogo className="size-20 drop-shadow-lg transition-transform duration-300 group-hover:scale-105" />
          </div>

          <h1
            className="text-[26px] leading-none uppercase tracking-tight"
            style={{ fontFamily: FONT_HEADING, color: COLOR.neutral100 }}
          >
            AI HUB
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span
              className="text-[11px] font-bold tracking-[0.25em] uppercase"
              style={{ color: COLOR.accent500 }}
            >
              Orchestrator
            </span>
            <span className="size-1 rounded-full bg-border" />
            <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
              Authentication
            </span>
          </div>
        </div>

        {/* Login card */}
        <div className="w-full relative">
          <form
            onSubmit={handleSubmit}
            className="relative flex flex-col gap-5 p-7 sm:p-8 rounded-2xl border border-border/80 shadow-2xl backdrop-blur-xl transition-all duration-300"
            style={{
              background: "var(--card)",
              boxShadow: `0 20px 45px -15px rgba(0, 0, 0, 0.15), 0 0 25px -10px ${COLOR.accent500}20`,
            }}
          >
            {/* Tech Corner Accent Brackets */}
            <div
              className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 rounded-tl-2xl pointer-events-none"
              style={{ borderColor: COLOR.accent500 }}
            />
            <div
              className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 rounded-tr-2xl pointer-events-none"
              style={{ borderColor: COLOR.accent500 }}
            />
            <div
              className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 rounded-bl-2xl pointer-events-none"
              style={{ borderColor: COLOR.accent500 }}
            />
            <div
              className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 rounded-br-2xl pointer-events-none"
              style={{ borderColor: COLOR.accent500 }}
            />

            {/* Username Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono font-medium uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                <span>Username</span>
                <span className="text-[10px] text-muted-foreground/60 font-sans normal-case">Required</span>
              </label>
              <div className="tech-input-box flex items-center h-11 px-3.5 rounded-xl border border-border bg-secondary/50 focus-within:bg-card text-foreground">
                <UserIcon className="size-4 text-muted-foreground mr-2.5 flex-none" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                  autoFocus
                  style={{ outline: "none", border: "none", boxShadow: "none" }}
                  className="tech-input-field flex-1 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none text-xs font-mono text-foreground placeholder:text-muted-foreground/50 h-full p-0"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-mono font-medium uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                <span>Password</span>
                <span className="text-[10px] text-muted-foreground/60 font-sans normal-case">Security Key</span>
              </label>
              <div className="tech-input-box flex items-center h-11 px-3.5 rounded-xl border border-border bg-secondary/50 focus-within:bg-card text-foreground">
                <Lock className="size-4 text-muted-foreground mr-2.5 flex-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  style={{ outline: "none", border: "none", boxShadow: "none" }}
                  className="tech-input-field flex-1 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none text-xs font-mono text-foreground placeholder:text-muted-foreground/50 h-full p-0"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-muted-foreground hover:text-foreground transition-colors focus:outline-none cursor-pointer flex items-center justify-center ml-2 p-1"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="animate-alert-in flex items-center gap-2 p-3 rounded-xl text-xs font-medium border border-destructive/30 bg-destructive/10 text-destructive dark:text-red-400">
                <AlertCircle className="size-4 flex-none" />
                <span className="flex-1 leading-snug">{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="login-submit-btn mt-1 w-full py-3.5 px-4 rounded-xl font-bold tracking-[0.18em] text-[12px] uppercase flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-white shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${COLOR.accent500} 0%, ${COLOR.accent600} 100%)`,
              }}
            >
              {loading ? (
                <span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Login</span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Status Pill */}
        <div className="mt-6 flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>SYSTEM READY</span>
          <span className="text-border">|</span>
          <span className="text-[10px] tracking-wider uppercase">TLS SECURE UPLINK</span>
        </div>
      </div>
    </div>
  );
}

