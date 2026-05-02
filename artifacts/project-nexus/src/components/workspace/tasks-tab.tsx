import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  getListTasksQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  CheckCircle2,
  Circle,
  Loader2,
  MoreVertical,
  Trash2,
  Pencil,
  ArrowUp,
  ArrowRight,
  ArrowDown,
  ClipboardList,
} from "lucide-react";
import { useListWorkspaceMembers } from "@workspace/api-client-react";

const STATUS_CONFIG = {
  todo: { label: "To Do", icon: Circle, color: "text-slate-500" },
  in_progress: { label: "In Progress", icon: Loader2, color: "text-blue-500" },
  done: { label: "Done", icon: CheckCircle2, color: "text-green-500" },
};

const PRIORITY_CONFIG = {
  high: { label: "High", icon: ArrowUp, color: "text-red-500", badge: "destructive" as const },
  medium: { label: "Medium", icon: ArrowRight, color: "text-amber-500", badge: "secondary" as const },
  low: { label: "Low", icon: ArrowDown, color: "text-slate-400", badge: "outline" as const },
};

function initials(name: string) {
  return name.split(" ").map(p => p[0]).join("").toUpperCase().slice(0, 2);
}

function TaskCard({
  task,
  onStatusChange,
  onEdit,
  onDelete,
  canEdit,
}: {
  task: any;
  onStatusChange: (id: string, status: string) => void;
  onEdit: (task: any) => void;
  onDelete: (id: string) => void;
  canEdit: boolean;
}) {
  const status = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.todo;
  const priority = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.medium;
  const StatusIcon = status.icon;
  const PriorityIcon = priority.icon;

  return (
    <div className="group flex items-start gap-3 p-4 rounded-xl bg-card border hover:border-primary/30 hover:shadow-sm transition-all">
      <button
        className={`mt-0.5 flex-shrink-0 ${status.color} hover:scale-110 transition-transform`}
        onClick={() => {
          if (!canEdit) return;
          const next = task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo";
          onStatusChange(task.id, next);
        }}
        disabled={!canEdit}
        title={`Status: ${status.label}`}
      >
        <StatusIcon className={`h-5 w-5 ${task.status === "in_progress" ? "animate-spin" : ""}`} />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
            {task.title}
          </span>
          <div className="flex items-center gap-1">
            <PriorityIcon className={`h-3.5 w-3.5 ${priority.color}`} />
            <Badge variant={priority.badge} className="text-xs px-1.5 py-0">
              {priority.label}
            </Badge>
          </div>
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{task.description}</p>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          {task.assignee && (
            <div className="flex items-center gap-1.5">
              <Avatar className="h-5 w-5">
                <AvatarImage src={task.assignee.avatarUrl ?? ""} />
                <AvatarFallback className="text-[10px]">{initials(task.assignee.name)}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">{task.assignee.name}</span>
            </div>
          )}
          {task.dueDate && (
            <span className="text-xs text-muted-foreground">
              Due {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            by {task.creator?.name ?? "Unknown"}
          </span>
        </div>
      </div>

      {canEdit && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(task)}>
              <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-destructive focus:text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

function TaskFormDialog({
  workspaceId,
  members,
  open,
  onOpenChange,
  editTask,
  onSave,
}: {
  workspaceId: string;
  members: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTask?: any;
  onSave: (data: any) => void;
}) {
  const [title, setTitle] = useState(editTask?.title ?? "");
  const [description, setDescription] = useState(editTask?.description ?? "");
  const [status, setStatus] = useState<string>(editTask?.status ?? "todo");
  const [priority, setPriority] = useState<string>(editTask?.priority ?? "medium");
  const [assigneeId, setAssigneeId] = useState<string>(editTask?.assigneeId ?? "none");
  const [dueDate, setDueDate] = useState(editTask?.dueDate ? new Date(editTask.dueDate).toISOString().split("T")[0] : "");

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      assigneeId: assigneeId === "none" ? null : assigneeId,
      dueDate: dueDate || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editTask ? "Edit Task" : "Create Task"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Title *</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title..." />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Description</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description..." rows={3} className="resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Priority</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Assign To</label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {members.map((m: any) => (
                  <SelectItem key={m.userId} value={m.userId}>{m.user?.name ?? m.userId}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Due Date</label>
            <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!title.trim()}>
            {editTask ? "Save Changes" : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TasksTab({ workspaceId, role }: { workspaceId: string; role: string }) {
  const queryClient = useQueryClient();
  const { data: tasks = [], isLoading } = useListTasks(workspaceId, {
    query: { queryKey: getListTasksQueryKey(workspaceId) },
  });
  const { data: membersData = [] } = useListWorkspaceMembers(workspaceId);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<any>(null);
  const [filter, setFilter] = useState<"all" | "todo" | "in_progress" | "done">("all");

  const canEdit = role !== "viewer";

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey(workspaceId) });

  const handleCreate = (data: any) => {
    createTask.mutate({ workspaceId, data }, { onSuccess: invalidate });
  };

  const handleUpdate = (data: any) => {
    if (!editTask) return;
    updateTask.mutate({ workspaceId, taskId: editTask.id, data }, { onSuccess: invalidate });
    setEditTask(null);
  };

  const handleStatusChange = (taskId: string, status: string) => {
    updateTask.mutate({ workspaceId, taskId, data: { status: status as any } }, { onSuccess: invalidate });
  };

  const handleDelete = (taskId: string) => {
    deleteTask.mutate({ workspaceId, taskId }, { onSuccess: invalidate });
  };

  const filtered = filter === "all" ? tasks : tasks.filter((t: any) => t.status === filter);

  const counts = {
    all: tasks.length,
    todo: tasks.filter((t: any) => t.status === "todo").length,
    in_progress: tasks.filter((t: any) => t.status === "in_progress").length,
    done: tasks.filter((t: any) => t.status === "done").length,
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Tasks</h2>
          <p className="text-sm text-muted-foreground">{counts.all} total · {counts.done} done</p>
        </div>
        {canEdit && (
          <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> New Task
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "todo", "in_progress", "done"] as const).map(f => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
            className="capitalize gap-1.5"
          >
            {f === "all" ? "All" : STATUS_CONFIG[f as keyof typeof STATUS_CONFIG].label}
            <Badge variant="secondary" className="text-xs px-1.5 py-0 min-w-[1.25rem] text-center">
              {counts[f]}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Task List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <ClipboardList className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-1">
            {filter === "all" ? "No tasks yet" : `No ${STATUS_CONFIG[filter as keyof typeof STATUS_CONFIG]?.label} tasks`}
          </h3>
          <p className="text-muted-foreground text-sm max-w-xs">
            {filter === "all" && canEdit ? "Create your first task to get started." : "Nothing here yet."}
          </p>
          {filter === "all" && canEdit && (
            <Button className="mt-4 gap-2" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Create Task
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task: any) => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={handleStatusChange}
              onEdit={setEditTask}
              onDelete={handleDelete}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <TaskFormDialog
        workspaceId={workspaceId}
        members={membersData}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSave={handleCreate}
      />

      {/* Edit Dialog */}
      {editTask && (
        <TaskFormDialog
          workspaceId={workspaceId}
          members={membersData}
          open={!!editTask}
          onOpenChange={open => { if (!open) setEditTask(null); }}
          editTask={editTask}
          onSave={handleUpdate}
        />
      )}
    </div>
  );
}
