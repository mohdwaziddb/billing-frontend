import { Bot, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useAiAssistant } from "../hooks/useAiAssistant";
import { AiChatDrawer } from "./AiChatDrawer";

export const AiAssistantWidget = () => {
  const { user, can, sessionType, refreshPermissions, refreshProfile } = useAuth();
  const { open, setOpen } = useAiAssistant();
  const chatbotEnabled = Boolean(user?.company?.isChatbotEnabled);
  const canUseAssistant = can("AI_ASSISTANT", "VIEW");

  useEffect(() => {
    if (sessionType !== "user") {
      return;
    }

    void refreshProfile();
    void refreshPermissions();

    const refreshAssistantAccess = () => {
      if (document.visibilityState === "visible") {
        void refreshProfile();
        void refreshPermissions();
      }
    };

    window.addEventListener("focus", refreshAssistantAccess);
    document.addEventListener("visibilitychange", refreshAssistantAccess);
    return () => {
      window.removeEventListener("focus", refreshAssistantAccess);
      document.removeEventListener("visibilitychange", refreshAssistantAccess);
    };
  }, [sessionType]);

  useEffect(() => {
    if ((!chatbotEnabled || !canUseAssistant) && open) {
      setOpen(false);
    }
  }, [canUseAssistant, chatbotEnabled, open, setOpen]);

  if (sessionType !== "user" || !chatbotEnabled || !canUseAssistant) {
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
