import { useNavigate } from "react-router-dom";
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
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/hooks/use-theme";
import { clearSession, getSessionUser } from "@/lib/auth";

const THEMES = ["light", "dark", "system"] as const;

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const user = getSessionUser();
  const nav = useNavigate();

  async function clearCaches() {
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      toast.success("Caches cleared");
    } catch {
      toast.error("Could not clear caches");
    }
  }

  async function unregisterSW() {
    if (!("serviceWorker" in navigator)) {
      toast.message("Service workers unsupported");
      return;
    }
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
    toast.success(`Unregistered ${regs.length} service worker(s)`);
  }

  function logout() {
    clearSession();
    nav("/login", { replace: true });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your current admin session.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Username" value={user?.username ?? "—"} />
          <Row label="Full name" value={user?.full_name ?? "—"} />
          <Row label="Role" value={<Badge variant="secondary">{user?.role ?? "admin"}</Badge>} />
          <Separator className="my-2" />
          <Button variant="outline" onClick={logout}>Sign out</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Theme preference is stored locally.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {THEMES.map((t) => (
            <Button
              key={t}
              variant={theme === t ? "default" : "outline"}
              onClick={() => setTheme(t)}
              className="capitalize"
            >
              {t}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Cache & service worker</CardTitle>
          <CardDescription>
            Force-refresh cached assets if users report stale content.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={clearCaches}>Clear app caches</Button>
          <Button variant="outline" onClick={unregisterSW}>Unregister service workers</Button>
          <Button variant="outline" onClick={() => location.reload()}>Reload app</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
