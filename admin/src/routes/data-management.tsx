import { useQuery } from "@tanstack/react-query";
import { Download, RefreshCw, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { exportUsersToCsv, listUsers, listRecentActivities, testConnection } from "@/lib/api";
import { SUPABASE_URL } from "@/lib/supabase";

function download(filename: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export default function DataManagement() {
  const usersQ = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const healthQ = useQuery({ queryKey: ["health"], queryFn: testConnection });

  async function exportCsv() {
    const users = usersQ.data ?? (await listUsers());
    const csv = exportUsersToCsv(users);
    download(`users-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv");
    toast.success(`Exported ${users.length} users`);
  }

  async function backupJson() {
    const [users, activities] = await Promise.all([
      listUsers(),
      listRecentActivities(500),
    ]);
    const payload = {
      exported_at: new Date().toISOString(),
      users,
      activities,
    };
    download(
      `step-tracker-backup-${Date.now()}.json`,
      JSON.stringify(payload, null, 2),
      "application/json",
    );
    toast.success("Backup downloaded");
  }

  async function generateReport() {
    const users = usersQ.data ?? (await listUsers());
    const total = users.reduce((acc, u) => acc + (u.total_steps ?? 0), 0);
    const lines = [
      "CxE EMEA Step Tracker — Admin Report",
      `Generated: ${new Date().toLocaleString()}`,
      "",
      `Total users: ${users.length}`,
      `Total steps: ${total.toLocaleString()}`,
      `Average steps/user: ${users.length ? Math.round(total / users.length).toLocaleString() : 0}`,
      "",
      "Top 10 participants:",
      ...users
        .slice()
        .sort((a, b) => (b.total_steps ?? 0) - (a.total_steps ?? 0))
        .slice(0, 10)
        .map(
          (u, i) =>
            `  ${i + 1}. ${u.name} (${u.team ?? "—"}) — ${(u.total_steps ?? 0).toLocaleString()} steps`,
        ),
    ].join("\n");
    download(`report-${new Date().toISOString().slice(0, 10)}.txt`, lines);
    toast.success("Report generated");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Export</CardTitle>
          <CardDescription>Download user data and activity for analysis.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button onClick={exportCsv}>
            <Download className="h-4 w-4" />
            Export users CSV
          </Button>
          <Button variant="outline" onClick={backupJson}>
            <Download className="h-4 w-4" />
            Full backup (JSON)
          </Button>
          <Button variant="outline" onClick={generateReport}>
            <FileText className="h-4 w-4" />
            Generate report
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Database</CardTitle>
          <CardDescription>Live connection status and quick actions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="font-medium text-sm">Supabase</p>
              <p className="text-xs text-muted-foreground">{new URL(SUPABASE_URL).host}</p>
            </div>
            {healthQ.data?.ok ? (
              <Badge variant="success">Connected · {healthQ.data.latencyMs}ms</Badge>
            ) : (
              <Badge variant="destructive">Offline</Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => healthQ.refetch()}>
              <RefreshCw className="h-4 w-4" />
              Re-test connection
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Destructive operations (bulk delete, schema reset) must still be performed from the
            Supabase console for safety.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
