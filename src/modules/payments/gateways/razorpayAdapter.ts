import type { GatewayCheckoutAdapter, GatewayCheckoutResult } from "./types";

const RAZORPAY_CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

type RazorpaySuccessResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayFailureResponse = {
  error?: { description?: string; reason?: string };
};

type RazorpayInstance = {
  open: () => void;
  on: (event: "payment.failed", handler: (response: RazorpayFailureResponse) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

let loadPromise: Promise<void> | null = null;

const loadScript = () => {
  if (window.Razorpay) {
    return Promise.resolve();
  }
  if (!loadPromise) {
    loadPromise = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = RAZORPAY_CHECKOUT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        loadPromise = null;
        script.remove();
        reject(new Error("Unable to load Razorpay checkout. Check your internet connection."));
      };
      document.body.appendChild(script);
    });
  }
  return loadPromise;
};

export const razorpayAdapter: GatewayCheckoutAdapter = {
  type: "RAZORPAY",
  load: loadScript,
  open: async (options) => {
    await loadScript();
    const Razorpay = window.Razorpay;
    if (!Razorpay) {
      throw new Error("Razorpay checkout is not available");
    }
    return new Promise<GatewayCheckoutResult>((resolve) => {
      let settled = false;
      const finish = (result: GatewayCheckoutResult) => {
        if (!settled) {
          settled = true;
          resolve(result);
        }
      };
      const instance = new Razorpay({
        ...options,
        // Failed attempt ke baad Razorpay popup me hi retry deta hai; popup band hone par hi result.
        retry: { enabled: true },
        handler: (response: RazorpaySuccessResponse) => finish({ status: "SUCCESS", data: { ...response } }),
        modal: {
          ondismiss: () => finish({ status: "DISMISSED" }),
          confirm_close: true
        }
      });
      instance.on("payment.failed", (response) => {
        // Sirf note karo; customer popup me dobara try kar sakta hai. Final status backend/webhook se.
        console.warn("Razorpay payment attempt failed", response.error?.description || response.error?.reason);
      });
      instance.open();
    });
  }
};
