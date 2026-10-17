import { useMemo, useState } from "react";
import { getCommunicationHistory, type CommunicationHistoryChannel, type CommunicationHistoryItem } from "../api/communicationHistory";
import { Button } from "../components/Button";
import { applyVisibleColumns } from "../components/CommonColumnSelector";
import { CommonListPage } from "../components/CommonListPage";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { PreviewSurface } from "../components/PreviewSurface";
import { Select } from "../components/Select";
import { StatusBadge } from "../components/StatusBadge";
import { useListPage } from "../hooks/useListPage";
import { formatDateTime } from "../lib/format";
import { sanitizeHtml } from "../lib/sanitizeHtml";

type ChannelMeta = {
  title: string;
  subtitle: string;
  recipientLabel: string;
  showSubject: boolean;
};

const CHANNEL_META: Record<CommunicationHistoryChannel, ChannelMeta> = {
  mail: {
    title: "Mail History",
    subtitle: "Template and free-form emails sent from this workspace, newest first.",
    recipientLabel: "Recipient email",
    showSubject: true
  },
  sms: {
    title: "SMS History",
    subtitle: "Text messages sent from this workspace, newest first.",
    recipientLabel: "Mobile number",
    showSubject: false
  },
  whatsapp: {
    title: "WhatsApp History",
    subtitle: "WhatsApp messages sent from this workspace, newest first.",
    recipientLabel: "Mobile number",
    showSubject: false
  }
};

const stripHtml = (value: string | null) => {
  if (!value) {
    return "--";
  }
  const text = value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text || "--";
};

const snippet = (value: string | null, length = 90) => {
  const text = stripHtml(value);
  if (text === "--" || text.length <= length) {
    return text;
  }
  return `${text.slice(0, length)}…`;
};

const isHtmlMessage = (value: string | null) => {
  if (!value) {
    return false;
  }
  return /<\/?[a-z][^>]*>/i.test(value);
};

type HistoryFilters = {
  search: string;
  status: string;
  from: string;
  to: string;
};

const emptyFilters: HistoryFilters = {
  search: "",
  status: "",
  from: "",
  to: ""
};

export const CommunicationHistoryPage = ({ channel }: { channel: CommunicationHistoryChannel }) => (
  <CommunicationHistoryView key={channel} channel={channel} />
);

const CommunicationHistoryView = ({ channel }: { channel: CommunicationHistoryChannel }) => {
  const meta = CHANNEL_META[channel];
  const tableName = channel === "mail" ? "MAIL_HISTORY" : channel === "sms" ? "SMS_HISTORY" : "WHATSAPP_HISTORY";
  const [detail, setDetail] = useState<CommunicationHistoryItem | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);

  const list = useListPage<CommunicationHistoryItem, HistoryFilters>({
    initialFilters: emptyFilters,
    errorMessage: "Unable to load communication history",
    fetchPage: ({ page, size, search, filters }) =>
      getCommunicationHistory(channel, {
        search: search.trim() || undefined,
        status: filters.status || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        page,
        size
      })
  });

  const allColumns = useMemo(() => [
    {
      key: "date",
      header: "Date",
      render: (item: CommunicationHistoryItem) => <span className="whitespace-nowrap text-xs text-slate-600">{formatDateTime(item.createdAt)}</span>
    },
    {
      key: "recipient",
      header: channel === "mail" ? "Email" : "Mobile",
      render: (item: CommunicationHistoryItem) => <span className="block min-w-[160px] font-semibold text-slate-950">{item.recipient}</span>
    },
    ...(meta.showSubject
      ? [{
          key: "subject",
          header: "Subject",
          render: (item: CommunicationHistoryItem) => <span className="block min-w-[160px]">{item.subject ?? "--"}</span>
        }]
      : []),
    {
      key: "message",
      header: "Message",
      render: (item: CommunicationHistoryItem) => <span className="block min-w-[220px] max-w-[320px] truncate text-slate-600" title={stripHtml(item.message)}>{snippet(item.message)}</span>
    },
    {
      key: "provider",
      header: "Provider",
      render: (item: CommunicationHistoryItem) => <span className="whitespace-nowrap">{item.providerName ?? "--"}</span>
    },
    {
      key: "sender",
      header: "From",
      render: (item: CommunicationHistoryItem) => <span className="block min-w-[140px]">{item.sender ?? "--"}</span>
    },
    {
      key: "sentBy",
      header: "Sent By",
      render: (item: CommunicationHistoryItem) => <span className="whitespace-nowrap">{item.sentBy ?? "--"}</span>
    },
    {
      key: "sentAt",
      header: "Sent At",
      render: (item: CommunicationHistoryItem) => <span className="whitespace-nowrap text-xs text-slate-600">{formatDateTime(item.sentAt ?? item.createdAt)}</span>
    },
    {
      key: "status",
      header: "Status",
      render: (item: CommunicationHistoryItem) => <StatusBadge label={item.status} />
    },
    {
      key: "actions",
      header: "Details",
      render: (item: CommunicationHistoryItem) => (
        <Button type="button" variant="secondary" title="View full message" aria-label="View full message" onClick={() => setDetail(item)}>
          View
        </Button>
      )
    }
  ], [channel, meta.showSubject]);

  const visibleTableColumns = useMemo(() => applyVisibleColumns(allColumns, visibleColumns), [allColumns, visibleColumns]);

  return (
    <CommonListPage<CommunicationHistoryItem, HistoryFilters>
      pageTitle={meta.title}
      pageSubtitle={meta.subtitle}
      list={list}
      liveSearch
      searchPlaceholder={`Search ${meta.recipientLabel.toLowerCase()} or message...`}
      activeFilterCount={(filters) => (filters.status ? 1 : 0) + (filters.from ? 1 : 0) + (filters.to ? 1 : 0)}
      filterFields={
        <>
          <Select
            label="Status"
            value={list.formFilters.status}
            options={[
              { label: "All", value: "" },
              { label: "Sent", value: "SENT" },
              { label: "Failed", value: "FAILED" },
              { label: "Pending", value: "PENDING" }
            ]}
            onChange={(event) => list.updateFormFilters({ status: event.target.value })}
          />
          <Input
            label="From"
            type="date"
            value={list.formFilters.from}
            onChange={(event) => list.updateFormFilters({ from: event.target.value })}
          />
          <Input
            label="To"
            type="date"
            value={list.formFilters.to}
            onChange={(event) => list.updateFormFilters({ to: event.target.value })}
          />
        </>
      }
      columnSelector={{ tableName, columns: allColumns, visible: visibleColumns, onChange: setVisibleColumns, lockedKeys: ["date"] }}
      tableColumns={visibleTableColumns}
      emptyMessage={list.loading ? "Loading history..." : `No ${channel === "mail" ? "mail" : channel === "sms" ? "SMS" : "WhatsApp"} history found.`}
      modals={
        <Modal open={detail !== null} title={`${meta.title} details`} onClose={() => setDetail(null)}>
          {detail ? (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <p className="text-sm"><span className="font-bold text-slate-500">{channel === "mail" ? "Email: " : "Mobile: "}</span><span className="font-semibold text-slate-950">{detail.recipient}</span></p>
                <p className="text-sm"><span className="font-bold text-slate-500">Status: </span><StatusBadge label={detail.status} /></p>
                {meta.showSubject ? (
                  <p className="text-sm md:col-span-2"><span className="font-bold text-slate-500">Subject: </span><span className="font-semibold text-slate-950">{detail.subject ?? "--"}</span></p>
                ) : null}
                <p className="text-sm"><span className="font-bold text-slate-500">Provider: </span>{detail.providerName ?? "--"}</p>
                <p className="text-sm"><span className="font-bold text-slate-500">From: </span>{detail.sender ?? "--"}</p>
                <p className="text-sm"><span className="font-bold text-slate-500">Sent by: </span>{detail.sentBy ?? "--"}</p>
                <p className="text-sm"><span className="font-bold text-slate-500">Sent at: </span>{formatDateTime(detail.sentAt ?? detail.createdAt)}</p>
                {detail.messageId ? (
                  <p className="text-sm"><span className="font-bold text-slate-500">Message ID: </span>{detail.messageId}</p>
                ) : null}
              </div>
              {detail.errorMessage ? (
                <p className="amount-danger rounded-lg border border-[var(--panel-border)] bg-[var(--panel-soft)] p-4 text-sm">{detail.errorMessage}</p>
              ) : null}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Message</p>
                {channel === "mail" && isHtmlMessage(detail.message) ? (
                  <PreviewSurface className="p-3">
                    <div
                      className="break-words text-sm leading-6 [&_p]:my-1"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(detail.message) }}
                    />
                  </PreviewSurface>
                ) : (
                  <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{stripHtml(detail.message)}</p>
                )}
              </div>
            </div>
          ) : null}
        </Modal>
      }
    />
  );
};
