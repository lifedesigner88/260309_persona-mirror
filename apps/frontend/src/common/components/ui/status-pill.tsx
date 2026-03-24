import { cn } from "@/lib/utils";

export function StatusPill({ label, tone = "default" }: { label: string; tone?: "default" | "success" | "warn" }) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-100 text-emerald-800"
      : tone === "warn"
        ? "bg-amber-100 text-amber-800"
        : "bg-slate-100 text-slate-700";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium tracking-wide",
        toneClass
      )}
    >
      {label}
    </span>
  );
}
