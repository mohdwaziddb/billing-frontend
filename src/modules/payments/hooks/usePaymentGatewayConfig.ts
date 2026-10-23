import { useCallback, useEffect, useState } from "react";
import { getPaymentGatewayConfig } from "../paymentGateway.api";
import type { PaymentGatewayPublicConfig } from "../payment.types";

let cachedConfig: PaymentGatewayPublicConfig | null = null;
let inflight: Promise<PaymentGatewayPublicConfig> | null = null;

const loadConfig = (force = false) => {
  if (cachedConfig && !force) {
    return Promise.resolve(cachedConfig);
  }
  if (!inflight || force) {
    inflight = getPaymentGatewayConfig()
      .then((config) => {
        cachedConfig = config;
        return config;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
};

/** Settings save hone par purana "online on/off" cache hatao. */
export const clearPaymentGatewayConfigCache = () => {
  cachedConfig = null;
};

/**
 * Billing screens ke liye: online payment on hai ya nahi. Fail ho (permission
 * nahi / network) to online band maan lo — offline flow kabhi block na ho.
 */
export const usePaymentGatewayConfig = (enabled = true) => {
  const [config, setConfig] = useState<PaymentGatewayPublicConfig | null>(cachedConfig);
  const [loading, setLoading] = useState(enabled && !cachedConfig);

  const reload = useCallback(async (force = true) => {
    setLoading(true);
    try {
      setConfig(await loadConfig(force));
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
