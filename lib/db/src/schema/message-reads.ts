import { pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

export const messageReadsTable = pgTable("message_reads", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  messageId: text("message_id").notNull(),
  userId: text("user_id").notNull(),
  readAt: timestamp("read_at").notNull().defaultNow(),
}, (t) => [unique().on(t.messageId, t.userId)]);

export type MessageRead = typeof messageReadsTable.$inferSelect;
