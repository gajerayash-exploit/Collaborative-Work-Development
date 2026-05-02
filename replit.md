# Project Nexus

## Overview

Unified collaboration platform for students and teams. pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Auth**: Clerk (Google OAuth)
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec → React Query hooks)
- **Build**: esbuild (CJS bundle)

## Features Implemented

- **Auth**: Clerk Google OAuth, user sync, session management
- **Workspaces**: Create, join, list, update, delete; RBAC (admin/editor/viewer)
- **Invite Links**: Generate/revoke shareable invite codes; `/join/:code` page
- **Members**: Invite by email, change roles, remove members
- **Chat**: Real-time polling (5s), message history, send messages
- **Files**: Upload (Replit Object Storage), download, delete with RBAC
- **Tasks**: Full CRUD per workspace; status (todo/in_progress/done), priority (low/medium/high), assignee, due date; clickable status cycling
- **Search**: Cmd+K search dialog; searches messages + files + tasks simultaneously with instant results
- **User Profile**: `/profile` page to update display name; Google auth info display
- **Dashboard**: Workspace overview with stats, activity timeline, recent files, team roster, recent messages
- **Notifications**: In-app notification bell; triggers on new messages, files, member joins; 15s polling
- **Settings**: Rename workspace, update description (admin only)

## DB Tables

`users`, `workspaces`, `workspace_members`, `workspace_files`, `messages`, `notifications`, `tasks`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Important Patterns

- Route handlers: `res.json(...); return;` NOT `return res.json(...)` (Express return type is void)
- Notification triggers: fire-and-forget after `res.json()` using `.catch(() => {})`
- DB migrations: use `executeSql` directly (not interactive `db push`)
- After schema changes: run `pnpm run typecheck:libs` to rebuild lib declarations
- Search uses Postgres `ilike` with `%term%` pattern
- Tasks table: `workspace_id`, `assignee_id`, `created_by`, `due_date`

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
