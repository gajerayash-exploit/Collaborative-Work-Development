import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Circle, Loader2, CheckCircle2,
  ArrowUp, ArrowRight, ArrowDown,
  MoreVertical, Pencil, Trash2, Plus,
  GripVertical,
} from "lucide-react";

const STATUS_CONFIG = {
  todo: {
    label: "To Do",
    icon: Circle,
    color: "text-slate-500",
    bg: "bg-slate-50 dark:bg-slate-900/40",
    border: "border-slate-200 dark:border-slate-700",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    dot: "bg-slate-400",
  },
  in_progress: {
    label: "In Progress",
    icon: Loader2,
    color: "text-blue-500",
    bg: "bg-blue-50/50 dark:bg-blue-950/20",
    border: "border-blue-200 dark:border-blue-800",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  done: {
    label: "Done",
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-50/50 dark:bg-emerald-950/20",
    border: "border-emerald-200 dark:border-emerald-800",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
};

const PRIORITY_CONFIG = {
  high: { label: "High", icon: ArrowUp, color: "text-red-500", badge: "destructive" as const },
  medium: { label: "Medium", icon: ArrowRight, color: "text-amber-500", badge: "secondary" as const },
  low: { label: "Low", icon: ArrowDown, color: "text-slate-400", badge: "outline" as const },
};

function initials(name: string) {
  return name.split(" ").map((p: string) => p[0]).join("").toUpperCase().slice(0, 2);
}

function KanbanCard({
  task,
  onEdit,
  onDelete,
  canEdit,
  isDragging = false,
}: {
  task: any;
  onEdit: (task: any) => void;
  onDelete: (id: string) => void;
  canEdit: boolean;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
    disabled: !canEdit,
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const priority = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG] ?? PRIORITY_CONFIG.medium;
  const PriorityIcon = priority.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group bg-card border rounded-xl p-3.5 shadow-sm transition-all select-none
        ${isDragging ? "opacity-50" : ""}
        ${canEdit ? "cursor-grab active:cursor-grabbing hover:shadow-md hover:border-primary/30" : ""}
      `}
    >
      <div className="flex items-start gap-2">
        {canEdit && (
          <button
            {...listeners}
            {...attributes}
            className="mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-40 hover:!opacity-70 text-muted-foreground transition-opacity"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className={`text-sm font-medium leading-snug ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>
              {task.title}
            </span>

            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity -mt-0.5 -mr-1"
                    onPointerDown={e => e.stopPropagation()}
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(task)}>
                    <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(task.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground mb-2.5 leading-relaxed line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <PriorityIcon className={`h-3 w-3 ${priority.color}`} />
              <Badge variant={priority.badge} className="text-[10px] px-1.5 py-0 h-4">
                {priority.label}
              </Badge>
              {task.dueDate && task.status !== "done" && new Date(task.dueDate) < new Date() && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
                  Overdue
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {task.dueDate && (
                <span className={`text-[10px] flex items-center gap-0.5 ${
                  task.status !== "done" && new Date(task.dueDate) < new Date()
                    ? "text-destructive font-medium"
                    : "text-muted-foreground"
                }`}>
                  {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
              {task.assignee && (
                <Avatar className="h-5 w-5 border">
                  <AvatarImage src={task.assignee.avatarUrl ?? ""} />
                  <AvatarFallback className="text-[9px]">{initials(task.assignee.name)}</AvatarFallback>
                </Avatar>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({
  status,
  tasks,
  onEdit,
  onDelete,
  onAddTask,
  canEdit,
  activeId,
}: {
  status: keyof typeof STATUS_CONFIG;
  tasks: any[];
  onEdit: (task: any) => void;
  onDelete: (id: string) => void;
  onAddTask: (status: string) => void;
  canEdit: boolean;
  activeId: string | null;
}) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex flex-col min-w-0 flex-1">
      {/* Column header */}
      <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl border-x border-t ${config.border} ${config.bg}`}>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${config.dot}`} />
          <span className="text-sm font-semibold">{config.label}</span>
          <span className={`text-xs font-medium px-1.5 py-0 rounded-full ${config.badge}`}>
            {tasks.length}
          </span>
        </div>
        {canEdit && (
          <button
            onClick={() => onAddTask(status)}
            className="opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
            title={`Add ${config.label} task`}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`flex-1 flex flex-col gap-2 p-2 rounded-b-xl border-x border-b min-h-[200px] transition-colors
          ${config.border}
          ${isOver ? `${config.bg} ring-2 ring-inset ring-primary/20` : "bg-muted/20"}
        `}
      >
        {tasks.map(task => (
          <KanbanCard
            key={task.id}
            task={task}
            onEdit={onEdit}
            onDelete={onDelete}
            canEdit={canEdit}
            isDragging={activeId === task.id}
          />
        ))}

        {tasks.length === 0 && !isOver && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-muted-foreground/50 select-none">Drop here</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function KanbanBoard({
  tasks,
  canEdit,
  onStatusChange,
  onEdit,
  onDelete,
  onAddTask,
}: {
  tasks: any[];
  canEdit: boolean;
  onStatusChange: (taskId: string, status: string) => void;
  onEdit: (task: any) => void;
  onDelete: (id: string) => void;
  onAddTask: (status: string) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeTask = tasks.find(t => t.id === activeId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const columns: (keyof typeof STATUS_CONFIG)[] = ["todo", "in_progress", "done"];

  const byStatus = (status: string) => tasks.filter(t => t.status === status);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const newStatus = over.id as string;
    const task = tasks.find(t => t.id === active.id);
    if (task && task.status !== newStatus && columns.includes(newStatus as any)) {
      onStatusChange(task.id, newStatus);
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="group flex gap-4 overflow-x-auto pb-4 min-h-[60vh]">
        {columns.map(status => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={byStatus(status)}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddTask={onAddTask}
            canEdit={canEdit}
            activeId={activeId}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
        {activeTask ? (
          <div className="rotate-1 scale-105 opacity-95 shadow-2xl">
            <KanbanCard
              task={activeTask}
              onEdit={() => {}}
              onDelete={() => {}}
              canEdit={false}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
