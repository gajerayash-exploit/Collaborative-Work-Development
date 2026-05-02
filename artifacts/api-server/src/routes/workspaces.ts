import { Router, type IRouter } from "express";
import { db, workspacesTable, workspaceMembersTable, usersTable, workspaceFilesTable, messagesTable } from "@workspace/db";
import { eq, and, count, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 7);
}

router.get("/workspaces", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.json([]); return; }

    const memberships = await db.select({
      workspace: workspacesTable,
      role: workspaceMembersTable.role,
    })
      .from(workspaceMembersTable)
      .innerJoin(workspacesTable, eq(workspaceMembersTable.workspaceId, workspacesTable.id))
      .where(eq(workspaceMembersTable.userId, user[0].id));

    const result = await Promise.all(memberships.map(async ({ workspace, role }) => {
      const [memberCount] = await db.select({ count: count() }).from(workspaceMembersTable).where(eq(workspaceMembersTable.workspaceId, workspace.id));
      return {
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        slug: workspace.slug,
        memberCount: memberCount.count,
        role,
        createdAt: workspace.createdAt,
      };
    }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list workspaces");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/workspaces", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    const { name, description } = req.body;
    if (!name) { res.status(400).json({ error: "Name is required" }); return; }

    const [workspace] = await db.insert(workspacesTable).values({
      name,
      description: description ?? null,
      slug: slugify(name),
      ownerId: user[0].id,
    }).returning();

    await db.insert(workspaceMembersTable).values({
      workspaceId: workspace.id,
      userId: user[0].id,
      role: "admin",
    });

    res.status(201).json({
      ...workspace,
      memberCount: 1,
      role: "admin",
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create workspace");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/workspaces/:workspaceId", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { workspaceId } = req.params;
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    const workspace = await db.select().from(workspacesTable).where(eq(workspacesTable.id, workspaceId)).limit(1);
    if (!workspace[0]) { res.status(404).json({ error: "Workspace not found" }); return; }

    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0]) { res.status(403).json({ error: "Access denied" }); return; }

    const [memberCount] = await db.select({ count: count() }).from(workspaceMembersTable).where(eq(workspaceMembersTable.workspaceId, workspaceId));

    res.json({
      ...workspace[0],
      memberCount: memberCount.count,
      role: membership[0].role,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get workspace");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/workspaces/:workspaceId", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { workspaceId } = req.params;
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0] || membership[0].role !== "admin") { res.status(403).json({ error: "Access denied" }); return; }

    const { name, description } = req.body;
    const [updated] = await db.update(workspacesTable)
      .set({ name, description, updatedAt: new Date() })
      .where(eq(workspacesTable.id, workspaceId))
      .returning();

    const [memberCount] = await db.select({ count: count() }).from(workspaceMembersTable).where(eq(workspaceMembersTable.workspaceId, workspaceId));

    res.json({ ...updated, memberCount: memberCount.count, role: membership[0].role });
  } catch (err) {
    req.log.error({ err }, "Failed to update workspace");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/workspaces/:workspaceId", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { workspaceId } = req.params;
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    const workspace = await db.select().from(workspacesTable).where(eq(workspacesTable.id, workspaceId)).limit(1);
    if (!workspace[0]) { res.status(404).json({ error: "Workspace not found" }); return; }
    if (workspace[0].ownerId !== user[0].id) { res.status(403).json({ error: "Only owner can delete workspace" }); return; }

    await db.delete(workspaceMembersTable).where(eq(workspaceMembersTable.workspaceId, workspaceId));
    await db.delete(workspaceFilesTable).where(eq(workspaceFilesTable.workspaceId, workspaceId));
    await db.delete(messagesTable).where(eq(messagesTable.workspaceId, workspaceId));
    await db.delete(workspacesTable).where(eq(workspacesTable.id, workspaceId));

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete workspace");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/workspaces/:workspaceId/stats", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { workspaceId } = req.params;
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0]) { res.status(403).json({ error: "Access denied" }); return; }

    const [[memberCount], [fileCount], [messageCount]] = await Promise.all([
      db.select({ count: count() }).from(workspaceMembersTable).where(eq(workspaceMembersTable.workspaceId, workspaceId)),
      db.select({ count: count() }).from(workspaceFilesTable).where(eq(workspaceFilesTable.workspaceId, workspaceId)),
      db.select({ count: count() }).from(messagesTable).where(eq(messagesTable.workspaceId, workspaceId)),
    ]);

    const recentMessages = await db.select({
      id: messagesTable.id,
      content: messagesTable.content,
      senderId: messagesTable.senderId,
      createdAt: messagesTable.createdAt,
      senderName: usersTable.name,
    })
      .from(messagesTable)
      .innerJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
      .where(eq(messagesTable.workspaceId, workspaceId))
      .orderBy(desc(messagesTable.createdAt))
      .limit(3);

    const recentFiles = await db.select({
      name: workspaceFilesTable.name,
      uploadedBy: workspaceFilesTable.uploadedBy,
      createdAt: workspaceFilesTable.createdAt,
      uploaderName: usersTable.name,
    })
      .from(workspaceFilesTable)
      .innerJoin(usersTable, eq(workspaceFilesTable.uploadedBy, usersTable.id))
      .where(eq(workspaceFilesTable.workspaceId, workspaceId))
      .orderBy(desc(workspaceFilesTable.createdAt))
      .limit(2);

    const recentActivity = [
      ...recentMessages.map(m => ({
        type: "message" as const,
        description: `Sent a message: "${m.content.slice(0, 50)}${m.content.length > 50 ? "..." : ""}"`,
        userName: m.senderName,
        createdAt: m.createdAt,
      })),
      ...recentFiles.map(f => ({
        type: "file_upload" as const,
        description: `Uploaded file: ${f.name}`,
        userName: f.uploaderName,
        createdAt: f.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

    res.json({
      memberCount: memberCount.count,
      fileCount: fileCount.count,
      messageCount: messageCount.count,
      recentActivity,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get workspace stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
