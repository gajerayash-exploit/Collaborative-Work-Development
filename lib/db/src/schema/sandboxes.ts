import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sandboxesTable = pgTable("sandboxes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  workspaceId: text("workspace_id").notNull(),
  name: text("name").notNull(),
  framework: text("framework").notNull().default("react-vite"),
  status: text("status", { enum: ["creating", "running", "stopped", "error"] }).notNull().default("creating"),
  previewUrl: text("preview_url"),
  pitchMode: boolean("pitch_mode").notNull().default(false),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSandboxSchema = createInsertSchema(sandboxesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSandbox = z.infer<typeof insertSandboxSchema>;
export type Sandbox = typeof sandboxesTable.$inferSelect;
