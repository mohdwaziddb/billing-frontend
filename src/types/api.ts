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
  legalName?: string | null;
  code?: string | null;
  databaseName?: string | null;
  email: string;
  phone: string;
  alternatePhone?: string | null;
  address: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  taxId: string;
  panNumber?: string | null;
  cinNumber?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
};

export type CompanyTheme = {
  themeColor: string;
};

export type PlatformSettings = {
  platformName: string;
  platformLogo: string | null;
  platformTagline: string | null;
};

export type UserPreference = {
  darkModeEnabled: boolean;
};

export type TablePreference = {
  id: number | null;
  companyId: number;
  userId: number;
  tableName: string;
  visibleColumns: string[];
  createdOn: string | null;
  updatedOn: string | null;
};

export type UserProfile = {
  id: number;
  fullName: string;
  mobileNumber: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt?: string | null;
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
  totalExpense: number;
  netRevenue: number;
  outstandingAmount: number;
  totalCustomers: number;
  newCustomers: number;
  existingCustomers: number;
  totalInvoices: number;
  totalProducts: number;
  totalRevenue: number;
  totalExpense: number;
  netRevenue: number;
  outstandingBalance: number;
  totalSalesTrendPercentage: number;
  collectionTrendPercentage: number;
  outstandingTrendPercentage: number;
  totalCustomersTrendPercentage: number;
  topCustomers: DashboardTopCustomer[];
};

export type PageResponse<T> = {
  records: T[];
  page: number;
  size: number;
  totalRecords: number;
  totalPages: number;
};

export type DashboardCardKey = "totalSales" | "collections" | "outstanding" | "customers" | "newCustomers" | "existingCustomers" | "invoices" | "products";

export type DashboardDetailRow = Record<string, string | number | null>;

export type DashboardDetail = {
  card: DashboardCardKey;
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  sortBy: string;
  sortDirection: "asc" | "desc";
  search: string | null;
  rows: DashboardDetailRow[];
  productSummary: DashboardDetailRow[];
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
  expenseTrend: MetricPoint[];
  netProfitTrend: MetricPoint[];
  outstandingTrend: MetricPoint[];
  customerGrowthTrend: MetricPoint[];
  monthlyRevenue: MetricPoint[];
  expenseByCategory: MetricPoint[];
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
};

export type SalesByCategory = {
  categoryId: number;
  categoryName: string;
  totalAmount: number;
  percentage: number;
};

export type Customer = {
  id: number;
  name: string;
  mobile: string;
  email: string | null;
  address: string | null;
  gstNo: string | null;
  currentBalance: number;
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
  currentBalance: number;
  entries: LedgerEntry[];
  page: number;
  size: number;
  totalRecords: number;
  totalPages: number;
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
  page: number;
  size: number;
  totalRecords: number;
  totalPages: number;
};

export type Product = {
  id: number;
  name: string;
  categoryId: number | null;
  categoryName: string | null;
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

export type ProductCategory = {
  id: number;
  categoryName: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
};

export type ProductCategoryRequest = {
  categoryName: string;
  description?: string;
  active: boolean;
};

export type ProductRequest = {
  name: string;
  categoryId: number;
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
  discountType?: "FIXED" | "PERCENT";
  discountValue?: number;
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
  customerMobile?: string | null;
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

export type ExpenseType = "GENERAL" | "CUSTOMER_RELATED" | "INVOICE_RELATED";

export type ExpenseCategory = {
  id: number;
  categoryName: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
};

export type ExpenseCategoryRequest = {
  categoryName: string;
  description?: string;
  active: boolean;
};

export type Expense = {
  id: number;
  expenseType: ExpenseType;
  categoryId: number;
  categoryName: string;
  customerId: number | null;
  customerName: string | null;
  invoiceId: number | null;
  invoiceNo: string | null;
  amount: number;
  expenseDate: string;
  description: string | null;
  attachmentUrl: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
};

export type ExpenseRequest = {
  expenseType: ExpenseType;
  categoryId: number;
  customerId?: number;
  invoiceId?: number;
  amount: number;
  expenseDate: string;
  description?: string;
  attachmentUrl?: string;
};

export type Profitability = {
  referenceId: number;
  referenceName: string;
  revenue: number;
  expense: number;
  netRevenue: number;
};

export type ProfitLossPoint = {
  label: string;
  revenue?: number;
  expense?: number;
  netRevenue?: number;
  value?: number;
};

export type ProfitLossReport = {
  startDate: string | null;
  endDate: string | null;
  revenue: number;
  expense: number;
  netProfit: number;
  expenseByCategory: ProfitLossPoint[];
  revenueVsExpense: ProfitLossPoint[];
};

export type AuditLog = {
  id: number;
  moduleName: string;
  entityName: string;
  entityId: number;
  recordName: string | null;
  actionType: "CREATE" | "UPDATE" | "DELETE" | "STATUS_CHANGE" | "PAYMENT_ADDED" | "PAYMENT_UPDATED" | "PAYMENT_DELETED" | string;
  oldData: string | null;
  newData: string | null;
  changedFields: string | null;
  userId: number | null;
  userName: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type NotificationChannel = {
  id: number;
  channelName: string;
  defaultChannel: boolean;
  active: boolean;
};

export type EmailTemplate = {
  id: number;
  templateName: string;
  subject: string;
  emailBody: string;
  active: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmailTemplateRequest = {
  templateName: string;
  subject: string;
  emailBody: string;
  active: boolean;
};

export type EmailPreview = {
  subject: string;
  emailBody: string;
};

export type EmailLog = {
  id: number;
  templateId: number | null;
  recipientEmail: string;
  subject: string;
  emailBody: string;
  status: "Pending" | "Sent" | "Failed";
  errorMessage: string | null;
  sentBy: string | null;
  sentAt: string | null;
};

export type SmsTemplate = {
  id: number;
  templateName: string;
  templateBody: string;
  active: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SmsTemplateRequest = {
  templateName: string;
  templateBody: string;
  active: boolean;
};

export type ProviderSettings = {
  id: number;
  providerName: string;
  senderEmail?: string | null;
  awsAccessKey?: string | null;
  awsRegion?: string | null;
  apiUrl?: string | null;
  username?: string | null;
  senderId?: string | null;
  channelName?: string | null;
  active: boolean;
};

export type ProviderSettingsRequest = {
  providerName?: string;
  senderEmail?: string;
  awsAccessKey?: string;
  awsSecretKey?: string;
  awsRegion?: string;
  apiUrl?: string;
  username?: string;
  password?: string;
  senderId?: string;
  channelName?: string;
  active?: boolean;
};

export type HierarchyNode = {
  id: number;
  name: string;
  role: Role;
  department: string;
  status: "Active" | "Inactive";
  email: string;
  mobile: string;
  reportingManager: string;
  createdAt: string;
  hasChildren: boolean;
  metrics: {
    totalCustomers: number;
    totalInvoices: number;
    totalPayments: number;
    totalProducts: number;
    totalUsers: number;
    totalRevenue: number;
    totalCollection: number;
    outstandingAmount: number;
    averageInvoiceValue: number;
    lastActivityDate: string | null;
  };
};

export type CompanyUserRequest = {
  fullName: string;
  mobileNumber: string;
  email: string;
  password?: string;
  role: Role;
  active: boolean;
};

export type ActionPermission = {
  id: number;
  actionName: string;
  actionCode: string;
  allowed: boolean;
  overrideAllowed: boolean | null;
};

export type MenuPermission = {
  id: number;
  menuName: string;
  menuCode: string;
  menuIcon: string | null;
  menuRoute: string;
  displayOrder: number;
  parentMenuId: number | null;
  parentMenuCode: string | null;
  canView: boolean;
  actions: ActionPermission[];
  children?: MenuPermission[];
};

export type PermissionMatrix = {
  roleCode: Role;
  userId: number | null;
  menus: MenuPermission[];
};

export type PermissionMatrixRequest = {
  roleCode?: Role;
  userId?: number;
  menus: Array<{
    menuId: number;
    canView: boolean;
    actions: Array<{
      actionId: number;
      allowed: boolean;
      overrideAllowed?: boolean | null;
    }>;
  }>;
};
