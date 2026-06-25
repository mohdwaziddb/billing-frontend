import { Bot, Sparkles } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useAiAssistant } from "../hooks/useAiAssistant";
import { AiChatDrawer } from "./AiChatDrawer";

export const AiAssistantWidget = () => {
  const { user, sessionType } = useAuth();
  const { open, setOpen } = useAiAssistant();

  if (sessionType !== "user" || !user?.company?.isChatbotEnabled) {
    return null;
  }

  return (
    <>
      {!open ? (
        <button
          type="button"
          className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-lg border border-white/20 bg-[var(--theme-color)] text-[var(--theme-contrast)] shadow-[0_18px_35px_color-mix(in_srgb,var(--theme-color)_34%,transparent)] transition hover:-translate-y-1 hover:bg-[var(--theme-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-color)] focus-visible:ring-offset-2"
          onClick={() => setOpen(true)}
          title="Open BizFinity Assistant"
        >
          <Bot size={24} />
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
            <Sparkles size={12} />
          </span>
        </button>
      ) : null}
      {open ? <div className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[1px]" onClick={() => setOpen(false)} /> : null}
      <AiChatDrawer />
    </>
  );
};
