# Vercel Deployment

Deploy this repo as two Vercel projects from the same Git repository:

1. `artifacts/api-server`
2. `artifacts/project-nexus`

## API project

- Root Directory: `artifacts/api-server`
- Framework Preset: `Other`
- Build Command: `pnpm run build`

Required environment variables:

- `CLERK_SECRET_KEY`
- `CLERK_PUBLISHABLE_KEY`
- `DATABASE_URL`
- `SESSION_SECRET`
- `NODE_ENV=production`

Notes:

- The API now exports the Express app for Vercel and only starts a local listener outside Vercel.
- Raw WebSockets are disabled on Vercel because Vercel Functions do not support that transport.

## Frontend project

- Root Directory: `artifacts/project-nexus`
- Framework Preset: `Vite`

Required environment variables:

- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_API_BASE_URL=https://<your-api-project>.vercel.app`
- `VITE_ENABLE_WEBSOCKETS=false`
- `VITE_ENABLE_SRS_LIVE_SYNC=false`

Notes:

- SPA rewrites are configured in [artifacts/project-nexus/vercel.json](/D:/Asset-Manager/artifacts/project-nexus/vercel.json:1).
- The frontend now sends Clerk bearer tokens to the API, so it can call a separate Vercel backend origin.
- Chat, notifications, and typing fallback work without WebSockets.
- Huddles, live presence, and in-memory realtime collaboration are intentionally hidden or disabled in production-style deployments.
