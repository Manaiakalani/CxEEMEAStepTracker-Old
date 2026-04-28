import { createHashRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "@/routes/login";
import DashboardLayout from "@/routes/dashboard-layout";
import Overview from "@/routes/overview";
import Users from "@/routes/users";
import Leaderboard from "@/routes/leaderboard";
import Activity from "@/routes/activity";
import DataManagement from "@/routes/data-management";
import Diagnostics from "@/routes/diagnostics";
import Settings from "@/routes/settings";
import { RequireAuth } from "@/routes/require-auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const router = createHashRouter([
  { path: "/login", element: <Login /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: "/", element: <Overview /> },
          { path: "/users", element: <Users /> },
          { path: "/leaderboard", element: <Leaderboard /> },
          { path: "/activity", element: <Activity /> },
          { path: "/data", element: <DataManagement /> },
          { path: "/diagnostics", element: <Diagnostics /> },
          { path: "/settings", element: <Settings /> },
        ],
      },
    ],
  },
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={250}>
        <RouterProvider router={router} />
        <Toaster richColors closeButton position="top-right" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
