import type { ReactNode } from "react";

import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components";

export function CapturePageShell({
  badge,
  title,
  description,
  children,
  footer,
}: {
  badge: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Card className="bg-white/92">
      <CardHeader>
        <Badge variant="outline">{badge}</Badge>
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
      {footer}
    </Card>
  );
}
