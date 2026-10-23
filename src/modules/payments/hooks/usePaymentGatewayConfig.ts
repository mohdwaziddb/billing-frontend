import { useCallback, useEffect, useState } from "react";
import { getPaymentGatewayConfig } from "../paymentGateway.api";
import type { PaymentGatewayPublicConfig } from "../payment.types";

// Koi cache nahi: har screen par live config (gateway on/off turant dikhe).
// Sirf ek hi waqt ki duplicate calls ek request share karti hain.
let inflight: Promise<PaymentGatewayPublicConfig> | null = null;

const loadConfig = () => {
  if (!inflight) {
    inflight = getPaymentGatewayConfig().finally(() => {
      inflight = null;
    });
  }
  return inflight;
};

/**
 * Billing screens ke liye: online payment on hai ya nahi. Fail ho (permission
 * nahi / network) to online band maan lo — offline flow kabhi block na ho.
 */
export const usePaymentGatewayConfig = (enabled = true) => {
  const [config, setConfig] = useState<PaymentGatewayPublicConfig | null>(null);
  const [loading, setLoading] = useState(enabled);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setConfig(await loadConfig());
    } catch {
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    loadConfig()
      .then((next) => {
        if (!cancelled) {
          setConfig(next);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setConfig(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return {
    config,
    onlineEnabled: Boolean(config?.onlineEnabled),
    onlineModeCode: config?.onlineModeCode || "ONLINE",
    loading,
    reload
  };
};
