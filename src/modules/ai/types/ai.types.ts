export type AiDraftAction = {
  draftId: string | null;
  operation: string;
  title: string;
  fields: Record<string, unknown>;
  missingFields: string[];
  confirmable: boolean;
  expiresAt: string | null;
};

export type AiChatResponse = {
  message: string;
  intent: string;
  action: string;
  requiresConfirmation: boolean;
  draft?: AiDraftAction | null;
  data?: unknown;
};

export type AiChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  draft?: AiDraftAction | null;
  pending?: boolean;
};
