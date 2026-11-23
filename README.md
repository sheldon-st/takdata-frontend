# TAK Manager — Web UI

[![CI](https://github.com/sheldon-st/takdata-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/sheldon-st/takdata-frontend/actions/workflows/ci.yml)
[![Image](https://github.com/sheldon-st/takdata-frontend/actions/workflows/docker-image.yml/badge.svg)](https://github.com/sheldon-st/takdata-frontend/pkgs/container/takdata-frontend)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)

Browser UI for [**TAK Manager**](https://github.com/sheldon-st/takdata): configure
ADS-B, AIS and synthetic data feeds, manage the TAK Server connection and
client certificates, distribute data packages, and watch live per-feed
status.

> System architecture, auth modes, the API and deployment are documented in
> the primary [**takdata README**](https://github.com/sheldon-st/takdata#readme)
> and [**DEPLOY.md**](https://github.com/sheldon-st/takdata/blob/main/DEPLOY.md).

---

## Role in the system

This repo is the **frontend only**. It talks to the FastAPI backend over:

- **REST** `/api/v1/*` for config, lifecycle, certs and packages.
- **WebSocket** `/api/v1/ws/status` for live per-enablement metrics
  (events sent and dropped, active tracks, per-source polls, TAK link state).

Auth happens at the reverse proxy (Authentik forward-auth) or is skipped
when the backend runs with `AUTH_ENABLED=false`. The UI reads
`GET /api/v1/me` to decide which controls to show: viewers get read-only
screens, and the sign-out link is hidden in no-auth mode.

---

## Stack

- **Next.js 16** (App Router, standalone output) + **React 19**
- **Tailwind CSS 4** + **shadcn/ui** on **Base UI** primitives
- **TanStack Query** for server state
- **react-hook-form** + **zod 4** for forms
- **OpenLayers** for the bounding-box filter map
- **sonner** for toasts

---

## Development

Requires Node 22+ and pnpm (version pinned in `package.json`; `corepack
enable` picks it up).

```bash
pnpm install
cp .env.example .env    # points the UI at http://localhost:8000
pnpm dev
```

Open <http://localhost:3000>. Run the
[backend](https://github.com/sheldon-st/takdata#local-development) alongside
it with `AUTH_ENABLED=false` so requests work without Authentik headers.

### Scripts

| Command          | What it does                            |
| ---------------- | --------------------------------------- |
| `pnpm dev`       | Dev server with HMR                     |
| `pnpm build`     | Production (standalone) build           |
| `pnpm start`     | Serve the production build              |
| `pnpm lint`      | ESLint (Next.js + React Compiler rules) |
| `pnpm typecheck` | `tsc --noEmit`                          |

CI runs lint, typecheck, build, a production dependency audit and a
container smoke test on every pull request.

---

## Environment variables

Both are **build-time**: Next.js inlines `NEXT_PUBLIC_*` into the browser bundle.

| Variable                   | Default            | Purpose                                                                                                          |
| -------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | `""` (same-origin) | Backend base URL. Leave empty when UI and `/api` share a host (production). Set for local dev.                   |
| `NEXT_PUBLIC_SIGN_OUT_URL` | opengeo.space URL  | Where **Sign out** sends the user (Authentik end-session endpoint). Only shown when the backend reports auth on. |

All API calls go through [`lib/api.ts`](lib/api.ts) with
`credentials: "include"`, so the Authentik session cookie is sent when present.

---

## Project layout

```
app/                    Routes (App Router)
  page.tsx              Dashboard — TAK link + live enablement status
  enablements/          Enablement list and detail (config, sources, live stats)
  packages/             Data package upload / download
  settings/tak/         TAK server connection + client certificates
components/
  app-shell.tsx         Sidebar, nav, user / sign-out
  AdminOnly.tsx         Role-gated wrapper
  providers.tsx         React Query, theme, auth, WebSocket providers
  ws-context.tsx        Live status context (useWsStatus)
  enablements/          Enablement + source forms, geo filter map
  ui/                   shadcn/ui components
context/AuthContext.tsx useAuth(), useIsAdmin(), useAuthEnabled()
hooks/use-websocket.ts  Reconnecting status stream
lib/
  api.ts                Typed fetch client + ApiError
  types.ts              Types mirroring the backend schemas (see /openapi.json)
  query-keys.ts         TanStack Query keys
```

---

## Deployment

CI publishes multi-arch images to `ghcr.io/sheldon-st/takdata-frontend`:
`latest` and `sha-<short>` from `main`, and `X.Y.Z` / `X.Y` from `vX.Y.Z`
tags. The image runs as a non-root user with a built-in healthcheck.

[`docker-compose.yml`](docker-compose.yml) deploys the UI and the backend
together behind Traefik + Authentik on Dokploy. Step-by-step instructions
are in [takdata/DEPLOY.md](https://github.com/sheldon-st/takdata/blob/main/DEPLOY.md).
