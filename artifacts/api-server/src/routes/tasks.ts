import { Router, type IRouter } from "express";
import { db, tasksTable, usersTable, workspaceMembersTable, notificationsTable } from "@workspace/db";
import { eq, and, lt, ne, isNotNull } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { recordActivity } from "../lib/recordActivity";

const router: IRouter = Router();

async function createAssignmentNotification(opts: {
  workspaceId: string;
  assigneeId: string;
  taskId: string;
  taskTitle: string;
  assignerName: string;
}) {
  await db.insert(notificationsTable).values({
    userId: opts.assigneeId,
    workspaceId: opts.workspaceId,
    type: "task_assigned",
    title: `New task assigned`,
    body: `${opts.assignerName} assigned you to "${opts.taskTitle}"`,
  });
}

router.get("/workspaces/:workspaceId/tasks", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { workspaceId } = req.params;
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0]) { res.status(403).json({ error: "Access denied" }); return; }

    const tasks = await db.select({
      id: tasksTable.id,
      workspaceId: tasksTable.workspaceId,
      title: tasksTable.title,
      description: tasksTable.description,
      status: tasksTable.status,
      priority: tasksTable.priority,
      assigneeId: tasksTable.assigneeId,
      createdBy: tasksTable.createdBy,
      dueDate: tasksTable.dueDate,
      createdAt: tasksTable.createdAt,
      updatedAt: tasksTable.updatedAt,
    }).from(tasksTable).where(eq(tasksTable.workspaceId, workspaceId));

    const memberUsers = await db.select({
      id: usersTable.id,
      name: usersTable.name,
      avatarUrl: usersTable.avatarUrl,
      email: usersTable.email,
    })
      .from(workspaceMembersTable)
      .innerJoin(usersTable, eq(workspaceMembersTable.userId, usersTable.id))
      .where(eq(workspaceMembersTable.workspaceId, workspaceId));

    const userMap = Object.fromEntries(memberUsers.map(u => [u.id, u]));

    res.json(tasks.map(t => ({
      ...t,
      assignee: t.assigneeId ? (userMap[t.assigneeId] ?? null) : null,
      creator: userMap[t.createdBy] ?? null,
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to list tasks");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/workspaces/:workspaceId/tasks", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { workspaceId } = req.params;
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0] || membership[0].role === "viewer") { res.status(403).json({ error: "Viewers cannot create tasks" }); return; }

    const { title, description, status = "todo", priority = "medium", assigneeId, dueDate } = req.body;
    if (!title?.trim()) { res.status(400).json({ error: "Title is required" }); return; }

    const [task] = await db.insert(tasksTable).values({
      workspaceId,
      title: title.trim(),
      description: description ?? null,
      status,
      priority,
      assigneeId: assigneeId ?? null,
      createdBy: user[0].id,
      dueDate: dueDate ? new Date(dueDate) : null,
    }).returning();

    let assignee = null;
    if (task.assigneeId) {
      const a = await db.select({ id: usersTable.id, name: usersTable.name, avatarUrl: usersTable.avatarUrl, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, task.assigneeId)).limit(1);
      assignee = a[0] ?? null;
    }

    res.status(201).json({ ...task, assignee, creator: { id: user[0].id, name: user[0].name, avatarUrl: user[0].avatarUrl, email: user[0].email } });

    recordActivity({ workspaceId, userId: user[0].id, type: "task_created", payload: { taskId: task.id, taskTitle: task.title, status: task.status } }).catch(() => {});

    if (task.assigneeId && task.assigneeId !== user[0].id) {
      createAssignmentNotification({
        workspaceId,
        assigneeId: task.assigneeId,
        taskId: task.id,
        taskTitle: task.title,
        assignerName: user[0].name,
      }).catch(() => {});
    }
  } catch (err) {
    req.log.error({ err }, "Failed to create task");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/workspaces/:workspaceId/tasks/:taskId", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { workspaceId, taskId } = req.params;
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0] || membership[0].role === "viewer") { res.status(403).json({ error: "Viewers cannot update tasks" }); return; }

    const { title, description, status, priority, assigneeId, dueDate } = req.body;

    const existing = await db.select().from(tasksTable).where(and(eq(tasksTable.id, taskId), eq(tasksTable.workspaceId, workspaceId))).limit(1);
    if (!existing[0]) { res.status(404).json({ error: "Task not found" }); return; }
    const before = existing[0];

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (assigneeId !== undefined) updateData.assigneeId = assigneeId;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

    const [updated] = await db.update(tasksTable)
      .set(updateData)
      .where(and(eq(tasksTable.id, taskId), eq(tasksTable.workspaceId, workspaceId)))
      .returning();

    if (!updated) { res.status(404).json({ error: "Task not found" }); return; }

    let assignee = null;
    if (updated.assigneeId) {
      const a = await db.select({ id: usersTable.id, name: usersTable.name, avatarUrl: usersTable.avatarUrl, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, updated.assigneeId)).limit(1);
      assignee = a[0] ?? null;
    }
    const creator = await db.select({ id: usersTable.id, name: usersTable.name, avatarUrl: usersTable.avatarUrl, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, updated.createdBy)).limit(1);

    res.json({ ...updated, assignee, creator: creator[0] ?? null });

    if (status !== undefined && status !== before.status) {
      recordActivity({ workspaceId, userId: user[0].id, type: "task_status_changed", payload: { taskId: updated.id, taskTitle: updated.title, oldStatus: before.status, newStatus: status } }).catch(() => {});
    }
    if (priority !== undefined && priority !== before.priority) {
      recordActivity({ workspaceId, userId: user[0].id, type: "task_priority_changed", payload: { taskId: updated.id, taskTitle: updated.title, oldPriority: before.priority, newPriority: priority } }).catch(() => {});
    }
    if (assigneeId !== undefined && assigneeId !== before.assigneeId && assigneeId && assignee) {
      recordActivity({ workspaceId, userId: user[0].id, type: "task_assigned", payload: { taskId: updated.id, taskTitle: updated.title, assigneeName: assignee.name } }).catch(() => {});
      if (assigneeId !== user[0].id) {
        createAssignmentNotification({
          workspaceId,
          assigneeId,
          taskId: updated.id,
          taskTitle: updated.title,
          assignerName: user[0].name,
        }).catch(() => {});
      }
    }
  } catch (err) {
    req.log.error({ err }, "Failed to update task");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/workspaces/:workspaceId/tasks/:taskId", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { workspaceId, taskId } = req.params;
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0] || membership[0].role === "viewer") { res.status(403).json({ error: "Viewers cannot delete tasks" }); return; }

    const task = await db.select().from(tasksTable).where(and(eq(tasksTable.id, taskId), eq(tasksTable.workspaceId, workspaceId))).limit(1);
    if (!task[0]) { res.status(404).json({ error: "Task not found" }); return; }

    if (task[0].createdBy !== user[0].id && membership[0].role !== "admin") {
      res.status(403).json({ error: "Only admins or the task creator can delete tasks" }); return;
    }

    await db.delete(tasksTable).where(eq(tasksTable.id, taskId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete task");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/workspaces/:workspaceId/tasks/check-overdue", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { workspaceId } = req.params;
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0]) { res.status(403).json({ error: "Access denied" }); return; }

    const now = new Date();

    const overdueTasks = await db.select({
      id: tasksTable.id,
      title: tasksTable.title,
      dueDate: tasksTable.dueDate,
    })
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.workspaceId, workspaceId),
          eq(tasksTable.assigneeId, user[0].id),
          isNotNull(tasksTable.dueDate),
          lt(tasksTable.dueDate, now),
          ne(tasksTable.status, "done"),
        )
      );

    const existingOverdue = await db.select({ body: notificationsTable.body })
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.userId, user[0].id),
          eq(notificationsTable.workspaceId, workspaceId),
          eq(notificationsTable.type, "task_overdue"),
          eq(notificationsTable.isRead, false),
        )
      );

    const alreadyNotified = new Set(
      existingOverdue.map(n => {
        const match = n.body.match(/\[([^\]]+)\]/);
        return match ? match[1] : null;
      }).filter(Boolean)
    );

    let created = 0;
    for (const task of overdueTasks) {
      if (alreadyNotified.has(task.id)) continue;
      const dueStr = task.dueDate
        ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : "unknown";
      await db.insert(notificationsTable).values({
        userId: user[0].id,
        workspaceId,
        type: "task_overdue",
        title: "Task overdue",
        body: `[${task.id}] "${task.title}" was due on ${dueStr}`,
      });
      created++;
    }

    res.json({ checked: overdueTasks.length, created });
  } catch (err) {
    req.log.error({ err }, "Failed to check overdue tasks");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
