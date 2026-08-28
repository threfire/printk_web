"use client";

import { useEffect, useRef, useState, type ComponentPropsWithoutRef } from "react";

type HomeRevealProps = ComponentPropsWithoutRef<"section">;

export function HomeReveal({ className = "", children, ...props }: HomeRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.58);
    }, { threshold: [0, 0.58, 1] });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <section ref={ref} {...props} className={`${className}${visible ? " is-revealed" : ""}`}>{children}</section>;
}
