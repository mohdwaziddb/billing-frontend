import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Bot,
  BrainCircuit,
  Boxes,
  CreditCard,
  FileText,
  LineChart,
  LockKeyhole,
  Mail,
  MessageSquare,
  ReceiptIndianRupee,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Users,
  Warehouse,
  Workflow,
  Building2
} from "lucide-react";

export const trustMetrics = [
  { label: "Invoices", value: 10, suffix: "K+" },
  { label: "Businesses", value: 500, suffix: "+" },
  { label: "Uptime", value: 99.9, display: "99.9%" },
  { label: "Support", value: 24, display: "24×7" }
];

export const featureCards: Array<{ title: string; description: string; icon: LucideIcon; accent: string }> = [
  { title: "Billing", description: "Create polished invoices, taxes, discounts, and faster checkout-ready billing flows.", icon: FileText, accent: "from-blue-500/15 via-cyan-400/12 to-transparent" },
  { title: "Inventory", description: "Track stock, product movement, low inventory alerts, and purchase visibility in one place.", icon: Warehouse, accent: "from-cyan-500/14 via-sky-400/12 to-transparent" },
  { title: "CRM", description: "Maintain customer details, balances, follow-up context, and relationship history with clarity.", icon: Users, accent: "from-violet-500/14 via-fuchsia-400/12 to-transparent" },
  { title: "Payments", description: "Capture collections, manage outstanding balances, and keep payment mode tracking organized.", icon: CreditCard, accent: "from-emerald-500/14 via-cyan-400/12 to-transparent" },
  { title: "Reports", description: "Convert operational data into clean summaries for sales, dues, expenses, and performance review.", icon: ScrollText, accent: "from-amber-500/14 via-orange-300/12 to-transparent" },
  { title: "Analytics", description: "Understand trends, momentum, collection ratios, and growth signals through readable insights.", icon: BarChart3, accent: "from-blue-500/15 via-violet-300/12 to-transparent" },
  { title: "Email", description: "Manage business communication with configurable delivery and professional message workflows.", icon: Mail, accent: "from-sky-500/15 via-cyan-300/12 to-transparent" },
  { title: "SMS", description: "Support reliable SMS delivery with provider-based settings and multi-company safe configuration.", icon: MessageSquare, accent: "from-violet-500/14 via-blue-300/12 to-transparent" },
  { title: "WhatsApp", description: "Bring modern customer communication into billing and reminder operations through connected providers.", icon: Sparkles, accent: "from-cyan-500/14 via-emerald-300/12 to-transparent" },
  { title: "AI Ready", description: "Prepared for assistant-led workflows, smart reports, and natural language business actions.", icon: Bot, accent: "from-violet-500/15 via-fuchsia-300/12 to-transparent" },
  { title: "Role Based Access", description: "Give the right visibility and action boundaries to every user without losing control.", icon: ShieldCheck, accent: "from-blue-500/15 via-sky-300/12 to-transparent" },
  { title: "Audit Logs", description: "Track operational changes and accountability trails across teams and business activity.", icon: Activity, accent: "from-slate-400/14 via-blue-300/12 to-transparent" }
];

export const timelineSteps = [
  { title: "Easy Setup", description: "Start with products, customers, payment modes, and communication settings in a guided structure.", icon: Building2 },
  { title: "Create Products", description: "Define catalog, stock, pricing, taxes, and categories before your first transaction.", icon: Boxes },
  { title: "Generate Invoice", description: "Move from quote-like thinking to invoice-ready execution without operational friction.", icon: ReceiptIndianRupee },
  { title: "Receive Payment", description: "Track collections, pending dues, and payment state with less manual overhead.", icon: Workflow },
  { title: "Grow Business", description: "Use analytics, reports, roles, and communication to scale decision-making with confidence.", icon: LineChart }
];

export const workflowSteps = [
  "Customer",
  "Invoice",
  "Payment",
  "Reports",
  "Growth"
];

export const securityItems = [
  { title: "JWT Authentication", description: "Token-based access designed for secure session handling.", icon: LockKeyhole },
  { title: "Role Based Access", description: "Permission-aware workflows for owners, admins, and teams.", icon: ShieldCheck },
  { title: "Company Isolation", description: "Strong tenant boundaries across records and provider settings.", icon: Building2 },
  { title: "Encrypted Credentials", description: "Sensitive communication credentials remain protected at rest.", icon: BrainCircuit },
  { title: "Audit Logs", description: "Critical operational actions remain visible and traceable.", icon: Activity },
  { title: "Cloud Security", description: "Centralized deployment model with enterprise-ready operating posture.", icon: Sparkles }
];

export const testimonials = [
  {
    quote: "BizFinity gave our operations a cleaner rhythm. Billing, stock, and collections finally feel connected instead of scattered.",
    name: "Aarav Mehta",
    role: "Director, Urban Retail Group"
  },
  {
    quote: "The product feels polished enough for leadership and practical enough for the people doing daily work. That combination is rare.",
    name: "Naina Kapoor",
    role: "Finance Lead, Distribution Network"
  },
  {
    quote: "We wanted clarity, speed, and control. BizFinity gave us a business platform that looks premium and works like operations software should.",
    name: "Rahul Verma",
    role: "Operations Head, Multi-Outlet Business"
  }
];

export const faqs = [
  {
    title: "Who is BizFinity built for?",
    content: "BizFinity is designed for modern businesses that need billing, inventory, customer tracking, payments, reporting, and communication under one operational platform."
  },
  {
    title: "Does BizFinity support multi-company operations?",
    content: "Yes. The platform is structured for company isolation and controlled configuration so each business works within its own operational boundary."
  },
  {
    title: "Can teams use different roles and permissions?",
    content: "Yes. Role-based access is part of the core product approach, helping businesses control visibility and action rights across users."
  },
  {
    title: "Is communication built into the platform?",
    content: "Yes. Email, SMS, and WhatsApp provider-based communication support is part of the broader product ecosystem."
  }
];
