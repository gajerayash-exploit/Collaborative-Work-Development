import { Router, type IRouter } from "express";
import { db, usersTable, workspaceMembersTable, workspaceSecretsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { encrypt, decrypt } from "../lib/encryption";

const router: IRouter = Router();

// GET /workspaces/:workspaceId/secrets — list keys (no values revealed)
router.get("/workspaces/:workspaceId/secrets", requireAuth, async (req: any, res): Promise<void> => {
  const { workspaceId } = req.params;
  const clerkId = req.clerkUserId;

  const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

  const membership = await db.select({ role: workspaceMembersTable.role })
    .from(workspaceMembersTable)
    .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
    .limit(1);
  if (!membership[0]) { res.status(403).json({ error: "Access denied" }); return; }

  const secrets = await db.select({
    id: workspaceSecretsTable.id,
    key: workspaceSecretsTable.key,
    createdAt: workspaceSecretsTable.createdAt,
    updatedAt: workspaceSecretsTable.updatedAt,
  }).from(workspaceSecretsTable)
    .where(eq(workspaceSecretsTable.workspaceId, workspaceId))
    .orderBy(workspaceSecretsTable.createdAt);

  res.json(secrets);
});

// POST /workspaces/:workspaceId/secrets — create or update a secret
router.post("/workspaces/:workspaceId/secrets", requireAuth, async (req: any, res): Promise<void> => {
  const { workspaceId } = req.params;
  const clerkId = req.clerkUserId;
  const { key, value } = req.body;

  if (!key?.trim() || !value?.trim()) {
    res.status(400).json({ error: "key and value are required" });
    return;
  }

  const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

  const membership = await db.select({ role: workspaceMembersTable.role })
    .from(workspaceMembersTable)
    .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
    .limit(1);
  if (!membership[0] || membership[0].role === "viewer") {
    res.status(403).json({ error: "Only admins and members can manage secrets" });
    return;
  }

  const { encryptedValue, iv } = encrypt(value.trim());

  // Upsert by key name within the workspace
  const existing = await db.select({ id: workspaceSecretsTable.id })
    .from(workspaceSecretsTable)
    .where(and(eq(workspaceSecretsTable.workspaceId, workspaceId), eq(workspaceSecretsTable.key, key.trim())))
    .limit(1);

  if (existing[0]) {
    const [updated] = await db.update(workspaceSecretsTable)
      .set({ encryptedValue, iv, updatedAt: new Date() })
      .where(eq(workspaceSecretsTable.id, existing[0].id))
      .returning();
    res.json({ id: updated.id, key: updated.key, createdAt: updated.createdAt, updatedAt: updated.updatedAt });
  } else {
    const [created] = await db.insert(workspaceSecretsTable).values({
      workspaceId,
      key: key.trim(),
      encryptedValue,
      iv,
      createdBy: user[0].id,
    }).returning();
    res.status(201).json({ id: created.id, key: created.key, createdAt: created.createdAt, updatedAt: created.updatedAt });
  }
});

// GET /workspaces/:workspaceId/secrets/:secretId/reveal — return decrypted value (admin/owner only)
router.get("/workspaces/:workspaceId/secrets/:secretId/reveal", requireAuth, async (req: any, res): Promise<void> => {
  const { workspaceId, secretId } = req.params;
  const clerkId = req.clerkUserId;

  const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

  const membership = await db.select({ role: workspaceMembersTable.role })
    .from(workspaceMembersTable)
    .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
    .limit(1);
  if (!membership[0] || membership[0].role === "viewer") {
    res.status(403).json({ error: "Only admins and members can reveal secrets" });
    return;
  }

  const secret = await db.select()
    .from(workspaceSecretsTable)
    .where(and(eq(workspaceSecretsTable.id, secretId), eq(workspaceSecretsTable.workspaceId, workspaceId)))
    .limit(1);
  if (!secret[0]) { res.status(404).json({ error: "Secret not found" }); return; }

  const value = decrypt(secret[0].encryptedValue, secret[0].iv);
  res.json({ id: secret[0].id, key: secret[0].key, value });
});

// DELETE /workspaces/:workspaceId/secrets/:secretId
router.delete("/workspaces/:workspaceId/secrets/:secretId", requireAuth, async (req: any, res): Promise<void> => {
  const { workspaceId, secretId } = req.params;
  const clerkId = req.clerkUserId;

  const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

  const membership = await db.select({ role: workspaceMembersTable.role })
    .from(workspaceMembersTable)
    .where(and(eq(workspaceMembersTable.workspaceId, workspaceId), eq(workspaceMembersTable.userId, user[0].id)))
    .limit(1);
  if (!membership[0] || membership[0].role === "viewer") {
    res.status(403).json({ error: "Only admins and members can delete secrets" });
    return;
  }

  await db.delete(workspaceSecretsTable)
    .where(and(eq(workspaceSecretsTable.id, secretId), eq(workspaceSecretsTable.workspaceId, workspaceId)));

  res.json({ success: true });
});

export default router;
