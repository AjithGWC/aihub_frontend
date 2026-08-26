import { useEffect, useRef, useState } from "react";
import { Hexagon, Send, LogOut, Sun, Moon } from "lucide-react";
import { useSession } from "../auth/SessionContext";
import { useNavigate } from "react-router-dom";
import { COLOR, FONT_HEADING, FONT_BODY } from "../components/atlasTheme";
import { useTheme } from "../components/AppNavbar";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  text: string;
}

const PLACEHOLDER_REPLIES = [
  "I'm still being wired up to a real model — for now this is a placeholder reply.",
  "Noted. Once the assistant backend is connected I'll be able to answer that properly.",
  "This is a stand-in response so the chat UI can be reviewed before the API is live.",
];

function getBotReply(userMessage: string): string {
  const pick = PLACEHOLDER_REPLIES[userMessage.length % PLACEHOLDER_REPLIES.length];
  return pick;
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;

    const userMsg: ChatMessage = { id: Date.now(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    window.setTimeout(() => {
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: "assistant", text: getBotReply(text) }]);
      setIsTyping(false);
    }, 700);
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
            className="flex items-center justify-center size-8.5 rounded-sm transition-colors border border-border bg-card text-muted-foreground hover:text-foreground cursor-pointer"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest px-3 py-2 rounded-sm transition-colors cursor-pointer"
            style={{ border: `1px solid ${COLOR.panelBorder}`, color: COLOR.neutral300, background: "var(--card)" }}
          >
            <LogOut className="size-3.5" />
            Logout
          </button>
        </div>
      </header>

      <div className="relative z-10 flex-1 flex flex-col max-w-3xl w-full mx-auto px-6 py-6 min-h-0">
        <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-4 pr-1">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[75%] px-4 py-3 rounded-lg text-sm leading-relaxed"
                style={
                  m.role === "user"
                    ? { background: COLOR.accent500, color: "var(--background)" }
                    : { background: COLOR.panelBg, border: `1px solid ${COLOR.panelBorder}`, color: COLOR.neutral100, boxShadow: "0 1px 4px rgba(0,0,0,.05)" }
                }
              >
                {m.text}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div
                className="px-4 py-3 rounded-lg flex items-center gap-1.5"
                style={{ background: COLOR.panelBg, border: `1px solid ${COLOR.panelBorder}`, boxShadow: "0 1px 4px rgba(0,0,0,.05)" }}
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

        <form onSubmit={handleSend} className="mt-4 flex items-center gap-3">
          <div
            className="flex-1 flex items-center h-12 px-4 rounded-sm"
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
            disabled={!input.trim()}
            className="h-12 w-12 flex items-center justify-center rounded-sm transition-colors cursor-pointer disabled:opacity-40"
            style={{ border: `1px solid ${COLOR.accent500}`, color: "var(--foreground)", background: "var(--card)" }}
          >
            <Send className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
