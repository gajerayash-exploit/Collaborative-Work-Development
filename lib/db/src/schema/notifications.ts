import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const notificationsTable = pgTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  workspaceId: text("workspace_id").notNull(),
  type: text("type").notNull(), // "message" | "file_uploaded" | "member_joined"
  title: text("title").notNull(),
  body: text("body").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Notification = typeof notificationsTable.$inferSelect;
