import {
  createElement,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ForwardedRef,
  type HTMLAttributes,
  type MouseEvent,
  type PropsWithChildren,
  type RefObject
} from "react";

type MotionStyle = Omit<CSSProperties, "rotate" | "scale"> & {
  scale?: number;
  x?: number | string;
  y?: number | string;
  rotate?: number | string;
};

type Transition = {
  duration?: number;
  delay?: number;
  ease?: string | number[];
};

type ViewportOptions = {
  once?: boolean;
  amount?: number;
};

type MotionProps = PropsWithChildren<
  HTMLAttributes<HTMLElement> & {
    as?: ElementType;
    initial?: MotionStyle;
    animate?: MotionStyle;
    whileInView?: MotionStyle;
    whileHover?: MotionStyle;
    transition?: Transition;
    viewport?: ViewportOptions;
  }
>;

const toTransform = (style?: MotionStyle) => {
  if (!style) {
    return "";
  }

  const transforms: string[] = [];

  if (style.x !== undefined) {
    transforms.push(`translateX(${typeof style.x === "number" ? `${style.x}px` : style.x})`);
  }
  if (style.y !== undefined) {
    transforms.push(`translateY(${typeof style.y === "number" ? `${style.y}px` : style.y})`);
  }
  if (style.scale !== undefined) {
    transforms.push(`scale(${style.scale})`);
  }
  if (style.rotate !== undefined) {
    transforms.push(`rotate(${typeof style.rotate === "number" ? `${style.rotate}deg` : style.rotate})`);
  }

  return transforms.join(" ");
};

const toCssStyle = (style?: MotionStyle): CSSProperties => {
  if (!style) {
    return {};
  }

  const { scale, x, y, rotate, ...rest } = style;
  const transform = toTransform(style);

  return {
    ...rest,
    ...(transform ? { transform } : {})
  };
};

const getTransition = (transition?: Transition) => {
  const duration = transition?.duration ?? 0.6;
  const delay = transition?.delay ?? 0;
  const ease = typeof transition?.ease === "string" ? transition.ease : "cubic-bezier(0.22, 1, 0.36, 1)";
  return `all ${duration}s ${ease} ${delay}s`;
};

export const useInView = <T extends HTMLElement>(
  ref: RefObject<T>,
  options?: ViewportOptions
) => {
  const [isInView, setIsInView] = useState(false);
  const threshold = options?.amount ?? 0.2;

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (options?.once !== false) {
            observer.disconnect();
          }
          return;
        }

        if (options?.once === false) {
          setIsInView(false);
        }
      },
      { threshold }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [options?.once, threshold, ref]);

  return isInView;
};

const MotionPrimitive = (
  {
    as = "div",
    initial,
    animate,
    whileInView,
    whileHover,
    transition,
    viewport,
    style,
    onMouseEnter,
    onMouseLeave,
    children,
    ...rest
  }: MotionProps,
  forwardedRef: ForwardedRef<HTMLElement>
) => {
  const innerRef = useRef<HTMLElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const isInView = useInView(innerRef as RefObject<HTMLElement>, viewport);

  const mergedRef = (node: HTMLElement | null) => {
    innerRef.current = node;
    if (typeof forwardedRef === "function") {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  };

  const resolvedStyle = useMemo(() => {
    const baseStyle = toCssStyle(initial);
    const animatedStyle = toCssStyle(isInView ? whileInView ?? animate : animate && !initial ? animate : undefined);
    const hoverStyle = toCssStyle(hovered ? whileHover : undefined);

    return {
      ...baseStyle,
      ...animatedStyle,
      ...hoverStyle,
      ...style,
      transition: style?.transition ?? getTransition(transition),
      willChange: "transform, opacity"
    } as CSSProperties;
  }, [animate, hovered, initial, isInView, style, transition, whileHover, whileInView]);

  return createElement(
    as,
    {
      ...rest,
      ref: mergedRef,
      style: resolvedStyle,
      onMouseEnter: (event: MouseEvent<HTMLElement>) => {
        setHovered(true);
        onMouseEnter?.(event);
      },
      onMouseLeave: (event: MouseEvent<HTMLElement>) => {
        setHovered(false);
        onMouseLeave?.(event);
      }
    },
    children
  );
};

const ForwardedMotionPrimitive = forwardRef(MotionPrimitive);

const createMotionTag = (tag: ElementType) =>
  forwardRef<HTMLElement, Omit<MotionProps, "as">>((props, ref) => (
    <ForwardedMotionPrimitive {...props} as={tag} ref={ref} />
  ));

export const motion = new Proxy(
  {},
  {
    get: (_, key: string) => createMotionTag(key as ElementType)
  }
) as Record<string, ReturnType<typeof createMotionTag>>;
