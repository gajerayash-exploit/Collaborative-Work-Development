import { Router, type IRouter } from "express";
import { db, apiTokensTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { createHash, randomBytes } from "node:crypto";

const router: IRouter = Router();

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateToken(): { raw: string; prefix: string; hash: string } {
  const raw = `nxs_${randomBytes(32).toString("hex")}`;
  const prefix = raw.slice(0, 12);
  const hash = hashToken(raw);
  return { raw, prefix, hash };
}

router.get("/user/tokens", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    const tokens = await db.select({
      id: apiTokensTable.id,
      name: apiTokensTable.name,
      tokenPrefix: apiTokensTable.tokenPrefix,
      createdAt: apiTokensTable.createdAt,
      lastUsedAt: apiTokensTable.lastUsedAt,
    }).from(apiTokensTable).where(eq(apiTokensTable.userId, user[0].id));

    res.json(tokens);
  } catch (err) {
    req.log.error({ err }, "Failed to list API tokens");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/user/tokens", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { name } = req.body;
    if (!name?.trim()) { res.status(400).json({ error: "Token name is required" }); return; }

    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    const existing = await db.select().from(apiTokensTable).where(eq(apiTokensTable.userId, user[0].id));
    if (existing.length >= 10) {
      res.status(400).json({ error: "Maximum of 10 API tokens allowed" }); return;
    }

    const { raw, prefix, hash } = generateToken();

    const [token] = await db.insert(apiTokensTable).values({
      userId: user[0].id,
      name: name.trim(),
      tokenHash: hash,
      tokenPrefix: prefix,
    }).returning({
      id: apiTokensTable.id,
      name: apiTokensTable.name,
      tokenPrefix: apiTokensTable.tokenPrefix,
      createdAt: apiTokensTable.createdAt,
      lastUsedAt: apiTokensTable.lastUsedAt,
    });

    res.status(201).json({ ...token, token: raw });
  } catch (err) {
    req.log.error({ err }, "Failed to create API token");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/user/tokens/:tokenId", requireAuth, async (req: any, res): Promise<void> => {
  try {
    const clerkUserId = req.clerkUserId;
    const { tokenId } = req.params;

    const user = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkUserId)).limit(1);
    if (!user[0]) { res.status(404).json({ error: "User not found" }); return; }

    const token = await db.select().from(apiTokensTable).where(eq(apiTokensTable.id, tokenId)).limit(1);
    if (!token[0] || token[0].userId !== user[0].id) {
      res.status(404).json({ error: "Token not found" }); return;
    }

    await db.delete(apiTokensTable).where(eq(apiTokensTable.id, tokenId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete API token");
    res.status(500).json({ error: "Internal server error" });
  }
});

export { hashToken };
export default router;
