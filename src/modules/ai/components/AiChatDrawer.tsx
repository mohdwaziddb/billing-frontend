import { Bot, Copy, LoaderCircle, Send, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../../../components/Button";
import { notificationService } from "../../../services/notificationService";
import { useAiAssistant } from "../hooks/useAiAssistant";
import { AiDraftCard } from "./AiDraftCard";
import { MarkdownMessage } from "./MarkdownMessage";

export const AiChatDrawer = ({ embedded = false }: { embedded?: boolean }) => {
  const { open, setOpen, messages, loading, sendMessage, confirmDraft, cancelDraft, clearHistory } = useAiAssistant();
  const [input, setInput] = useState("");
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const visible = embedded || open;

  useEffect(() => {
    if (visible) {
      scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, loading, visible]);

  if (!visible) {
    return null;
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const next = input.trim();
    if (!next) {
      return;
    }
    setInput("");
    void sendMessage(next);
  };

  return (
    <aside className={embedded ? "h-[calc(100vh-8rem)] rounded-lg border border-slate-200 bg-white shadow-xl" : "fixed inset-y-0 right-0 z-50 flex w-full max-w-[460px] flex-col border-l border-slate-200 bg-white shadow-[-18px_0_50px_rgba(15,23,42,0.18)]"}>
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--theme-color)] text-[var(--theme-contrast)]">
            <Bot size={20} />
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-950">BizFinity Assistant</h2>
            <p className="text-xs font-medium text-slate-500">Company-scoped AI workspace</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length ? (
            <button type="button" className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" onClick={clearHistory} title="Clear chat">
              <Trash2 size={17} />
            </button>
          ) : null}
          {!embedded ? (
            <button type="button" className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900" onClick={() => setOpen(false)} title="Close assistant">
              <X size={18} />
            </button>
          ) : null}
        </div>
      </div>

      <div ref={scrollerRef} className="scrollbar-thin flex-1 space-y-4 overflow-y-auto bg-slate-50 px-4 py-5">
        {messages.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600 shadow-sm">
            Try asking: <span className="font-semibold text-slate-950">Create invoice for Ram with 5 Fans</span>
          </div>
        ) : null}

        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[88%] rounded-lg px-4 py-3 shadow-sm ${message.role === "user" ? "bg-[var(--theme-color)] text-[var(--theme-contrast)]" : "border border-slate-200 bg-white text-slate-700"}`}>
              <MarkdownMessage content={message.content} />
              {message.role === "assistant" ? (
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                    onClick={() => void copyToClipboard(message.content)}
                  >
                    <Copy size={13} /> Copy
                  </button>
                </div>
              ) : null}
              {message.draft ? (
                <AiDraftCard
                  draft={message.draft}
                  loading={loading}
                  onConfirm={() => void confirmDraft(message.id, message.draft!)}
                  onCancel={() => void cancelDraft(message.id, message.draft!)}
                />
              ) : null}
            </div>
          </div>
        ))}

        {loading ? (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-500 shadow-sm">
              <LoaderCircle className="animate-spin text-[var(--theme-color)]" size={16} />
              Typing...
            </div>
          </div>
        ) : null}
      </div>

      <form className="border-t border-slate-200 bg-white p-4" onSubmit={submit}>
        <div className="flex items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2 focus-within:border-[var(--theme-color)] focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--theme-color)_16%,transparent)]">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            rows={2}
            placeholder="Ask about invoices, stock, customers, payments..."
            className="min-h-[44px] flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm text-slate-950 outline-none placeholder:text-slate-400"
          />
          <Button type="submit" className="h-10 min-h-10 px-3" disabled={loading || !input.trim()}>
            {loading ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />}
          </Button>
        </div>
      </form>
    </aside>
  );
};

const copyToClipboard = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value);
    notificationService.showSuccess("Response copied");
  } catch (error) {
    notificationService.showError("Unable to copy response", error);
  }
};
