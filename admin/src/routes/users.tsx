import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { createUser, deleteUser, listUsers, updateUser, type StepUser } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

const createSchema = z.object({
  name: z.string().min(1, "Required"),
  team: z.string().min(1, "Required"),
  dailyGoal: z.coerce.number().int().min(100).max(200000).default(10000),
});
type CreateForm = z.infer<typeof createSchema>;

const editSchema = z.object({
  name: z.string().min(1),
  team: z.string().min(1),
  daily_goal: z.coerce.number().int().min(100).max(200000),
  total_steps: z.coerce.number().int().min(0),
});
type EditForm = z.infer<typeof editSchema>;

export default function Users() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StepUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StepUser | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = data ?? [];
    if (!q) return list;
    return list.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.team?.toLowerCase().includes(q) ||
        u.id?.toLowerCase().includes(q),
    );
  }, [search, data]);

  const createForm = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", team: "", dailyGoal: 10000 },
  });

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: "", team: "", daily_goal: 10000, total_steps: 0 },
  });

  const createMut = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      toast.success("User added");
      setAddOpen(false);
      createForm.reset({ name: "", team: "", dailyGoal: 10000 });
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to add user"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<StepUser> }) =>
      updateUser(id, updates),
    onSuccess: () => {
      toast.success("User updated");
      setEditTarget(null);
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to update"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      toast.success("User deleted");
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to delete"),
  });

  function openEdit(u: StepUser) {
    editForm.reset({
      name: u.name ?? "",
      team: u.team ?? "",
      daily_goal: u.daily_goal ?? 10000,
      total_steps: u.total_steps ?? 0,
    });
    setEditTarget(u);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Users</CardTitle>
            <CardDescription>
              {isLoading ? "Loading…" : `${filtered.length} of ${data?.length ?? 0} users`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, team, id…"
                className="pl-8 w-56"
              />
            </div>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Add user
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {search ? "No users match your search." : "No users yet."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-right">Total steps</TableHead>
                  <TableHead className="text-right">Goal</TableHead>
                  <TableHead>Last active</TableHead>
                  <TableHead className="w-[140px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{u.name}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {u.id.slice(0, 8)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.team ? <Badge variant="secondary">{u.team}</Badge> : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(u.total_steps ?? 0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(u.daily_goal ?? 0)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.last_active_date ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(u)} aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(u)}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add new user</DialogTitle>
            <DialogDescription>Register a participant in the step tracker.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={createForm.handleSubmit((v) =>
              createMut.mutate({ name: v.name, team: v.team, dailyGoal: v.dailyGoal }),
            )}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input {...createForm.register("name")} placeholder="Jane Doe" />
              {createForm.formState.errors.name ? (
                <p className="text-xs text-destructive">{createForm.formState.errors.name.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>Team</Label>
              <Input {...createForm.register("team")} placeholder="Team Alpha" />
              {createForm.formState.errors.team ? (
                <p className="text-xs text-destructive">{createForm.formState.errors.team.message}</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>Daily goal</Label>
              <Input type="number" {...createForm.register("dailyGoal")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Add user
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(v) => !v && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>Update profile, goal, or total steps.</DialogDescription>
          </DialogHeader>
          {editTarget ? (
            <form
              onSubmit={editForm.handleSubmit((v) =>
                updateMut.mutate({ id: editTarget.id, updates: v }),
              )}
              className="space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input {...editForm.register("name")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Team</Label>
                  <Input {...editForm.register("team")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Daily goal</Label>
                  <Input type="number" {...editForm.register("daily_goal")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Total steps</Label>
                  <Input type="number" {...editForm.register("total_steps")} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMut.isPending}>
                  {updateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the user and all of their steps & activities. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) deleteMut.mutate(deleteTarget.id);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
