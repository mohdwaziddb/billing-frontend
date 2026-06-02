import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { CreateInvoicePage } from "./pages/CreateInvoicePage";
import { CustomerFormPage } from "./pages/CustomerFormPage";
import { CustomerListPage } from "./pages/CustomerListPage";
import { DashboardPage } from "./pages/DashboardPage";
import { InvoiceDetailPage } from "./pages/InvoiceDetailPage";
import { InvoiceListPage } from "./pages/InvoiceListPage";
import { LoginPage } from "./pages/LoginPage";
import { OutstandingCustomersPage } from "./pages/OutstandingCustomersPage";
import { PaymentEntryPage } from "./pages/PaymentEntryPage";
import { ProductFormPage } from "./pages/ProductFormPage";
import { ProductListPage } from "./pages/ProductListPage";
import { RegisterPage } from "./pages/RegisterPage";
import { SalesAnalyticsPage } from "./pages/SalesAnalyticsPage";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/customers" element={<CustomerListPage />} />
          <Route path="/customers/new" element={<CustomerFormPage />} />
          <Route path="/customers/:customerId/edit" element={<CustomerFormPage />} />
          <Route path="/products" element={<ProductListPage />} />
          <Route path="/products/new" element={<ProductFormPage />} />
          <Route path="/products/:productId/edit" element={<ProductFormPage />} />
          <Route path="/invoices" element={<InvoiceListPage />} />
          <Route path="/invoices/new" element={<CreateInvoicePage />} />
          <Route path="/invoices/:invoiceId" element={<InvoiceDetailPage />} />
          <Route path="/payments/new" element={<PaymentEntryPage />} />
          <Route path="/outstanding-customers" element={<OutstandingCustomersPage />} />
          <Route path="/sales-analytics" element={<SalesAnalyticsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate replace to="/dashboard" />} />
    </Routes>
  );
}

export default App;
