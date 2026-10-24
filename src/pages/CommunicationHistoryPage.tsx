import { useMemo, useState } from "react";
import clsx from "clsx";
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
import { providerLabel } from "../lib/providerLabel";
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

  // Compact (Invoices list jaisa): pehle 10 columns the — Provider, From, Status, View
  // 1366px par screen se bahar chale jaate the. Ab do-line cells, sab bina side-scroll ke.
  const allColumns = useMemo(() => [
    {
      key: "date",
      header: "Date",
      render: (item: CommunicationHistoryItem) => (
        <span className="block whitespace-nowrap">
          <span className="block text-xs font-medium text-slate-700">{formatDateTime(item.sentAt ?? item.createdAt)}</span>
          {item.sentBy ? <span className="block max-w-[150px] truncate text-[11px] text-slate-400" title={item.sentBy}>by {item.sentBy}</span> : null}
        </span>
      )
    },
    {
      key: "recipient",
      header: "To / From",
      render: (item: CommunicationHistoryItem) => (
        <span className="block min-w-[150px] max-w-[205px]">
          <span className="block truncate font-semibold text-slate-950" title={item.recipient}>{item.recipient}</span>
          <span className="block truncate text-[11px] text-slate-400" title={item.sender ?? undefined}>from {item.sender ?? "--"}</span>
        </span>
      )
    },
    {
      key: "message",
      header: meta.showSubject ? "Subject" : "Message",
      render: (item: CommunicationHistoryItem) => (
        <span className="block min-w-[170px] max-w-[250px]" title={stripHtml(item.message)}>
          {meta.showSubject ? <span className="block truncate font-medium text-slate-800">{item.subject ?? "--"}</span> : null}
          <span className={clsx("block truncate text-slate-500", meta.showSubject && "text-xs")}>{snippet(item.message)}</span>
        </span>
      )
    },
    {
      key: "provider",
      header: "Provider",
      render: (item: CommunicationHistoryItem) => {
        const label = providerLabel(item.providerName);
        const missing = label === "Not recorded" || label === "Not configured";
        return (
          <span className={clsx("inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold", missing ? "bg-slate-100 text-slate-400" : "bg-sky-50 text-sky-700")}>
            {label}
          </span>
        );
      }
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
                <p className="text-sm"><span className="font-bold text-slate-500">Provider: </span>{providerLabel(detail.providerName)}</p>
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
