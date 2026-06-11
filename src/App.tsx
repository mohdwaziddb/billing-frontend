import { Route, Routes } from "react-router-dom";
import { DefaultRoute } from "./components/DefaultRoute";
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
import { LoginPage } from "./pages/LoginPage";
import { OutstandingCustomersPage } from "./pages/OutstandingCustomersPage";
import { PaymentEntryPage } from "./pages/PaymentEntryPage";
import { PaymentListPage } from "./pages/PaymentListPage";
import { ProductFormPage } from "./pages/ProductFormPage";
import { ProductCategoryPage } from "./pages/ProductCategoryPage";
import { ProductListPage } from "./pages/ProductListPage";
import { RegisterPage } from "./pages/RegisterPage";
import { NoMenuPage } from "./pages/NoMenuPage";
import { EmailSettingsPage, SmsSettingsPage } from "./pages/NotificationSettingsPages";
import { RolePermissionsPage } from "./pages/RolePermissionsPage";
import { SalesAnalyticsPage } from "./pages/SalesAnalyticsPage";
import { ThemeSettingsPage } from "./pages/ThemeSettingsPage";
import { UserManagementPage } from "./pages/UserManagementPage";
import { SmsTemplatePage } from "./pages/SmsTemplatePage";
import { ManagementHierarchyPage } from "./pages/ManagementHierarchyPage";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<PermissionRoute menuCode="DASHBOARD"><DashboardPage /></PermissionRoute>} />
          <Route path="/customers" element={<PermissionRoute menuCode="CUSTOMERS"><CustomerListPage /></PermissionRoute>} />
          <Route path="/customers/new" element={<PermissionRoute menuCode="CUSTOMERS" actionCode="ADD"><CustomerFormPage /></PermissionRoute>} />
          <Route path="/customers/:customerId/edit" element={<PermissionRoute menuCode="CUSTOMERS" actionCode="EDIT"><CustomerFormPage /></PermissionRoute>} />
          <Route path="/products" element={<PermissionRoute menuCode="PRODUCTS"><ProductListPage /></PermissionRoute>} />
          <Route path="/products/new" element={<PermissionRoute menuCode="PRODUCTS" actionCode="ADD"><ProductFormPage /></PermissionRoute>} />
          <Route path="/products/:productId/edit" element={<PermissionRoute menuCode="PRODUCTS" actionCode="EDIT"><ProductFormPage /></PermissionRoute>} />
          <Route path="/setup/product-categories" element={<PermissionRoute menuCode="PRODUCT_CATEGORY"><ProductCategoryPage /></PermissionRoute>} />
          <Route path="/setup/product-category" element={<PermissionRoute menuCode="PRODUCT_CATEGORY"><ProductCategoryPage /></PermissionRoute>} />
          <Route path="/setup/theme-settings" element={<PermissionRoute menuCode="THEME_SETTINGS"><ThemeSettingsPage /></PermissionRoute>} />
          <Route path="/setup/about-company" element={<PermissionRoute menuCode="ABOUT_COMPANY"><AboutCompanyPage /></PermissionRoute>} />
          <Route path="/setup/email-templates" element={<PermissionRoute menuCode="EMAIL_TEMPLATES"><EmailTemplatePage /></PermissionRoute>} />
          <Route path="/setup/sms-templates" element={<PermissionRoute menuCode="SMS_TEMPLATES"><SmsTemplatePage /></PermissionRoute>} />
          <Route path="/setup/email-settings" element={<PermissionRoute menuCode="EMAIL_SETTINGS"><EmailSettingsPage /></PermissionRoute>} />
          <Route path="/setup/sms-settings" element={<PermissionRoute menuCode="SMS_SETTINGS"><SmsSettingsPage /></PermissionRoute>} />
          <Route path="/invoices" element={<PermissionRoute menuCode="INVOICES"><InvoiceListPage /></PermissionRoute>} />
          <Route path="/create-invoice" element={<PermissionRoute menuCode="CREATE_INVOICE" actionCode="ADD"><CreateInvoicePage /></PermissionRoute>} />
          <Route path="/invoices/new" element={<PermissionRoute menuCode="CREATE_INVOICE" actionCode="ADD"><CreateInvoicePage /></PermissionRoute>} />
          <Route path="/invoices/:invoiceId" element={<PermissionRoute menuCode="INVOICES"><InvoiceDetailPage /></PermissionRoute>} />
          <Route path="/payments" element={<PermissionRoute menuCode="PAYMENTS"><PaymentListPage /></PermissionRoute>} />
          <Route path="/payments/new" element={<PermissionRoute menuCode="PAYMENTS" actionCode="ADD"><PaymentEntryPage /></PermissionRoute>} />
          <Route path="/outstanding" element={<PermissionRoute menuCode="OUTSTANDING"><OutstandingCustomersPage /></PermissionRoute>} />
          <Route path="/outstanding-customers" element={<PermissionRoute menuCode="OUTSTANDING"><OutstandingCustomersPage /></PermissionRoute>} />
          <Route path="/analytics" element={<PermissionRoute menuCode="ANALYTICS"><SalesAnalyticsPage /></PermissionRoute>} />
          <Route path="/sales-analytics" element={<PermissionRoute menuCode="ANALYTICS"><SalesAnalyticsPage /></PermissionRoute>} />
          <Route path="/reports/management-hierarchy" element={<PermissionRoute menuCode="MANAGEMENT_HIERARCHY"><ManagementHierarchyPage /></PermissionRoute>} />
          <Route path="/setup/users" element={<PermissionRoute menuCode="USERS"><UserManagementPage /></PermissionRoute>} />
          <Route path="/users" element={<PermissionRoute menuCode="USERS"><UserManagementPage /></PermissionRoute>} />
          <Route path="/setup/role-permissions" element={<PermissionRoute menuCode="ROLE_PERMISSIONS"><RolePermissionsPage /></PermissionRoute>} />
          <Route path="/no-menu" element={<NoMenuPage />} />
          <Route path="/" element={<DefaultRoute />} />
        </Route>
      </Route>

      <Route path="*" element={<DefaultRoute />} />
    </Routes>
  );
}

export default App;
