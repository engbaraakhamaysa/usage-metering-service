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
  mock account creation.

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
bun run build
bun run test
```

To run the production SSR build locally after `bun run build`:

```sh
PORT=3100 node .output/server/index.mjs
```

`bun run preview --host 127.0.0.1 --port 3100` also previews the build.
Port 3100 avoids the backend's default port 3000. No backend service, database,
API credentials, environment file, or translation provider is required.
Google Fonts supplies the original IBM Plex fonts; offline browsers use fallbacks.

## Framework and behavior

The original React 19, TanStack Start file routing, Vite 8, Tailwind 4, SSR
error wrapper, and Lovable Vite configuration helper are retained. The helper
already registers the framework plugins; do not duplicate them. Nitro's preset
is explicitly `node-server` instead of the helper's Cloudflare default, solely
to support a standalone local Node process. No deployment is configured here.

The six pages are `/account`, `/plans`, `/users`, `/consumption`, `/records`, and
`/translation`; `/` redirects to `/account`. Styles, components, interactions,
and in-memory mock implementations are imported unchanged. The API Base URL
field is display/demo configuration only. Session keys and mock changes are
in-memory and reset on reload. Translation output is simulated. No real API
or translation provider has been integrated.

The existing test suite contains one routing test; it is not comprehensive
interaction or visual regression coverage. Import validation also checks the
six pages in a browser and mock account creation.

Source repository synchronization instructions, `.lovable` metadata, Git
metadata, dependencies, secrets, and build artifacts are excluded. Generated
`src/routeTree.gen.ts` is retained because routes and tests import it; let the
TanStack plugin regenerate it rather than editing it manually.
