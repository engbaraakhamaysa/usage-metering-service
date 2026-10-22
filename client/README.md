# Usage Metering frontend

Initial frontend generated with [Lovable](https://lovable.dev), imported from
https://github.com/engbaraakhamaysa/screenshot-exact-match at commit
`42a2f49856049fc8a6c5f2849fd214150623cb02`. This repository is maintained separately;
it does not synchronize with the source repository or Lovable.

## AI contributions

- Lovable generated the initial frontend.
- Codex imported it into `client/`, adjusted runtime configuration, and performed
  the reported import validation. Codex subsequently connected Account, Plans,
  and Users to the backend, then connected Consumption and Records with safe
  replay and real usage-record pagination. Codex organized the five connected
  pages into local components and hooks, added browser-counted text consumption,
  and removed the simulated Translation page and mock API.
- Codex converted the frontend to a Vite React SPA with React Router and native
  fetch using React state/effects, and verified navigation, cancellation,
  replay behavior, and connected flows against the running local backend.

## Stack and commands

React 19, TypeScript, Vite 8.3.5, React Router, Tailwind CSS 4, and shadcn/ui.
TanStack Start, Router, Query, Nitro, SSR entry points, generated routes, and the
Lovable Vite wrapper have been removed. `src/main.tsx` mounts the app;
`src/App.tsx` defines the routes and layout. `index.html` supplies document
metadata and the original IBM Plex fonts. Google Fonts requires network access;
offline browsers use fallback fonts.

Use Node.js 22.15.0 (`.nvmrc`; dependencies require Node >=22.12) and npm 10.9.2
(bundled with that Node version).
Run commands from `client/`, independently of the backend's root npm project.
If npm 10 rejects optional WebAssembly entries in the lockfile, use temporary
npm 11.6.2 for installation: `npx --yes npm@11.6.2 ci`. This clean-install path
was verified on Node 22.15.0 without changing the locked dependency versions.

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 3100
```

Required validation:

```sh
npm run typecheck
npm run lint
npm run build
npm audit
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

The five pages are `/account`, `/plans`, `/users`, `/consumption`, and `/records`.
The former `/translation` URL redirects to `/consumption` with history replacement.
`/` redirects to `/account` using history replacement.
Unknown URLs show the existing not-found design. React Router links preserve
client-side navigation and browser back/forward. The sidebar, layout, styles,
forms, dialogs, loading/empty/success/error displays, and shadcn/ui components
are retained. A React error boundary retains the render-error recovery screen.

## Backend connection

Account, Plans, Users, Consumption, and Records use the shared typed native-fetch client in
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
account-details GET endpoint. Consumption writes are made only from the
Consumption page. Plan visibility is derived from `ownerAccountId`; `/api/plans/me` includes
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
state.

Aborting cannot undo a write already accepted by the backend; returning to a
page fetches its current data again.

## Feature structure

Each feature stays under `src/pages/{account,plans,users,consumption,records}/`.
Its `*Page.tsx` entry point composes meaningful sections from local `components/`;
`useAccountPage`, `usePlansPage`, `useUsersPage`, `useConsumptionPage`, and
`useRecordsPage` own the page state, effects, and write handlers. `useUsage` handles
month/selection-sensitive usage reads separately from consumption writes.
User-plan options and detail dialogs keep their feature-specific state locally.
Shared HTTP contracts, parsing, and error handling stay in `src/api/`.

## Consumption and records

Consumption reads the connected account's real users, account usage, and selected
user usage. Both usage summaries show used units, remaining units, current plan
allowances, per-request limits, and the UTC period. Historical months retain the
backend's `remainingUnits: null` as "Not applicable". Invalid/future month filters
are rejected locally, with backend validation errors still displayed if returned.

### Text consumption

Manual units and **Text consumption** share the existing consumption endpoint and
real connected users. Text is counted entirely in the browser: trim it, return zero
if empty, otherwise split on one or more whitespace characters (`/\s+/`). One token
is one word and one unit. Repeated spaces, tabs, and newlines do not add units;
punctuation attached to a word does not add words. Arabic and English use the same
rule. Empty/whitespace-only text cannot be submitted.

This is a metered word-count demo convention. It performs no translation or external
processing. The backend receives only `{ userId, requestId, requestedUnits }`, never
the text; it validates units and quotas but cannot verify the original text or enforce
this word-counting rule. Text and its replay snapshot remain in React memory only.

### Decisions and replay

Each **Consume** or **Consume text** click creates a new logical request with one UUID and the actual
backend payload `{ userId, requestId, requestedUnits }`. A synchronous in-flight
guard and disabled inputs/buttons prevent simultaneous submissions. A saved
attempt captures its mode, user, units, UUID, and original text when applicable.
The request payload is frozen and never changed when either form is edited.
The shared **Last consumption request** card identifies the saved mode and payload,
and displays the original text snapshot for text attempts. **Retry / replay last request**
always uses that original snapshot, user, units, and UUID, including after a network error
or navigation away and back. The saved attempt and last confirmed decision live
only in session memory and are cleared on reload, disconnect, key connection,
or backend URL changes. No keys, text snapshots, or saved requests are persisted to browser storage.
The text form itself resets when navigating away; the saved attempt remains available
until replaced or the session changes. Both forms share the selected user with the
usage summary; replay still uses the saved user if the selection has changed.

Network errors, unexpected responses, and HTTP 5xx leave an uncertain result:
the backend might already have processed the request. New consumption is blocked
until the saved request is retried or the user explicitly chooses **Start a new
request anyway**, which can consume additional units. Replay returns the original
decision without double counting. Edited fields are used only for a new request;
there is no action that reuses an old UUID with edited input.

The backend returns a full record with `status`, `rejectionReason`, `id`, and
`duplicate`. HTTP 200 with `status: "rejected"` is a completed business decision,
shown alongside its reason and record ID. Authentication, validation, idempotency
conflict (HTTP 409), and server errors remain HTTP errors. Usage-refresh errors
are separate from write errors: they cannot turn a confirmed decision into a
failed consumption. Completing a decision refreshes both account and selected-user
usage and returns the month filter to the current UTC month. **Refresh usage**
retries reads independently.

Records sends the backend's `page` and `limit` query parameters, reads
`{ records, pagination }`, and displays the returned metadata. It preserves the
backend's newest-first ordering without sorting locally, supports limits up to
100, and fetches each detail from `/api/usage/records/:id`. Loading, empty, and
HTTP error states remain explicit. Revisiting the page fetches fresh records,
including decisions made on Consumption. Connection changes reset pagination,
details, usage, and saved requests; effect cleanup ignores late responses from
old sessions, pages, user selections, months, and record pages.

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

Frontend automated tests have been removed: there is no frontend test runner,
test setup, test configuration, or `test`/`test:watch` command. Verification now
relies on TypeScript checks, lint, production builds, dependency audits, and
manual browser testing. Backend tests and their configuration remain separate
and unchanged.

Run `npm ci` (or the npm 11.6.2 workaround above), `npm run typecheck`,
`npm run lint`, `npm run build`, and `npm audit`. When dependencies are changed, preserve the committed security
updates and avoid unrelated upgrades. Vite remains pinned to 8.3.5; the old
rolldown 1.2.1 override must not be restored. If npm 10 encounters the known
`edgesOut` error during dependency updates, use npm 11.6.2 temporarily with
Node 22.15.0, for example `npx --yes npm@11.6.2 install --package-lock-only`.

With the local backend and PostgreSQL running, manually check all five direct
page URLs and reloads, root redirect, browser back/forward, account creation and
existing-key reconnection, private plan creation/update, account plan changes,
user list/create/details/plan changes, and invalid-key HTTP 401 display through
the Vite `/api` proxy. Also verify accepted and rejected consumption, replay with
unchanged counters, record ordering/pagination/details, and connection changes.
Verify the former `/translation` redirect to `/consumption`, too.

For this refactor, browser verification against the running local backend and
PostgreSQL exercised account creation/key connection, public/owned plans, private
plan creation/update, account plan changes, and user creation/details/plan changes.
It also covered manual and text consumption, English/Arabic/whitespace/empty counts,
accepted and rejected decisions, unchanged rejection counters, exact replay after
editing text/user/units, no new record or increment on replay, Records pagination,
details/order, direct routes/reloads, root and former Translation redirects,
back/forward navigation, and session changes.

Browser interception additionally simulated a lost response after a real committed
write, a usage-refresh failure, a held consumption response (shared pending guard),
delayed user-usage responses, and an old write response arriving after an account
switch; these conditions are distinct from actual backend
outages. Typecheck, lint, build, and `npm audit` passed (zero vulnerabilities).
Dependencies and the npm lockfile were unchanged, so no new installation was needed.
No frontend automated test files, runners, or dependencies were added.

Lint retains seven pre-existing Fast Refresh warnings; the production build
retains a large-chunk warning. TypeScript strictness is unchanged. Automated
frontend regression coverage is no longer available; a deployed production
host with API routing has not been verified. Source synchronization
instructions, Git metadata, dependencies, secrets, build outputs, and caches
are not committed.
