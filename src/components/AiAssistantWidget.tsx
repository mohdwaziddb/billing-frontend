import { Bot, Check, Copy, Send, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { sendAiMessage, type AiChartData, type AiTableData } from "../api/ai";
import { useAuth } from "../context/AuthContext";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  chart?: AiChartData | null;
  table?: AiTableData | null;
};

const formatChartAmount = (value: number) => `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const buildCopyText = (item: ChatMessage) => {
  let text = item.content;
  if (item.role === "assistant" && item.chart?.data?.length) {
    text += `\n\n${item.chart.title || "Chart"}:`;
    item.chart.data.forEach((point) => {
      text += `\nDay ${point.label}: sales ₹${Number(point.sales).toLocaleString("en-IN", { maximumFractionDigits: 2 })}, collection ₹${Number(point.collection).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
    });
  }
  if (item.role === "assistant" && item.table?.html) {
    const holder = document.createElement("div");
    holder.innerHTML = item.table.html;
    const tableText = (holder.textContent || "").replace(/\s+/g, " ").trim();
    text += `\n\n${item.table.title ? `${item.table.title}\n` : ""}${tableText}`;
  }
  return text.trim();
};

export const AiAssistantWidget = () => {
  const { sessionType, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading]);

  if (sessionType !== "user") {
    return null;
  }

  if (user?.company && user.company.chatbotEnabled === false) {
    return null;
  }

  const send = async () => {
    const message = input.trim();
    if (!message || loading) {
      return;
    }
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const history = messages.slice(-10).map(({ role, content }) => ({ role, content }));
      const result = await sendAiMessage(message, history, controller.signal);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: result.reply, chart: result.chart, table: result.table }
      ]);
    } catch {
      if (!controller.signal.aborted) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Sorry, main is waqt reply nahi de pa raha. Thodi der baad try karo." }
        ]);
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    setMessages((prev) => prev.slice(0, -1));
  };

  const copyMessage = async (item: ChatMessage, index: number) => {
    try {
      await navigator.clipboard.writeText(buildCopyText(item));
      setCopiedIndex(index);
      window.setTimeout(() => setCopiedIndex((prev) => (prev === index ? null : prev)), 1500);
    } catch {
      // Clipboard not available; ignore.
    }
  };

  return (
    <>
      {open ? (
        <div className="fixed bottom-5 right-5 z-50 flex w-[min(92vw,24rem)] flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.25)]">
          <div className="flex items-center justify-between bg-[linear-gradient(135deg,#0f172a,#155e75)] px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                <Bot size={17} />
              </span>
              <div>
                <p className="text-sm font-bold">Bizio AI Assistant</p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-cyan-100">Aapka business, aapki madad</p>
              </div>
            </div>
            {messages.length > 0 ? (
              <button
                type="button"
                aria-label="Clear chat"
                title="Chat clear karo"
                className="rounded-full p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white"
                onClick={() => setMessages([])}
              >
                <Trash2 size={16} />
              </button>
            ) : null}
            <button type="button" aria-label="Close chat" className="rounded-full p-1.5 text-white/80 transition hover:bg-white/10 hover:text-white" onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <div ref={scrollRef} className="h-80 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4">
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center text-sm text-slate-400">
                <div>
                  <Bot size={28} className="mx-auto mb-2 text-slate-300" />
                  <p>Bizio se kuch bhi poochho - invoice, customer, GST, reports...</p>
                </div>
              </div>
            ) : (
              messages.map((item, index) => (
                <div key={index} className={item.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div className="max-w-[85%]">
                    <div
                      className={
                        item.role === "user"
                          ? "whitespace-pre-wrap rounded-2xl rounded-br-md bg-[var(--theme-color)] px-3.5 py-2.5 text-sm font-medium text-[var(--theme-contrast)]"
                          : "whitespace-pre-wrap rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800"
                      }
                    >
                      {item.content}
                      {item.role === "assistant" && item.chart?.data?.length ? (
                        <div className="mt-2">
                          <p className="mb-1 text-xs font-bold text-slate-700">{item.chart.title}</p>
                          <div className="h-44 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={item.chart.data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(value: number) => formatChartAmount(value)} />
                                <Tooltip formatter={(value: number | string) => [formatChartAmount(Number(value)), ""]} labelFormatter={(label) => `Day ${label}`} />
                                <Bar dataKey="sales" name="Sales" fill="var(--theme-color)" radius={[3, 3, 0, 0]} />
                                <Bar dataKey="collection" name="Collection" fill="#10b981" radius={[3, 3, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      ) : null}
                      {item.role === "assistant" && item.table?.html ? (
                        <div className="ai-table-root mt-2 max-w-full" dangerouslySetInnerHTML={{ __html: item.table.html }} />
                      ) : null}
                    </div>
                    <div className={`mt-1 flex ${item.role === "user" ? "justify-end" : "justify-start"}`}>
                      <button
                        type="button"
                        title="Copy to clipboard"
                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
                        onClick={() => void copyMessage(item, index)}
                      >
                        {copiedIndex === index ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                        {copiedIndex === index ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
            {loading ? (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-400">
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-flex items-center gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "120ms" }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: "240ms" }} />
                    </span>
                    <button
                      type="button"
                      title="Cancel this request"
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                      onClick={cancel}
                    >
                      <X size={11} />
                      Cancel
                    </button>
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2 border-t border-slate-200 bg-white px-3 py-3">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              placeholder="Message likho..."
              className="min-w-0 flex-1 rounded-[var(--radius-control)] border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-[var(--theme-color)] focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--theme-color)_14%,transparent)]"
            />
            <button
              type="button"
              aria-label="Send message"
              disabled={!input.trim() || loading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-[var(--theme-color)] text-[var(--theme-contrast)] transition hover:bg-[var(--theme-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void send()}
            >
              <Send size={17} />
            </button>
          </div>
          <style>{`
            .ai-table-root { max-height: 14rem; overflow: auto; }
            .ai-table-root table { width: 100%; border-collapse: collapse; font-size: 12px; }
            .ai-table-root th, .ai-table-root td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; vertical-align: top; white-space: nowrap; }
            .ai-table-root th { background: #f1f5f9; font-weight: 600; position: sticky; top: 0; z-index: 1; }
            .ai-table-root tbody tr:nth-child(even) { background: #f8fafc; }
            .ai-table-root::-webkit-scrollbar { height: 8px; width: 8px; }
            .ai-table-root::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
          `}</style>
        </div>
      ) : (
        <button
          type="button"
          aria-label="Open AI assistant"
          title="Bizio AI Assistant"
          className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f172a,#155e75)] text-white shadow-[0_16px_40px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(15,23,42,0.4)]"
          onClick={() => setOpen(true)}
        >
          <Bot size={26} />
        </button>
      )}
    </>
  );
};
