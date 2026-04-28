import { useQuery } from "@tanstack/react-query";
import { Crown, Medal, Trophy } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { listUsers } from "@/lib/api";
import { cn, formatNumber, initials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

function MedalIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown className="h-5 w-5 text-amber-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-slate-400" />;
  if (rank === 3) return <Medal className="h-5 w-5 text-amber-700" />;
  return <span className="text-xs font-semibold tabular-nums text-muted-foreground">#{rank}</span>;
}

export default function Leaderboard() {
  const { data, isLoading } = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const sorted = (data ?? [])
    .slice()
    .sort((a, b) => (b.total_steps ?? 0) - (a.total_steps ?? 0));
  const max = sorted[0]?.total_steps ?? 1;

  // Team aggregation
  const teams = new Map<string, { total: number; count: number }>();
  for (const u of sorted) {
    const key = u.team || "— No team";
    const t = teams.get(key) ?? { total: 0, count: 0 };
    t.total += u.total_steps ?? 0;
    t.count += 1;
    teams.set(key, t);
  }
  const teamList = Array.from(teams.entries())
    .map(([team, v]) => ({ team, ...v }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Individual rankings
          </CardTitle>
          <CardDescription>All participants sorted by total steps</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No users yet.</p>
          ) : (
            <ol className="space-y-2">
              {sorted.map((u, idx) => {
                const rank = idx + 1;
                const pct = Math.max(3, Math.round(((u.total_steps ?? 0) / Math.max(1, max)) * 100));
                return (
                  <li
                    key={u.id}
                    className={cn(
                      "relative overflow-hidden rounded-lg border bg-card p-3 flex items-center gap-3 transition-all duration-200",
                      rank <= 3 && "shadow-sm",
                    )}
                  >
                    <div
                      className="absolute inset-y-0 left-0 bg-primary/8"
                      style={{ width: `${pct}%` }}
                      aria-hidden
                    />
                    <div className="relative flex w-8 justify-center">
                      <MedalIcon rank={rank} />
                    </div>
                    <Avatar className="relative">
                      <AvatarFallback>{initials(u.name)}</AvatarFallback>
                    </Avatar>
                    <div className="relative flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{u.name}</p>
                        {u.team ? (
                          <Badge variant="secondary" className="shrink-0">
                            {u.team}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Goal {formatNumber(u.daily_goal ?? 0)}/day
                      </p>
                    </div>
                    <div className="relative text-right">
                      <p className="text-lg font-semibold tabular-nums">
                        {formatNumber(u.total_steps ?? 0)}
                      </p>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        steps
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team standings</CardTitle>
          <CardDescription>By total steps across all members</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : teamList.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No teams yet.</p>
          ) : (
            <ol className="space-y-2">
              {teamList.map((t, idx) => (
                <li
                  key={t.team}
                  className="flex items-center gap-3 rounded-md border p-3 transition-colors hover:bg-accent/40"
                >
                  <MedalIcon rank={idx + 1} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{t.team}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.count} member{t.count === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="text-right tabular-nums">
                    <p className="font-semibold">{formatNumber(t.total)}</p>
                    <p className="text-[10px] uppercase text-muted-foreground">steps</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
