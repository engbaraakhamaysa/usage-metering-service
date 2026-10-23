# Usage Metering Frontend

A React interface for managing accounts, plans, users, consumption, and usage history.

## Pages

- **Account:** Create an account, connect using an API key, and change the account plan.
- **Plans:** View public and owned plans, and create or update private plans.
- **Users:** Create users, view their details, and change their plans.
- **Consumption:** Inspect usage, consume manual units or text-based units, and replay requests.
- **Records:** Browse consumption history with pagination and record details.

## Local Development

Use Node.js 22.15.0 and npm 10.9.2. Start the backend separately on port 3000.

From `client/`:

```bash
npm ci
npm run dev
```

Open the URL printed by Vite.

## Backend Connection

Leave **API Base URL** blank to use the development proxy, which forwards `/api` requests to `http://127.0.0.1:3000`.

To change the development proxy target:

```bash
BACKEND_PROXY_TARGET=http://127.0.0.1:3001 npm run dev
```

Alternatively, enter a backend URL without `/api` in the Account page and click **Apply URL**. Direct requests to another origin require appropriate CORS support from that backend.

## API Keys

- Create an account and save the returned API key, or connect using an existing key.
- Authenticated requests send the key through the `x-api-key` header.
- Keys are held in memory only and disappear on page reload.
- Changing the connection clears account-specific data and saved requests.

Stay on the Account page until account creation completes and the key appears. Navigating away before the response arrives can discard the returned key.

## Consumption and Replay

Manual consumption accepts a positive integer number of units.

Text consumption counts one Unicode code point as one unit using:

```ts
Array.from(text).length;
```

Spaces, tabs, and line breaks are included. Empty or whitespace-only text is blocked. Combining marks and compound emoji may count as multiple units.

Only the calculated units, user ID, and request ID are sent to the backend, not the original text.

Each new submission generates a UUID. **Retry / replay** reuses the original user, units, request ID, and saved text snapshot, even after editing the form.

If a response is lost, retry the saved request instead of creating a new one to avoid additional consumption.

## Usage and Records

- View account and selected-user usage.
- Query the current or a previous UTC month.
- Display accepted and rejected decisions with rejection reasons.
- Browse records with pagination and inspect individual record details.
- Historical remaining allowance is displayed as not applicable because the backend returns `null`.

## Structure

| Location          | Responsibility                                  |
| ----------------- | ----------------------------------------------- |
| `src/pages/`      | Feature pages, local components, and hooks      |
| `src/api/`        | Shared HTTP client and error handling           |
| `src/context/`    | Connection state and saved consumption attempts |
| `src/components/` | Shared layout and UI components                 |
| `src/App.tsx`     | Routes and application layout                   |
| `src/main.tsx`    | Application entry point                         |

Data fetching uses native `fetch`, `useState`, and `useEffect`. Pages handle loading, empty, success, and error states.

## Checks

Run from `client/`:

```bash
npm run typecheck
npm run lint
npm run build
npm audit
```

Frontend automated tests are not included. Verification uses these checks and manual browser testing.

The production build is written to `dist/`. The Vite development proxy is not included in the built files.

Seven existing Fast Refresh lint warnings and a bundle-size warning remain.

## Technology

- React and TypeScript.
- Vite.
- React Router.
- Tailwind CSS.
- shadcn/ui.
- ESLint and Prettier.

## AI Assistance

The initial frontend was generated with Lovable and imported from:

https://github.com/engbaraakhamaysa/screenshot-exact-match

Source commit: `42a2f49856049fc8a6c5f2849fd214150623cb02`.

Codex assisted with importing, backend integration, refactoring, and review. Relevant commits include co-author attribution.

See the [main README](../README.md) for the service documentation and example walkthrough.
