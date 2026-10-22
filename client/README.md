# Usage Metering frontend

Initial frontend generated with [Lovable](https://lovable.dev), imported from
https://github.com/engbaraakhamaysa/screenshot-exact-match at commit
`42a2f49856049fc8a6c5f2849fd214150623cb02`. This repository is maintained separately;
it does not synchronize with the source repository or Lovable.

## AI contributions

- Lovable generated the initial frontend.
- Codex imported it into `client/`, adjusted runtime configuration, and performed
  the reported import validation. Codex subsequently connected Account, Plans,
  and Users to the backend and added API integration tests.
- Codex converted the frontend to a Vite React SPA with React Router and native
  fetch using React state/effects, and tested navigation, cancellation, mock
  behavior, and the connected flows against the running local backend.

## Stack and commands

React 19, TypeScript, Vite 8, React Router, Tailwind CSS 4, and shadcn/ui.
TanStack Start, Router, Query, Nitro, SSR entry points, generated routes, and the
Lovable Vite wrapper have been removed. `src/main.tsx` mounts the app;
`src/App.tsx` defines the routes and layout. `index.html` supplies document
metadata and the original IBM Plex fonts. Google Fonts requires network access;
offline browsers use fallback fonts.

Use Node.js 22.15.0 (`.nvmrc`; dependencies require Node >=22.12) and npm 10.9.2
(bundled with that Node version).
Run commands from `client/`, independently of the backend's root npm project:

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 3100
```

Required validation:

```sh
npm run typecheck
npm run lint
npm run test
npm run build
```

The production build is static files in `dist/`. To inspect it locally:

```sh
npm run preview -- --host 127.0.0.1 --port 3100
```

Vite preview is a local inspection tool, not production hosting. No frontend
SSR process, database, environment file, or translation provider is required.

Frontend dependencies are locked in `client/package-lock.json`; use `npm ci`
for a clean, repeatable installation. The frontend and backend keep separate
manifests and lockfiles; no workspaces are configured. The migration preserves
the existing dependency versions and integrity hashes. Bun configuration and
runtime requirements are removed. The former Bun-specific minimum release age
setting has no equivalent in npm 10; dependency updates should be reviewed
separately from locked installs.

## Routes and design

The six URLs remain `/account`, `/plans`, `/users`, `/consumption`, `/records`,
and `/translation`. `/` redirects to `/account` using history replacement.
Unknown URLs show the existing not-found design. React Router links preserve
client-side navigation and browser back/forward. The sidebar, layout, styles,
forms, dialogs, loading/empty/success/error displays, and shadcn/ui components
are retained. A React error boundary retains the render-error recovery screen.

## Backend connection

Account, Plans, and Users use the shared typed native-fetch client in
`src/api/http.ts`. Start the existing backend separately using the root npm
commands and its configured PostgreSQL database. With API Base URL blank,
Vite proxies `/api` to `http://127.0.0.1:3000`. Override that development target
with a non-secret URL when needed:

```sh
BACKEND_PROXY_TARGET=http://127.0.0.1:3001 npm run dev -- --host 127.0.0.1 --port 3100
```

On Account, leave **API Base URL** blank for same-origin requests. To use a
different backend, enter an HTTP(S) URL or same-origin base path **without
`/api`**, click **Apply URL**, then connect the key. The existing backend does
not provide CORS middleware, so use the development proxy for local work.
Direct cross-origin requests need appropriate CORS support at that backend.

Create an account with a public account plan or enter an existing key and click
**Connect**. Authenticated requests send `x-api-key`; public requests omit it.
Keys stay in React memory only and disappear on reload. They are never written
to storage, cookies, files, logs, or public environment variables. The initial
creation key is revealed on Account until dismissed or until leaving that page.
Changing the backend URL clears authentication. Failed requests display real
backend errors and validation issues, with no automatic mock fallback.

Account reads the current plan from `GET /api/usage/account`, since there is no
account-details GET endpoint. No consumption writes were added to the connected
pages. Plan visibility is derived from `ownerAccountId`; `/api/plans/me` includes
public and owned plans, displayed once. Only owned private plans are editable.

## State, effects, and cancellation

Each page owns its read data, loading/error state, form values, and write status
in React state. Effects read data; event handlers perform writes. Successful
writes update the returned detail or increment a local refresh counter to read
relevant lists again. There is no shared cache or replacement query framework.
`useUserPlans` is a small effect for user-plan options, not a cache.

A connection change immediately aborts that connection's HTTP requests and
increments a connection ID. Pages remount on that ID, clearing account-specific
forms, dialogs, data, and write results. Read effects ignore results after
cleanup (including filter changes and navigation). Event-handler continuations
also check page lifetime and the captured connection signal before updating
state. Mock requests capture their original credentials instead of reading a
new account's key after a delay.

Aborting cannot undo a write already accepted by the backend; returning to a
page fetches its current data again.

## Remaining mock pages

Consumption, Records, and Translation continue using the original independent
in-memory mock API. Their loading and write state now use React effects/state;
the mock store, request IDs, replay/idempotency decisions, pagination, and
simulated translation behavior are retained. Translation retries reuse the
request ID and do not refund already-consumed units after a simulated failure.
These pages never call the real backend.

Real accounts, keys, users, and usage are not copied into that mock store.
Navigating to mock pages with a real key still shows mock authentication errors.
No demo-account bootstrap UI is added, so authenticated mock flows are not
independently usable from the connected Account page. Tests seed mock-only
accounts to verify those flows. The header identifies connected versus mock
pages. No translation provider or additional API integration was added.

## Production hosting requirements

Deploy `dist/` to static hosting with **SPA route fallback**: direct requests
and reloads for page URLs must serve `index.html`. Serve actual assets normally,
and route **`/api` to the backend before applying the SPA fallback**. Otherwise
API calls may incorrectly receive HTML instead of JSON.

Alternatively, configure API Base URL to a backend origin with appropriate CORS
support for the frontend origin, `Content-Type`, `x-api-key`, and the required
GET/POST/PATCH methods. Do not disable browser security. The Vite development
proxy is not included in the built files. Production hosting, reverse-proxy
configuration, CORS changes, and deployment are outside this task.

## Validation and limits

The tests cover HTTP contracts/errors/cancellation; all routes, redirect,
navigation/history and not-found behavior; connected account/plan/user flows;
and delayed reads/writes during identity changes, backend changes,
disconnection, and navigation. Delayed-response tests deliberately include a
transport that ignores abort, verifying that late results still cannot update
the UI. These are mocked HTTP tests, not proof of backend availability.

A separate browser check against the running local backend and PostgreSQL used
the Vite `/api` proxy and verified all six direct page URLs and reloads,
root redirect, browser back/forward, account creation and existing-key
reconnection, private plan creation/update, account plan changes, user
list/create/details/plan changes, and invalid-key HTTP 401 display. A separate
mock-page test verifies replay, record details, and simulated translation and
failure/retry behavior without any native fetch calls.

Lint retains seven pre-existing Fast Refresh warnings; the production build
retains a large-chunk warning. No checks or TypeScript strictness were weakened.
Exhaustive visual regression coverage and a deployed production host with API
routing have not been verified. Source synchronization instructions, Git
metadata, dependencies, secrets, build outputs, and caches are not committed.
