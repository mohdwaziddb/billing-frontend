import { Bot, Sparkles } from "lucide-react";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useAiAssistant } from "../hooks/useAiAssistant";
import { AiChatDrawer } from "./AiChatDrawer";

const AI_WIDGET_POSITION_KEY = "bizfinity.aiWidgetPosition";
const WIDGET_SIZE = 56;
const WIDGET_MARGIN = 20;

type WidgetPosition = {
  x: number;
  y: number;
};

const getDefaultPosition = (): WidgetPosition => ({
  x: Math.max(WIDGET_MARGIN, window.innerWidth - WIDGET_SIZE - WIDGET_MARGIN),
  y: Math.max(WIDGET_MARGIN, window.innerHeight - WIDGET_SIZE - WIDGET_MARGIN)
});

const clampPosition = (position: WidgetPosition): WidgetPosition => ({
  x: Math.min(Math.max(position.x, WIDGET_MARGIN), Math.max(WIDGET_MARGIN, window.innerWidth - WIDGET_SIZE - WIDGET_MARGIN)),
  y: Math.min(Math.max(position.y, WIDGET_MARGIN), Math.max(WIDGET_MARGIN, window.innerHeight - WIDGET_SIZE - WIDGET_MARGIN))
});

export const AiAssistantWidget = () => {
  const { user, can, sessionType, refreshPermissions, refreshProfile } = useAuth();
  const { open, setOpen } = useAiAssistant();
  const chatbotEnabled = Boolean(user?.company?.isChatbotEnabled);
  const canUseAssistant = can("AI_ASSISTANT", "VIEW");
  const [position, setPosition] = useState<WidgetPosition>(() => getDefaultPosition());
  const dragStateRef = useRef<{ pointerId: number; offsetX: number; offsetY: number; moved: boolean } | null>(null);

  useEffect(() => {
    try {
      const savedPosition = window.localStorage.getItem(AI_WIDGET_POSITION_KEY);
      if (!savedPosition) {
        setPosition(getDefaultPosition());
        return;
      }
      const parsed = JSON.parse(savedPosition) as Partial<WidgetPosition>;
      if (typeof parsed.x === "number" && typeof parsed.y === "number") {
        setPosition(clampPosition({ x: parsed.x, y: parsed.y }));
        return;
      }
    } catch {
      // Ignore malformed saved position and fall back to default.
    }
    setPosition(getDefaultPosition());
  }, []);

  useEffect(() => {
    if (sessionType !== "user") {
      return;
    }

    void refreshProfile();
    void refreshPermissions();

    const refreshAssistantAccess = () => {
      if (document.visibilityState === "visible") {
        void refreshProfile();
        void refreshPermissions();
      }
    };

    window.addEventListener("focus", refreshAssistantAccess);
    document.addEventListener("visibilitychange", refreshAssistantAccess);
    return () => {
      window.removeEventListener("focus", refreshAssistantAccess);
      document.removeEventListener("visibilitychange", refreshAssistantAccess);
    };
  }, [sessionType]);

  useEffect(() => {
    if ((!chatbotEnabled || !canUseAssistant) && open) {
      setOpen(false);
    }
  }, [canUseAssistant, chatbotEnabled, open, setOpen]);

  useEffect(() => {
    const handleResize = () => {
      setPosition((current) => clampPosition(current));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(AI_WIDGET_POSITION_KEY, JSON.stringify(position));
  }, [position]);

  if (sessionType !== "user" || !chatbotEnabled || !canUseAssistant) {
    return null;
  }

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    dragStateRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - position.x,
      offsetY: event.clientY - position.y,
      moved: false
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!dragStateRef.current || dragStateRef.current.pointerId !== event.pointerId) {
      return;
    }

    const nextPosition = clampPosition({
      x: event.clientX - dragStateRef.current.offsetX,
      y: event.clientY - dragStateRef.current.offsetY
    });

    const deltaX = Math.abs(nextPosition.x - position.x);
    const deltaY = Math.abs(nextPosition.y - position.y);
    if (deltaX > 3 || deltaY > 3) {
      dragStateRef.current.moved = true;
    }

    setPosition(nextPosition);
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (!dragStateRef.current || dragStateRef.current.pointerId !== event.pointerId) {
      return;
    }

    const didMove = dragStateRef.current.moved;
    dragStateRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);

    if (!didMove) {
      setOpen(true);
    }
  };

  return (
    <>
      {!open ? (
        <button
          type="button"
          className="fixed z-40 flex h-14 w-14 cursor-grab items-center justify-center rounded-lg border border-white/20 bg-[var(--theme-color)] text-[var(--theme-contrast)] shadow-[0_18px_35px_color-mix(in_srgb,var(--theme-color)_34%,transparent)] transition hover:-translate-y-1 hover:bg-[var(--theme-hover)] active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--theme-color)] focus-visible:ring-offset-2"
          style={{ left: `${position.x}px`, top: `${position.y}px` }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          title="Open BizFinity Assistant"
        >
          <Bot size={24} />
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow">
            <Sparkles size={12} />
          </span>
        </button>
      ) : null}
      {open ? <div className="fixed inset-0 z-40 bg-slate-950/20 backdrop-blur-[1px]" onClick={() => setOpen(false)} /> : null}
      <AiChatDrawer />
    </>
  );
};
