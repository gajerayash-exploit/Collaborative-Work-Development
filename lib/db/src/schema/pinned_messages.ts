import { pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

export const pinnedMessagesTable = pgTable("pinned_messages", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull(),
  messageId: text("message_id").notNull(),
  pinnedBy: text("pinned_by").notNull(),
  pinnedAt: timestamp("pinned_at").notNull().defaultNow(),
}, (t) => [unique().on(t.workspaceId, t.messageId)]);

export type PinnedMessage = typeof pinnedMessagesTable.$inferSelect;
