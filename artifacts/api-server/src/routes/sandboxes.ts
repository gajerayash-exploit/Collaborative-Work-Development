import { Router, type IRouter } from "express";
import { db, sandboxesTable, workspaceMembersTable, usersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

const FRAMEWORKS: Record<string, { label: string; deps: string[] }> = {
  "react-vite": { label: "React + Vite", deps: ["react", "react-dom", "vite"] },
  "nextjs": { label: "Next.js", deps: ["next", "react", "react-dom"] },
  "express-api": { label: "Express API", deps: ["express", "cors"] },
  "vue-vite": { label: "Vue + Vite", deps: ["vue", "vite"] },
  "svelte": { label: "Svelte + Vite", deps: ["svelte", "vite"] },
};

function generatePreviewUrl(sandboxId: string, framework: string): string {
  return `https://sandbox-${sandboxId.slice(0, 8)}.nexus.dev`;
}

router.get("/workspaces/:workspaceId/sandboxes", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, req.clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }
    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0]) { res.status(403).json({ error: "Access denied" }); return; }

    const sandboxes = await db.select({
      id: sandboxesTable.id,
      workspaceId: sandboxesTable.workspaceId,
      name: sandboxesTable.name,
      framework: sandboxesTable.framework,
      status: sandboxesTable.status,
      previewUrl: sandboxesTable.previewUrl,
      pitchMode: sandboxesTable.pitchMode,
      createdBy: sandboxesTable.createdBy,
      createdAt: sandboxesTable.createdAt,
      updatedAt: sandboxesTable.updatedAt,
      creatorName: usersTable.name,
    })
      .from(sandboxesTable)
      .innerJoin(usersTable, eq(sandboxesTable.createdBy, usersTable.id))
      .where(eq(sandboxesTable.workspaceId, workspaceId))
      .orderBy(desc(sandboxesTable.createdAt));

    res.json(sandboxes);
  } catch (err) {
    req.log.error({ err }, "Failed to list sandboxes");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/workspaces/:workspaceId/sandboxes", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const { workspaceId } = req.params;
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, req.clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }
    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0] || membership[0].role === "viewer") {
      res.status(403).json({ error: "Viewers cannot create sandboxes" }); return;
    }

    const { name, framework = "react-vite" } = req.body;
    if (!name) { res.status(400).json({ error: "Name is required" }); return; }
    if (!FRAMEWORKS[framework]) { res.status(400).json({ error: "Invalid framework" }); return; }

    const [sandbox] = await db.insert(sandboxesTable).values({
      workspaceId,
      name,
      framework,
      status: "creating",
      createdBy: user[0].id,
    }).returning();

    setTimeout(async () => {
      try {
        await db.update(sandboxesTable)
          .set({
            status: "running",
            previewUrl: generatePreviewUrl(sandbox.id, framework),
            updatedAt: new Date(),
          })
          .where(eq(sandboxesTable.id, sandbox.id));
      } catch {}
    }, 4000);

    res.status(201).json({ ...sandbox, creatorName: user[0].name, frameworkLabel: FRAMEWORKS[framework].label });
  } catch (err) {
    req.log.error({ err }, "Failed to create sandbox");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/workspaces/:workspaceId/sandboxes/:sandboxId", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const { workspaceId, sandboxId } = req.params;
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, req.clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }
    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0]) { res.status(403).json({ error: "Access denied" }); return; }

    const [sandbox] = await db.select({
      id: sandboxesTable.id,
      workspaceId: sandboxesTable.workspaceId,
      name: sandboxesTable.name,
      framework: sandboxesTable.framework,
      status: sandboxesTable.status,
      previewUrl: sandboxesTable.previewUrl,
      pitchMode: sandboxesTable.pitchMode,
      createdBy: sandboxesTable.createdBy,
      createdAt: sandboxesTable.createdAt,
      updatedAt: sandboxesTable.updatedAt,
      creatorName: usersTable.name,
    })
      .from(sandboxesTable)
      .innerJoin(usersTable, eq(sandboxesTable.createdBy, usersTable.id))
      .where(and(eq(sandboxesTable.id, sandboxId), eq(sandboxesTable.workspaceId, workspaceId)));

    if (!sandbox) { res.status(404).json({ error: "Sandbox not found" }); return; }
    res.json({ ...sandbox, frameworkLabel: FRAMEWORKS[sandbox.framework]?.label ?? sandbox.framework });
  } catch (err) {
    req.log.error({ err }, "Failed to get sandbox");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/workspaces/:workspaceId/sandboxes/:sandboxId/pitch-mode", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const { workspaceId, sandboxId } = req.params;
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, req.clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }
    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0] || membership[0].role === "viewer") {
      res.status(403).json({ error: "Insufficient permissions" }); return;
    }
    const { enabled } = req.body;
    const [updated] = await db.update(sandboxesTable)
      .set({ pitchMode: !!enabled, updatedAt: new Date() })
      .where(and(eq(sandboxesTable.id, sandboxId), eq(sandboxesTable.workspaceId, workspaceId)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Sandbox not found" }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to toggle pitch mode");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/workspaces/:workspaceId/sandboxes/:sandboxId", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const { workspaceId, sandboxId } = req.params;
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, req.clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }
    const membership = await db.select().from(workspaceMembersTable)
      .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
      .limit(1);
    if (!membership[0] || membership[0].role === "viewer") {
      res.status(403).json({ error: "Insufficient permissions" }); return;
    }
    await db.delete(sandboxesTable)
      .where(and(eq(sandboxesTable.id, sandboxId), eq(sandboxesTable.workspaceId, workspaceId)));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete sandbox");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
