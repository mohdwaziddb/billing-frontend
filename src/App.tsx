import { useEffect, useState, type ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { apiClient } from "./api/apiClient";
import { PLATFORM_ADMIN_LOGIN_URL } from "./config/site";
import {
  currentHostname,
  isLiveHost,
  isMainHost,
  isTenantSubdomainHost,
  mainSiteHomeUrl
} from "./lib/hosts";
import {
  isMaintenanceError,
  MAINTENANCE_EVENT,
  notifyMaintenance
} from "./lib/tenantMaintenance";
import { PlatformAdminRoute } from "./components/PlatformAdminRoute";
import { PermissionRoute } from "./components/PermissionRoute";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { AboutCompanyPage } from "./pages/AboutCompanyPage";
import { CreateInvoicePage } from "./pages/CreateInvoicePage";
import { CustomerFormPage } from "./pages/CustomerFormPage";
import { CustomerListPage } from "./pages/CustomerListPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EmailTemplatePage } from "./pages/EmailTemplatePage";
import { InvoiceDetailPage } from "./pages/InvoiceDetailPage";
import { InvoiceListPage } from "./pages/InvoiceListPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { PlatformAdminLoginPage } from "./pages/PlatformAdminLoginPage";
import { OutstandingCustomersPage } from "./pages/OutstandingCustomersPage";
import { PaymentEntryPage } from "./pages/PaymentEntryPage";
import { PaymentHierarchyPage } from "./pages/PaymentHierarchyPage";
import { PaymentListPage } from "./pages/PaymentListPage";
import { PaymentModePage } from "./pages/PaymentModePage";
import { ExpenseCategoryPage } from "./pages/ExpenseCategoryPage";
import { ExpenseListPage } from "./pages/ExpenseListPage";
import { GstSummaryPage } from "./pages/GstSummaryPage";
import { ProfitLossReportPage } from "./pages/ProfitLossReportPage";
import { ProductFormPage } from "./pages/ProductFormPage";
import { ProductCategoryPage } from "./pages/ProductCategoryPage";
import { ProductSubCategoryPage } from "./pages/ProductSubCategoryPage";
import { ProductDataPortPage } from "./pages/ProductDataPortPage";
import { ProductListPage } from "./pages/ProductListPage";
import { NoMenuPage } from "./pages/NoMenuPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { CommunicationSettingsPage } from "./pages/NotificationSettingsPages";
import { RolePermissionsPage } from "./pages/RolePermissionsPage";
import { SalesAnalyticsPage } from "./pages/SalesAnalyticsPage";
import { SalesReferralsPage } from "./pages/SalesReferralsPage";
import { ThemeSettingsPage } from "./pages/ThemeSettingsPage";
import { TaxMasterPage } from "./pages/TaxMasterPage";
import { UserManagementPage } from "./pages/UserManagementPage";
import { SmsTemplatePage } from "./pages/SmsTemplatePage";
import { PlatformAdminPage } from "./pages/PlatformAdminPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { PurchaseListPage } from "./pages/PurchaseListPage";
import { StockLedgerPage } from "./pages/StockLedgerPage";
import { InvoiceTemplatesPage } from "./pages/InvoiceTemplatesPage";
import { MaintenancePage } from "./pages/MaintenancePage";

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

function useTenantMaintenance(): { maintenance: boolean; checking: boolean } {
  const [maintenance, setMaintenance] = useState(false);
  // While the status probe is in flight, render a blank screen so the
  // login page never flashes on an INACTIVE tenant. URL stays untouched.
  const [checking, setChecking] = useState(() => isTenantSubdomainHost());

  useEffect(() => {
    if (!isTenantSubdomainHost()) {
      return;
    }
    const onMaintenance = () => setMaintenance(true);
    window.addEventListener(MAINTENANCE_EVENT, onMaintenance);
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
        if (!cancelled) {
          if (isMaintenanceError(err)) {
            clearTenantSession();
          } else {
            setChecking(false);
            // Unknown tenant subdomain -> own main site. This probe only runs on
            // tenant hosts, so any 404 here means ghost tenant. Live goes to
            // the live main site, local goes to the local main (landing).
            // Main hosts never reach here (no probe there) so no loop possible.
            if ((err as any)?.response?.status === 404) {
              window.location.href = mainSiteHomeUrl();
            }
          }
        }
      });
    return () => {
      cancelled = true;
      window.removeEventListener(MAINTENANCE_EVENT, onMaintenance);
    };
  }, []);

  return { maintenance, checking };
}

function App() {
  const isApp = isAppHost();
  const { maintenance, checking } = useTenantMaintenance();
  if (maintenance) {
    // Same URL, no navigation: the workspace is unavailable, nothing else renders.
    return (
      <Routes>
        <Route path="*" element={<MaintenancePage />} />
      </Routes>
    );
  }
  if (checking) {
    return <main className="min-h-screen bg-white" />;
  }
  return (
    <Routes>
      <Route path="/" element={isApp ? <LoginPage /> : <LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/platform-admin/login" element={<PlatformAdminHostGuard><PlatformAdminLoginPage /></PlatformAdminHostGuard>} />

      <Route element={<ProtectedRoute />}>
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
          <Route path="/data-port/products" element={<PermissionRoute menuCode="PRODUCT_DATAPORT"><ProductDataPortPage /></PermissionRoute>} />
          <Route path="/setup/product-categories" element={<PermissionRoute menuCode="PRODUCT_CATEGORY"><ProductCategoryPage /></PermissionRoute>} />
          <Route path="/setup/product-category" element={<PermissionRoute menuCode="PRODUCT_CATEGORY"><ProductCategoryPage /></PermissionRoute>} />
          <Route path="/setup/product-sub-categories" element={<PermissionRoute menuCode="PRODUCT_SUB_CATEGORIES"><ProductSubCategoryPage /></PermissionRoute>} />
          <Route path="/setup/expense-categories" element={<PermissionRoute menuCode="EXPENSE_CATEGORIES"><ExpenseCategoryPage /></PermissionRoute>} />
          <Route path="/setup/payment-modes" element={<PermissionRoute menuCode="PAYMENT_MODES"><PaymentModePage /></PermissionRoute>} />
          <Route path="/setup/tax-master" element={<PermissionRoute menuCode="TAX_MASTER"><TaxMasterPage /></PermissionRoute>} />
          <Route path="/setup/theme-settings" element={<PermissionRoute menuCode="THEME_SETTINGS"><ThemeSettingsPage /></PermissionRoute>} />
          <Route path="/setup/about-company" element={<PermissionRoute menuCode="ABOUT_COMPANY"><AboutCompanyPage /></PermissionRoute>} />
          <Route path="/setup/email-templates" element={<PermissionRoute menuCode="EMAIL_TEMPLATES"><EmailTemplatePage /></PermissionRoute>} />
          <Route path="/setup/sms-templates" element={<PermissionRoute menuCode="SMS_TEMPLATES"><SmsTemplatePage /></PermissionRoute>} />
          <Route path="/setup/invoice-templates" element={<PermissionRoute menuCode="INVOICE_TEMPLATES"><InvoiceTemplatesPage /></PermissionRoute>} />
          <Route path="/setup/communication" element={<PermissionRoute menuCode="COMMUNICATION"><CommunicationSettingsPage /></PermissionRoute>} />
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
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
