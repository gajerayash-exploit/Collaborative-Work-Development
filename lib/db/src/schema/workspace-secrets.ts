import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const workspaceSecretsTable = pgTable("workspace_secrets", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull(),
  key: text("key").notNull(),
  encryptedValue: text("encrypted_value").notNull(),
  iv: text("iv").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type WorkspaceSecret = typeof workspaceSecretsTable.$inferSelect;
