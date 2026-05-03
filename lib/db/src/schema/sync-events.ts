import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const syncEventsTable = pgTable("sync_events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  action: text("action", { enum: ["created", "modified", "deleted"] }).notNull(),
  triggeredBy: text("triggered_by").notNull(),
  pushedAt: timestamp("pushed_at").notNull().defaultNow(),
});

export const insertSyncEventSchema = createInsertSchema(syncEventsTable).omit({ id: true, pushedAt: true });
export type InsertSyncEvent = z.infer<typeof insertSyncEventSchema>;
export type SyncEvent = typeof syncEventsTable.$inferSelect;
