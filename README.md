# takdata-frontend

Web UI for [TAK Manager](../takdata) — configure data enablements, manage TAK Server connections, and watch live status streams.

> For system overview, architecture, auth modes, and deployment, see the primary [**takdata README**](../takdata/README.md).

---

## Role in the system

This repo is the **frontend only**. It talks to the FastAPI backend (in [`takdata/`](../takdata)) over:

- **REST** — `/api/v1/*` for config, lifecycle, certs, packages
- **WebSocket** — `/api/v1/ws/status` for live per-enablement metrics

Auth is handled at the reverse proxy (Authentik forward-auth) or skipped entirely when the backend runs with `AUTH_ENABLED=false`. The UI auto-detects via `GET /api/v1/me` and hides the sign-out link in no-auth mode.

---

## Stack

- **Next.js 16** (App Router, React 19)
- **Tailwind v4** + **shadcn/ui** + **Base UI** primitives
- **TanStack Query** — server state, retry/error handling
- **react-hook-form** + **zod** — forms + validation
- **OpenLayers** — map widgets
- **sonner** — toasts

---

## Development

```bash
pnpm install
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000 pnpm dev
```

Open <http://localhost:3000>. Run the backend separately (see [takdata README](../takdata/README.md#local-development)) — easiest with `AUTH_ENABLED=false` so requests work without Authentik headers.

### Scripts

| Command | What it does |
|---------|--------------|
| `pnpm dev` | Next dev server with HMR |
| `pnpm build` | Production build |
| `pnpm start` | Run production build |
| `pnpm lint` | ESLint |

---

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | `""` (same-origin) | Backend base URL. Leave empty in production when frontend and backend sit behind a single reverse-proxy host (e.g. `data.opengeo.space` with `/api` path-routed to the backend). Set explicitly for local dev. |

All API calls go through [`lib/api.ts`](lib/api.ts) with `credentials: "include"` so the Authentik session cookie is sent automatically when present.

---

## Project layout

```
app/                Next.js routes (App Router)
components/         UI components
  app-shell.tsx     Sidebar + nav + user/logout
  AdminOnly.tsx     Role-gated wrapper
  providers.tsx     React Query + theme + auth
context/
  AuthContext.tsx   useAuth(), useIsAdmin(), useAuthEnabled()
hooks/              Custom hooks (WebSocket, etc.)
lib/
  api.ts            Typed fetch wrapper for /api/v1/*
  types.ts          Types mirroring openapispec.json
openapispec.json    Backend OpenAPI spec (source of truth for types)
```

---

## Deployment

Built as a Docker image (`ghcr.io/sheldon-st/takdata-frontend:latest`) — CI publishes multi-arch images on push to `main`. The build is defined in [`Dockerfile`](Dockerfile). Run alongside the backend behind a reverse proxy that path-routes `/api/*` to the backend; see [takdata/DEPLOY.md](../takdata/DEPLOY.md).

For full deployment instructions see [takdata/DEPLOY.md](../takdata/DEPLOY.md).
