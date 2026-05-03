import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const apiTokensTable = pgTable("api_tokens", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  tokenPrefix: text("token_prefix").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
});

export type ApiToken = typeof apiTokensTable.$inferSelect;
