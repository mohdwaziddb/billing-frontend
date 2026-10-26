import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { apiClient } from "./api/apiClient";
import { PLATFORM_ADMIN_LOGIN_URL } from "./config/site";
import {
  currentHostname,
  isLiveHost,
  isMainHost,
  isTenantSubdomainHost
} from "./lib/hosts";
import {
  INVALID_URL_EVENT,
  isMaintenanceError,
  MAINTENANCE_EVENT,
  notifyInvalidUrl,
  notifyMaintenance
} from "./lib/tenantMaintenance";
import { CommonPageLoader } from "./components/CommonPageLoader";
import { PlatformAdminRoute } from "./components/PlatformAdminRoute";
import { SuperAdminRoute } from "./components/SuperAdminRoute";
import { PermissionRoute, RouteMenuPermission } from "./components/PermissionRoute";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardLayout, RouteChunkFallback } from "./layouts/DashboardLayout";
import { LoginPage } from "./pages/LoginPage";
import { NoMenuPage } from "./pages/NoMenuPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { MaintenancePage } from "./pages/MaintenancePage";
import { InvalidUrlPage } from "./pages/InvalidUrlPage";

// Har page apna alag chunk: pehle saare pages (charts samet ~1.4MB JS) login
// page par hi download hote the. Login eager hai kyunki wahi pehla page hai.
const AboutCompanyPage = lazy(() => import("./pages/AboutCompanyPage").then((module) => ({ default: module.AboutCompanyPage })));
const CreateInvoicePage = lazy(() => import("./pages/CreateInvoicePage").then((module) => ({ default: module.CreateInvoicePage })));
const CustomerFormPage = lazy(() => import("./pages/CustomerFormPage").then((module) => ({ default: module.CustomerFormPage })));
const CustomerListPage = lazy(() => import("./pages/CustomerListPage").then((module) => ({ default: module.CustomerListPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const EmailTemplatePage = lazy(() => import("./pages/EmailTemplatePage").then((module) => ({ default: module.EmailTemplatePage })));
const InvoiceDetailPage = lazy(() => import("./pages/InvoiceDetailPage").then((module) => ({ default: module.InvoiceDetailPage })));
const InvoiceListPage = lazy(() => import("./pages/InvoiceListPage").then((module) => ({ default: module.InvoiceListPage })));
const LandingPage = lazy(() => import("./pages/LandingPage").then((module) => ({ default: module.LandingPage })));
const PlatformAdminLoginPage = lazy(() => import("./pages/PlatformAdminLoginPage").then((module) => ({ default: module.PlatformAdminLoginPage })));
const OutstandingCustomersPage = lazy(() => import("./pages/OutstandingCustomersPage").then((module) => ({ default: module.OutstandingCustomersPage })));
const PaymentEntryPage = lazy(() => import("./pages/PaymentEntryPage").then((module) => ({ default: module.PaymentEntryPage })));
const PaymentHierarchyPage = lazy(() => import("./pages/PaymentHierarchyPage").then((module) => ({ default: module.PaymentHierarchyPage })));
const PaymentListPage = lazy(() => import("./pages/PaymentListPage").then((module) => ({ default: module.PaymentListPage })));
const PaymentModePage = lazy(() => import("./pages/PaymentModePage").then((module) => ({ default: module.PaymentModePage })));
const PaymentGatewaySettingsPage = lazy(() => import("./modules/payments/pages/PaymentGatewaySettingsPage").then((module) => ({ default: module.PaymentGatewaySettingsPage })));
const ExpenseCategoryPage = lazy(() => import("./pages/ExpenseCategoryPage").then((module) => ({ default: module.ExpenseCategoryPage })));
const CommunicationHistoryPage = lazy(() => import("./pages/CommunicationHistoryPage").then((module) => ({ default: module.CommunicationHistoryPage })));
const ExpenseListPage = lazy(() => import("./pages/ExpenseListPage").then((module) => ({ default: module.ExpenseListPage })));
const GstSummaryPage = lazy(() => import("./pages/GstSummaryPage").then((module) => ({ default: module.GstSummaryPage })));
const ProfitLossReportPage = lazy(() => import("./pages/ProfitLossReportPage").then((module) => ({ default: module.ProfitLossReportPage })));
const ProductFormPage = lazy(() => import("./pages/ProductFormPage").then((module) => ({ default: module.ProductFormPage })));
const ProductCategoryPage = lazy(() => import("./pages/ProductCategoryPage").then((module) => ({ default: module.ProductCategoryPage })));
const ProductSubCategoryPage = lazy(() => import("./pages/ProductSubCategoryPage").then((module) => ({ default: module.ProductSubCategoryPage })));
const DataPortHubPage = lazy(() => import("./pages/DataPortHubPage").then((module) => ({ default: module.DataPortHubPage })));
const DataPortPage = lazy(() => import("./pages/DataPortPage").then((module) => ({ default: module.DataPortPage })));
const ProductListPage = lazy(() => import("./pages/ProductListPage").then((module) => ({ default: module.ProductListPage })));
const CommunicationSettingsPage = lazy(() => import("./pages/NotificationSettingsPages").then((module) => ({ default: module.CommunicationSettingsPage })));
const RolePermissionsPage = lazy(() => import("./pages/RolePermissionsPage").then((module) => ({ default: module.RolePermissionsPage })));
const SalesAnalyticsPage = lazy(() => import("./pages/SalesAnalyticsPage").then((module) => ({ default: module.SalesAnalyticsPage })));
const SalesReferralsPage = lazy(() => import("./pages/SalesReferralsPage").then((module) => ({ default: module.SalesReferralsPage })));
const ThemeSettingsPage = lazy(() => import("./pages/ThemeSettingsPage").then((module) => ({ default: module.ThemeSettingsPage })));
const TaxMasterPage = lazy(() => import("./pages/TaxMasterPage").then((module) => ({ default: module.TaxMasterPage })));
const UserManagementPage = lazy(() => import("./pages/UserManagementPage").then((module) => ({ default: module.UserManagementPage })));
const TwoStepVerificationPage = lazy(() => import("./pages/TwoStepVerificationPage").then((module) => ({ default: module.TwoStepVerificationPage })));
const SmsTemplatePage = lazy(() => import("./pages/SmsTemplatePage").then((module) => ({ default: module.SmsTemplatePage })));
const PlatformAdminPage = lazy(() => import("./pages/PlatformAdminPage").then((module) => ({ default: module.PlatformAdminPage })));
const BizioConsolePage = lazy(() => import("./pages/BizioConsolePage").then((module) => ({ default: module.BizioConsolePage })));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage").then((module) => ({ default: module.ProductDetailPage })));
const PurchaseListPage = lazy(() => import("./pages/PurchaseListPage").then((module) => ({ default: module.PurchaseListPage })));
const StockLedgerPage = lazy(() => import("./pages/StockLedgerPage").then((module) => ({ default: module.StockLedgerPage })));
const InvoiceTemplatesPage = lazy(() => import("./pages/InvoiceTemplatesPage").then((module) => ({ default: module.InvoiceTemplatesPage })));

// All host decisions come from the single shared helper in lib/hosts.
// isAppHost: main hosts show LandingPage, everything else is tenant app space.
// isLiveTenantSubdomainHost: platform-admin lives on the main domain only;
// local tenant subdomains must NEVER redirect to the live site.
function isAppHost(): boolean {
  return !isMainHost();
}

function isLiveTenantSubdomainHost(): boolean {
  const host = currentHostname();
  return isLiveHost(host) && isTenantSubdomainHost(host);
}

function PlatformAdminHostGuard({ children }: { children: ReactNode }) {
  if (typeof window !== "undefined" && isLiveTenantSubdomainHost()) {
    window.location.href = PLATFORM_ADMIN_LOGIN_URL;
    return null;
  }
  return <>{children}</>;
}

const clearTenantSession = () => {
  notifyMaintenance();
};

function useTenantMaintenance(): { maintenance: boolean; invalidUrl: boolean; checking: boolean } {
  const [maintenance, setMaintenance] = useState(false);
  const [invalidUrl, setInvalidUrl] = useState(false);
  // While the status probe is in flight, render a blank screen so the
  // login page never flashes on an INACTIVE tenant. URL stays untouched.
  const [checking, setChecking] = useState(() => isTenantSubdomainHost());

  useEffect(() => {
    if (!isTenantSubdomainHost()) {
      return;
    }
    const onMaintenance = () => setMaintenance(true);
    const onInvalidUrl = () => setInvalidUrl(true);
    window.addEventListener(MAINTENANCE_EVENT, onMaintenance);
    window.addEventListener(INVALID_URL_EVENT, onInvalidUrl);
    let cancelled = false;
    // Single status probe: the backend interceptor answers 503 for an
    // INACTIVE tenant or a missing database before any controller runs.
    apiClient
      .get("/v1/company/by-domain", {
        params: { domain: window.location.hostname },
        skipAuthRefresh: true
      })
      .then(() => {
        if (!cancelled) {
          setChecking(false);
        }
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        if (isMaintenanceError(err)) {
          clearTenantSession();
        } else if ((err as any)?.response?.status === 404) {
          // Ghost tenant subdomain: branded Invalid URL screen on the SAME
          // URL, koi redirect nahi. Ye probe sirf tenant hosts par chalta
          // hai — main hosts par (no probe) loop possible hi nahi.
          notifyInvalidUrl();
        } else {
          setChecking(false);
        }
      });
    return () => {
      cancelled = true;
      window.removeEventListener(MAINTENANCE_EVENT, onMaintenance);
      window.removeEventListener(INVALID_URL_EVENT, onInvalidUrl);
    };
  }, []);

  return { maintenance, invalidUrl, checking };
}

function App() {
  const isApp = isAppHost();
  // Tenant login lives on tenant subdomains only. On the LIVE main host
  // (biziotechnologies.com) /login must not render — redirect to landing.
  // Local main hosts (localhost) keep working for single-DB dev.
  const isLiveMain = typeof window !== "undefined" && isLiveHost() && isMainHost();
  const { maintenance, invalidUrl, checking } = useTenantMaintenance();
  if (maintenance) {
    // Same URL, no navigation: the workspace is unavailable, nothing else renders.
    return (
      <Routes>
        <Route path="*" element={<MaintenancePage />} />
      </Routes>
    );
  }
  if (invalidUrl) {
    // Same URL, no navigation: unknown tenant subdomain gets the branded
    // Invalid URL screen.
    return (
      <Routes>
        <Route path="*" element={<InvalidUrlPage />} />
      </Routes>
    );
  }
  if (checking) {
    return (
      <main className="min-h-screen bg-white">
        <CommonPageLoader />
      </main>
    );
  }
  return (
    <Suspense fallback={<RouteChunkFallback />}>
      <Routes>
        <Route path="/" element={isApp ? <LoginPage /> : <LandingPage />} />
        <Route path="/login" element={isLiveMain ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/platform-admin/login" element={<PlatformAdminHostGuard><PlatformAdminLoginPage /></PlatformAdminHostGuard>} />

        <Route element={<ProtectedRoute />}>
          <Route element={<SuperAdminRoute />}>
            <Route path="/BizioConsole" element={<BizioConsolePage />} />
          </Route>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<PermissionRoute menuCode="DASHBOARD"><DashboardPage /></PermissionRoute>} />
            <Route path="/customers" element={<PermissionRoute menuCode="CUSTOMERS"><CustomerListPage /></PermissionRoute>} />
            <Route path="/customers/new" element={<PermissionRoute menuCode="CUSTOMERS" actionCode="ADD"><CustomerFormPage /></PermissionRoute>} />
            <Route path="/customers/:customerId/edit" element={<PermissionRoute menuCode="CUSTOMERS" actionCode="EDIT"><CustomerFormPage /></PermissionRoute>} />
            <Route path="/products" element={<PermissionRoute menuCode="PRODUCTS"><ProductListPage /></PermissionRoute>} />
            <Route path="/products/new" element={<PermissionRoute menuCode="PRODUCTS" actionCode="ADD"><ProductFormPage /></PermissionRoute>} />
            <Route path="/products/:productId" element={<PermissionRoute menuCode="PRODUCTS"><ProductDetailPage /></PermissionRoute>} />
            <Route path="/products/:productId/edit" element={<PermissionRoute menuCode="PRODUCTS" actionCode="EDIT"><ProductFormPage /></PermissionRoute>} />
            <Route path="/purchases" element={<PermissionRoute menuCode="PURCHASES"><PurchaseListPage /></PermissionRoute>} />
            <Route path="/inventory/stock-ledger" element={<PermissionRoute menuCode="STOCK_LEDGER"><StockLedgerPage /></PermissionRoute>} />
            <Route path="/data-port" element={<PermissionRoute menuCode="DATA_PORT"><DataPortHubPage /></PermissionRoute>} />
            <Route path="/data-port/:moduleKey" element={<RouteMenuPermission fallbackMenuCode="DATA_PORT"><DataPortPage /></RouteMenuPermission>} />
            <Route path="/setup/product-categories" element={<PermissionRoute menuCode="PRODUCT_CATEGORY"><ProductCategoryPage /></PermissionRoute>} />
            <Route path="/setup/product-category" element={<PermissionRoute menuCode="PRODUCT_CATEGORY"><ProductCategoryPage /></PermissionRoute>} />
            <Route path="/setup/product-sub-categories" element={<PermissionRoute menuCode="PRODUCT_SUB_CATEGORIES"><ProductSubCategoryPage /></PermissionRoute>} />
            <Route path="/setup/expense-categories" element={<PermissionRoute menuCode="EXPENSE_CATEGORIES"><ExpenseCategoryPage /></PermissionRoute>} />
            <Route path="/setup/payment-modes" element={<PermissionRoute menuCode="PAYMENT_MODES"><PaymentModePage /></PermissionRoute>} />
            <Route path="/setup/payment-gateway" element={<PermissionRoute menuCode="PAYMENT_GATEWAY"><PaymentGatewaySettingsPage /></PermissionRoute>} />
            <Route path="/setup/tax-master" element={<PermissionRoute menuCode="TAX_MASTER"><TaxMasterPage /></PermissionRoute>} />
            <Route path="/setup/theme-settings" element={<PermissionRoute menuCode="THEME_SETTINGS"><ThemeSettingsPage /></PermissionRoute>} />
            <Route path="/setup/about-company" element={<PermissionRoute menuCode="ABOUT_COMPANY"><AboutCompanyPage /></PermissionRoute>} />
            <Route path="/setup/email-templates" element={<PermissionRoute menuCode="EMAIL_TEMPLATES"><EmailTemplatePage /></PermissionRoute>} />
            <Route path="/setup/sms-templates" element={<PermissionRoute menuCode="SMS_TEMPLATES"><SmsTemplatePage /></PermissionRoute>} />
            <Route path="/setup/invoice-templates" element={<PermissionRoute menuCode="INVOICE_TEMPLATES"><InvoiceTemplatesPage /></PermissionRoute>} />
            <Route path="/setup/communication" element={<PermissionRoute menuCode="COMMUNICATION"><CommunicationSettingsPage /></PermissionRoute>} />
            <Route path="/communication-history/mail" element={<PermissionRoute menuCode="MAIL_HISTORY"><CommunicationHistoryPage channel="mail" /></PermissionRoute>} />
            <Route path="/communication-history/sms" element={<PermissionRoute menuCode="SMS_HISTORY"><CommunicationHistoryPage channel="sms" /></PermissionRoute>} />
            <Route path="/communication-history/whatsapp" element={<PermissionRoute menuCode="WHATSAPP_HISTORY"><CommunicationHistoryPage channel="whatsapp" /></PermissionRoute>} />
            <Route path="/setup/email-settings" element={<Navigate replace to="/dashboard" />} />
            <Route path="/setup/sms-settings" element={<Navigate replace to="/dashboard" />} />
            <Route path="/setup/whatsapp-settings" element={<Navigate replace to="/dashboard" />} />
            <Route path="/reports/payment-hierarchy" element={<PermissionRoute menuCode="PAYMENT_HIERARCHY"><PaymentHierarchyPage /></PermissionRoute>} />
            <Route path="/invoices" element={<PermissionRoute menuCode="INVOICES"><InvoiceListPage /></PermissionRoute>} />
            <Route path="/create-invoice" element={<PermissionRoute menuCode="CREATE_INVOICE" actionCode="ADD"><CreateInvoicePage /></PermissionRoute>} />
            <Route path="/invoices/new" element={<PermissionRoute menuCode="CREATE_INVOICE" actionCode="ADD"><CreateInvoicePage /></PermissionRoute>} />
            <Route path="/invoices/:invoiceId" element={<PermissionRoute menuCode="INVOICES"><InvoiceDetailPage /></PermissionRoute>} />
            <Route path="/payments" element={<PermissionRoute menuCode="PAYMENTS"><PaymentListPage /></PermissionRoute>} />
            <Route path="/payments/new" element={<PermissionRoute menuCode="PAYMENTS" actionCode="ADD"><PaymentEntryPage /></PermissionRoute>} />
            <Route path="/expenses" element={<PermissionRoute menuCode="EXPENSES"><ExpenseListPage /></PermissionRoute>} />
            <Route path="/outstanding" element={<PermissionRoute menuCode="OUTSTANDING"><OutstandingCustomersPage /></PermissionRoute>} />
            <Route path="/outstanding-customers" element={<PermissionRoute menuCode="OUTSTANDING"><OutstandingCustomersPage /></PermissionRoute>} />
            <Route path="/analytics" element={<PermissionRoute menuCode="ANALYTICS"><SalesAnalyticsPage /></PermissionRoute>} />
            <Route path="/sales-analytics" element={<PermissionRoute menuCode="ANALYTICS"><SalesAnalyticsPage /></PermissionRoute>} />
            <Route path="/reports/profit-loss" element={<PermissionRoute menuCode="PROFIT_LOSS"><ProfitLossReportPage /></PermissionRoute>} />
            <Route path="/reports/gst-summary" element={<PermissionRoute menuCode="GST_SUMMARY"><GstSummaryPage /></PermissionRoute>} />
            <Route path="/reports/sales-referrals" element={<PermissionRoute menuCode="SALES_REFERRALS"><SalesReferralsPage /></PermissionRoute>} />
            <Route path="/setup/users" element={<PermissionRoute menuCode="USERS"><UserManagementPage /></PermissionRoute>} />
            <Route path="/users" element={<PermissionRoute menuCode="USERS"><UserManagementPage /></PermissionRoute>} />
            <Route path="/setup/two-step-verification" element={<TwoStepVerificationPage />} />
            <Route path="/setup/role-permissions" element={<PermissionRoute menuCode="ROLE_PERMISSIONS"><RolePermissionsPage /></PermissionRoute>} />
            <Route path="/no-menu" element={<NoMenuPage />} />
          </Route>
        </Route>

        <Route element={<PlatformAdminHostGuard><PlatformAdminRoute /></PlatformAdminHostGuard>}>
          <Route element={<DashboardLayout />}>
            <Route path="/platform-admin" element={<PlatformAdminPage mode="dashboard" />} />
            <Route path="/platform-admin/dashboard" element={<PlatformAdminPage mode="dashboard" />} />
            <Route path="/platform-admin/companies" element={<PlatformAdminPage mode="companies" />} />
            <Route path="/platform-admin/company-details" element={<PlatformAdminPage mode="details" />} />
            <Route path="/platform-admin/settings" element={<PlatformAdminPage mode="settings" />} />
            <Route path="/platform-admin/dumps" element={<PlatformAdminPage mode="dumps" />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

export default App;
