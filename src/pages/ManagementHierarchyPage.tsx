import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Download, FileImage, FileText, Maximize2, Minimize2, Minus, Plus, Search, TrendingUp, UserRound, Users, Wallet } from "lucide-react";
import { getHierarchyChildren, getHierarchyRoots } from "../api/hierarchy";
import { Button } from "../components/Button";
import { CommonBreadcrumb } from "../components/CommonBreadcrumb";
import { GlassCard } from "../components/GlassCard";
import { Header } from "../components/Header";
import { Input } from "../components/Input";
import { Select } from "../components/Select";
import { StatusBadge } from "../components/StatusBadge";
import { formatCurrency } from "../lib/currency";
import { exportToExcel } from "../lib/excelExport";
import { formatDateTime } from "../lib/format";
import type { HierarchyNode } from "../types/api";

type TreeNode = HierarchyNode & {
  children?: TreeNode[];
  expanded?: boolean;
  loading?: boolean;
};

type Filters = {
  startDate: string;
  endDate: string;
  department: string;
  role: string;
  status: string;
  search: string;
  manager: string;
};

type TabKey = "hierarchy" | "collection" | "outstanding" | "invoice" | "customer";

const todayIso = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

const emptyFilters: Filters = {
  startDate: todayIso(),
  endDate: todayIso(),
  department: "",
  role: "",
  status: "",
  search: "",
  manager: ""
};

const tabs: Array<{ key: TabKey; label: string; metric: keyof HierarchyNode["metrics"] }> = [
  { key: "hierarchy", label: "Hierarchy View", metric: "totalRevenue" },
  { key: "collection", label: "Collection View", metric: "totalCollection" },
  { key: "outstanding", label: "Outstanding View", metric: "outstandingAmount" },
  { key: "invoice", label: "Invoice View", metric: "totalInvoices" },
  { key: "customer", label: "Customer View", metric: "totalCustomers" }
];

export const ManagementHierarchyPage = () => {
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [selected, setSelected] = useState<HierarchyNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [activeTab, setActiveTab] = useState<TabKey>("hierarchy");
  const [fullscreen, setFullscreen] = useState(false);

  const apiFilters = useMemo(() => ({
    role: filters.role || undefined,
    status: filters.status || undefined,
    search: filters.search.trim() || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    manager: filters.manager.trim() || undefined
  }), [filters]);

  const loadedNodes = useMemo(() => flatten(nodes), [nodes]);
  const companySummary = useMemo(() => summarize(loadedNodes), [loadedNodes]);
  const rankedNodes = useMemo(() => [...loadedNodes].sort((a, b) => metricValue(b, activeTab) - metricValue(a, activeTab)), [loadedNodes, activeTab]);

  const loadRoots = async () => {
    const roots = await getHierarchyRoots(apiFilters);
    setNodes(roots.map((node) => ({ ...node })));
  };

  useEffect(() => {
    void loadRoots();
  }, [apiFilters]);

  const toggleNode = async (node: TreeNode) => {
    if (!node.hasChildren) {
      return;
    }
    if (node.expanded) {
      setNodes((current) => updateNode(current, node.id, (target) => ({ ...target, expanded: false })));
      return;
    }
    if (node.children?.length) {
      setNodes((current) => updateNode(current, node.id, (target) => ({ ...target, expanded: true })));
      return;
    }
    setNodes((current) => updateNode(current, node.id, (target) => ({ ...target, loading: true })));
    const children = await getHierarchyChildren(node.id, apiFilters);
    setNodes((current) => updateNode(current, node.id, (target) => ({ ...target, children: children.map((child) => ({ ...child })), expanded: true, loading: false })));
  };

  const exportRows = () => {
    exportToExcel("management-hierarchy-analytics.xlsx", loadedNodes, [
      { key: "name", header: "Name" },
      { key: "role", header: "Role" },
      { key: "department", header: "Department" },
      { key: "status", header: "Status" },
      { key: "totalCustomers", header: "Customers", value: (row) => row.metrics.totalCustomers, type: "number" },
      { key: "totalInvoices", header: "Invoices", value: (row) => row.metrics.totalInvoices, type: "number" },
      { key: "totalPayments", header: "Payments", value: (row) => row.metrics.totalPayments, type: "number" },
      { key: "totalCollection", header: "Collection", value: (row) => row.metrics.totalCollection, type: "amount" },
      { key: "outstandingAmount", header: "Outstanding", value: (row) => row.metrics.outstandingAmount, type: "amount" },
      { key: "averageInvoiceValue", header: "Average Invoice Value", value: (row) => row.metrics.averageInvoiceValue, type: "amount" },
      { key: "lastActivityDate", header: "Last Activity", value: (row) => row.metrics.lastActivityDate, type: "date" }
    ]);
  };

  const exportImage = () => {
    const rows = loadedNodes.map((node, index) => `${index + 1}. ${node.name} | ${node.role} | Collection ${formatCurrency(node.metrics.totalCollection)} | Outstanding ${formatCurrency(node.metrics.outstandingAmount)}`);
    const width = 1400;
    const height = Math.max(520, rows.length * 44 + 170);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#0f172a"/><text x="48" y="72" fill="#fff" font-family="Arial" font-size="38" font-weight="700">Management Hierarchy Analytics</text><text x="48" y="116" fill="#93c5fd" font-family="Arial" font-size="22">Revenue ${formatCurrency(companySummary.revenue)} | Collection ${formatCurrency(companySummary.collection)} | Outstanding ${formatCurrency(companySummary.outstanding)}</text>${rows.map((row, index) => `<text x="64" y="${175 + index * 44}" fill="#dbeafe" font-family="Arial" font-size="22">${escapeSvg(row)}</text>`).join("")}</svg>`;
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.drawImage(image, 0, 0);
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = "management-hierarchy-analytics.png";
      link.click();
    };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };

  return (
    <div className={fullscreen ? "fixed inset-0 z-40 overflow-y-auto bg-slate-100 p-4 dark:bg-slate-950" : "space-y-4 pb-6"}>
      {!fullscreen ? <Header title="Management Hierarchy" subtitle="Executive org analytics with hierarchy, collection, outstanding, invoice, and customer contribution tracking." /> : null}

      <GlassCard className="overflow-hidden p-0">
        <div className="relative isolate overflow-hidden px-6 py-7 md:px-8">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--theme-color)_34%,transparent),transparent_34%),linear-gradient(135deg,#0f172a,#111827_48%,color-mix(in_srgb,var(--theme-dark)_80%,#020617))]" />
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <CommonBreadcrumb items={[{ label: "Reports" }, { label: "Management Hierarchy" }]} />
              <h2 className="mt-5 max-w-3xl text-3xl font-black tracking-tight text-white md:text-4xl">Executive hierarchy analytics.</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/70">Track who contributes to collection, where outstanding is concentrated, and how each level of the organization performs.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              <HeroMetric label="Revenue" value={formatCurrency(companySummary.revenue)} />
              <HeroMetric label="Collection" value={formatCurrency(companySummary.collection)} />
              <HeroMetric label="Outstanding" value={formatCurrency(companySummary.outstanding)} />
              <HeroMetric label="Users" value={companySummary.users} />
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-b border-slate-200 bg-white/80 p-5 dark:border-slate-700 dark:bg-slate-900/80 lg:grid-cols-4 xl:grid-cols-7">
          <Input label="Start Date" type="date" value={filters.startDate} onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))} />
          <Input label="End Date" type="date" value={filters.endDate} onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))} />
          <Select label="Department" value={filters.department} options={[{ label: "All Departments", value: "" }, { label: "General", value: "General" }]} onChange={(event) => setFilters((current) => ({ ...current, department: event.target.value }))} />
          <Select label="User Role" value={filters.role} options={[{ label: "All Roles", value: "" }, { label: "Owner", value: "OWNER" }, { label: "Admin / Manager", value: "ADMIN" }, { label: "Employee", value: "USER" }]} onChange={(event) => setFilters((current) => ({ ...current, role: event.target.value }))} />
          <Select label="Status" value={filters.status} options={[{ label: "All Status", value: "" }, { label: "Active", value: "active" }, { label: "Inactive", value: "inactive" }]} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} />
          <Input label="Employee" placeholder="Search employee" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} />
          <Input label="Manager" placeholder="Manager name" value={filters.manager} onChange={(event) => setFilters((current) => ({ ...current, manager: event.target.value }))} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={`rounded-2xl px-4 py-2 text-sm font-bold transition ${activeTab === tab.key ? "bg-[var(--theme-color)] text-[var(--theme-contrast)] shadow-lg" : "bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200"}`}>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setZoom((current) => Math.max(0.65, current - 0.1))}><Minus size={16} /> Zoom Out</Button>
            <Button type="button" variant="secondary" onClick={() => setZoom((current) => Math.min(1.35, current + 0.1))}><Plus size={16} /> Zoom In</Button>
            <Button type="button" variant="secondary" onClick={() => setFullscreen((current) => !current)}>{fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />} {fullscreen ? "Exit" : "Full Screen"}</Button>
            <Button type="button" variant="secondary" disabled={!loadedNodes.length} onClick={exportRows}><Download size={16} /> Excel</Button>
            <Button type="button" variant="secondary" disabled={!loadedNodes.length} onClick={() => window.print()}><FileText size={16} /> PDF</Button>
            <Button type="button" variant="secondary" disabled={!loadedNodes.length} onClick={exportImage}><FileImage size={16} /> PNG</Button>
          </div>
        </div>

        {activeTab === "hierarchy" ? (
          <div className="relative min-h-[620px] overflow-auto bg-[linear-gradient(180deg,#f8fafc,#eef2ff)] p-8 dark:bg-[linear-gradient(180deg,#0f172a,#111827)]">
            <div className="min-w-max origin-top-left transition-transform duration-300" style={{ transform: `scale(${zoom})` }}>
              {nodes.length ? (
                <div className="flex flex-col items-center gap-8">
                  {nodes.map((node) => (
                    <HierarchyBranch key={node.id} node={node} onToggle={toggleNode} onSelect={setSelected} />
                  ))}
                </div>
              ) : <EmptyState />}
            </div>
          </div>
        ) : (
          <AnalyticsView tab={activeTab} nodes={rankedNodes} onSelect={setSelected} />
        )}
      </GlassCard>

      {selected ? <DetailsDrawer node={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
};

const HierarchyBranch = ({ node, onToggle, onSelect }: { node: TreeNode; onToggle: (node: TreeNode) => void; onSelect: (node: HierarchyNode) => void }) => (
  <div className="flex flex-col items-center">
    <HierarchyCard node={node} onToggle={onToggle} onSelect={onSelect} />
    {node.expanded && node.children?.length ? (
      <>
        <div className="h-8 w-px bg-slate-300 dark:bg-slate-600" />
        <div className="flex gap-8 border-t border-slate-300 pt-8 dark:border-slate-600">
          {node.children.map((child) => (
            <HierarchyBranch key={child.id} node={child} onToggle={onToggle} onSelect={onSelect} />
          ))}
        </div>
      </>
    ) : null}
  </div>
);

const HierarchyCard = ({ node, onToggle, onSelect }: { node: TreeNode; onToggle: (node: TreeNode) => void; onSelect: (node: HierarchyNode) => void }) => (
  <div className={`group w-[320px] rounded-[30px] border bg-white/92 p-4 shadow-[0_24px_60px_rgba(15,23,42,0.16)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_80px_rgba(15,23,42,0.24)] dark:bg-slate-900/92 ${performanceBorder(node)}`}>
    <button type="button" className="w-full text-left" onClick={() => onSelect(node)}>
      <div className="flex items-start gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--theme-color),var(--theme-dark))] text-[var(--theme-contrast)] shadow-lg">
          <UserRound size={25} />
        </span>
        <div className="min-w-0">
          <h3 className="truncate text-lg font-black text-slate-950 dark:text-white">{node.name}</h3>
          <p className="text-sm font-semibold text-[var(--theme-color)]">{roleLabel(node.role)}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{node.department}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Kpi label="Invoices" value={node.metrics.totalInvoices} />
        <Kpi label="Payments" value={node.metrics.totalPayments} />
        <Kpi label="Collection" value={formatCurrency(node.metrics.totalCollection)} />
        <Kpi label="Outstanding" value={formatCurrency(node.metrics.outstandingAmount)} tone={node.metrics.outstandingAmount > node.metrics.totalCollection * 0.4 ? "danger" : "success"} />
        <Kpi label="Customers" value={node.metrics.totalCustomers} />
        <Kpi label="Products" value={node.metrics.totalProducts} />
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <StatusBadge label={node.status.toUpperCase()} />
        <span className="text-xs font-semibold text-slate-400">{formatDateTime(node.metrics.lastActivityDate)}</span>
      </div>
    </button>
    {node.hasChildren ? (
      <button type="button" className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" onClick={() => void onToggle(node)}>
        <ChevronDown className={node.expanded ? "rotate-180 transition" : "transition"} size={16} />
        {node.loading ? "Loading..." : node.expanded ? "Collapse Team" : "Expand Team"}
      </button>
    ) : null}
  </div>
);

const AnalyticsView = ({ tab, nodes, onSelect }: { tab: TabKey; nodes: TreeNode[]; onSelect: (node: HierarchyNode) => void }) => {
  const title = tabs.find((item) => item.key === tab)?.label ?? "Analytics";
  return (
    <div className="min-h-[620px] bg-slate-50 p-6 dark:bg-slate-950">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--theme-color)] text-[var(--theme-contrast)]"><TrendingUp size={22} /></span>
        <div>
          <h3 className="text-2xl font-black text-slate-950 dark:text-white">{title}</h3>
          <p className="text-sm text-slate-500">Loaded hierarchy nodes ranked by selected business metric.</p>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {nodes.length ? nodes.map((node, index) => (
          <button key={node.id} type="button" className="rounded-[28px] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-700 dark:bg-slate-900" onClick={() => onSelect(node)}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">Rank #{index + 1}</p>
                <h4 className="mt-2 text-xl font-black text-slate-950 dark:text-white">{node.name}</h4>
                <p className="text-sm text-slate-500">{roleLabel(node.role)} | {node.department}</p>
              </div>
              <PerformancePill node={node} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MetricTile label="Collection" value={formatCurrency(node.metrics.totalCollection)} />
              <MetricTile label="Outstanding" value={formatCurrency(node.metrics.outstandingAmount)} />
              <MetricTile label={metricLabel(tab)} value={metricDisplay(node, tab)} />
            </div>
          </button>
        )) : <EmptyState />}
      </div>
    </div>
  );
};

const DetailsDrawer = ({ node, onClose }: { node: HierarchyNode; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm">
    <button type="button" aria-label="Close hierarchy details" className="absolute inset-0 h-full w-full cursor-default" onClick={onClose} />
    <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-[0_30px_90px_rgba(2,6,23,0.35)] dark:bg-slate-900">
      <div className="rounded-[30px] bg-[linear-gradient(135deg,var(--theme-color),var(--theme-dark))] p-5 text-[var(--theme-contrast)]">
        <Users size={30} />
        <h3 className="mt-4 text-2xl font-black">{node.name}</h3>
        <p className="mt-1 text-sm opacity-80">{roleLabel(node.role)} | {node.department}</p>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Detail label="Total Customers" value={String(node.metrics.totalCustomers)} />
        <Detail label="Total Invoices" value={String(node.metrics.totalInvoices)} />
        <Detail label="Total Payments" value={String(node.metrics.totalPayments)} />
        <Detail label="Total Collection" value={formatCurrency(node.metrics.totalCollection)} />
        <Detail label="Outstanding Amount" value={formatCurrency(node.metrics.outstandingAmount)} />
        <Detail label="Average Invoice Value" value={formatCurrency(node.metrics.averageInvoiceValue)} />
        <Detail label="Last Activity Date" value={formatDateTime(node.metrics.lastActivityDate)} />
        <Detail label="Team Users" value={String(node.metrics.totalUsers)} />
        <Detail label="Email" value={node.email} />
        <Detail label="Mobile" value={node.mobile} />
        <Detail label="Reporting Manager" value={node.reportingManager} />
        <Detail label="Created Date" value={formatDateTime(node.createdAt)} />
      </div>
      <Button type="button" variant="secondary" className="mt-6 w-full" onClick={onClose}>Close</Button>
    </aside>
  </div>
);

const HeroMetric = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-3xl border border-white/15 bg-white/10 px-5 py-4 text-white shadow-xl backdrop-blur">
    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">{label}</p>
    <p className="mt-2 text-xl font-black">{value}</p>
  </div>
);

const Kpi = ({ label, value, tone = "neutral" }: { label: string; value: string | number; tone?: "neutral" | "success" | "danger" }) => (
  <div className={`rounded-2xl border px-3 py-2 ${tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : tone === "danger" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>
    <p className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-65">{label}</p>
    <p className="mt-1 truncate text-sm font-black">{value}</p>
  </div>
);

const MetricTile = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
    <p className="mt-2 text-lg font-black text-slate-950 dark:text-white">{value}</p>
  </div>
);

const PerformancePill = ({ node }: { node: HierarchyNode }) => {
  const outstandingRatio = node.metrics.totalCollection ? node.metrics.outstandingAmount / node.metrics.totalCollection : node.metrics.outstandingAmount ? 1 : 0;
  const label = outstandingRatio > 0.6 ? "High Outstanding" : outstandingRatio > 0.25 ? "Medium Performance" : "Good Collection";
  const classes = outstandingRatio > 0.6 ? "bg-rose-100 text-rose-700" : outstandingRatio > 0.25 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";
  return <span className={`rounded-full px-3 py-1 text-xs font-black ${classes}`}>{label}</span>;
};

const Detail = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</p>
    <p className="mt-2 break-words font-bold text-slate-950 dark:text-white">{value || "--"}</p>
  </div>
);

const EmptyState = () => (
  <div className="flex min-h-[420px] items-center justify-center">
    <div className="max-w-md rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-slate-700 dark:bg-slate-900">
      <Search className="mx-auto text-slate-400" size={32} />
      <h3 className="mt-4 text-xl font-extrabold text-slate-950 dark:text-white">No hierarchy records found</h3>
      <p className="mt-2 text-sm text-slate-500">Adjust filters to discover people in this organization structure.</p>
    </div>
  </div>
);

const flatten = (nodes: TreeNode[]): TreeNode[] => nodes.flatMap((node) => [node, ...flatten(node.children ?? [])]);

const updateNode = (nodes: TreeNode[], id: number, updater: (node: TreeNode) => TreeNode): TreeNode[] => nodes.map((node) => {
  if (node.id === id) {
    return updater(node);
  }
  return { ...node, children: node.children ? updateNode(node.children, id, updater) : undefined };
});

const summarize = (nodes: TreeNode[]) => ({
  revenue: nodes.reduce((sum, node) => sum + node.metrics.totalRevenue, 0),
  collection: nodes.reduce((sum, node) => sum + node.metrics.totalCollection, 0),
  outstanding: nodes.reduce((sum, node) => sum + node.metrics.outstandingAmount, 0),
  users: nodes.reduce((sum, node) => Math.max(sum, node.metrics.totalUsers), nodes.length)
});

const metricValue = (node: HierarchyNode, tab: TabKey) => {
  if (tab === "collection") return node.metrics.totalCollection;
  if (tab === "outstanding") return node.metrics.outstandingAmount;
  if (tab === "invoice") return node.metrics.totalInvoices;
  if (tab === "customer") return node.metrics.totalCustomers;
  return node.metrics.totalRevenue;
};

const metricDisplay = (node: HierarchyNode, tab: TabKey) => ["collection", "outstanding", "hierarchy"].includes(tab) ? formatCurrency(metricValue(node, tab)) : metricValue(node, tab);

const metricLabel = (tab: TabKey) => tab === "invoice" ? "Invoices" : tab === "customer" ? "Customers" : tab === "outstanding" ? "Outstanding" : "Collection";

const performanceBorder = (node: HierarchyNode) => {
  const ratio = node.metrics.totalCollection ? node.metrics.outstandingAmount / node.metrics.totalCollection : node.metrics.outstandingAmount ? 1 : 0;
  if (ratio > 0.6) return "border-rose-300";
  if (ratio > 0.25) return "border-amber-300";
  return "border-emerald-200";
};

const roleLabel = (role: string) => role === "ADMIN" ? "Manager / Admin" : role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();

const escapeSvg = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char] ?? char));
