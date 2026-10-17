export const INVENTORY_CONSUMPTION_METHODS = ["FIFO", "LIFO"] as const;
export type InventoryConsumptionMethod = (typeof INVENTORY_CONSUMPTION_METHODS)[number];

export const INVENTORY_PRICING_POLICIES = ["LATEST_BATCH_SELLING_PRICE", "CURRENT_BATCH_SELLING_PRICE", "MANUAL_PRICE"] as const;
export type InventoryPricingPolicy = (typeof INVENTORY_PRICING_POLICIES)[number];

export const DEFAULT_INVENTORY_CONSUMPTION_METHOD: InventoryConsumptionMethod = "FIFO";
export const DEFAULT_INVENTORY_PRICING_POLICY: InventoryPricingPolicy = "LATEST_BATCH_SELLING_PRICE";

export const inventoryConsumptionOptions = [
  { label: "FIFO — oldest stock is consumed first", value: "FIFO" },
  { label: "LIFO — newest stock is consumed first", value: "LIFO" }
];

export const inventoryPricingOptions = [
  { label: "Latest batch price — rate auto-fills from the newest purchase batch", value: "LATEST_BATCH_SELLING_PRICE" },
  { label: "Current batch price — rate auto-fills from the batch that will be consumed next (FIFO: oldest in-stock, LIFO: newest in-stock)", value: "CURRENT_BATCH_SELLING_PRICE" },
  { label: "Manual entry — rate stays empty, type it on each invoice line", value: "MANUAL_PRICE" }
];

export const resolveInventoryConsumptionMethod = (value?: string | null): InventoryConsumptionMethod =>
  value === "LIFO" ? "LIFO" : DEFAULT_INVENTORY_CONSUMPTION_METHOD;

export const resolveInventoryPricingPolicy = (value?: string | null): InventoryPricingPolicy =>
  value === "MANUAL_PRICE"
    ? "MANUAL_PRICE"
    : value === "CURRENT_BATCH_SELLING_PRICE"
      ? "CURRENT_BATCH_SELLING_PRICE"
      : DEFAULT_INVENTORY_PRICING_POLICY;

export const isManualPricingPolicy = (value?: string | null): boolean =>
  resolveInventoryPricingPolicy(value) === "MANUAL_PRICE";
