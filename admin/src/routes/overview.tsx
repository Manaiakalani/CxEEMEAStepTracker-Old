import { useQuery } from "@tanstack/react-query";
import {
  Users as UsersIcon,
  Footprints,
  Activity as ActivityIcon,
  Target,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { StatsCard } from "@/components/stats-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getDailyStepsSeries,
  listRecentActivities,
  listUsers,
  testConnection,
} from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";

export default function Overview() {
  const usersQ = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const activitiesQ = useQuery({
    queryKey: ["activities", 8],
    queryFn: () => listRecentActivities(8),
  });
  const seriesQ = useQuery({
    queryKey: ["steps-series", 14],
    queryFn: () => getDailyStepsSeries(14),
  });
  const healthQ = useQuery({
    queryKey: ["health"],
    queryFn: testConnection,
    refetchInterval: 60_000,
  });

  const users = usersQ.data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const totalUsers = users.length;
  const totalSteps = users.reduce((acc, u) => acc + (u.total_steps ?? 0), 0);
  const activeToday = users.filter((u) => u.last_active_date === today).length;
  const avg = totalUsers ? Math.round(totalSteps / totalUsers) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold tracking-tight">System Overview</h2>
        <div className="ml-auto flex items-center gap-2">
          {healthQ.data ? (
            healthQ.data.ok ? (
              <Badge variant="success">● Connected</Badge>
            ) : (
              <Badge variant="destructive">● Disconnected</Badge>
            )
          ) : (
            <Skeleton className="h-5 w-24" />
          )}
          {healthQ.data?.latencyMs != null ? (
            <Badge variant="outline">{healthQ.data.latencyMs} ms</Badge>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          label="Total users"
          value={totalUsers}
          icon={UsersIcon}
          loading={usersQ.isLoading}
          hint="Registered participants"
        />
        <StatsCard
          label="Total steps"
          value={totalSteps}
          icon={Footprints}
          loading={usersQ.isLoading}
          hint="All-time combined"
        />
        <StatsCard
          label="Active today"
          value={activeToday}
          icon={ActivityIcon}
          loading={usersQ.isLoading}
          hint={`On ${format(new Date(), "MMM d")}`}
        />
        <StatsCard
          label="Avg steps / user"
          value={avg}
          icon={Target}
          loading={usersQ.isLoading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Daily steps · last 14 days</CardTitle>
            <CardDescription>Aggregate steps across all users</CardDescription>
          </CardHeader>
          <CardContent>
            {seriesQ.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={(seriesQ.data ?? []).map((d) => ({
                      ...d,
                      label: format(parseISO(d.date), "MMM d"),
                    }))}
                    margin={{ top: 8, right: 12, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="steps" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) => formatNumber(Number(v))}
                      width={60}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v: number) => [formatNumber(Number(v)), "Steps"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="steps"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#steps)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest events from the tracker</CardDescription>
          </CardHeader>
          <CardContent>
            {activitiesQ.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : (activitiesQ.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ul className="space-y-3">
                {activitiesQ.data!.map((a) => (
                  <li key={String(a.id)} className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{a.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(a.timestamp), "MMM d, h:mm a")} · {a.type}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
