import { pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

export const messageReactionsTable = pgTable("message_reactions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  messageId: text("message_id").notNull(),
  userId: text("user_id").notNull(),
  emoji: text("emoji").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [unique().on(t.messageId, t.userId, t.emoji)]);

export type MessageReaction = typeof messageReactionsTable.$inferSelect;
