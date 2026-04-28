import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatNumber } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: number | string | null | undefined;
  icon?: LucideIcon;
  hint?: string;
  loading?: boolean;
  trend?: { value: number; label?: string } | null;
  className?: string;
}

export function StatsCard({ label, value, icon: Icon, hint, loading, trend, className }: Props) {
  const display =
    typeof value === "number" ? formatNumber(value) : value ?? "—";
  return (
    <Card className={cn("overflow-hidden transition-all duration-200 hover:shadow-md", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-3xl font-semibold tracking-tight tabular-nums">{display}</div>
        )}
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        {trend ? (
          <p
            className={cn(
              "mt-2 text-xs font-medium",
              trend.value >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600",
            )}
          >
            {trend.value >= 0 ? "▲" : "▼"} {Math.abs(trend.value).toFixed(1)}%{" "}
            {trend.label ?? ""}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
