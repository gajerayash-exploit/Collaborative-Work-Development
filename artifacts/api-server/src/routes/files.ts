import { Router, type IRouter } from "express";
import { db, workspaceFilesTable, usersTable, workspaceMembersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { notifyWorkspaceMembers } from "../lib/notify";
import { recordActivity } from "../lib/recordActivity";

const router: IRouter = Router();

router.get("/workspaces/:workspaceId/files", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { workspaceId } = req.params;
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0]) { res.status(403).json({ error: "Access denied" }); return; }

    const files = await db.select({
      id: workspaceFilesTable.id,
      workspaceId: workspaceFilesTable.workspaceId,
      name: workspaceFilesTable.name,
      size: workspaceFilesTable.size,
      mimeType: workspaceFilesTable.mimeType,
      url: workspaceFilesTable.url,
      uploadedBy: workspaceFilesTable.uploadedBy,
      createdAt: workspaceFilesTable.createdAt,
      uploaderName: usersTable.name,
    })
      .from(workspaceFilesTable)
      .innerJoin(usersTable, eq(workspaceFilesTable.uploadedBy, usersTable.id))
      .where(eq(workspaceFilesTable.workspaceId, workspaceId))
      .orderBy(desc(workspaceFilesTable.createdAt));

    res.json(files);
  } catch (err) {
    req.log.error({ err }, "Failed to list files");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/workspaces/:workspaceId/files", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { workspaceId } = req.params;
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0] || membership[0].role === "viewer") { res.status(403).json({ error: "Viewers cannot upload files" }); return; }

    const { name, size, mimeType, url } = req.body;

    const [file] = await db.insert(workspaceFilesTable).values({
      workspaceId,
      name,
      size,
      mimeType,
      url,
      uploadedBy: user[0].id,
    }).returning();

    res.status(201).json({ ...file, uploaderName: user[0].name });

    recordActivity({ workspaceId, userId: user[0].id, type: "file_uploaded", payload: { fileId: file.id, fileName: name, fileSize: size, mimeType } }).catch(() => {});

    notifyWorkspaceMembers({
      workspaceId,
      excludeUserId: user[0].id,
      type: "file_uploaded",
      title: `New file uploaded by ${user[0].name}`,
      body: name,
    }).catch(() => {});
  } catch (err) {
    req.log.error({ err }, "Failed to upload file");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/workspaces/:workspaceId/files/:fileId", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { workspaceId, fileId } = req.params;
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0] || membership[0].role === "viewer") { res.status(403).json({ error: "Viewers cannot delete files" }); return; }

    const file = await db.select().from(workspaceFilesTable).where(eq(workspaceFilesTable.id, fileId)).limit(1);
    if (!file[0]) { res.status(404).json({ error: "File not found" }); return; }

    if (file[0].uploadedBy !== user[0].id && membership[0].role !== "admin") {
      res.status(403).json({ error: "Only admins or the uploader can delete files" }); return;
    }

    await db.delete(workspaceFilesTable).where(eq(workspaceFilesTable.id, fileId));

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete file");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
