import { Navigate, Route, Routes } from "react-router-dom";
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
import { ProfitLossReportPage } from "./pages/ProfitLossReportPage";
import { ProductFormPage } from "./pages/ProductFormPage";
import { ProductCategoryPage } from "./pages/ProductCategoryPage";
import { ProductDataPortPage } from "./pages/ProductDataPortPage";
import { ProductListPage } from "./pages/ProductListPage";
import { NoMenuPage } from "./pages/NoMenuPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { CommunicationSettingsPage, PlatformAdminCommunicationPage } from "./pages/NotificationSettingsPages";
import { RolePermissionsPage } from "./pages/RolePermissionsPage";
import { SalesAnalyticsPage } from "./pages/SalesAnalyticsPage";
import { ThemeSettingsPage } from "./pages/ThemeSettingsPage";
import { UserManagementPage } from "./pages/UserManagementPage";
import { SmsTemplatePage } from "./pages/SmsTemplatePage";
import { PlatformAdminPage } from "./pages/PlatformAdminPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/platform-admin/login" element={<PlatformAdminLoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<PermissionRoute menuCode="DASHBOARD"><DashboardPage /></PermissionRoute>} />
          <Route path="/customers" element={<PermissionRoute menuCode="CUSTOMERS"><CustomerListPage /></PermissionRoute>} />
          <Route path="/customers/new" element={<PermissionRoute menuCode="CUSTOMERS" actionCode="ADD"><CustomerFormPage /></PermissionRoute>} />
          <Route path="/customers/:customerId/edit" element={<PermissionRoute menuCode="CUSTOMERS" actionCode="EDIT"><CustomerFormPage /></PermissionRoute>} />
          <Route path="/products" element={<PermissionRoute menuCode="PRODUCTS"><ProductListPage /></PermissionRoute>} />
          <Route path="/products/new" element={<PermissionRoute menuCode="PRODUCTS" actionCode="ADD"><ProductFormPage /></PermissionRoute>} />
          <Route path="/products/:productId/edit" element={<PermissionRoute menuCode="PRODUCTS" actionCode="EDIT"><ProductFormPage /></PermissionRoute>} />
          <Route path="/data-port/products" element={<PermissionRoute menuCode="PRODUCT_DATAPORT"><ProductDataPortPage /></PermissionRoute>} />
          <Route path="/setup/product-categories" element={<PermissionRoute menuCode="PRODUCT_CATEGORY"><ProductCategoryPage /></PermissionRoute>} />
          <Route path="/setup/product-category" element={<PermissionRoute menuCode="PRODUCT_CATEGORY"><ProductCategoryPage /></PermissionRoute>} />
          <Route path="/setup/expense-categories" element={<PermissionRoute menuCode="EXPENSE_CATEGORIES"><ExpenseCategoryPage /></PermissionRoute>} />
          <Route path="/setup/payment-modes" element={<PermissionRoute menuCode="PAYMENT_MODES"><PaymentModePage /></PermissionRoute>} />
          <Route path="/setup/theme-settings" element={<PermissionRoute menuCode="THEME_SETTINGS"><ThemeSettingsPage /></PermissionRoute>} />
          <Route path="/setup/about-company" element={<PermissionRoute menuCode="ABOUT_COMPANY"><AboutCompanyPage /></PermissionRoute>} />
          <Route path="/setup/email-templates" element={<PermissionRoute menuCode="EMAIL_TEMPLATES"><EmailTemplatePage /></PermissionRoute>} />
          <Route path="/setup/sms-templates" element={<PermissionRoute menuCode="SMS_TEMPLATES"><SmsTemplatePage /></PermissionRoute>} />
          <Route path="/setup/communication" element={<PermissionRoute menuCode="COMMUNICATION"><CommunicationSettingsPage /></PermissionRoute>} />
          <Route path="/setup/email-settings" element={<Navigate replace to="/setup/communication?tab=email" />} />
          <Route path="/setup/sms-settings" element={<Navigate replace to="/setup/communication?tab=sms" />} />
          <Route path="/setup/whatsapp-settings" element={<Navigate replace to="/setup/communication?tab=whatsapp" />} />
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
          <Route path="/setup/users" element={<PermissionRoute menuCode="USERS"><UserManagementPage /></PermissionRoute>} />
          <Route path="/users" element={<PermissionRoute menuCode="USERS"><UserManagementPage /></PermissionRoute>} />
          <Route path="/setup/role-permissions" element={<PermissionRoute menuCode="ROLE_PERMISSIONS"><RolePermissionsPage /></PermissionRoute>} />
          <Route path="/no-menu" element={<NoMenuPage />} />
        </Route>
      </Route>

      <Route element={<PlatformAdminRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/platform-admin" element={<PlatformAdminPage mode="dashboard" />} />
          <Route path="/platform-admin/dashboard" element={<PlatformAdminPage mode="dashboard" />} />
          <Route path="/platform-admin/companies" element={<PlatformAdminPage mode="companies" />} />
          <Route path="/platform-admin/communication" element={<PlatformAdminCommunicationPage />} />
          <Route path="/platform-admin/company-details" element={<PlatformAdminPage mode="details" />} />
          <Route path="/platform-admin/settings" element={<PlatformAdminPage mode="settings" />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
