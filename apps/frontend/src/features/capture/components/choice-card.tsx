import { Badge } from "@/common/components";
import { cn } from "@/lib/utils";

export function ChoiceCard({
  defaultChecked,
  title,
  description,
  value,
  name,
}: {
  defaultChecked: boolean;
  title: string;
  description: string;
  value: string;
  name: string;
}) {
  return (
    <label className="block">
      <input className="peer sr-only" defaultChecked={defaultChecked} name={name} type="radio" value={value} />
      <div
        className={cn(
          "rounded-3xl border border-border/80 bg-card px-5 py-4 transition-all",
          "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_20px_48px_-32px_rgba(30,41,59,0.28)]",
          "peer-checked:border-primary peer-checked:bg-[linear-gradient(180deg,rgba(38,96,118,0.98),rgba(25,73,93,0.98))] peer-checked:text-primary-foreground"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">{title}</div>
            <div className="mt-2 text-sm leading-6 text-muted-foreground peer-checked:text-primary-foreground/80">
              {description}
            </div>
          </div>
          <Badge className="peer-checked:border-white/20 peer-checked:bg-white/10 peer-checked:text-white" variant="outline">
            option
          </Badge>
        </div>
      </div>
    </label>
  );
}
