import { NavLink } from "react-router-dom";

import { Badge } from "@/common/components";
import { cn } from "@/lib/utils";

export function StepLink({
  to,
  title,
  done,
}: {
  to: string;
  title: string;
  done: boolean;
}) {
  return (
    <NavLink
      end
      to={to}
      className={({ isActive }) =>
        cn(
          "rounded-3xl border px-4 py-4 text-sm transition-all",
          isActive
            ? "border-primary bg-[linear-gradient(180deg,rgba(38,96,118,0.98),rgba(25,73,93,0.98))] text-primary-foreground shadow-[0_24px_48px_-36px_rgba(30,41,59,0.55)]"
            : "border-border/80 bg-card text-foreground/80 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-white"
        )
      }
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">{title}</span>
        <Badge
          className={cn(done ? "" : "bg-slate-50", "capitalize")}
          variant={done ? "success" : "outline"}
        >
          {done ? "done" : "pending"}
        </Badge>
      </div>
    </NavLink>
  );
}
