import { supabase, TABLES } from "./supabase";

export interface AdminUser {
  id: string;
  username: string;
  full_name?: string | null;
  role?: string | null;
  is_active?: boolean | null;
}

export interface StepUser {
  id: string;
  name: string;
  team?: string | null;
  daily_goal?: number | null;
  total_steps?: number | null;
  joined_date?: string | null;
  last_active_date?: string | null;
  daily_overachiever_notified?: boolean | null;
  updated_at?: string | null;
}

export interface Activity {
  id: number | string;
  type: string;
  description: string;
  timestamp: string;
  user_id?: string | null;
}

export interface DailyStep {
  user_id: string;
  date: string;
  steps: number;
  updated_at?: string | null;
}

export async function authenticateAdmin(username: string, password: string) {
  if (!username || !password) {
    return { success: false as const, error: "Username and password required" };
  }
  const { data, error } = await supabase.rpc("verify_admin_credentials", {
    input_username: username,
    input_password: password,
  });
  if (error) {
    return { success: false as const, error: error.message || "Authentication error" };
  }
  if (!data || data.length === 0) {
    return { success: false as const, error: "Invalid credentials" };
  }
  const admin = data[0];
  return {
    success: true as const,
    user: {
      id: admin.admin_id,
      username: admin.username,
      full_name: admin.full_name,
      role: admin.role,
      is_active: admin.is_active,
    } as AdminUser,
  };
}

export async function listUsers(): Promise<StepUser[]> {
  const { data, error } = await supabase
    .from(TABLES.USERS)
    .select("*")
    .order("total_steps", { ascending: false });
  if (error) throw error;
  return (data ?? []) as StepUser[];
}

export async function createUser(input: {
  name: string;
  team: string;
  dailyGoal?: number;
}): Promise<StepUser> {
  const id = crypto.randomUUID();
  const userData = {
    id,
    name: input.name,
    team: input.team,
    daily_goal: input.dailyGoal ?? 10000,
    joined_date: new Date().toISOString().slice(0, 10),
    total_steps: 0,
    last_active_date: null,
    daily_overachiever_notified: false,
  };
  const { data, error } = await supabase
    .from(TABLES.USERS)
    .insert([userData])
    .select();
  if (error) throw error;
  try {
    await supabase.from(TABLES.ACTIVITIES).insert([
      {
        type: "user",
        description: `${input.name} joined the step tracker challenge!`,
        timestamp: new Date().toISOString(),
      },
    ]);
  } catch {
    /* non-fatal */
  }
  return data![0] as StepUser;
}

export async function updateUser(
  id: string,
  updates: Partial<StepUser>,
): Promise<StepUser> {
  const { data, error } = await supabase
    .from(TABLES.USERS)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select();
  if (error) throw error;
  return data![0] as StepUser;
}

export async function deleteUser(id: string): Promise<void> {
  await supabase.from(TABLES.STEPS).delete().eq("user_id", id);
  await supabase.from(TABLES.ACTIVITIES).delete().eq("user_id", id);
  const { error } = await supabase.from(TABLES.USERS).delete().eq("id", id);
  if (error) throw error;
}

export async function listRecentActivities(limit = 50): Promise<Activity[]> {
  const { data, error } = await supabase
    .from(TABLES.ACTIVITIES)
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Activity[];
}

export async function testConnection(): Promise<{
  ok: boolean;
  error?: string;
  latencyMs?: number;
}> {
  const start = performance.now();
  const { error } = await supabase
    .from(TABLES.USERS)
    .select("id", { count: "exact", head: true });
  const latencyMs = Math.round(performance.now() - start);
  if (error) return { ok: false, error: error.message, latencyMs };
  return { ok: true, latencyMs };
}

export async function setUserTotalSteps(id: string, total: number) {
  const { data, error } = await supabase
    .from(TABLES.USERS)
    .update({ total_steps: total, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select();
  if (error) throw error;
  return data![0] as StepUser;
}

export async function getDailyStepsSeries(
  days = 14,
): Promise<{ date: string; steps: number }[]> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  const sinceStr = since.toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from(TABLES.STEPS)
    .select("date, steps")
    .gte("date", sinceStr);
  if (error) throw error;
  const map = new Map<string, number>();
  for (const row of data ?? []) {
    const d = row.date as string;
    map.set(d, (map.get(d) ?? 0) + (row.steps ?? 0));
  }
  const out: { date: string; steps: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, steps: map.get(key) ?? 0 });
  }
  return out;
}

export function exportUsersToCsv(users: StepUser[]): string {
  const cols: (keyof StepUser)[] = [
    "id",
    "name",
    "team",
    "daily_goal",
    "total_steps",
    "joined_date",
    "last_active_date",
  ];
  const header = cols.join(",");
  const rows = users.map((u) =>
    cols
      .map((c) => {
        const v = u[c];
        if (v == null) return "";
        const s = String(v).split('"').join('""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      })
      .join(","),
  );
  return [header, ...rows].join("\n");
}
