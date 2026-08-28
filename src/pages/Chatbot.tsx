import { useEffect, useRef, useState } from "react";
import {
  Hexagon,
  Send,
  LogOut,
  Sun,
  Moon,
  KeyRound,
  AlertCircle,
  Cpu,
  Bot,
  User as UserIcon,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
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
  MissingApiKeyError,
  setGatewayKey,
  setGatewaySelectedModel,
} from "@/api/gateway";
import { listChatModels } from "@/api/portal";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  text: string;
}

export interface ChatModel {
  name: string; // Exact registered model name — passed directly to chatCompletion
  backend?: string;
  tasks?: string[];
  entitled: boolean;
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

  const [models, setModels] = useState<ChatModel[]>([]);
  const entitledModels = models.filter((m) => m.entitled);
  const [selectedModel, setSelectedModelState] = useState<string>(() => (user ? getGatewaySelectedModel(user.id) : ""));

  // Remember choice per user so it survives reload
  const setSelectedModel = (modelName: string) => {
    setSelectedModelState(modelName);
    if (user) setGatewaySelectedModel(user.id, modelName);
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!user || !hasKey) return;

    // /portal/chat/models returns every active model with an `entitled` flag —
    // only entitled: true models are selectable/usable for chat.
    listChatModels()
      .then((chatModels) => {
        const resolved: ChatModel[] = chatModels.map((m) => ({
          name: m.name,
          backend: m.backend,
          tasks: m.tasks,
          entitled: !!m.entitled,
        }));

        setModels(resolved);

        const entitledModels = resolved.filter((m) => m.entitled);

        // Auto-selection: if user has exactly 1 entitled model, select it immediately.
        if (entitledModels.length === 1) {
          setSelectedModel(entitledModels[0].name);
        } else if (entitledModels.length > 1) {
          const currentSaved = getGatewaySelectedModel(user.id);
          if (currentSaved && entitledModels.some((m) => m.name === currentSaved)) {
            setSelectedModelState(currentSaved);
          } else {
            setSelectedModelState("");
          }
        } else {
          setSelectedModelState("");
        }
      })
      .catch(() => {
        // Non-critical — don't clear key on model load failure
        setModels([]);
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

    // Requirement: Check if model is selected. If not, throw toast & error message.
    if (!selectedModel) {
      toast.error("Please select a model from the sidebar to start chatting.", {
        duration: 3500,
        position: "top-right",
      });
      setError("Please select a model from the sidebar before sending a message.");
      return;
    }

    // Defensive re-check: only entitled models may be used, even if selectedModel
    // was set before an entitlement was revoked.
    const isEntitled = models.find((m) => m.name === selectedModel)?.entitled;
    if (!isEntitled) {
      toast.error("You are not entitled to use this model.", {
        duration: 3500,
        position: "top-right",
      });
      setError("You are not entitled to use the selected model.");
      return;
    }

    const userMsg: ChatMessage = { id: Date.now(), role: "user", text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setError(null);
    setIsTyping(true);

    try {
      const data = await chatCompletion(user.id, {
        model: selectedModel,
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
      <Toaster />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Figtree:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap');

        @keyframes msg-pop-in {
          0% { opacity: 0; transform: translateY(8px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pulse-glow-hub {
          0%, 100% { opacity: 0.5; filter: drop-shadow(0 0 8px ${COLOR.accent500}); }
          50% { opacity: 0.9; filter: drop-shadow(0 0 16px ${COLOR.accent500}); }
        }

        .animate-msg-in {
          animation: msg-pop-in 0.25s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        .animate-pulse-hub {
          animation: pulse-glow-hub 3.5s ease-in-out infinite;
        }

        .chat-input-container,
        .key-input-container {
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
        }

        .chat-input-container input,
        .key-input-container input,
        .chat-input-container input:focus,
        .key-input-container input:focus,
        .chat-input-container input:focus-visible,
        .key-input-container input:focus-visible {
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

        .chat-input-container:focus-within,
        .key-input-container:focus-within {
          border-color: ${COLOR.accent500} !important;
          box-shadow: 0 0 0 1.5px ${COLOR.accent500}, 0 0 16px -2px ${COLOR.accent500}44 !important;
          background-color: var(--card) !important;
        }
      `}</style>

      {/* Ambient background glow */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(1100px 900px at 88% 4%, rgba(59,130,246,0.10) 0%, rgba(59,130,246,0) 60%),
            radial-gradient(900px 700px at 8% 96%, rgba(139,92,246,0.07) 0%, rgba(139,92,246,0) 60%),
            ${COLOR.bg}
          `,
        }}
      />

      {/* Grid Pattern overlay */}
      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Header Bar */}
      <header
        className="relative z-10 flex items-center justify-between px-6 py-3.5 backdrop-blur-md border-b border-border/80"
        style={{ background: "var(--card)" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-8 relative flex items-center justify-center cursor-pointer transition-transform hover:scale-105">
            <svg className="absolute inset-0 size-full animate-pulse-hub" viewBox="0 0 100 100" fill="none">
              <polygon points="50,3 93,28 93,78 50,97 7,78 7,28" stroke={COLOR.accent500} strokeWidth="3" fill="var(--card)" />
            </svg>
            <Hexagon className="size-4 relative z-10" style={{ color: COLOR.accent500 }} />
          </div>
          <div className="flex flex-col leading-none">
            <span style={{ fontFamily: FONT_HEADING, fontSize: 16, color: COLOR.neutral100 }}>AI HUB</span>
            <span className="text-[10px] font-bold tracking-[0.22em] uppercase mt-0.5" style={{ color: COLOR.accent500 }}>
              ASSISTANT
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-border/70 bg-secondary/50">
            <div className="size-6 rounded-lg flex items-center justify-center bg-primary/10 text-primary">
              <UserIcon className="size-3.5" />
            </div>
            <div className="flex flex-col text-left leading-none">
              <span className="text-xs font-semibold text-foreground">{user?.name}</span>
              <span className="text-[9.5px] uppercase font-mono tracking-wider mt-0.5" style={{ color: COLOR.accent500 }}>
                {user?.roleLabel ?? user?.role}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center justify-center size-9 rounded-xl transition-all border border-border bg-card text-muted-foreground hover:text-foreground hover:shadow-sm cursor-pointer"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="size-4 text-amber-400" /> : <Moon className="size-4 text-primary" />}
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-3.5 py-2 rounded-xl transition-all duration-200 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40 border border-border bg-card text-muted-foreground cursor-pointer"
          >
            <LogOut className="size-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <div className="relative z-10 flex-1 flex min-h-0">
        {/* Model Selection Sidebar (When Key is Connected) */}
        {hasKey && (
          <aside
            className="w-64 flex-none overflow-y-auto py-5 px-3.5 border-r border-border/80 backdrop-blur-sm"
            style={{ background: "var(--card)" }}
          >
            <div className="flex items-center justify-between px-2 mb-3">
              <div className="flex items-center gap-2 text-[10px] uppercase font-mono font-bold tracking-widest text-muted-foreground">
                <Cpu className="size-3.5 text-primary" />
                Available Models
              </div>
              {models.length > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold">
                  {models.length}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              {models.length === 0 ? (
                <div className="px-3 py-2 text-[11px] leading-relaxed text-muted-foreground/80 bg-secondary/30 rounded-xl border border-border/50">
                  No specific model overrides entitled to this key yet.
                </div>
              ) : (
                models.map((m) => {
                  const active = m.name === selectedModel;
                  const locked = !m.entitled;
                  return (
                    <button
                      key={m.name}
                      type="button"
                      disabled={locked}
                      title={locked ? "Not entitled — ask an administrator for access to this model." : undefined}
                      onClick={() => {
                        if (locked) return;
                        setSelectedModel(m.name);
                        setError(null);
                      }}
                      className={`group flex flex-col gap-1 px-3 py-2.5 rounded-xl text-left transition-all duration-200 ${
                        locked
                          ? "bg-transparent border border-transparent text-muted-foreground/50 cursor-not-allowed opacity-60"
                          : active
                          ? "bg-primary/10 border border-primary/40 text-primary font-bold shadow-xs cursor-pointer"
                          : "bg-transparent border border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/60 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-center gap-2 w-full">
                        {locked ? (
                          <Lock className="size-2.5 flex-none text-muted-foreground/60" />
                        ) : (
                          <span
                            className="size-2 rounded-full flex-none transition-transform"
                            style={{
                              background: active ? COLOR.accent500 : "var(--muted-foreground)",
                              boxShadow: active ? `0 0 8px ${COLOR.accent500}` : "none",
                            }}
                          />
                        )}
                        <span className="truncate font-mono text-xs flex-1">{m.name}</span>
                        {active && !locked && <CheckCircle2 className="size-3.5 text-primary flex-none" />}
                      </div>
                      {m.backend && (
                        <div className="text-[9.5px] font-mono text-muted-foreground/70 pl-4 truncate">
                          {m.backend}
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Model Selection Notice if Multiple Models exist and None is Picked */}
            {entitledModels.length > 1 && !selectedModel && (
              <div className="mt-4 p-2.5 rounded-xl border border-primary/20 bg-primary/5 text-primary text-[10.5px] leading-snug">
                Please pick a model above to begin chatting.
              </div>
            )}
          </aside>
        )}

        {/* Chat Feed and Message Input */}
        <div className="flex-1 flex flex-col min-h-0 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6">
          <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1">
            {messages.map((m) => {
              const isUser = m.role === "user";
              return (
                <div key={m.id} className={`flex items-end gap-2.5 animate-msg-in ${isUser ? "justify-end" : "justify-start"}`}>
                  {!isUser && (
                    <div className="size-7 rounded-xl flex items-center justify-center flex-none bg-primary/10 border border-primary/20 text-primary mb-1">
                      <Bot className="size-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm transition-all ${
                      isUser
                        ? "rounded-br-sm text-white shadow-md"
                        : "rounded-bl-sm border border-border/80 text-foreground"
                    }`}
                    style={
                      isUser
                        ? { background: `linear-gradient(135deg, ${COLOR.accent500} 0%, ${COLOR.accent600} 100%)` }
                        : { background: "var(--card)" }
                    }
                  >
                    {m.text}
                  </div>

                  {isUser && (
                    <div className="size-7 rounded-xl flex items-center justify-center flex-none bg-secondary text-muted-foreground mb-1 border border-border/60">
                      <UserIcon className="size-3.5" />
                    </div>
                  )}
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-center gap-2.5 animate-msg-in">
                <div className="size-7 rounded-xl flex items-center justify-center flex-none bg-primary/10 border border-primary/20 text-primary">
                  <Bot className="size-4" />
                </div>
                <div
                  className="px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5 shadow-sm border border-border/80"
                  style={{ background: "var(--card)" }}
                >
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="size-2 rounded-full animate-bounce"
                      style={{ background: COLOR.accent500, animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-3 flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium border border-destructive/30 bg-destructive/10 text-destructive dark:text-red-400">
              <AlertCircle className="size-4 flex-none" />
              <span className="flex-1">{error}</span>
            </div>
          )}

          {/* Connected Key: Message Input Form */}
          {hasKey ? (
            <form onSubmit={handleSend} className="mt-4 flex items-center gap-3">
              <div className="chat-input-container flex-1 flex items-center h-12 px-4 rounded-2xl border border-border bg-card/90 backdrop-blur transition-all">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    selectedModel
                      ? `Message ${selectedModel}…`
                      : entitledModels.length === 1
                      ? `Message ${entitledModels[0]?.name}…`
                      : "Select a model on the left to start messaging…"
                  }
                  style={{ outline: "none", border: "none", boxShadow: "none" }}
                  className="flex-1 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none text-sm text-foreground placeholder:text-muted-foreground/60 h-full p-0"
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="size-12 flex items-center justify-center rounded-2xl transition-all duration-200 cursor-pointer shadow-md disabled:opacity-40 text-white"
                style={{
                  background: `linear-gradient(135deg, ${COLOR.accent500} 0%, ${COLOR.accent600} 100%)`,
                }}
                title="Send message"
              >
                <Send className="size-4" />
              </button>
            </form>
          ) : (
            /* Disconnected Key: Key Link Prompt Card */
            <form
              onSubmit={handleConnectKey}
              className="mt-4 relative flex flex-col gap-3 p-6 rounded-2xl border border-border/80 shadow-xl backdrop-blur-xl transition-all"
              style={{
                background: "var(--card)",
                boxShadow: `0 20px 40px -15px rgba(0, 0, 0, 0.15), 0 0 20px -8px ${COLOR.accent500}1a`,
              }}
            >
              {/* Tech Corner Accent Brackets */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 rounded-tl-2xl pointer-events-none" style={{ borderColor: COLOR.accent500 }} />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 rounded-tr-2xl pointer-events-none" style={{ borderColor: COLOR.accent500 }} />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 rounded-bl-2xl pointer-events-none" style={{ borderColor: COLOR.accent500 }} />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 rounded-br-2xl pointer-events-none" style={{ borderColor: COLOR.accent500 }} />

              <div className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
                  <KeyRound className="size-4" />
                </div>
                <span>Connect your API key to start chatting</span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Ask an administrator to issue an API key from the Portal's Key Vault, then paste it here to authenticate with the local AI gateway.
              </p>
              <div className="flex items-center gap-3 mt-1">
                <div className="key-input-container flex-1 flex items-center h-11 px-3.5 rounded-xl border border-border bg-secondary/50 focus-within:bg-card focus-within:border-primary transition-colors">
                  <KeyRound className="size-4 text-muted-foreground mr-2.5 flex-none" />
                  <input
                    type="password"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="sk-..."
                    required
                    style={{ outline: "none", border: "none", boxShadow: "none" }}
                    className="flex-1 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none text-xs font-mono text-foreground placeholder:text-muted-foreground/50 h-full p-0"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!keyInput.trim() || connecting}
                  className="h-11 px-5 rounded-xl text-xs uppercase font-mono font-bold tracking-widest cursor-pointer transition-all duration-200 shadow-md text-white disabled:opacity-40"
                  style={{
                    background: `linear-gradient(135deg, ${COLOR.accent500} 0%, ${COLOR.accent600} 100%)`,
                  }}
                >
                  {connecting ? "Connecting..." : "Connect"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

