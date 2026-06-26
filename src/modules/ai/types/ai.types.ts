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
  chart?: AiChart | null;
  data?: unknown;
};

export type AiChartSeries = {
  key: string;
  label: string;
  color?: string | null;
};

export type AiChart = {
  type: "LINE" | "BAR" | "PIE" | string;
  title: string;
  labelKey: string;
  valueKey: string;
  series?: AiChartSeries[] | null;
  data: Array<Record<string, string | number | null>>;
};

export type AiChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  draft?: AiDraftAction | null;
  chart?: AiChart | null;
  pending?: boolean;
};
