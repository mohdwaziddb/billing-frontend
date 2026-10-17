import { useLayoutEffect, useRef, useState } from "react";

export type AnchoredPanelStyle = { top: number; left: number };

/**
 * Shared floating-panel behavior: portal + button-anchored positioning.
 *
 * - Kholte hi sahi jagah render hota hai (koi blink/jump nahi).
 * - Panel ke andar ka scroll ignore hota hai, bahar scroll par panel button
 *   ke saath move karta hai; button viewport se bahar nikle tab band hota hai.
 * - Outside click aur Escape se band hota hai.
 */
export const useAnchoredPanel = ({
  panelWidth,
  panelHeight,
  gap = 8,
  margin = 8
}: {
  panelWidth: number | ((panel: HTMLElement | null) => number);
  panelHeight: number | ((panel: HTMLElement | null) => number);
  gap?: number;
  margin?: number;
}) => {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<AnchoredPanelStyle>({ top: -9999, left: -9999 });
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const compute = (): AnchoredPanelStyle | null => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) {
      return null;
    }
    const panel = panelRef.current;
    const width = typeof panelWidth === "function" ? panelWidth(panel) : panelWidth;
    const height = typeof panelHeight === "function" ? panelHeight(panel) : panelHeight;
    const left = Math.max(margin, Math.min(rect.right - width, window.innerWidth - width - margin));
    const spaceBelow = window.innerHeight - rect.bottom;
    const opensUp = spaceBelow < height + gap && rect.top >= height + gap;
    const rawTop = opensUp
      ? rect.top - height - gap
      : Math.min(rect.bottom + gap, window.innerHeight - height - margin);
    return { top: Math.max(margin, rawTop), left };
  };

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    // Pehle position compute karke open karo — warna pehla frame purani
    // jagah par aata hai aur blink jaisa lagta hai.
    const style = compute();
    if (style) {
      setPanelStyle(style);
    }
    setOpen(true);
  };

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    const place = () => {
      const style = compute();
      if (style) {
        setPanelStyle(style);
      }
    };
    place();

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    const handleScroll = (event: Event) => {
      // Panel ke andar ka scroll (lambi list) ignore — warna apna scrollbar
      // use karte hi panel band ho jata.
      if (panelRef.current?.contains(event.target as Node)) {
        return;
      }
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) {
        setOpen(false);
        return;
      }
      place();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", place);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return { open, setOpen, toggle, buttonRef, panelRef, panelStyle };
};
