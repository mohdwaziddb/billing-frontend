export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
};

export type Role = "OWNER" | "ADMIN" | "USER";

export type CompanySummary = {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
};

export type UserProfile = {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  active: boolean;
  company: CompanySummary | null;
};

export type AuthPayload = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserProfile;
};

export type DashboardSummary = {
  startDate: string | null;
  endDate: string | null;
  totalSales: number;
  totalCollection: number;
  outstandingAmount: number;
  newCustomers: number;
  totalInvoices: number;
  totalProducts: number;
  totalRevenue: number;
  outstandingBalance: number;
  topCustomers: DashboardTopCustomer[];
};

export type DashboardTopCustomer = {
  customerId: number;
  customerName: string;
  mobile: string;
  totalPurchaseAmount: number;
  totalPaidAmount: number;
  outstandingBalance: number;
  lastPurchaseDate: string | null;
};

export type TrendStatus = "UP" | "DOWN" | "FLAT";

export type AnalyticsSummary = {
  startDate: string | null;
  endDate: string | null;
  todaySales: number;
  yesterdaySales: number;
  thisMonthSales: number;
  lastMonthSales: number;
  totalSales: number;
  totalCollection: number;
  totalOutstandingBalance: number;
  newCustomers: number;
  totalInvoices: number;
  lowStockProducts: number;
  dueCustomers: number;
  salesTrendPercentage: number;
  trendStatus: TrendStatus;
};

export type MetricPoint = {
  label: string;
  index: number;
  value: number;
};

export type OwnerAnalytics = {
  startDate: string;
  endDate: string;
  totalSales: number;
  totalCollection: number;
  outstandingAmount: number;
  newCustomers: number;
  totalInvoices: number;
  salesTrend: MetricPoint[];
  collectionTrend: MetricPoint[];
  outstandingTrend: MetricPoint[];
  customerGrowthTrend: MetricPoint[];
  monthlyRevenue: MetricPoint[];
};

export type SalesChartPoint = {
  label: string;
  index: number;
  salesAmount: number;
};

export type TopSellingProduct = {
  productId: number;
  productName: string;
  sku: string;
  totalQtySold: number;
  totalSalesAmount: number;
  currentStockQty: number;
};

export type LowStockProduct = {
  productId: number;
  productName: string;
  sku: string;
  stockQty: number;
  minStockQty: number;
  active: boolean;
};

export type CustomerDue = {
  customerId: number;
  customerName: string;
  mobile: string;
  email: string | null;
  currentBalance: number;
  creditLimit: number;
};

export type Customer = {
  id: number;
  name: string;
  mobile: string;
  email: string | null;
  address: string | null;
  gstNo: string | null;
  openingBalance: number;
  currentBalance: number;
  creditLimit: number;
  totalPurchaseAmount: number;
  totalPaidAmount: number;
  totalDiscountGiven: number;
  outstandingBalance: number;
  lastPurchaseDate: string | null;
  hasPurchaseHistory: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
};

export type CustomerRequest = {
  name: string;
  mobile: string;
  email?: string;
  address?: string;
  gstNo?: string;
  openingBalance: number;
  creditLimit: number;
  active: boolean;
};

export type LedgerEntry = {
  type: string;
  referenceId: number;
  referenceNo: string;
  entryDate: string;
  debit: number;
  credit: number;
  runningBalance: number;
  remarks: string;
};

export type CustomerLedger = {
  customerId: number;
  customerName: string;
  openingBalance: number;
  currentBalance: number;
  entries: LedgerEntry[];
};

export type CustomerSummaryMetrics = {
  totalPurchaseAmount: number;
  totalPaidAmount: number;
  totalDiscountGiven: number;
  outstandingBalance: number;
  lastPurchaseDate: string | null;
  hasPurchaseHistory: boolean;
};

export type CustomerPurchaseHistory = {
  customerId: number;
  customerName: string;
  mobile: string;
  address: string | null;
  summary: CustomerSummaryMetrics;
  invoices: Invoice[];
};

export type Product = {
  id: number;
  name: string;
  category: string | null;
  brand: string | null;
  sku: string;
  hsnCode: string | null;
  purchasePrice: number;
  sellingPrice: number;
  stockQty: number;
  minStockQty: number;
  taxPercent: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
};

export type ProductRequest = {
  name: string;
  category?: string;
  brand?: string;
  sku: string;
  hsnCode?: string;
  purchasePrice: number;
  sellingPrice: number;
  stockQty: number;
  minStockQty: number;
  taxPercent: number;
  active: boolean;
};

export type InvoiceItem = {
  id: number;
  productId: number;
  productName: string;
  qty: number;
  price: number;
  discountPercent: number;
  taxPercent: number;
  lineTotal: number;
};

export type Invoice = {
  id: number;
  invoiceNo: string;
  customerId: number;
  customerName: string;
  customerMobile: string;
  customerAddress: string | null;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: "UNPAID" | "PARTIAL" | "PAID";
  invoiceDate: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  items: InvoiceItem[];
};

export type InvoiceRequestItem = {
  productId: number;
  qty: number;
  discountPercent: number;
};

export type InvoiceRequest = {
  customerId: number;
  invoiceDate: string;
  discountAmount: number;
  items: InvoiceRequestItem[];
};

export type PaymentMode = "CASH" | "CARD" | "UPI" | "BANK_TRANSFER" | "CHEQUE" | "WALLET" | "OTHER";

export type Payment = {
  id: number;
  customerId: number;
  customerName: string;
  invoiceId: number | null;
  invoiceNo: string | null;
  amount: number;
  paymentDate: string;
  mode: PaymentMode;
  remarks: string | null;
  createdAt: string;
  createdBy: string | null;
};

export type PaymentRequest = {
  customerId: number;
  invoiceId?: number;
  amount: number;
  paymentDate: string;
  mode: PaymentMode;
  remarks?: string;
};

export type CompanyUserRequest = {
  fullName: string;
  email: string;
  password?: string;
  role: Role;
  active: boolean;
};
