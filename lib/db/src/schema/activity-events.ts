import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const activityEventsTable = pgTable("activity_events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull(),
  userId: text("user_id").notNull(),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ActivityEvent = typeof activityEventsTable.$inferSelect;
