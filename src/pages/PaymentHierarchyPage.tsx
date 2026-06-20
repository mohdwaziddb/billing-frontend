import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Maximize2, Minimize2, RefreshCcw, ZoomIn, ZoomOut } from "lucide-react";
import { getPaymentHierarchyChildren, type PaymentHierarchyParams } from "../api/paymentHierarchy";
import { Button } from "../components/Button";
import { CommonBreadcrumb } from "../components/CommonBreadcrumb";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { formatCurrency } from "../lib/currency";
import { formatDate } from "../lib/format";
import { notificationService } from "../services/notificationService";
import type { PaymentHierarchyNode, PaymentHierarchyRecord } from "../types/api";

type DatePreset = "today" | "yesterday" | "thisWeek" | "thisMonth" | "thisYear" | "custom";

type SummaryState = {
  companyName: string;
  totalReceivable: number;
  totalCollected: number;
  totalOutstanding: number;
  totalExpense: number;
  netRevenue: number;
};

const defaultSummary: SummaryState = {
  companyName: "Company",
  totalReceivable: 0,
  totalCollected: 0,
  totalOutstanding: 0,
  totalExpense: 0,
  netRevenue: 0
};

const DATE_PRESET_OPTIONS: Array<{ value: DatePreset; label: string }> = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "thisWeek", label: "This Week" },
  { value: "thisMonth", label: "This Month" },
  { value: "thisYear", label: "This Year" },
  { value: "custom", label: "Custom Range" }
];

const toIso = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildRange = (preset: DatePreset) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (preset === "today") {
    return { startDate: toIso(today), endDate: toIso(today) };
  }
  if (preset === "yesterday") {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return { startDate: toIso(yesterday), endDate: toIso(yesterday) };
  }
  if (preset === "thisWeek") {
    const start = new Date(today);
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    return { startDate: toIso(start), endDate: toIso(today) };
  }
  if (preset === "thisMonth") {
    return { startDate: toIso(new Date(today.getFullYear(), today.getMonth(), 1)), endDate: toIso(today) };
  }
  return { startDate: toIso(new Date(today.getFullYear(), 0, 1)), endDate: toIso(today) };
};

const companyRootNode = (summary: SummaryState): PaymentHierarchyNode => ({
  id: "company",
  parentId: null,
  type: "company",
  label: summary.companyName || "Company",
  subtitle: "Payment hierarchy",
  amount: summary.totalReceivable,
  count: 0,
  hasChildren: true,
  tone: "company"
});

const summaryMetricNodes = (summary: SummaryState, counts: Record<string, number> = {}): PaymentHierarchyNode[] => [
  {
    id: "total-sales",
    parentId: "company",
    type: "metric",
    label: "Total Sales",
    subtitle: "Total invoiced amount",
    amount: summary.totalReceivable,
    count: counts["total-sales"] ?? 0,
    hasChildren: true,
    tone: "sales"
  },
  {
    id: "total-collection",
    parentId: "company",
    type: "metric",
    label: "Total Collection",
    subtitle: "Received amount",
    amount: summary.totalCollected,
    count: counts["total-collection"] ?? 0,
    hasChildren: true,
    tone: "collected"
  },
  {
    id: "total-outstanding",
    parentId: "company",
    type: "metric",
    label: "Outstanding",
    subtitle: "Pending amount",
    amount: summary.totalOutstanding,
    count: counts["total-outstanding"] ?? 0,
    hasChildren: true,
    tone: "danger"
  },
  {
    id: "total-expense",
    parentId: "company",
    type: "metric",
    label: "Expense",
    subtitle: "Total expense",
    amount: summary.totalExpense,
    count: counts["total-expense"] ?? 0,
    hasChildren: true,
    tone: "expense"
  },
  {
    id: "net-revenue",
    parentId: "company",
    type: "metric",
    label: "Net Revenue",
    subtitle: "Collection minus expense",
    amount: summary.netRevenue,
    count: counts["net-revenue"] ?? 0,
    hasChildren: true,
    tone: "net"
  }
].filter((node) => Math.abs(node.amount) > 0.005);

export const PaymentHierarchyPage = () => {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [summary, setSummary] = useState<SummaryState>(defaultSummary);
  const [metricCounts, setMetricCounts] = useState<Record<string, number>>({});
  const [childrenByParent, setChildrenByParent] = useState<Record<string, PaymentHierarchyNode[]>>({});
  const [recordsByDay, setRecordsByDay] = useState<Record<string, PaymentHierarchyRecord[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState<Set<string>>(new Set());
  const [activeNode, setActiveNode] = useState<PaymentHierarchyNode | null>(null);
  const [loadingNode, setLoadingNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.9);
  const [fullscreen, setFullscreen] = useState(false);
  const [preset, setPreset] = useState<DatePreset>("thisYear");
  const [customRange, setCustomRange] = useState(() => buildRange("thisMonth"));

  const activeRange = useMemo(() => (preset === "custom" ? customRange : buildRange(preset)), [customRange, preset]);
  const root = companyRootNode(summary);
  const metricNodes = summaryMetricNodes(summary, metricCounts);
  const activeRecords = activeNode?.type === "day" ? recordsByDay[activeNode.id] ?? [] : [];

  useEffect(() => {
    setSummary(defaultSummary);
    setMetricCounts({});
    setRecordsByDay({});
    setExpanded(new Set());
    setChildrenByParent({ company: summaryMetricNodes(defaultSummary, {}) });
    setLoaded(new Set());
    setActiveNode(null);
    void loadSummary();
  }, [activeRange]);

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const loadSummary = async () => {
    try {
      const response = await getPaymentHierarchyChildren({ ...activeRange, nodeType: "company" });
      setSummary({
        companyName: response.companyName,
        totalReceivable: response.totalReceivable,
        totalCollected: response.totalCollected,
        totalOutstanding: response.totalOutstanding,
        totalExpense: response.totalExpense,
        netRevenue: response.netRevenue
      });
      const nextSummary = {
        companyName: response.companyName,
        totalReceivable: response.totalReceivable,
        totalCollected: response.totalCollected,
        totalOutstanding: response.totalOutstanding,
        totalExpense: response.totalExpense,
        netRevenue: response.netRevenue
      };
      const visibleMetrics = summaryMetricNodes(nextSummary, {});
      const countEntries = await Promise.all(
        visibleMetrics.map(async (metric) => {
          const metricResponse = await getPaymentHierarchyChildren({ ...activeRange, nodeType: "metric", nodeId: metric.id });
          return [metric.id, metricResponse.nodes.length] as const;
        })
      );
      setMetricCounts(Object.fromEntries(countEntries));
    } catch (error) {
      notificationService.showError("Unable to load payment hierarchy summary", error);
    }
  };

  const loadChildren = async (node: PaymentHierarchyNode, force = false) => {
    if (!node.hasChildren || (!force && loaded.has(node.id))) {
      return childrenByParent[node.id]?.length ?? 0;
    }
    setLoadingNode(node.id);
    try {
      const response = await getPaymentHierarchyChildren({ ...activeRange, ...paramsForNode(node) });
      setSummary({
        companyName: response.companyName,
        totalReceivable: response.totalReceivable,
        totalCollected: response.totalCollected,
        totalOutstanding: response.totalOutstanding,
        totalExpense: response.totalExpense,
        netRevenue: response.netRevenue
      });
      setChildrenByParent((current) => ({ ...current, [node.id]: response.nodes }));
      if (node.type === "day") {
        setRecordsByDay((current) => ({ ...current, [node.id]: response.records }));
      }
      setLoaded((current) => new Set(current).add(node.id));
      return response.nodes.length;
    } catch (error) {
      notificationService.showError("Unable to load payment hierarchy", error);
      return 0;
    } finally {
      setLoadingNode(null);
    }
  };

  const toggleNode = async (node: PaymentHierarchyNode) => {
    setActiveNode(node);
    if (node.id === "company") {
      setChildrenByParent((current) => ({ ...current, company: metricNodes }));
      if (expanded.has(node.id)) {
        setExpanded(new Set());
        return;
      }
      setExpanded(new Set(["company"]));
      return;
    }
    if (!node.hasChildren) {
      return;
    }
    if (expanded.has(node.id)) {
      setExpanded((current) => {
        const next = new Set(current);
        [node.id, ...flattenChildren(node.id, childrenByParent).map((child) => child.id)].forEach((id) => next.delete(id));
        return next;
      });
      return;
    }
    const childCount = await loadChildren(node);
    if (childCount === 0) {
      return;
    }
    setExpanded((current) => {
      if (node.type === "metric") {
        return new Set(["company", node.id]);
      }
      return new Set(current).add(node.id);
    });
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await surfaceRef.current?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  return (
    <div className="space-y-4 pb-6">
      <Header title="Payment Hierarchy" subtitle="Drill down from collection totals to actual payment records." />

      <GlassCard className="p-4 md:p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <CommonBreadcrumb items={[{ label: "Reports" }, { label: "Payment Hierarchy" }]} />
          </div>
        </div>

        <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--panel-border)" }}>
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
            {DATE_PRESET_OPTIONS.map(({ value, label }) => (
              <Button key={value} type="button" variant={preset === value ? "primary" : "secondary"} onClick={() => setPreset(value)}>
                {label}
              </Button>
            ))}
            </div>
          </div>
        </div>

        {preset === "custom" ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:max-w-xl">
            <Input
              label="Start date"
              type="date"
              value={customRange.startDate}
              onChange={(event) => setCustomRange((current) => ({ ...current, startDate: event.target.value }))}
            />
            <Input
              label="End date"
              type="date"
              value={customRange.endDate}
              onChange={(event) => setCustomRange((current) => ({ ...current, endDate: event.target.value }))}
            />
          </div>
        ) : null}
      </GlassCard>

      <div
        ref={surfaceRef}
        className={`${fullscreen ? "h-screen overflow-hidden rounded-none" : "rounded-[var(--radius-panel)]"} flex min-h-0 flex-col gap-4 border p-4 shadow-[var(--shadow-panel)] md:p-5`}
        style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }}
      >
        <div className="sticky top-0 z-10 flex flex-col gap-3 rounded-[var(--radius-card)] border p-3 sm:flex-row sm:items-center sm:justify-between" style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }}>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "var(--text-tertiary)" }}>Hierarchy View</p>
            <p className="mt-1 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>Zoom {Math.round(zoom * 100)}%</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setZoom((value) => Math.max(0.1, Number((value - 0.1).toFixed(2))))}><ZoomOut size={16} />Zoom Out</Button>
            <Button type="button" variant="secondary" onClick={() => setZoom((value) => Math.min(1.4, Number((value + 0.1).toFixed(2))))}><ZoomIn size={16} />Zoom In</Button>
            <Button type="button" variant="secondary" onClick={toggleFullscreen}>{fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}{fullscreen ? "Exit Full Screen" : "Full Screen"}</Button>
          </div>
        </div>

        <div className={`${fullscreen ? "min-h-0" : "max-h-[70vh] min-h-[420px]"} flex-1 overflow-auto overscroll-contain rounded-[var(--radius-card)] border p-4`} style={{ borderColor: "var(--panel-border)", background: "var(--panel-soft)", WebkitOverflowScrolling: "touch" } as CSSProperties}>
          <div className="flex min-h-max min-w-full justify-center">
          <div className="inline-block min-h-max min-w-max transition-[zoom] duration-300" style={{ zoom } as CSSProperties}>
            <TreeNode
              node={root}
              childrenByParent={{ ...childrenByParent, company: metricNodes }}
              expanded={expanded}
              loaded={loaded}
              activeId={activeNode?.id ?? root.id}
              loadingNode={loadingNode}
              onToggle={toggleNode}
              level={0}
            />
          </div>
          </div>
        </div>

        {activeRecords.length ? <RecordsPanel records={activeRecords} title={activeNode?.label ?? "Payment Records"} /> : null}
      </div>
    </div>
  );
};

const TreeNode = ({
  node,
  childrenByParent,
  expanded,
  loaded,
  activeId,
  loadingNode,
  onToggle,
  level
}: {
  node: PaymentHierarchyNode;
  childrenByParent: Record<string, PaymentHierarchyNode[]>;
  expanded: Set<string>;
  loaded: Set<string>;
  activeId: string;
  loadingNode: string | null;
  onToggle: (node: PaymentHierarchyNode) => void | Promise<void>;
  level: number;
}) => {
  const children = childrenByParent[node.id] ?? [];
  const isOpen = expanded.has(node.id);
  const hasLoadedEmpty = loaded.has(node.id) && children.length === 0;
  const canExpand = node.hasChildren && !hasLoadedEmpty;
  const connectorColor = "color-mix(in srgb, var(--theme-color) 46%, var(--text-secondary))";
  return (
    <div className="flex flex-col items-center">
      <HierarchyCard node={node} level={level} active={activeId === node.id} expanded={isOpen} loading={loadingNode === node.id} canExpand={canExpand} childCount={node.id === "company" || loaded.has(node.id) ? children.length : node.count} onClick={() => void onToggle(node)} />
      {isOpen && children.length ? (
        <>
          <div className="h-8 w-0.5 rounded-full" style={{ background: connectorColor }} />
          <div className="relative flex items-start gap-4">
            {children.length > 1 ? <span className="absolute left-8 right-8 top-0 h-0.5 rounded-full" style={{ background: connectorColor }} /> : null}
            {children.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                <div className="h-8 w-0.5 rounded-full" style={{ background: connectorColor }} />
                <TreeNode
                  node={child}
                  childrenByParent={childrenByParent}
                  expanded={expanded}
                  loaded={loaded}
                  activeId={activeId}
                  loadingNode={loadingNode}
                  onToggle={onToggle}
                  level={level + 1}
                />
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
};

const HierarchyCard = ({ node, level, active, expanded, loading, canExpand, childCount, onClick }: { node: PaymentHierarchyNode; level: number; active: boolean; expanded: boolean; loading: boolean; canExpand: boolean; childCount: number; onClick: () => void }) => {
  const width = node.type === "invoice" ? "w-64" : level === 0 ? "w-72" : level === 1 ? "w-64" : "w-52";
  const tone = hierarchyTone(node.tone);
  return (
    <button
      type="button"
      data-hierarchy-node={node.id}
      className={`${width} rounded-[var(--radius-card)] border p-4 text-left shadow-[var(--shadow-soft)] transition duration-300 hover:-translate-y-0.5`}
      style={{
        background: active
          ? `linear-gradient(135deg, color-mix(in srgb, ${tone.accent} 24%, var(--panel-bg)), color-mix(in srgb, ${tone.accent} 10%, var(--panel-bg)))`
          : `linear-gradient(135deg, color-mix(in srgb, ${tone.accent} 15%, var(--panel-bg)), var(--panel-bg))`,
        borderColor: active ? `color-mix(in srgb, ${tone.accent} 72%, var(--panel-border))` : `color-mix(in srgb, ${tone.accent} 42%, var(--panel-border))`,
        boxShadow: active ? `0 18px 42px color-mix(in srgb, ${tone.accent} 18%, transparent)` : "var(--shadow-soft)",
        color: "var(--text-primary)"
      }}
      onClick={onClick}
    >
      {node.type === "invoice" ? (
        <div className="space-y-3">
          <div>
            <p className="break-words text-sm font-extrabold" style={{ color: "var(--text-primary)" }}>{node.subtitle}</p>
            <p className="mt-1 break-words text-xs font-bold uppercase tracking-[0.08em]" style={{ color: tone.accent }}>{node.label}</p>
          </div>
          <div className="grid gap-2 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
            <AmountLine label="Amount" value={node.totalAmount ?? node.amount} />
            <AmountLine label="Collected" value={node.collectedAmount ?? 0} />
            <AmountLine label="Outstanding" value={node.outstandingAmount ?? 0} danger />
          </div>
        </div>
      ) : (
      <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold" style={{ color: "var(--text-primary)" }}>{node.label}</p>
          <p className="mt-1 truncate text-xs font-semibold" style={{ color: "var(--text-tertiary)" }}>{node.subtitle}</p>
        </div>
        <span className="shrink-0 rounded-full px-2 py-1 text-xs font-bold" style={{ background: `color-mix(in srgb, ${tone.accent} 18%, var(--panel-soft))`, color: tone.accent }}>{childCount}</span>
      </div>
      <p className={`${level <= 1 ? "text-xl" : "text-lg"} mt-4 font-black`} style={{ color: "var(--text-primary)" }}>{formatCurrency(node.amount)}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: tone.accent }}>{node.type.replace(/_/g, " ")}</span>
        {canExpand ? (
          <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: `color-mix(in srgb, ${tone.accent} 18%, var(--panel-soft))`, color: tone.accent }}>
            {loading ? <RefreshCcw className="animate-spin" size={14} /> : expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </span>
        ) : null}
      </div>
      </>
      )}
    </button>
  );
};

const AmountLine = ({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) => (
  <span className="flex items-center justify-between gap-3">
    <span>{label}:</span>
    <span className="font-black" style={{ color: danger ? "var(--danger)" : "var(--text-primary)" }}>{formatCurrency(value)}</span>
  </span>
);

const hierarchyTone = (tone?: string | null) => {
  const tones: Record<string, { accent: string }> = {
    company: { accent: "var(--theme-color)" },
    metric: { accent: "var(--theme-color)" },
    sales: { accent: "var(--theme-color)" },
    collected: { accent: "var(--success)" },
    success: { accent: "var(--success)" },
    danger: { accent: "var(--danger)" },
    cash: { accent: "var(--success)" },
    upi: { accent: "var(--theme-color)" },
    card: { accent: "var(--info)" },
    bank: { accent: "var(--theme-dark)" },
    cheque: { accent: "var(--warning)" },
    other: { accent: "var(--text-secondary)" },
    year: { accent: "var(--info)" },
    month: { accent: "var(--warning)" },
    day: { accent: "var(--success)" },
    period: { accent: "var(--success)" },
    customer: { accent: "var(--theme-color)" },
    invoice: { accent: "var(--danger)" },
    record: { accent: "var(--danger)" },
    expense: { accent: "var(--warning)" },
    net: { accent: "var(--success)" }
  };
  return tones[tone ?? ""] ?? tones.other;
};

const RecordsPanel = ({ records, title }: { records: PaymentHierarchyRecord[]; title: string }) => (
  <section className="mt-5 rounded-[var(--radius-card)] border p-4 shadow-[var(--shadow-soft)]" style={{ background: "var(--panel-bg)", borderColor: "var(--panel-border)" }}>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: "var(--text-tertiary)" }}>Payment Records</p>
        <h2 className="mt-1 text-lg font-extrabold" style={{ color: "var(--text-primary)" }}>{title}</h2>
      </div>
      <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: "var(--panel-soft)", color: "var(--text-secondary)" }}>{records.length} records</span>
    </div>
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {records.map((record) => (
        <div key={record.paymentId} className="rounded-[var(--radius-control)] border p-3" style={{ borderColor: "var(--panel-border)", background: "var(--panel-soft)" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold" style={{ color: "var(--text-primary)" }}>{record.invoiceNo}</p>
              <p className="mt-1 truncate text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{record.customerName}</p>
            </div>
            <p className="shrink-0 text-sm font-black" style={{ color: "var(--text-primary)" }}>{formatCurrency(record.amount)}</p>
          </div>
          <div className="mt-3 grid gap-1 text-xs font-semibold" style={{ color: "var(--text-tertiary)" }}>
            <span>{record.paymentMode.replace(/_/g, " ")}</span>
            <span>{formatDate(record.paymentDate)}</span>
            <span>{record.collectedBy ?? "--"}</span>
          </div>
        </div>
      ))}
    </div>
  </section>
);

const paramsForNode = (node: PaymentHierarchyNode): PaymentHierarchyParams => {
  if (node.id === "company") {
    return { nodeType: "company" };
  }
  if (node.type === "metric") {
    return { nodeType: "metric", nodeId: node.id };
  }
  return { nodeType: node.type, nodeId: node.id };
};

const flattenChildren = (nodeId: string, childrenByParent: Record<string, PaymentHierarchyNode[]>): PaymentHierarchyNode[] => {
  const children = childrenByParent[nodeId] ?? [];
  return children.flatMap((child) => [child, ...flattenChildren(child.id, childrenByParent)]);
};
