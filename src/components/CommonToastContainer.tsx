import { Info, TriangleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";
import { CommonToastError } from "./CommonToastError";
import { CommonToastSuccess } from "./CommonToastSuccess";
import { type AppNotification, notificationService } from "../services/notificationService";

const AUTO_CLOSE_MS = 4500;

export const CommonToastContainer = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const close = (id: number) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
  };

  useEffect(() => notificationService.subscribe((notification) => {
    setNotifications((current) => [...current, notification]);
    window.setTimeout(() => close(notification.id), AUTO_CLOSE_MS);
  }), []);

  if (!notifications.length) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[80] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3">
      {notifications.map((notification) => {
        if (notification.type === "success") {
          return <CommonToastSuccess key={notification.id} notification={notification} onClose={() => close(notification.id)} />;
        }
        if (notification.type === "error") {
          return <CommonToastError key={notification.id} notification={notification} onClose={() => close(notification.id)} />;
        }
        const Icon = notification.type === "warning" ? TriangleAlert : Info;
        const tone = notification.type === "warning" ? "border-orange-500 bg-orange-500 text-white" : "border-blue-600 bg-blue-600 text-white";
        return (
          <div key={notification.id} className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[var(--radius-card)] border px-4 py-3 text-sm shadow-[0_18px_50px_rgba(2,6,23,0.24)] ${tone}`}>
            <Icon className="mt-0.5 shrink-0" size={18} />
            <p className="min-w-0 flex-1 font-semibold">{notification.message}</p>
            <button type="button" className="shrink-0 text-white/80 transition hover:text-white" aria-label="Close notification" onClick={() => close(notification.id)}>
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
