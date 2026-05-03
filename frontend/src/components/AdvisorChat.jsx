import { useEffect, useRef, useState } from "react";
import { Robot, PaperPlaneTilt, X, CircleNotch, Sparkle } from "@phosphor-icons/react";
import { api } from "../lib/api";

const SUGGESTIONS = [
  "Best rig under $5k at $0.08/kWh?",
  "Should I mine BTC or KAS right now?",
  "Compare KS5 Pro vs L9 for ROI",
  "Is Mystnodes worth running with mining?",
];

const sessionId = `advisor-${Math.random().toString(36).slice(2, 10)}`;

export default function AdvisorChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text:
        "I'm RigBot — your no-fluff mining advisor. Tell me your electricity rate and budget and I'll point at the rigs actually worth your money.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setLoading(true);
    try {
      const r = await api.post("/advisor/ask", { question: q, session_id: sessionId });
      setMessages((m) => [...m, { role: "assistant", text: r.data.answer }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "AI advisor failed. Try again in a moment." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating launcher */}
      <button
        onClick={() => setOpen((v) => !v)}
        data-testid="advisor-toggle"
        className="fixed bottom-6 left-6 z-50 bg-slate-900 hover:bg-emerald-600 transition-colors text-white px-5 py-4 font-bold text-xs uppercase tracking-wider inline-flex items-center gap-2 shadow-[6px_6px_0_0_rgba(15,23,42,0.15)]"
      >
        {open ? <X size={16} weight="bold" /> : <Robot size={16} weight="bold" />}
        {open ? "Close" : "RigBot AI"}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-24 left-6 z-50 w-[min(92vw,420px)] h-[min(70vh,560px)] bg-white border border-slate-300 shadow-[10px_10px_0_0_rgba(15,23,42,0.1)] flex flex-col"
          data-testid="advisor-panel"
        >
          <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-400 flex items-center gap-1">
                <Sparkle size={10} weight="fill" /> Powered by Claude Haiku 4.5
              </div>
              <div className="font-bold text-base mt-0.5">RigBot — Mining Advisor</div>
            </div>
            <button onClick={() => setOpen(false)} className="hover:opacity-70" data-testid="advisor-close">
              <X size={16} weight="bold" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                data-testid={`advisor-msg-${m.role}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-slate-900 text-white"
                      : "bg-white border border-slate-200 text-slate-900"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 px-4 py-3 inline-flex items-center gap-2 text-sm text-slate-600">
                  <CircleNotch className="animate-spin" size={14} /> Thinking…
                </div>
              </div>
            )}
            {messages.length <= 1 && !loading && (
              <div className="pt-2 flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    data-testid="advisor-suggestion"
                    className="text-xs px-3 py-2 bg-white border border-slate-300 hover:border-slate-900 hover:bg-slate-100 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="p-3 border-t border-slate-200 flex gap-2 bg-white"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about rigs, ROI, electricity, Mystnodes…"
              data-testid="advisor-input"
              className="flex-1 bg-white border border-slate-300 px-3 py-2 text-sm font-mono focus:outline-none focus:border-slate-900"
            />
            <button
              type="submit"
              disabled={loading}
              data-testid="advisor-send"
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors text-white px-4 py-2 font-bold text-xs uppercase tracking-wider inline-flex items-center gap-1"
            >
              <PaperPlaneTilt size={14} weight="bold" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
