import type { PaymentModeMaster } from "../../types/api";
import type { Option } from "../../types/forms";

export const isOnlineModeMaster = (mode: PaymentModeMaster | null | undefined) => mode?.modeType === "ONLINE";

export const findPaymentMode = (modes: PaymentModeMaster[], modeCode: string | null | undefined) => {
  if (!modeCode) {
    return undefined;
  }
  const normalized = modeCode.toUpperCase();
  return modes.find((mode) => mode.modeCode.toUpperCase() === normalized);
};

/** ONLINE mode sirf tab dikhe jab company ka gateway on ho. */
export const visiblePaymentModes = (modes: PaymentModeMaster[], onlineEnabled: boolean) =>
  modes.filter((mode) => mode.active && (!isOnlineModeMaster(mode) || onlineEnabled));

/** Manual entry (Record Payment edit / filters) ke liye: online mode kabhi nahi. */
export const offlinePaymentModes = (modes: PaymentModeMaster[]) => modes.filter((mode) => mode.active && !isOnlineModeMaster(mode));

/** Online mode dropdown me gateway ke naam se dikhe (e.g. "Razorpay"); gateway badle to label khud badle. */
export const paymentModeLabel = (mode: PaymentModeMaster, gatewayName?: string | null) =>
  isOnlineModeMaster(mode) && gatewayName ? gatewayName : mode.modeName;

export const paymentModeOptions = (modes: PaymentModeMaster[], onlineEnabled: boolean, gatewayName?: string | null): Option[] =>
  visiblePaymentModes(modes, onlineEnabled).map((mode) => ({
    label: paymentModeLabel(mode, gatewayName),
    value: mode.modeCode
  }));

/** Reference field ka label mode ke hisaab se (UTR / approval / cheque no.). */
export const referenceLabelForMode = (modeCode: string | null | undefined) => {
  switch ((modeCode || "").toUpperCase()) {
    case "UPI":
      return "UPI Ref / UTR No.";
    case "CARD":
      return "Card Approval / Txn No.";
    case "CHEQUE":
      return "Cheque No.";
    case "BANK_TRANSFER":
      return "Bank Ref / UTR No.";
    default:
      return "Reference No.";
  }
};

/** "RAZORPAY" -> "Razorpay" (gateway code ko padhne layak naam). */
export const gatewayDisplayName = (gatewayType?: string | null) =>
  gatewayType ? gatewayType.charAt(0).toUpperCase() + gatewayType.slice(1).toLowerCase().replace(/_/g, " ") : "Online";

/** Payment row ka mode label: gateway payment = gateway naam, warna mode code. */
export const paymentModeDisplay = (payment: { mode: string; source?: string | null; gatewayType?: string | null }) =>
  payment.source === "GATEWAY" ? gatewayDisplayName(payment.gatewayType) : payment.mode.replace(/_/g, " ");
