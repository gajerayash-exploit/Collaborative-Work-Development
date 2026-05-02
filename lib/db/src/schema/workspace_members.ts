import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const workspaceMembersTable = pgTable("workspace_members", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull(),
  userId: text("user_id").notNull(),
  role: text("role", { enum: ["admin", "editor", "viewer"] }).notNull().default("viewer"),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

export const insertWorkspaceMemberSchema = createInsertSchema(workspaceMembersTable).omit({ id: true, joinedAt: true });
export type InsertWorkspaceMember = z.infer<typeof insertWorkspaceMemberSchema>;
export type WorkspaceMember = typeof workspaceMembersTable.$inferSelect;
