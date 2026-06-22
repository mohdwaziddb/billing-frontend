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
  username: string;
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

export type PlatformAdminAuthPayload = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  username: string;
};

export type StoredAuthSession =
  | { type: "user"; auth: AuthPayload }
  | { type: "platform-admin"; auth: PlatformAdminAuthPayload };

export type PlatformAdminDashboardSummary = {
  totalCompanies: number;
  activeCompanies: number;
  inactiveCompanies: number;
};

export type PlatformAdminCompany = {
  id: number;
  name: string;
  ownerName: string | null;
  email: string;
  mobile: string;
  active: boolean;
  createdAt: string | null;
  ownerCount: number;
  adminCount: number;
  userCount: number;
  totalUsers: number;
};

export type PlatformAdminCompanyOverview = {
  companyCount: number;
  ownerCount: number;
  adminCount: number;
  userCount: number;
};

export type PlatformAdminUser = {
  id: number;
  companyId: number;
  companyName: string;
  fullName: string;
  username: string;
  email: string;
  mobileNumber: string;
  role: Role;
  active: boolean;
  createdAt: string | null;
};

export type PlatformAdminCompanyDetails = {
  company: PlatformAdminCompany;
  owner: PlatformAdminUser | null;
  ownerCount: number;
  adminCount: number;
  userCount: number;
  auditLogCount: number;
  users: PlatformAdminUser[];
};

export type PlatformAdminSettings = {
  platformName: string;
  platformLogo: string | null;
  platformTagline: string | null;
  username: string;
};

export type DashboardSummary = {
  startDate: string | null;
  endDate: string | null;
  totalSales: number;
  totalCollection: number;
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

export type DashboardCardKey = "totalSales" | "collections" | "outstanding" | "totalExpense" | "netRevenue" | "customers" | "newCustomers" | "existingCustomers" | "invoices" | "products";

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
  totalExpense: number;
  netRevenue: number;
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
  subCategoryId: number | null;
  subCategoryName: string | null;
  subCategory: string | null;
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

export type ProductSubCategory = {
  id: number;
  categoryId: number;
  categoryName: string;
  subCategoryName: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
};

export type ProductSubCategoryRequest = {
  categoryId: number;
  subCategoryName: string;
  description?: string;
  active: boolean;
};

export type ProductRequest = {
  name: string;
  categoryId: number;
  subCategoryId: number;
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

export type ProductDataPortRow = {
  rowNumber: number;
  productName: string;
  productCategory: string;
  productSubCategory: string;
  sku: string;
  active: string;
  brand: string | null;
  hsnCode: string | null;
  purchasePrice: string;
  sellingPrice: string;
  openingStockQty: string;
  minimumStockQty: string;
  taxPercent: string;
  productCategoryId: number | null;
  productSubCategoryId: number | null;
  activeValue: boolean | null;
  valid: boolean;
  validationErrors: Record<string, string>;
};

export type ProductDataPortReferenceData = {
  categories: Array<{
    id: number;
    name: string;
  }>;
  subCategories: Array<{
    id: number;
    categoryId: number;
    categoryName: string;
    name: string;
  }>;
  existingSkus: string[];
};

export type DataPortPreviewResponse<T, R = unknown> = {
  rows: T[];
  totalRows: number;
  validRows: number;
  invalidRows: number;
  referenceData: R;
};

export type ImportResult = {
  importedRecords: number;
  failedRecords: number;
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
  customerEmail?: string | null;
  customerAddress: string | null;
  referByUserId?: number | null;
  referByUserName?: string | null;
  referByUsername?: string | null;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: "UNPAID" | "PARTIAL" | "PAID";
  invoiceDate: string;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  items: InvoiceItem[];
};

export type InvoiceRequestItem = {
  productId: number;
  qty: number;
  price?: number;
  taxPercent?: number;
  discountPercent: number;
  discountType?: "FIXED" | "PERCENT";
  discountValue?: number;
};

export type InvoiceRequest = {
  customerId: number;
  invoiceDate: string;
  referByUserId?: number | null;
  discountAmount: number;
  paidAmount?: number;
  paymentMode?: string;
  items: InvoiceRequestItem[];
};

export type PaymentMode = string;

export type Payment = {
  id: number;
  customerId: number;
  customerName: string;
  customerMobile?: string | null;
  customerEmail?: string | null;
  invoiceId: number | null;
  invoiceNo: string | null;
  amount: number;
  paymentDate: string;
  mode: PaymentMode;
  remarks: string | null;
  deleted: boolean;
  createdAt: string;
  createdBy: string | null;
};

export type PaymentHierarchyNode = {
  id: string;
  parentId: string | null;
  type: "metric" | "collected" | "mode" | "year" | "month" | "day" | "record" | string;
  label: string;
  subtitle: string | null;
  amount: number;
  totalAmount?: number | null;
  collectedAmount?: number | null;
  outstandingAmount?: number | null;
  count: number;
  invoiceCount?: number | null;
  customerCount?: number | null;
  collectionCount?: number | null;
  hasChildren: boolean;
  tone: string;
};

export type PaymentHierarchyRecord = {
  paymentId: number;
  invoiceNo: string;
  customerName: string;
  amount: number;
  collectedBy: string | null;
  paymentMode: string;
  paymentDate: string;
};

export type PaymentHierarchyResponse = {
  nodeId: string;
  nodeType: string;
  companyName: string;
  totalReceivable: number;
  totalCollected: number;
  totalOutstanding: number;
  totalExpense: number;
  netRevenue: number;
  nodes: PaymentHierarchyNode[];
  records: PaymentHierarchyRecord[];
};

export type SalesReferralInvoice = {
  invoiceId: number;
  invoiceNo: string;
  customerName: string;
  referByUserName?: string | null;
  referByUserMobileNumber?: string | null;
  invoiceDate: string;
  amount: number;
  paidAmount: number;
  outstandingAmount: number;
};

export type SalesReferralUserSummary = {
  userId: number;
  userName: string;
  username: string;
  totalInvoices: number;
  totalRevenue: number;
  paidRevenue: number;
  outstandingRevenue: number;
  averageInvoiceValue: number;
  invoices: SalesReferralInvoice[];
};

export type SalesReferralReport = {
  startDate: string | null;
  endDate: string | null;
  totalReferredInvoices: number;
  totalReferredRevenue: number;
  thisMonthReferredRevenue: number;
  topPerformer: SalesReferralUserSummary | null;
  users: SalesReferralUserSummary[];
  topContributors: SalesReferralUserSummary[];
  referredInvoices: SalesReferralInvoice[];
  thisMonthInvoices: SalesReferralInvoice[];
};

export type PaymentRequest = {
  customerId: number;
  invoiceId?: number;
  amount: number;
  paymentDate: string;
  mode: PaymentMode;
  remarks?: string;
};

export type PaymentModeMaster = {
  id: number;
  modeName: string;
  modeCode: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
};

export type PaymentModeRequest = {
  modeName: string;
  description?: string;
  active: boolean;
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

export type BulkDeleteResponse = {
  deleted: number;
  failed: number;
  failures: Record<number, string>;
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

export type NotificationLog = {
  id: number;
  channel: string;
  templateId: number | null;
  recipient: string;
  subject: string | null;
  message: string | null;
  providerResponse: string | null;
  status: string;
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
  smtpHost?: string | null;
  smtpPort?: number | null;
  smtpUsername?: string | null;
  smtpTlsEnabled?: boolean;
  awsAccessKey?: string | null;
  awsRegion?: string | null;
  sendgridApiKey?: string | null;
  apiUrl?: string | null;
  providerType?: string | null;
  authKey?: string | null;
  senderId?: string | null;
  templateId?: string | null;
  whatsappNumber?: string | null;
  senderName?: string | null;
  active: boolean;
};

export type ProviderSettingsRequest = {
  providerName?: string;
  senderEmail?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string;
  smtpTlsEnabled?: boolean;
  awsAccessKey?: string;
  awsSecretKey?: string;
  awsRegion?: string;
  sendgridApiKey?: string;
  apiUrl?: string;
  providerType?: string;
  authKey?: string;
  senderId?: string;
  templateId?: string;
  whatsappNumber?: string;
  senderName?: string;
  active?: boolean;
};

export type NotificationAttachmentPayload = {
  fileName: string;
  contentType: string;
  base64Content: string;
};

export type NotificationSendRequest = {
  channel?: "EMAIL" | "SMS" | "WHATSAPP";
  templateId?: number;
  subject?: string;
  message?: string;
  toEmails?: string[];
  ccEmails?: string[];
  bccEmails?: string[];
  mobileNumbers?: string[];
  attachments?: NotificationAttachmentPayload[];
  variables?: Record<string, string | number | boolean | null>;
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
  username: string;
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
