import {
  BarChart3,
  Boxes,
  Building2,
  CreditCard,
  DatabaseBackup,
  FilePlus2,
  FileText,
  LayoutDashboard,
  Mail,
  MessageCircle,
  MessageSquare,
  Package,
  Palette,
  ReceiptIndianRupee,
  ReceiptText,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Tags,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon
} from "lucide-react";

export const MENU_ICONS: Record<string, LucideIcon> = {
  BarChart3,
  Boxes,
  Building2,
  CreditCard,
  DatabaseBackup,
  FilePlus2,
  FileText,
  LayoutDashboard,
  Mail,
  MessageCircle,
  MessageSquare,
  Package,
  Palette,
  ReceiptIndianRupee,
  ReceiptText,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Tags,
  TrendingUp,
  Users,
  Wallet
};

export const DEFAULT_MENU_ICON: LucideIcon = LayoutDashboard;

export const resolveMenuIcon = (name?: string | null): LucideIcon =>
  (name ? MENU_ICONS[name] : undefined) ?? DEFAULT_MENU_ICON;
