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
- **Digital SRS Engine**: Interactive React Flow dependency graph (dark violet canvas), glassmorphic nodes, animated pulse edges, edge labels, node editing, Mermaid import, Project Health Radar, Sunburst chart, Neo-Brutalist mode, mini-map, JSON export, localStorage persistence
- **SRS Connection Audit**: Detects orphaned nodes, missing critical links, circular dependencies; colored glow rings on affected nodes; badge on SRS tab trigger and canvas label
- **AI Edge Suggestions**: `POST /api/srs/suggest` — sends graph to GPT-5-mini, returns up to 6 missing-edge recommendations with confidence scores; one-click "Add Edge" per suggestion in the Audit sidebar panel
- **OpenAI Integration**: Replit AI Integrations proxy (`AI_INTEGRATIONS_OPENAI_BASE_URL` + `AI_INTEGRATIONS_OPENAI_API_KEY`); lib at `lib/integrations-openai-ai-server`
- **Enhanced RBAC / Branches** (Feature A): Branches tab — named sub-spaces within a workspace with `allowedRoles` array, `isProtected` flag; role hierarchy cards (admin/editor/viewer); admin-only create/delete/protect; route: `GET|POST /api/workspaces/:id/branches`, `PUT|DELETE /api/workspaces/:id/branches/:branchId`
- **Live-Sync Engine** (Feature B): Sync tab — push file events (created/modified/deleted), live feed with pulse animation, 5s auto-refresh, simulated Sync Agent CLI command; route: `GET /api/workspaces/:id/sync/events`, `POST /api/workspaces/:id/sync/push`
- **Huddle Widget** (Feature C): Persistent header popover — join/leave workspace voice huddle, mute toggle, participant list with live presence indicator, 5s polling; route: `GET /api/workspaces/:id/huddle`, `POST /api/workspaces/:id/huddle/join|leave`
- **One-Click Sandbox** (Feature E): Sandbox tab — create cloud environments per framework (React/Next/Express/Vue/Svelte), animated 4-step creation sequence, preview URL display, Pitch Mode toggle (hides source code); route: `GET|POST /api/workspaces/:id/sandboxes`, `GET|DELETE /api/workspaces/:id/sandboxes/:sid`, `PUT /api/workspaces/:id/sandboxes/:sid/pitch-mode`
- **WebSocket Real-time + Presence**: `ws` server attached to the same HTTP server at path `/api/ws`; Clerk JWT verified on upgrade; workspace rooms (Map → Set<WsClient>); broadcasts `new_message`, `sync_event`, `huddle_update`, `presence` events to all room members; client `useWorkspaceSocket` hook connects with exponential backoff reconnection; `PresenceBar` component in workspace header shows online member avatars with green dot indicators and tooltips

## DB Tables

`users`, `workspaces`, `workspace_members`, `workspace_files`, `messages`, `notifications`, `tasks`, `conversations`, `ai_messages`, `branches`, `sync_events`, `huddle_sessions`, `sandboxes`

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
