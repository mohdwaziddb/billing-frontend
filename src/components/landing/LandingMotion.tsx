import { useEffect, useMemo, useRef, useState, type CSSProperties, type PropsWithChildren, type ReactNode } from "react";

const useInView = (threshold = 0.18) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || visible) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, visible]);

  return { ref, visible };
};

export const Reveal = ({
  children,
  className = "",
  delay = 0
}: PropsWithChildren<{ className?: string; delay?: number }>) => {
  const { ref, visible } = useInView();
  const style = useMemo<CSSProperties>(
    () => ({
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0px)" : "translateY(28px)",
      transition: `opacity 720ms ease ${delay}ms, transform 720ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`
    }),
    [delay, visible]
  );

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
};

export const Counter = ({
  value,
  suffix = "",
  duration = 1800,
  className = ""
}: {
  value: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) => {
  const { ref, visible } = useInView(0.45);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(value * eased));
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, value, visible]);

  return (
    <span ref={ref} className={className}>
      {count}
      {suffix}
    </span>
  );
};

export const FloatingOrb = ({
  className,
  duration = "8s"
}: {
  className: string;
  duration?: string;
}) => (
  <div
    aria-hidden
    className={`${className} will-change-transform`}
    style={{
      animation: `landing-float ${duration} ease-in-out infinite`
    }}
  />
);

export const AccordionItem = ({
  title,
  content,
  open,
  onToggle
}: {
  title: string;
  content: ReactNode;
  open: boolean;
  onToggle: () => void;
}) => (
  <div className="overflow-hidden rounded-[28px] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/80">
    <button
      type="button"
      className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      onClick={onToggle}
    >
      <span className="text-base font-extrabold tracking-[-0.02em] text-slate-950">{title}</span>
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-lg font-black text-sky-700 transition duration-300"
        style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}
      >
        +
      </span>
    </button>
    <div
      style={{
        maxHeight: open ? 220 : 0,
        opacity: open ? 1 : 0,
        transition: "max-height 360ms ease, opacity 260ms ease"
      }}
    >
      <div className="px-6 pb-6 text-sm leading-7 text-slate-600">{content}</div>
    </div>
  </div>
);
