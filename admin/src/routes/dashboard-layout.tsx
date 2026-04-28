import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Trophy,
  Activity as ActivityIcon,
  Database,
  Settings,
  Wrench,
  LogOut,
  Menu,
} from "lucide-react";
import { AppSidebar } from "@/components/app-sidebar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { clearSession, getSessionUser } from "@/lib/auth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, initials } from "@/lib/utils";

const mobileItems = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/users", label: "Users", icon: Users },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/activity", label: "Activity", icon: ActivityIcon },
  { to: "/data", label: "Data", icon: Database },
  { to: "/diagnostics", label: "Diagnostics", icon: Wrench },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout() {
  const nav = useNavigate();
  const loc = useLocation();
  const user = getSessionUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  function logout() {
    clearSession();
    nav("/login", { replace: true });
  }

  const title =
    {
      "/": "Overview",
      "/users": "Users",
      "/leaderboard": "Leaderboard",
      "/activity": "Activity Feed",
      "/data": "Data Management",
      "/diagnostics": "Diagnostics",
      "/settings": "Settings",
    }[loc.pathname] ?? "Admin";

  return (
    <div className="flex h-full min-h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/80 backdrop-blur px-4 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link to="/settings" className="hidden sm:flex items-center gap-2">
              <Avatar>
                <AvatarFallback>{initials(user?.full_name || user?.username)}</AvatarFallback>
              </Avatar>
              <div className="hidden lg:block text-xs">
                <div className="font-medium">{user?.full_name || user?.username || "Admin"}</div>
                <div className="text-muted-foreground">{user?.role || "admin"}</div>
              </div>
            </Link>
            <Button variant="ghost" size="icon" onClick={logout} aria-label="Log out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {mobileOpen ? (
          <nav className="md:hidden border-b bg-background">
            <div className="grid grid-cols-2 gap-1 p-2">
              {mobileItems.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/60",
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
            </div>
          </nav>
        ) : null}

        <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8 fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
