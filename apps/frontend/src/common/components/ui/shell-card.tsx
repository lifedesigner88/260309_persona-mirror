import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

export function ShellCard({
  className,
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-white/60 bg-card/95 p-6 shadow-[0_24px_80px_-36px_rgba(30,41,59,0.45)] backdrop-blur",
        className
      )}
      style={style}
    >
      {children}
    </section>
  );
}
