import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db, apiTokensTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const requireAuthOrToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith("Bearer nxs_")) {
    const raw = authHeader.slice(7);
    const hash = hashToken(raw);

    try {
      const tokenRows = await db.select().from(apiTokensTable)
        .where(eq(apiTokensTable.tokenHash, hash)).limit(1);

      if (!tokenRows[0]) {
        res.status(401).json({ error: "Invalid API token" }); return;
      }

      const userRows = await db.select().from(usersTable)
        .where(eq(usersTable.id, tokenRows[0].userId)).limit(1);

      if (!userRows[0]) {
        res.status(401).json({ error: "User not found" }); return;
      }

      db.update(apiTokensTable)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiTokensTable.id, tokenRows[0].id))
        .execute()
        .catch(() => {});

      (req as any).clerkUserId = userRows[0].clerkId;
      (req as any).dbUser = userRows[0];
      next();
      return;
    } catch {
      res.status(500).json({ error: "Internal server error" }); return;
    }
  }

  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" }); return;
  }
  (req as any).clerkUserId = userId;
  next();
};
