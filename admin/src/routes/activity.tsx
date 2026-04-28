import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { User, Footprints, Trophy, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { listRecentActivities } from "@/lib/api";

const ICONS: Record<string, LucideIcon> = {
  user: User,
  step: Footprints,
  milestone: Trophy,
  achievement: Sparkles,
};

function iconFor(type: string) {
  return ICONS[type.toLowerCase()] ?? Sparkles;
}

export default function Activity() {
  const { data, isLoading } = useQuery({
    queryKey: ["activities", 100],
    queryFn: () => listRecentActivities(100),
    refetchInterval: 30_000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>Live feed of events — refreshes every 30 seconds</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-12 text-center">No activity recorded.</p>
        ) : (
          <ul className="space-y-2">
            {data.map((a) => {
              const Icon = iconFor(a.type);
              return (
                <li
                  key={String(a.id)}
                  className="flex items-start gap-3 rounded-md border p-3 transition-colors hover:bg-accent/40"
                >
                  <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{a.description}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px] uppercase">{a.type}</Badge>
                      <span>{format(new Date(a.timestamp), "PP · p")}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
