# Usage Metering frontend

Initial frontend generated with [Lovable](https://lovable.dev).
Imported from https://github.com/engbaraakhamaysa/screenshot-exact-match at
commit `42a2f49856049fc8a6c5f2849fd214150623cb02`.
This copy is maintained in this repository; it is not configured to synchronize
with the source repository or Lovable.

## AI contributions

- Lovable generated the initial frontend.
- Codex imported it into `client/`, adjusted the runtime configuration, and
  validated the frozen dependency installation, TypeScript typecheck, production
  build, existing routing test, and browser smoke checks for all six pages and
  mock account creation. Codex subsequently implemented the Account, Plans, and
  Users HTTP integration, development proxy, session handling, and integration tests.

## Runtime and commands

Use Node.js 22.15.0 (`.nvmrc`; dependencies require Node >=22.12) and Bun 1.4.3.
Bun is the frontend package manager; keep `bun.lock` and use frozen installs.
The backend's npm workspace and lockfile are independent and unchanged.
Run all commands from `client/`:

```sh
bun install --frozen-lockfile
bun run dev --host 127.0.0.1 --port 3100
```

Validation:

```sh
bun run typecheck
bun run lint
bun run build
bun run test
```

To run the production SSR build locally after `bun run build`:

```sh
PORT=3100 node .output/server/index.mjs
```

`bun run preview --host 127.0.0.1 --port 3100` also previews the build.
Port 3100 avoids the backend's default port 3000. No frontend database,
environment file or translation provider is required. Connected pages require
a running backend and an API key for authenticated operations.
Google Fonts supplies the original IBM Plex fonts; offline browsers use fallbacks.

## Framework and behavior

The original React 19, TanStack Start file routing, Vite 8, Tailwind 4, SSR
error wrapper, and Lovable Vite configuration helper are retained. The helper
already registers the framework plugins; do not duplicate them. Nitro's preset
is explicitly `node-server` instead of the helper's Cloudflare default, solely
to support a standalone local Node process. No deployment is configured here.

The six pages are `/account`, `/plans`, `/users`, `/consumption`, `/records`, and
`/translation`; `/` redirects to `/account`. The original design and framework
are retained. Account, Plans, and Users now use the real backend. Consumption,
Records, and Translation retain their original mock implementations.

## Backend connection

Start the existing backend separately using the repository's root npm commands
and its configured PostgreSQL database. From `client/`, `bun run dev --host
127.0.0.1 --port 3100` proxies `/api` to `http://127.0.0.1:3000`. For a different
backend target, start Vite with a non-secret URL:

```sh
BACKEND_PROXY_TARGET=http://127.0.0.1:3001 bun run dev --host 127.0.0.1 --port 3100
```

Leave **API Base URL** blank on Account to use this same-origin proxy. To use a
different HTTP(S) origin or a same-origin base path, enter the URL without
`/api` and click **Apply URL**, then connect the key. Changing the backend URL
clears authentication and cached data. Direct cross-origin requests require
CORS support from that server; the current backend does not provide it. Use the
development proxy rather than disabling browser security or changing backend code.

The production SSR build does **not** include the Vite development proxy. Serve
`/api` through a reverse proxy to the backend on the frontend origin, or configure
a backend origin that supports CORS. That production infrastructure is outside
this task; local development uses the verified Vite proxy.

Create an account with a public account plan or enter an existing API key on
Account and click **Connect**. Authenticated requests send `x-api-key`. Keys stay
in React memory only, disappear on reload, and are never stored in localStorage,
cookies, files, query keys for connected pages, or public environment variables.
Only URL configuration belongs in `BACKEND_PROXY_TARGET`; never put a key there.
Public requests omit authentication. Failed requests display backend errors,
including field validation issues, without falling back to mock data.

Account reads its current plan from `GET /api/usage/account`, since the backend
has no account-details GET endpoint. No consumption writes are added. Plan
visibility is derived from `ownerAccountId`; `/api/plans/me` already includes
public and owned plans, which the UI displays once. Public plans are read-only.
Private plan writes and user management use the authenticated account's scope.

### Remaining mock pages

Consumption, Records, and Translation still call the independent in-memory mock
API. Real backend accounts, plans, users, usage, and keys are not copied into
that store. Navigating to these pages with a real key shows mock authentication
errors; they cannot operate on real accounts yet. No mock account bootstrap is
added in this task, so those authenticated demo flows are not independently
usable from the now-connected Account page. Their page code remains unchanged.
The header identifies connected versus mock pages and explains the separation.
Translation remains simulated; no provider is connected.

## Integration validation

`bun run test` includes the original routing test, HTTP client contract/error
tests, and connected page tests using mocked HTTP responses. The latter exercise
account creation and plan changes, private plan create/edit, user create/details/
plan changes, validation/authentication/conflict/not-found/server errors, and
connection changes. They do not establish real backend availability.

A separate browser smoke check against the running local backend and PostgreSQL
verified public plans, account creation, reconnecting with an existing key,
owned/private plan listing and writes, account plan changes, user list/create/
details/plan changes, and HTTP 401 display. Requests used the Vite same-origin
proxy. Typecheck, lint, tests, and the Node production build are required checks.
Lint has existing Fast Refresh warnings; the build has a large-chunk warning
and a Vite tsconfig-paths plugin deprecation notice. No checks are disabled.
Exhaustive visual regression coverage and a production reverse-proxy deployment
have not been verified.

Source repository synchronization instructions, `.lovable` metadata, Git
metadata, dependencies, secrets, and build artifacts are excluded. Generated
`src/routeTree.gen.ts` is retained because routes and tests import it; let the
TanStack plugin regenerate it rather than editing it manually.
