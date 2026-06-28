import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowUpRight,
  BellRing,
  Blocks,
  Bot,
  BrainCircuit,
  Building2,
  LineChart,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  DatabaseZap,
  FileClock,
  FileSpreadsheet,
  Fingerprint,
  GlobeLock,
  LayoutTemplate,
  Mail,
  MessageSquareMore,
  ReceiptIndianRupee,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
  Waypoints
} from "lucide-react";

export const trustMetrics = [
  { label: "Invoices processed", value: 12, suffix: "K+" },
  { label: "Finance teams onboarded", value: 640, suffix: "+" },
  { label: "Average collection accuracy", value: 99, suffix: ".8%" },
  { label: "Operations coverage", value: 24, suffix: "/7" }
];

export const featureHighlights: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
}> = [
  {
    title: "Revenue control room",
    description: "Track billing, receipts, dues, and margin signals from one executive-grade surface.",
    icon: CircleDollarSign,
    accent: "from-blue-500/20 via-cyan-400/15 to-transparent"
  },
  {
    title: "Inventory confidence",
    description: "Surface fast-moving stock, dead inventory, and purchase pressure before it hits cash flow.",
    icon: Blocks,
    accent: "from-cyan-500/18 via-sky-400/15 to-transparent"
  },
  {
    title: "Customer memory",
    description: "Keep balances, follow-ups, reminders, and account context tied to every customer relationship.",
    icon: Users,
    accent: "from-indigo-500/18 via-violet-400/14 to-transparent"
  },
  {
    title: "Automated collections",
    description: "Trigger reminders and coordinate payment follow-through without manual spreadsheet chasing.",
    icon: BellRing,
    accent: "from-emerald-500/18 via-teal-400/15 to-transparent"
  },
  {
    title: "Communication stack",
    description: "Unify email, SMS, and WhatsApp operations with provider-aware business messaging.",
    icon: MessageSquareMore,
    accent: "from-orange-500/18 via-amber-400/15 to-transparent"
  },
  {
    title: "Leadership reporting",
    description: "Turn day-to-day transactions into boardroom-ready summaries and performance narratives.",
    icon: FileSpreadsheet,
    accent: "from-fuchsia-500/18 via-indigo-400/15 to-transparent"
  }
];

export const operatingPillars: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
  metric: string;
}> = [
  {
    title: "Unify fragmented workflows",
    description: "Bring products, customers, billing, payment tracking, and reporting into one calm operating system.",
    icon: Waypoints,
    metric: "6 core workflows"
  },
  {
    title: "Reduce manual follow-up",
    description: "Replace scattered reminders and manual status updates with orchestrated operational visibility.",
    icon: FileClock,
    metric: "4x faster follow-through"
  },
  {
    title: "Improve cash discipline",
    description: "Keep teams aligned around overdue exposure, collection momentum, and customer payment behavior.",
    icon: WalletCards,
    metric: "Live dues tracking"
  }
];

export const solutionStream: Array<{
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    eyebrow: "Step 01",
    title: "Configure the commercial foundation",
    description: "Set up products, price logic, taxes, payment modes, and customer structures once.",
    icon: LayoutTemplate
  },
  {
    eyebrow: "Step 02",
    title: "Run daily billing at speed",
    description: "Create invoices fast while preserving precision, tax clarity, and customer-specific context.",
    icon: ReceiptIndianRupee
  },
  {
    eyebrow: "Step 03",
    title: "Coordinate collections and communication",
    description: "Track settlements, partial payments, reminders, and account follow-up without context loss.",
    icon: CreditCard
  },
  {
    eyebrow: "Step 04",
    title: "Read the business before problems grow",
    description: "Spot operational drag, sales momentum, and exception risk from digestible analytics.",
    icon: LineChart
  }
];

export const showcaseTabs = ["Command center", "Receivables", "Inventory", "Insights"];

export const workflowSteps: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    title: "Capture demand",
    description: "Bring customer requests and product requirements into a single starting point.",
    icon: Users
  },
  {
    title: "Issue with precision",
    description: "Generate polished invoices with taxes, quantities, and balance context already aligned.",
    icon: ReceiptIndianRupee
  },
  {
    title: "Collect without chaos",
    description: "See who paid, what remains open, and which accounts need follow-through next.",
    icon: CreditCard
  },
  {
    title: "Act on insight",
    description: "Use clean reporting to guide leadership decisions instead of reactive troubleshooting.",
    icon: ArrowUpRight
  }
];

export const aiCapabilities: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    title: "Natural language revenue questions",
    description: "Ask plain-English questions about sales, dues, or product performance and get structured answers.",
    icon: BrainCircuit
  },
  {
    title: "Operational nudges",
    description: "Prompt teams with next-best actions around overdue accounts, churn risk, or follow-up gaps.",
    icon: Sparkles
  },
  {
    title: "Automated summaries",
    description: "Convert complex transaction streams into concise daily and weekly management briefs.",
    icon: FileSpreadsheet
  },
  {
    title: "Workflow copilots",
    description: "Guide staff through repeatable business actions with less training overhead and fewer misses.",
    icon: Bot
  }
];

export const securityItems: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    title: "Granular access control",
    description: "Give each role the visibility and action scope it actually needs.",
    icon: ShieldCheck
  },
  {
    title: "Tenant-safe configuration",
    description: "Keep company-specific data, settings, and provider credentials logically isolated.",
    icon: Building2
  },
  {
    title: "Audit traceability",
    description: "Maintain a readable trail for operational changes and high-value business actions.",
    icon: Activity
  },
  {
    title: "Protected credentials",
    description: "Safeguard communication and payment configuration with encrypted handling.",
    icon: Fingerprint
  },
  {
    title: "Reliable backup posture",
    description: "Design for continuity so teams can move quickly without betting against resilience.",
    icon: DatabaseZap
  },
  {
    title: "Security-aware delivery",
    description: "Ship a product experience that balances speed, clarity, and enterprise expectations.",
    icon: GlobeLock
  }
];

export const testimonials = [
  {
    quote: "BizFinity feels like software built by people who understand both finance pressure and front-line execution.",
    name: "Ritika Sethi",
    role: "COO, Northline Distribution"
  },
  {
    quote: "The biggest win is clarity. Our team can see what matters without jumping across tools or improvising reports.",
    name: "Aman Bhatia",
    role: "Finance Director, Vertex Trade"
  },
  {
    quote: "It presents like premium SaaS and behaves like an operations system. That combination is exactly what we were missing.",
    name: "Kavya Narang",
    role: "Founder, LedgerCraft Retail"
  }
];

export const faqs = [
  {
    title: "What kind of business is BizFinity designed for?",
    content: "BizFinity is designed for businesses that need billing, customer management, payment tracking, inventory visibility, communication workflows, and reporting in one place."
  },
  {
    title: "Can BizFinity support finance and operations teams together?",
    content: "Yes. The landing page and product framing are built around shared workflows between business owners, finance leads, and operational users."
  },
  {
    title: "Is the platform prepared for enterprise expectations?",
    content: "Yes. The product direction emphasizes role control, audit visibility, company isolation, and secure handling of sensitive settings."
  },
  {
    title: "Will AI features replace the core workflow?",
    content: "No. AI is framed as a support layer for summaries, answers, and guided actions while the core billing and operations workflow remains primary."
  }
];

export const contactCards: Array<{
  label: string;
  value: string;
  icon: LucideIcon;
}> = [
  { label: "Email", value: "hello@bizfinity.in", icon: Mail },
  { label: "Advisory", value: "Enterprise onboarding available", icon: CheckCircle2 },
  { label: "Coverage", value: "Billing, CRM, inventory, analytics", icon: LayoutTemplate },
  { label: "Response", value: "Business-hour launch assistance", icon: BellRing }
];
