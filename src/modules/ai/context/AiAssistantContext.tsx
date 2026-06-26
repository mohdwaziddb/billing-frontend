import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { getApiErrorMessage } from "../../../lib/errors";
import { notificationService } from "../../../services/notificationService";
import { cancelAiDraft, confirmAiDraft, sendAiMessage } from "../api/ai.api";
import type { AiChatMessage, AiChatResponse, AiDraftAction } from "../types/ai.types";

type AiAssistantContextValue = {
  open: boolean;
  messages: AiChatMessage[];
  loading: boolean;
  setOpen: (open: boolean) => void;
  sendMessage: (message: string) => Promise<void>;
  confirmDraft: (messageId: string, draft: AiDraftAction) => Promise<void>;
  cancelDraft: (messageId: string, draft: AiDraftAction) => Promise<void>;
  clearHistory: () => void;
};

const AiAssistantContext = createContext<AiAssistantContextValue | undefined>(undefined);

export const AiAssistantProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const appendAssistantResponse = (response: AiChatResponse) => {
    setMessages((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.message,
        createdAt: new Date().toISOString(),
        draft: response.draft ?? null,
        chart: response.chart ?? null
      }
    ]);
  };

  const value = useMemo<AiAssistantContextValue>(() => ({
    open,
    messages,
    loading,
    setOpen,
    async sendMessage(message) {
      const trimmed = message.trim();
      if (!trimmed || loading) {
        return;
      }
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "user",
          content: trimmed,
          createdAt: new Date().toISOString()
        }
      ]);
      setLoading(true);
      try {
        appendAssistantResponse(await sendAiMessage(trimmed));
      } catch (error) {
        const messageText = getApiErrorMessage(error, "Unable to reach AI assistant");
        notificationService.showError(messageText, error);
        appendAssistantResponse({
          message: messageText,
          intent: "ERROR",
          action: "AI_CHAT",
          requiresConfirmation: false
        });
      } finally {
        setLoading(false);
      }
    },
    async confirmDraft(messageId, draft) {
      if (!draft.draftId || loading) {
        return;
      }
      setLoading(true);
      setMessages((current) => current.map((message) => (
        message.id === messageId ? { ...message, draft: { ...draft, confirmable: false } } : message
      )));
      try {
        appendAssistantResponse(await confirmAiDraft(draft.draftId));
      } catch (error) {
        const messageText = getApiErrorMessage(error, "Unable to confirm AI action");
        notificationService.showError(messageText, error);
        appendAssistantResponse({
          message: messageText,
          intent: "ERROR",
          action: "AI_ACTION",
          requiresConfirmation: false
        });
      } finally {
        setLoading(false);
      }
    },
    async cancelDraft(messageId, draft) {
      setMessages((current) => current.map((message) => (
        message.id === messageId ? { ...message, draft: null, content: "Draft cancelled." } : message
      )));
      if (!draft.draftId) {
        return;
      }
      try {
        await cancelAiDraft(draft.draftId);
      } catch {
        // The visible draft is already cancelled locally; the server will expire the signed draft.
      }
    },
    clearHistory() {
      setMessages([]);
    }
  }), [loading, messages, open]);

  return <AiAssistantContext.Provider value={value}>{children}</AiAssistantContext.Provider>;
};

export const useAiAssistantContext = () => {
  const context = useContext(AiAssistantContext);
  if (!context) {
    throw new Error("useAiAssistantContext must be used within AiAssistantProvider");
  }
  return context;
};
