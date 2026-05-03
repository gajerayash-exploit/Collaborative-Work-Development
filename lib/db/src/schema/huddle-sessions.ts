import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const huddleSessionsTable = pgTable("huddle_sessions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull().unique(),
  participants: text("participants").notNull().default("[]"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertHuddleSessionSchema = createInsertSchema(huddleSessionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertHuddleSession = z.infer<typeof insertHuddleSessionSchema>;
export type HuddleSession = typeof huddleSessionsTable.$inferSelect;
