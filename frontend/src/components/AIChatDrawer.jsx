import React, { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { X, PaperPlaneTilt, Robot, User, Sparkle } from "@phosphor-icons/react";

const SUGGESTIONS = [
  "Which nodes are underperforming this week?",
  "Forecast my earnings for the next 7 days",
  "Why is node phoenix-04 offline? How do I fix it?",
  "Which region should I expand into for best yield?",
];

function sessionId() {
  let id = localStorage.getItem("mm_session_id");
  if (!id) {
    id = `sess-${crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;
    localStorage.setItem("mm_session_id", id);
  }
  return id;
}

export default function AIChatDrawer({ open, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const sid = sessionId();

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const r = await api.get(`/ai/history/${sid}`);
        setMessages(r.data || []);
      } catch {}
    })();
  }, [open, sid]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    setInput("");
    const optimistic = {
      id: `tmp-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    setSending(true);
    try {
      const r = await api.post("/ai/chat", { session_id: sid, message: content });
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: r.data.reply,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "⚠ Upstream LLM error. Please try again in a moment.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" data-testid="ai-chat-drawer">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside
        className="absolute right-0 top-0 h-full w-full sm:w-[480px] md:w-[560px] bg-surface border-l border-lime/30 flex flex-col shimmer-border"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="relative h-8 w-8 rounded-sm border border-lime/40 bg-lime/10 flex items-center justify-center">
              <Robot size={16} weight="bold" className="text-lime" />
            </div>
            <div>
              <div className="font-display text-sm font-semibold">NODE-OPS</div>
              <div className="font-mono text-[10px] text-white/40 uppercase tracking-widest">AI copilot · live fleet context</div>
            </div>
          </div>
          <button
            data-testid="close-ai-chat-btn"
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center border border-white/10 hover:border-lime/50 rounded-sm"
          >
            <X size={14} />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <div className="p-4 border border-lime/30 bg-lime/5 rounded-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkle size={14} className="text-lime" weight="fill" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-lime">Ready</span>
                </div>
                <div className="font-body text-sm text-white/80 leading-relaxed">
                  I have live access to your fleet — 12 nodes, earnings, uptime, bandwidth. Ask me anything about optimization, anomalies or forecasts.
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    data-testid={`suggestion-${i}`}
                    onClick={() => send(s)}
                    className="text-left px-3 py-2 border border-white/10 hover:border-lime/40 hover:bg-lime/5 transition-colors rounded-sm font-mono text-[11px] text-white/70 hover:text-white"
                  >
                    › {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`h-6 w-6 flex-shrink-0 rounded-sm flex items-center justify-center border ${m.role === "user" ? "border-cyan/40 bg-cyan/10" : "border-lime/40 bg-lime/10"}`}>
                {m.role === "user" ? <User size={12} className="text-[#00F0FF]" /> : <Robot size={12} className="text-lime" />}
              </div>
              <div className={`max-w-[78%] border rounded-sm px-3 py-2 ${m.role === "user" ? "border-cyan/30 bg-cyan/5" : "border-white/10 bg-app/40"}`}>
                <div className={`font-body text-sm leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "text-white" : "text-white/90"}`}>
                  {m.content}
                </div>
                <div className="font-mono text-[9px] text-white/30 mt-1">
                  {new Date(m.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex gap-2">
              <div className="h-6 w-6 rounded-sm flex items-center justify-center border border-lime/40 bg-lime/10">
                <Robot size={12} className="text-lime" />
              </div>
              <div className="border border-white/10 bg-app/40 rounded-sm px-3 py-2">
                <div className="font-mono text-xs text-lime caret">thinking</div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-white/10 p-3">
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex items-center gap-2 border border-white/10 focus-within:border-lime/60 rounded-sm px-3 py-2 bg-app/50"
          >
            <input
              data-testid="ai-chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask NODE-OPS about your fleet…"
              className="flex-1 bg-transparent outline-none font-mono text-sm text-white placeholder-white/30"
              disabled={sending}
            />
            <button
              data-testid="ai-chat-send-btn"
              type="submit"
              disabled={sending || !input.trim()}
              className="h-8 w-8 flex items-center justify-center bg-lime text-black rounded-sm hover:bg-[#b3e600] transition-colors disabled:opacity-40"
            >
              <PaperPlaneTilt size={14} weight="bold" />
            </button>
          </form>
          <div className="font-mono text-[9px] text-white/30 mt-2 text-center tracking-widest uppercase">
            Powered by Claude Sonnet 4.5 · live fleet context
          </div>
        </div>
      </aside>
    </div>
  );
}
