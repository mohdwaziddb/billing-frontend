import { motion } from "../../lib/framerMotionCompat";
import { useEffect, useRef, useState, type PropsWithChildren, type ReactNode } from "react";

export const Reveal = ({
  children,
  className = "",
  delay = 0,
  y = 28
}: PropsWithChildren<{ className?: string; delay?: number; y?: number }>) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.72, delay }}
  >
    {children}
  </motion.div>
);

export const Float = ({
  children,
  className = "",
  delay = 0,
  distance = 10
}: PropsWithChildren<{ className?: string; delay?: number; distance?: number }>) => (
  <motion.div
    className={className}
    initial={{ y: 0 }}
    animate={{ y: -distance / 2 }}
    transition={{ duration: 3.4 + delay, delay, ease: "ease-in-out" }}
    style={{ animation: `landing-float ${7 + delay}s ease-in-out infinite` }}
  >
    {children}
  </motion.div>
);

export const Counter = ({
  value,
  suffix = "",
  duration = 1600,
  className = ""
}: {
  value: number;
  suffix?: string;
  duration?: number;
  className?: string;
}) => {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node || visible) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

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
  <motion.div
    className="overflow-hidden rounded-[28px] border border-white/70 bg-white/88 shadow-[0_22px_64px_rgba(15,23,42,0.08)] backdrop-blur-xl"
    whileHover={{ y: -2 }}
    transition={{ duration: 0.22 }}
  >
    <button
      type="button"
      className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      onClick={onToggle}
    >
      <span className="text-base font-extrabold tracking-[-0.02em] text-slate-950">{title}</span>
      <motion.span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg font-black text-[#2056d6]"
        animate={{ rotate: open ? 45 : 0 }}
        transition={{ duration: 0.24 }}
      >
        +
      </motion.span>
    </button>
    <motion.div
      initial={undefined}
      animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
      transition={{ duration: 0.3 }}
      style={{ overflow: "hidden" }}
    >
      <div className="px-6 pb-6 text-sm leading-7 text-slate-600">{content}</div>
    </motion.div>
  </motion.div>
);
