"use client";

import { useEffect, useRef, useState, type ComponentPropsWithoutRef } from "react";

type HomeRevealProps = ComponentPropsWithoutRef<"div">;

export function HomeReveal({ className = "", children, ...props }: HomeRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting && entry.intersectionRatio >= 0.25);
    }, { threshold: [0, 0.25, 1] });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} {...props} className={`home-reveal ${className}${visible ? " is-revealed" : ""}`}>{children}</div>;
}
