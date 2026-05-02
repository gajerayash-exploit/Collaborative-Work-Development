import { Router, type IRouter } from "express";
import { db, tasksTable, usersTable, workspaceMembersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { subDays, format, startOfDay, endOfDay, formatISO } from "date-fns";

const router: IRouter = Router();

router.get("/workspaces/:workspaceId/analytics/burndown", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { workspaceId } = req.params;
    const days = Math.min(parseInt((req.query.days as string) ?? "30", 10), 90);

    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0]) { res.status(403).json({ error: "Access denied" }); return; }

    const tasks = await db.select({
      id: tasksTable.id,
      status: tasksTable.status,
      priority: tasksTable.priority,
      createdAt: tasksTable.createdAt,
      updatedAt: tasksTable.updatedAt,
    }).from(tasksTable).where(eq(tasksTable.workspaceId, workspaceId));

    const today = new Date();
    const dailyData: Array<{ date: string; created: number; completed: number; cumCreated: number; cumCompleted: number }> = [];
    let cumCreated = 0;
    let cumCompleted = 0;

    for (let i = days - 1; i >= 0; i--) {
      const day = subDays(today, i);
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      const dateStr = format(day, "MMM d");

      const created = tasks.filter(t => {
        const d = new Date(t.createdAt);
        return d >= dayStart && d <= dayEnd;
      }).length;

      const completed = tasks.filter(t => {
        const d = new Date(t.updatedAt);
        return t.status === "done" && d >= dayStart && d <= dayEnd;
      }).length;

      cumCreated += created;
      cumCompleted += completed;
      dailyData.push({ date: dateStr, created, completed, cumCreated, cumCompleted });
    }

    const total = tasks.length;
    const done = tasks.filter(t => t.status === "done").length;
    const inProgress = tasks.filter(t => t.status === "in_progress").length;
    const todo = tasks.filter(t => t.status === "todo").length;
    const highPriority = tasks.filter(t => t.priority === "high").length;
    const mediumPriority = tasks.filter(t => t.priority === "medium").length;
    const lowPriority = tasks.filter(t => t.priority === "low").length;

    const sevenDaysAgo = subDays(today, 7);
    const recentCompleted = tasks.filter(t => {
      const d = new Date(t.updatedAt);
      return t.status === "done" && d >= sevenDaysAgo;
    }).length;
    const velocity = parseFloat((recentCompleted / 7).toFixed(2));

    res.json({
      dailyData,
      summary: { total, done, inProgress, todo, completionRate: total > 0 ? Math.round((done / total) * 100) : 0 },
      velocity,
      priorityBreakdown: { high: highPriority, medium: mediumPriority, low: lowPriority },
    });
    return;
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
    return;
  }
});

router.get("/workspaces/:workspaceId/analytics/leaderboard", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { workspaceId } = req.params;

    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0]) { res.status(403).json({ error: "Access denied" }); return; }

    // Get all members with their user info
    const members = await db.select({
      userId: workspaceMembersTable.userId,
      role: workspaceMembersTable.role,
      name: usersTable.name,
      email: usersTable.email,
    })
      .from(workspaceMembersTable)
      .innerJoin(usersTable, eq(workspaceMembersTable.userId, usersTable.id))
      .where(eq(workspaceMembersTable.workspaceId, workspaceId));

    // Get all tasks with assignee
    const tasks = await db.select({
      id: tasksTable.id,
      assigneeId: tasksTable.assigneeId,
      status: tasksTable.status,
      updatedAt: tasksTable.updatedAt,
    }).from(tasksTable).where(eq(tasksTable.workspaceId, workspaceId));

    const today = new Date();

    const leaderboard = members.map(member => {
      const myTasks = tasks.filter(t => t.assigneeId === member.userId);
      const completed = myTasks.filter(t => t.status === "done").length;
      const inProgress = myTasks.filter(t => t.status === "in_progress").length;
      const total = myTasks.length;

      // Compute streak: consecutive days ending today/yesterday where member completed a task
      const completedDates = new Set(
        myTasks
          .filter(t => t.status === "done")
          .map(t => formatISO(startOfDay(new Date(t.updatedAt)), { representation: "date" }))
      );

      let streak = 0;
      for (let i = 0; i <= 365; i++) {
        const dayStr = formatISO(startOfDay(subDays(today, i)), { representation: "date" });
        if (completedDates.has(dayStr)) {
          streak++;
        } else if (i > 0) {
          // Allow today to have no completions yet and still continue streak from yesterday
          break;
        }
      }

      return {
        userId: member.userId,
        name: member.name,
        email: member.email,
        role: member.role,
        completed,
        inProgress,
        total,
        streak,
      };
    });

    // Sort by completed desc, then streak desc as tiebreaker
    leaderboard.sort((a, b) => b.completed - a.completed || b.streak - a.streak);

    res.json({ leaderboard });
    return;
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
    return;
  }
});

export default router;
