import { useEffect, useRef, useState } from "react";
import { Hexagon, Send, LogOut, Sun, Moon, KeyRound, AlertCircle, Cpu } from "lucide-react";
import { useSession } from "../auth/SessionContext";
import { useNavigate } from "react-router-dom";
import { COLOR, FONT_HEADING, FONT_BODY } from "../components/atlasTheme";
import { useTheme } from "../components/AppNavbar";
import {
  chatCompletion,
  clearGatewayKey,
  extractReplyText,
  getGatewayKey,
  getGatewaySelectedModel,
  InvalidApiKeyError,
  listGatewayModels,
  MissingApiKeyError,
  setGatewayKey,
  setGatewaySelectedModel,
} from "@/api/gateway";
import { listModels } from "@/api/portal";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  text: string;
}

export default function Chatbot() {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const [theme, toggleTheme] = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 0,
      role: "assistant",
      text: `Hi ${user?.name?.split(" ")[0] ?? "there"}, I'm the AI Hub assistant. Ask me anything to get started.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [hasKey, setHasKey] = useState(() => (user ? !!getGatewayKey(user.id) : false));
  const [keyInput, setKeyInput] = useState("");
  const [connecting, setConnecting] = useState(false);

  const [models, setModels] = useState<{ id: string }[]>([]);
  const [selectedModel, setSelectedModelState] = useState<string>(() => (user ? getGatewaySelectedModel(user.id) : ""));

  // Remember the choice per user so it survives a reload instead of resetting to Auto.
  const setSelectedModel = (modelId: string) => {
    setSelectedModelState(modelId);
    if (user) setGatewaySelectedModel(user.id, modelId);
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!user || !hasKey) return;
    // Show only models that are BOTH genuinely registered/active in the
    // Portal's Model Registry AND actually entitled to this connected key
    // per the gateway's own /v1/models — the registry list alone can include
    // models this key isn't scoped to, and the gateway list alone can
    // include stale/undeployed ids, so the intersection is what's real.
    Promise.all([listModels(), listGatewayModels(user.id)])
      .then(([registry, gateway]) => {
        const entitled = new Set((gateway.data ?? []).map((m) => m.id));
        setModels(
          registry
            .filter((m) => m.status === 'active' && m.tasks.includes('chat') && entitled.has(m.name))
            .map((m) => ({ id: m.name }))
        );
      })
      .catch((err) => {
        if (err instanceof InvalidApiKeyError) {
          clearGatewayKey(user.id);
          setHasKey(false);
          setError(err.message);
        }
        // Other failures just leave the model list empty — the user can
        // still send with no model selected, which will surface the error.
      });
  }, [user, hasKey]);

  const handleConnectKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !keyInput.trim()) return;
    setConnecting(true);
    setGatewayKey(user.id, keyInput.trim());
    setKeyInput("");
    setHasKey(true);
    setConnecting(false);
    setError(null);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !user) return;

    const userMsg: ChatMessage = { id: Date.now(), role: "user", text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setError(null);
    setIsTyping(true);

    try {
      const data = await chatCompletion(user.id, {
        ...(selectedModel ? { model: selectedModel } : {}),
        messages: history.map((m) => ({ role: m.role, content: m.text })),
        stream: false,
      });
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: "assistant", text: extractReplyText(data) }]);
    } catch (err) {
      if (err instanceof MissingApiKeyError || err instanceof InvalidApiKeyError) {
        if (err instanceof InvalidApiKeyError) clearGatewayKey(user.id);
        setHasKey(false);
      }
      setError(err instanceof Error ? err.message : "Failed to reach the AI Hub assistant.");
    } finally {
      setIsTyping(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col relative overflow-hidden"
      style={{ fontFamily: FONT_BODY, background: COLOR.bg }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Figtree:wght@300;400;500;600;700;800;900&display=swap');`}</style>

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

      <header
        className="relative z-10 flex items-center justify-between px-6 py-4"
        style={{ borderBottom: `1px solid ${COLOR.hairline}` }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-8 relative flex items-center justify-center">
            <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" fill="none">
              <polygon points="50,3 93,28 93,78 50,97 7,78 7,28" stroke={COLOR.accent500} strokeWidth="4" fill={COLOR.bg} />
            </svg>
            <Hexagon className="size-4 relative z-10" style={{ color: COLOR.accent500 }} />
          </div>
          <div className="flex flex-col leading-none">
            <span style={{ fontFamily: FONT_HEADING, fontSize: 15, color: COLOR.neutral100 }}>AI HUB</span>
            <span style={{ fontSize: 10, letterSpacing: "0.25em", color: COLOR.accent500 }}>ASSISTANT</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end leading-tight">
            <span className="text-xs" style={{ color: COLOR.neutral200 }}>{user?.name}</span>
            <span className="text-[10px] uppercase tracking-widest" style={{ color: COLOR.accent500 }}>{user?.roleLabel ?? user?.role}</span>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center justify-center size-8.5 rounded-lg transition-colors border border-border bg-card text-muted-foreground hover:text-foreground hover:shadow-sm cursor-pointer"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest px-3 py-2 rounded-lg transition-colors hover:shadow-sm cursor-pointer"
            style={{ border: `1px solid ${COLOR.panelBorder}`, color: COLOR.neutral300, background: "var(--card)" }}
          >
            <LogOut className="size-3.5" />
            Logout
          </button>
        </div>
      </header>

      <div className="relative z-10 flex-1 flex min-h-0">
        {hasKey && (
          <aside
            className="w-56 flex-none overflow-y-auto py-5 px-3 bg-card"
            style={{ borderRight: `1px solid ${COLOR.hairline}` }}
          >
            <div
              className="flex items-center gap-1.5 px-2 mb-3 text-[10px] uppercase tracking-widest font-bold"
              style={{ color: COLOR.neutral400 }}
            >
              <Cpu className="size-3.5" />
              Your Models
            </div>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                onClick={() => setSelectedModel("")}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left transition-colors cursor-pointer"
                style={
                  selectedModel === ""
                    ? { background: `${COLOR.accent500}1a`, border: `1px solid ${COLOR.accent500}`, color: COLOR.accent600, fontWeight: 700 }
                    : { background: "transparent", border: "1px solid transparent", color: COLOR.neutral200 }
                }
              >
                <span
                  className="size-1.5 rounded-full flex-none"
                  style={{ background: selectedModel === "" ? COLOR.accent500 : COLOR.neutral400 }}
                />
                <span className="truncate">Auto (default)</span>
              </button>
              {models.length === 0 ? (
                <p className="px-2.5 py-1.5 text-[11px] leading-relaxed" style={{ color: COLOR.neutral400 }}>
                  No specific models entitled to this key yet — Auto will still work.
                </p>
              ) : (
                models.map((m) => {
                  const active = m.id === selectedModel;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedModel(m.id)}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left transition-colors cursor-pointer"
                      style={
                        active
                          ? { background: `${COLOR.accent500}1a`, border: `1px solid ${COLOR.accent500}`, color: COLOR.accent600, fontWeight: 700 }
                          : { background: "transparent", border: "1px solid transparent", color: COLOR.neutral200 }
                      }
                    >
                      <span
                        className="size-1.5 rounded-full flex-none"
                        style={{ background: active ? COLOR.accent500 : COLOR.neutral400 }}
                      />
                      <span className="truncate font-mono">{m.id}</span>
                    </button>
                  );
                })
              )}
            </div>
          </aside>
        )}

        <div className="flex-1 flex flex-col min-h-0 max-w-3xl w-full mx-auto px-6 py-6">
        <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[75%] px-4 py-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm"
                style={
                  m.role === "user"
                    ? { background: COLOR.accent500, color: "var(--background)" }
                    : { background: COLOR.panelBg, border: `1px solid ${COLOR.panelBorder}`, color: COLOR.neutral100 }
                }
              >
                {m.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div
                className="px-4 py-3 rounded-xl flex items-center gap-1.5 shadow-sm"
                style={{ background: COLOR.panelBg, border: `1px solid ${COLOR.panelBorder}` }}
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="size-1.5 rounded-full animate-bounce"
                    style={{ background: COLOR.accent500, animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div
            className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.35)", color: "#ef4444" }}
          >
            <AlertCircle className="size-3.5 flex-none" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {hasKey ? (
          <form onSubmit={handleSend} className="mt-4 flex items-center gap-3">
            <div
              className="flex-1 flex items-center h-12 px-4 rounded-xl"
              style={{ background: "var(--panel-2)", border: `1px solid ${COLOR.hairline}` }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message the AI Hub assistant…"
                className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-neutral-400 focus:ring-0 h-full p-0"
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="h-12 w-12 flex items-center justify-center rounded-xl transition-all cursor-pointer hover:shadow-sm disabled:opacity-40"
              style={{ border: `1px solid ${COLOR.accent500}`, color: "var(--foreground)", background: "var(--card)" }}
            >
              <Send className="size-4" />
            </button>
          </form>
        ) : (
          <form
            onSubmit={handleConnectKey}
            className="mt-4 flex flex-col gap-2 p-5 rounded-2xl shadow-sm"
            style={{ background: "var(--card)", border: `1px solid ${COLOR.hairline}` }}
          >
            <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: COLOR.neutral100 }}>
              <KeyRound className="size-3.5" style={{ color: COLOR.accent500 }} />
              Connect your API key to start chatting
            </div>
            <p className="text-[11px]" style={{ color: COLOR.neutral400 }}>
              Ask an admin to issue you an API key from the Portal's API Keys vault, then paste it here. It's stored only in this browser.
            </p>
            <div className="flex items-center gap-3 mt-1">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="sk-..."
                required
                className="flex-1 h-10 px-3 rounded-lg text-xs font-mono border border-border bg-background text-foreground placeholder:text-neutral-400 outline-none"
              />
              <button
                type="submit"
                disabled={!keyInput.trim() || connecting}
                className="h-10 px-4 rounded-lg text-[11px] uppercase tracking-widest font-bold cursor-pointer transition-all hover:shadow-sm disabled:opacity-40"
                style={{ border: `1px solid ${COLOR.accent500}`, color: COLOR.accent600, background: "transparent" }}
              >
                Connect
              </button>
            </div>
          </form>
        )}
        </div>
      </div>
    </div>
  );
}
