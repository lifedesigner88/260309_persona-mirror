import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/common/components";

export function SummaryBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,247,247,0.96))]">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm uppercase tracking-[0.16em] text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm leading-6 text-foreground/85">{children}</CardContent>
    </Card>
  );
}
