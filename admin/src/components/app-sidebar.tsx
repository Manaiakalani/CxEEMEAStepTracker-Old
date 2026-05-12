import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Trophy,
  Activity as ActivityIcon,
  Database,
  Settings,
  Wrench,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const items = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/users", label: "Users", icon: Users },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/activity", label: "Activity", icon: ActivityIcon },
  { to: "/data", label: "Data Management", icon: Database },
  { to: "/diagnostics", label: "Diagnostics", icon: Wrench },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar() {
  return (
    <aside className="hidden md:flex md:w-60 lg:w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-2 px-5">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
          Cx
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">CxE EMEA</div>
          <div className="truncate text-xs text-muted-foreground">Step Tracker Admin</div>
        </div>
      </div>
      <Separator />
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 ease-out",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                  : "text-sidebar-foreground/80",
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>
      <Separator />
      <div className="p-3">
        <a
          href="../../"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Back to main app
        </a>
      </div>
    </aside>
  );
}
