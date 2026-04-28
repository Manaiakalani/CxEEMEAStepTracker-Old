import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { authenticateAdmin } from "@/lib/api";
import { getSessionUser, saveSession } from "@/lib/auth";

export default function Login() {
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getSessionUser()) nav("/", { replace: true });
  }, [nav]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Please enter username and password");
      return;
    }
    setLoading(true);
    try {
      const res = await authenticateAdmin(username.trim(), password);
      if (!res.success) {
        toast.error(res.error || "Invalid credentials");
        return;
      }
      saveSession({
        id: res.user.id,
        username: res.user.username,
        full_name: res.user.full_name ?? null,
        role: res.user.role ?? "admin",
      });
      toast.success("Welcome back");
      nav("/", { replace: true });
    } catch (err) {
      console.error(err);
      toast.error("Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center px-4 bg-gradient-to-br from-primary/15 via-background to-background">
      <div
        className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-xl fade-in"
        style={{ transformOrigin: "center" }}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin Access</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to the CxE EMEA Step Tracker admin console
          </p>
        </div>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="username">Admin username</Label>
            <Input
              id="username"
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="cxeadmin"
              disabled={loading}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Authenticating…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
        <div className="mt-6 text-center text-xs text-muted-foreground">
          <a href="/" className="hover:text-foreground transition-colors">
            ← Back to Step Tracker
          </a>
        </div>
      </div>
    </div>
  );
}
