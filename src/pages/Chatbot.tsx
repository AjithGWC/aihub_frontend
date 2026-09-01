import { useEffect, useRef, useState } from "react";
import {
  Send,
  LogOut,
  Sun,
  Moon,
  AlertCircle,
  Cpu,
  Bot,
  User as UserIcon,
  CheckCircle2,
  Lock,
  Plus,
  MessageSquare,
  Trash2,
  ChevronDown,
  Square,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "../auth/SessionContext";
import { useNavigate } from "react-router-dom";
import { COLOR, FONT_HEADING, FONT_BODY } from "../components/atlasTheme";
import { useTheme } from "../components/AppNavbar";
import MarkdownRenderer from "../components/MarkdownRenderer";
import AiHubLogo from "../components/AiHubLogo";
import {
  listChatModels,
  createChatSession,
  listChatSessions,
  getChatSession,
  deleteChatSession,
  streamSessionChatCompletion,
  type ChatSession,
  type ChatTurnMessage,
} from "@/api/portal";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

export interface ChatModel {
  name: string; // Exact registered model name — passed directly to the session APIs
  backend?: string;
  tasks?: string[];
  entitled: boolean;
}

const MODEL_STORAGE_PREFIX = "aihub_chat_model:";
const getSavedModel = (userId: string): string => localStorage.getItem(`${MODEL_STORAGE_PREFIX}${userId}`) ?? "";
const saveModel = (userId: string, modelId: string): void =>
  localStorage.setItem(`${MODEL_STORAGE_PREFIX}${userId}`, modelId);

function greetingMessage(user: { name?: string } | null | undefined): ChatMessage {
  return {
    id: "greeting",
    role: "assistant",
    text: `Hi ${user?.name?.split(" ")[0] ?? "there"}, I'm the AI Hub assistant. Ask me anything to get started.`,
  };
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMin = Math.round((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const SYSTEM_INSTRUCTION =
  "You are the AI Hub assistant. Always format your responses cleanly using Markdown. Format key concepts, terminology, important names, and list item headings in bold using **bold text** so they stand out clearly.";

export default function Chatbot() {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const [theme, toggleTheme] = useTheme();

  const [models, setModels] = useState<ChatModel[]>([]);
  const entitledModels = models.filter((m) => m.entitled);
  const [selectedModel, setSelectedModelState] = useState<string>(() => (user ? getSavedModel(user.id) : ""));

  const setSelectedModel = (modelName: string) => {
    setSelectedModelState(modelName);
    if (user) saveModel(user.id, modelName);
  };

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [greetingMessage(user)]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortStreamRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  useEffect(() => {
    if (!user) return;

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
        const entitled = resolved.filter((m) => m.entitled);

        if (entitled.length === 1) {
          setSelectedModel(entitled[0].name);
        } else if (entitled.length > 1) {
          const saved = getSavedModel(user.id);
          setSelectedModelState(saved && entitled.some((m) => m.name === saved) ? saved : "");
        } else {
          setSelectedModelState("");
        }
      })
      .catch(() => setModels([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const refreshSessions = () => {
    listChatSessions()
      .then(setSessions)
      .catch(() => {})
      .finally(() => setSessionsLoading(false));
  };

  useEffect(() => {
    if (!user) return;
    refreshSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(
    () => () => {
      abortStreamRef.current?.();
    },
    []
  );

  const startNewChat = () => {
    abortStreamRef.current?.();
    abortStreamRef.current = null;
    setActiveSessionId(null);
    setMessages([greetingMessage(user)]);
    setInput("");
    setError(null);
    setIsSending(false);
  };

  const openSession = async (session: ChatSession) => {
    if (session.session_id === activeSessionId) return;
    abortStreamRef.current?.();
    abortStreamRef.current = null;
    setError(null);
    setIsSending(false);
    setInput("");
    setLoadingSession(true);
    setActiveSessionId(session.session_id);
    if (session.model) setSelectedModel(session.model);

    try {
      const detail = await getChatSession(session.session_id);
      const loaded: ChatMessage[] = detail.messages
        .filter((m) => m.role !== "system")
        .map((m, i) => ({ id: `${session.session_id}-${i}`, role: m.role as "user" | "assistant", text: m.content }));
      setMessages(loaded.length > 0 ? loaded : [greetingMessage(user)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load that conversation.");
      setActiveSessionId(null);
    } finally {
      setLoadingSession(false);
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${session.title || "this conversation"}"? This can't be undone.`)) return;

    try {
      await deleteChatSession(session.session_id);
      setSessions((prev) => prev.filter((s) => s.session_id !== session.session_id));
      if (activeSessionId === session.session_id) startNewChat();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete conversation.", {
        duration: 3500,
        position: "top-right",
      });
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !user || isSending) return;

    // "" means Auto — let the backend pick a model. Only validate entitlement
    // when a specific model is selected, even if it was set before being
    // revoked.
    if (selectedModel) {
      const isEntitled = models.find((m) => m.name === selectedModel)?.entitled;
      if (!isEntitled) {
        toast.error("You are not entitled to use this model.", { duration: 3500, position: "top-right" });
        setError("You are not entitled to use the selected model.");
        return;
      }
    }

    const isNewSession = activeSessionId === null;
    const userMsg: ChatMessage = { id: `local-${Date.now()}`, role: "user", text };
    const assistantId = `local-${Date.now() + 1}`;
    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: "assistant", text: "" }]);
    setInput("");
    setError(null);
    setIsSending(true);

    let sessionId = activeSessionId;
    if (sessionId === null) {
      try {
        const session = await createChatSession(selectedModel);
        sessionId = session.session_id;
        setActiveSessionId(sessionId);
        setSessions((prev) => [session, ...prev]);
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== userMsg.id && m.id !== assistantId));
        setError(err instanceof Error ? err.message : "Failed to start a new conversation.");
        setIsSending(false);
        return;
      }
    }

    // Only the new turn is ever sent — the backend already holds this
    // session's prior history server-side against `sessionId`.
    const turnMessages: ChatTurnMessage[] = isNewSession
      ? [
          { role: "system", content: SYSTEM_INSTRUCTION },
          { role: "user", content: text },
        ]
      : [{ role: "user", content: text }];

    abortStreamRef.current = streamSessionChatCompletion(
      sessionId,
      { model: selectedModel || undefined, messages: turnMessages, temperature: 0.7 },
      {
        onDelta: (delta) => {
          setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, text: m.text + delta } : m)));
        },
        onDone: () => {
          setIsSending(false);
          abortStreamRef.current = null;
          refreshSessions();
        },
        onError: (message) => {
          setIsSending(false);
          abortStreamRef.current = null;
          setError(message);
        },
      }
    );
  };

  const handleStop = () => {
    abortStreamRef.current?.();
    abortStreamRef.current = null;
    setIsSending(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const lastMessage = messages[messages.length - 1];
  const showTypingIndicator = isSending && lastMessage?.role === "assistant" && lastMessage.text === "";
  const visibleMessages = messages.filter((m) => m.text.length > 0 || m.role === "user");

  return (
    <div
      className="h-screen max-h-screen w-full flex flex-col relative overflow-hidden"
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

        .chat-input-container {
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
        }

        .chat-input-container input,
        .chat-input-container input:focus,
        .chat-input-container input:focus-visible {
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

        .chat-input-container:focus-within {
          border-color: ${COLOR.accent500} !important;
          box-shadow: 0 0 0 1.5px ${COLOR.accent500}, 0 0 16px -2px ${COLOR.accent500}44 !important;
          background-color: var(--card) !important;
        }

        /* Hide scrollbars across browsers while preserving scrollability */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
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
        className="relative z-10 flex-none flex items-center justify-between px-6 py-3.5 backdrop-blur-md border-b border-border/80"
        style={{ background: "var(--card)" }}
      >
        <div className="flex items-center gap-3">
          <div className="size-8 relative flex items-center justify-center cursor-pointer transition-transform hover:scale-105">
            <AiHubLogo className="size-8 drop-shadow-sm" />
          </div>
          <div className="flex flex-col leading-none">
            <span style={{ fontFamily: FONT_HEADING, fontSize: 16, color: COLOR.neutral100 }}>AI HUB</span>
            <span className="text-[10px] font-bold tracking-[0.22em] uppercase mt-0.5" style={{ color: COLOR.accent500 }}>
              ASSISTANT
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {models.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border/70 bg-secondary/50 text-xs font-mono text-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
                >
                  <Cpu className="size-3.5 text-primary" />
                  <span className="max-w-[140px] truncate">{selectedModel || "Auto"}</span>
                  <ChevronDown className="size-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onSelect={() => {
                    setSelectedModel("");
                    setError(null);
                  }}
                  className="flex items-center gap-2 font-mono text-xs"
                >
                  <Sparkles className="size-3 flex-none text-primary" />
                  <span className="truncate flex-1">Auto</span>
                  {!selectedModel && <CheckCircle2 className="size-3.5 text-primary flex-none" />}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {models.map((m) => (
                  <DropdownMenuItem
                    key={m.name}
                    disabled={!m.entitled}
                    onSelect={() => {
                      if (!m.entitled) return;
                      setSelectedModel(m.name);
                      setError(null);
                    }}
                    className="flex items-center gap-2 font-mono text-xs"
                  >
                    {m.entitled ? (
                      <span
                        className="size-2 rounded-full flex-none"
                        style={{ background: m.name === selectedModel ? COLOR.accent500 : "var(--muted-foreground)" }}
                      />
                    ) : (
                      <Lock className="size-3 flex-none text-muted-foreground/60" />
                    )}
                    <span className="truncate flex-1">{m.name}</span>
                    {m.name === selectedModel && m.entitled && <CheckCircle2 className="size-3.5 text-primary flex-none" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

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
      <div className="relative z-10 flex-1 flex min-h-0 overflow-hidden">
        {/* Conversation History Sidebar */}
        <aside
          className="w-72 flex-none h-full flex flex-col border-r border-border/80 backdrop-blur-sm"
          style={{ background: "var(--card)" }}
        >
          <div className="flex-none p-3.5">
            <button
              type="button"
              onClick={startNewChat}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer text-white shadow-sm"
              style={{ background: `linear-gradient(135deg, ${COLOR.accent500} 0%, ${COLOR.accent600} 100%)` }}
            >
              <Plus className="size-3.5" />
              New Chat
            </button>
          </div>

          <div className="flex items-center gap-2 px-5 mb-1.5 text-[10px] uppercase font-mono font-bold tracking-widest text-muted-foreground">
            <MessageSquare className="size-3.5 text-primary" />
            Conversations
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-3 pb-4 flex flex-col gap-1">
            {sessionsLoading ? (
              <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-muted-foreground/70">
                <Loader2 className="size-3.5 animate-spin" />
                Loading conversations…
              </div>
            ) : sessions.length === 0 ? (
              <div className="px-3 py-2 text-[11px] leading-relaxed text-muted-foreground/80 bg-secondary/30 rounded-xl border border-border/50">
                No conversations yet — start chatting to create one.
              </div>
            ) : (
              sessions.map((s) => {
                const active = s.session_id === activeSessionId;
                return (
                  <button
                    key={s.session_id}
                    type="button"
                    onClick={() => openSession(s)}
                    className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all duration-200 cursor-pointer ${
                      active
                        ? "bg-primary/10 border border-primary/40 text-primary shadow-xs"
                        : "bg-transparent border border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                    }`}
                  >
                    <MessageSquare className="size-3.5 flex-none opacity-70" />
                    <div className="flex-1 min-w-0 leading-tight">
                      <div className="truncate text-xs font-semibold">{s.title || "New conversation"}</div>
                      <div className="truncate text-[10px] font-mono text-muted-foreground/70">
                        {formatRelativeTime(s.updated_at)}
                      </div>
                    </div>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => handleDeleteSession(e, s)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-destructive/10 hover:text-destructive flex-none cursor-pointer"
                      title="Delete conversation"
                    >
                      <Trash2 className="size-3.5" />
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Chat Feed and Message Input */}
        <div className="flex-1 flex flex-col h-full min-h-0 max-w-3xl w-full mx-auto px-4 sm:px-6 pt-4 pb-4">
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto no-scrollbar flex flex-col gap-5 pr-2 pb-6 scroll-smooth">
            {loadingSession ? (
              <div className="flex-1 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading conversation…
              </div>
            ) : (
              <>
                {visibleMessages.map((m) => {
                  const isUser = m.role === "user";
                  return (
                    <div key={m.id} className={`flex items-start gap-3 animate-msg-in ${isUser ? "justify-end" : "justify-start"}`}>
                      {!isUser && (
                        <div className="size-7 rounded-xl flex items-center justify-center flex-none bg-primary/10 border border-primary/20 text-primary mt-1">
                          <Bot className="size-4" />
                        </div>
                      )}

                      <div
                        className={`max-w-[82%] px-5 py-3.5 rounded-2xl text-sm leading-relaxed break-words shadow-sm transition-all ${
                          isUser ? "text-white shadow-md" : "border border-border/80 text-foreground"
                        }`}
                        style={
                          isUser
                            ? { background: `linear-gradient(135deg, ${COLOR.accent500} 0%, ${COLOR.accent600} 100%)` }
                            : { background: "var(--card)" }
                        }
                      >
                        <MarkdownRenderer text={m.text} isUser={isUser} />
                      </div>

                      {isUser && (
                        <div className="size-7 rounded-xl flex items-center justify-center flex-none bg-secondary text-muted-foreground mt-1 border border-border/60">
                          <UserIcon className="size-3.5" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {showTypingIndicator && (
                  <div className="flex items-start gap-3 animate-msg-in">
                    <div className="size-7 rounded-xl flex items-center justify-center flex-none bg-primary/10 border border-primary/20 text-primary mt-1">
                      <Bot className="size-4" />
                    </div>
                    <div
                      className="px-4 py-3 rounded-2xl flex items-center gap-1.5 shadow-sm border border-border/80"
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
              </>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex-none mt-2 flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-medium border border-destructive/30 bg-destructive/10 text-destructive dark:text-red-400">
              <AlertCircle className="size-4 flex-none" />
              <span className="flex-1">{error}</span>
            </div>
          )}

          {/* Message Input Form */}
          <form onSubmit={handleSend} className="flex-none pt-2 pb-1 flex items-center gap-3">
            <div className="chat-input-container flex-1 flex items-center h-12 px-4 rounded-2xl border border-border bg-card/90 backdrop-blur transition-all">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loadingSession}
                placeholder={
                  selectedModel
                    ? `Message ${selectedModel}…`
                    : entitledModels.length === 1
                    ? `Message ${entitledModels[0]?.name}…`
                    : "Message the assistant (auto)…"
                }
                style={{ outline: "none", border: "none", boxShadow: "none" }}
                className="flex-1 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none text-sm text-foreground placeholder:text-muted-foreground/60 h-full p-0"
              />
            </div>
            <button
              type={isSending ? "button" : "submit"}
              onClick={isSending ? handleStop : undefined}
              disabled={!isSending && (!input.trim() || loadingSession)}
              className="size-12 flex items-center justify-center rounded-2xl transition-all duration-200 cursor-pointer shadow-md disabled:opacity-40 text-white"
              style={{
                background: isSending
                  ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                  : `linear-gradient(135deg, ${COLOR.accent500} 0%, ${COLOR.accent600} 100%)`,
              }}
              title={isSending ? "Stop generating" : "Send message"}
            >
              {isSending ? <Square className="size-4" /> : <Send className="size-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
