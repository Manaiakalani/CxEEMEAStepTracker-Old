import { useState } from "react";
import { Check, Loader2, X, Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listRecentActivities, listUsers, testConnection } from "@/lib/api";
import { cn } from "@/lib/utils";

type Status = "idle" | "running" | "pass" | "fail";

interface Check {
  id: string;
  label: string;
  run: () => Promise<{ ok: boolean; detail?: string }>;
}

const CHECKS: Check[] = [
  {
    id: "db",
    label: "Database connectivity",
    run: async () => {
      const r = await testConnection();
      return {
        ok: r.ok,
        detail: r.ok ? `latency ${r.latencyMs}ms` : r.error ?? "unknown error",
      };
    },
  },
  {
    id: "users",
    label: "Users table readable",
    run: async () => {
      const u = await listUsers();
      return { ok: true, detail: `${u.length} rows` };
    },
  },
  {
    id: "activities",
    label: "Activities table readable",
    run: async () => {
      const a = await listRecentActivities(5);
      return { ok: true, detail: `${a.length} rows fetched` };
    },
  },
  {
    id: "sw",
    label: "Service worker registration",
    run: async () => {
      if (!("serviceWorker" in navigator))
        return { ok: false, detail: "unsupported" };
      const regs = await navigator.serviceWorker.getRegistrations();
      return { ok: regs.length > 0, detail: `${regs.length} registration(s)` };
    },
  },
  {
    id: "storage",
    label: "localStorage writable",
    run: async () => {
      try {
        const k = `__probe__${Date.now()}`;
        localStorage.setItem(k, "1");
        localStorage.removeItem(k);
        return { ok: true };
      } catch (e: any) {
        return { ok: false, detail: e?.message };
      }
    },
  },
];

export default function Diagnostics() {
  const [results, setResults] = useState<
    Record<string, { status: Status; detail?: string }>
  >(() => Object.fromEntries(CHECKS.map((c) => [c.id, { status: "idle" }])));
  const [running, setRunning] = useState(false);

  async function runOne(c: Check) {
    setResults((r) => ({ ...r, [c.id]: { status: "running" } }));
    try {
      const res = await c.run();
      setResults((r) => ({
        ...r,
        [c.id]: { status: res.ok ? "pass" : "fail", detail: res.detail },
      }));
    } catch (e: any) {
      setResults((r) => ({
        ...r,
        [c.id]: { status: "fail", detail: e?.message ?? "error" },
      }));
    }
  }

  async function runAll() {
    setRunning(true);
    for (const c of CHECKS) await runOne(c);
    setRunning(false);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle>System diagnostics</CardTitle>
            <CardDescription>Run checks against the API, cache, and client.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={runAll} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Run all
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {CHECKS.map((c) => {
              const r = results[c.id];
              return (
                <li key={c.id} className="flex items-center gap-3 py-3">
                  <StatusIcon status={r.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{c.label}</p>
                    {r.detail ? (
                      <p className="text-xs text-muted-foreground truncate">{r.detail}</p>
                    ) : null}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => runOne(c)}
                    disabled={r.status === "running"}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Run
                  </Button>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Environment</CardTitle>
          <CardDescription>Information about the current client session.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <Row label="User agent" value={navigator.userAgent} />
          <Row label="Language" value={navigator.language} />
          <Row
            label="Online"
            value={<Badge variant={navigator.onLine ? "success" : "destructive"}>{String(navigator.onLine)}</Badge>}
          />
          <Row label="Screen" value={`${window.screen.width}×${window.screen.height}`} />
        </CardContent>
      </Card>
    </div>
  );
}

function StatusIcon({ status }: { status: Status }) {
  if (status === "running") return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (status === "pass")
    return (
      <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500/15 text-emerald-600">
        <Check className="h-3 w-3" />
      </span>
    );
  if (status === "fail")
    return (
      <span className="grid h-5 w-5 place-items-center rounded-full bg-destructive/15 text-destructive">
        <X className="h-3 w-3" />
      </span>
    );
  return <span className="h-5 w-5 rounded-full border border-dashed" />;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b pb-2 last:border-0">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={cn("text-right break-all")}>{value}</span>
    </div>
  );
}
