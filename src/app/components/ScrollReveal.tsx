import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  yOffset?: number;
  threshold?: number;
}

export function ScrollReveal({
  children,
  className = '',
  delay = 0,
  yOffset = 22,
  threshold = 0.12,
}: ScrollRevealProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          setVisible(true);
          observer.unobserve(entry.target);
        });
      },
      { threshold }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold]);

  const style = {
    '--reveal-delay': `${delay}ms`,
    '--reveal-y': `${yOffset}px`,
  } as CSSProperties;

  return (
    <div ref={rootRef} style={style} className={`scroll-reveal ${visible ? 'scroll-reveal--visible' : ''} ${className}`}>
      {children}
    </div>
  );
}
