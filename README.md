# Usage Metering and Quota Service

A usage tracking and quota enforcement service built with TypeScript, Express, and PostgreSQL, with a React management interface.

Applications with usage-based plans need to manage a shared allowance for a company while giving each user their own limits. This project provides a central place to manage those plans and track consumption, helping applications distribute their available resources across users.

## Features

- Account creation and API key authentication.
- Account-scoped users, plans, usage, and history.
- Predefined and private account/user plans.
- Monthly allowances and per-request limits at both levels.
- Atomic consumption with concurrency control.
- Account-scoped idempotency for safe retries.
- Current and historical monthly usage.
- Paginated consumption records.
- A React interface with manual and character-based consumption.

## Quick Start

### Requirements

- Docker Engine with Docker Compose.

### Run

From the repository root:

```bash
docker compose up --build
```

Startup automatically:

1. Starts PostgreSQL and waits for readiness.
2. Applies database migrations.
3. Seeds missing predefined plans.
4. Starts the backend and frontend.

Open:

http://localhost:8080

Leave **API Base URL** blank to use the included API proxy.

The Docker database is separate from any locally configured development database. Compose includes demo database credentials for local use.

### Stop

```bash
docker compose down
```

Database data is stored in a named volume and is retained when containers are removed.

### Start Again

```bash
docker compose up -d
```

## Try the Application

1. Create an account using a predefined account plan.
2. Copy and save the returned API key.
3. Create users and assign their user plans.
4. Open **Consumption** and submit units for a user.
5. Inspect the decision and remaining allowances.
6. Use **Retry / replay** to resend the saved request without counting it again.
7. Open **Records** to inspect consumption history.
8. Create or edit private plans and change assignments to explore their effect.

API keys are kept in browser memory only. After reloading the page, reconnect using your saved key.

Text consumption counts one Unicode code point as one unit, including whitespace. Empty or whitespace-only input is blocked. Counting happens in the browser; the backend receives units, not the original text.

### Example Scenario

Create a new account named **Foothill** using the **Starter** account plan, then create:

- **baraa** on the **Basic** user plan.
- **ahmad** on the **Premium** user plan.

Start with no usage in the current month. Use manual consumption and generate a new request for each submission, except when replaying.

| Request                                            | Expected result                 | Account usage |
| -------------------------------------------------- | ------------------------------- | ------------: |
| baraa: 5 units                                     | Accepted                        |             5 |
| Replay baraa's request                             | Duplicate; no additional usage  |             5 |
| baraa: 11 units                                    | Rejected: user request limit    |             5 |
| ahmad: 100 units                                   | Accepted                        |           105 |
| ahmad: eight additional requests of 100 units each | All accepted                    |           905 |
| ahmad: 96 units                                    | Rejected: account monthly limit |           905 |

The account has only **95 units remaining**, so ahmad's request for 96 units is rejected.

Change the account plan from **Starter** to **Pro**, then submit a **new** ahmad request for 96 units.

The request is accepted:

- Account usage becomes **1,001 of 10,000** units.
- ahmad's usage becomes **996 of 1,000** units.
- baraa's usage remains **5 of 100** units.

Changing the plan preserves existing usage and requires no client code changes.

Replaying the earlier rejected request still returns its original rejection.

## Predefined Plans

| Type    | Plan    | Monthly allowance | Maximum units per request |
| ------- | ------- | ----------------: | ------------------------: |
| Account | Starter |             1,000 |                       100 |
| Account | Pro     |            10,000 |                     1,000 |
| User    | Basic   |               100 |                        10 |
| User    | Premium |             1,000 |                       100 |

Public plans are read-only through the API. Accounts can create and update their own private plans.

An account may own multiple plans but has one assigned account plan at a time. Users sharing a plan keep separate usage totals.

## Consumption Rules

- Units must be positive integers, up to 2,147,483,647.
- Every request must satisfy both account and user limits.
- Accepted consumption adds the same units to both counters.
- Rejected consumption does not increase either counter.
- Monthly periods follow UTC calendar months.
- Processing time is captured after acquiring the account lock.
- Changing a plan preserves existing usage and request history.
- Remaining allowance is zero if the current limit is below existing usage.
- Reusing a request ID with identical input returns the original decision.
- Reusing it with a different user or unit count returns HTTP 409.
- Request IDs are unique within an account.

Consumption runs inside a database transaction. An account row lock serializes competing consumption requests for that account, and both counters and the decision record are committed together.

## Product Assumptions and Decisions

The following choices fill in behavior not fully specified by the assignment.

| Decision                       | Behavior and reasoning                                                                                                                             |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quota rejection                | HTTP 200 with `status: "rejected"`. The request was evaluated successfully, but a business rule prevented consumption.                             |
| Rejection priority             | Account request limit, account monthly allowance, user request limit, then user monthly allowance. This provides one predictable reason.           |
| Idempotency scope              | `(account_id, request_id)` allows independent accounts to use the same request ID.                                                                 |
| Replay after changes           | Return the original decision so a retry cannot become a new action. This applies after plan changes and across months.                             |
| Conflicting replay             | Return HTTP 409 when the same ID is used with different input, avoiding ambiguity.                                                                 |
| Historical remaining allowance | Return `null` for previous months because historical plan-limit snapshots are not stored. Reported `currentPlan` describes the current assignment. |
| Plan names                     | Private names are unique within an account and plan type, allowing independent account naming.                                                     |
| User names                     | Names are unique within an account but may repeat across accounts.                                                                                 |
| Account creation               | New accounts select a public account plan because they do not yet own private plans.                                                               |
| Plan assignment                | Allow public plans or privately owned plans of the correct type, preventing another account's private plans from being assigned.                   |
| Example action                 | Character-based consumption demonstrates metering without an external processing service.                                                          |

## API

Protected endpoints require the account's key:

```http
x-api-key: YOUR_API_KEY
```

JSON request bodies use:

```http
Content-Type: application/json
```

| Method | Endpoint                   | Purpose                                  |
| ------ | -------------------------- | ---------------------------------------- |
| POST   | `/api/accounts`            | Create an account and return its API key |
| PATCH  | `/api/accounts/me/plan`    | Change the account plan                  |
| GET    | `/api/plans`               | List public plans                        |
| GET    | `/api/plans/me`            | List public and owned plans              |
| POST   | `/api/plans`               | Create a private plan                    |
| PATCH  | `/api/plans/:id`           | Update an owned private plan             |
| POST   | `/api/users`               | Create a user                            |
| GET    | `/api/users`               | List account users                       |
| GET    | `/api/users/:id`           | Get a user                               |
| PATCH  | `/api/users/:id/plan`      | Change a user's plan                     |
| POST   | `/api/usage/consume`       | Consume units or replay a request        |
| GET    | `/api/usage/account`       | Get account usage                        |
| GET    | `/api/usage/users/:userId` | Get user usage                           |
| GET    | `/api/usage/records`       | List consumption records                 |
| GET    | `/api/usage/records/:id`   | Get a consumption record                 |

Account creation and public plan listing do not require an API key.

Plan lists accept an optional `planType=account` or `planType=user` filter. Usage queries accept `month=YYYY-MM`; omit it for the current month.

History accepts `page` and `limit`, defaulting to 1 and 10. The maximum limit is 100.

### API Request Examples

Use `http://localhost:8080` as the base URL when running with Docker Compose.

Send JSON bodies with `Content-Type: application/json`. Protected endpoints also require `x-api-key: YOUR_API_KEY`.

#### Create an Account

First, get available public account plans:

```http
GET /api/plans?planType=account
```

Use a returned plan ID to create an account. No API key is required:

```http
POST /api/accounts
```

```json
{
  "name": "Foothill",
  "planId": "PUBLIC_ACCOUNT_PLAN_UUID"
}
```

The response includes the account details and an `apiKey`. Save this key immediately; it cannot be retrieved later. Only its hash is stored in the database.

#### Create a User

Get available public and owned user plans using your API key:

```http
GET /api/plans/me?planType=user
```

Then create a user:

```http
POST /api/users
```

```json
{
  "name": "baraa",
  "planId": "USER_PLAN_UUID"
}
```

The user belongs to the account identified by the API key.

#### Create a Private Plan

```http
POST /api/plans
```

```json
{
  "name": "Foothill Custom",
  "planType": "account",
  "monthlyAllowance": 5000,
  "maxUnitsPerRequest": 200
}
```

The plan belongs to the authenticated account. Use `"planType": "user"` to create a user plan.

#### Update a Private Plan

```http
PATCH /api/plans/PRIVATE_PLAN_UUID
```

```json
{
  "monthlyAllowance": 8000,
  "maxUnitsPerRequest": 300
}
```

Only the owning account can update a private plan. Public plans cannot be edited.

#### Change an Assigned Plan

Change the authenticated account's plan:

```http
PATCH /api/accounts/me/plan
```

```json
{
  "planId": "ACCOUNT_PLAN_UUID"
}
```

Change a user's plan:

```http
PATCH /api/users/USER_UUID/plan
```

```json
{
  "planId": "USER_PLAN_UUID"
}
```

Plans must have the correct type and be public or owned by the authenticated account. Changing a plan preserves existing usage and history.

### Consumption Request

Replace the placeholders with valid UUIDs:

```json
{
  "userId": "USER_UUID",
  "requestId": "REQUEST_UUID",
  "requestedUnits": 5
}
```

Generate a new UUID for each new logical action. Reuse the same UUID and payload when retrying an uncertain result.

The response contains the saved record, including:

- `id`
- `status`
- `rejectionReason`
- `requestedUnits`
- `duplicate`

Rejection reasons:

- `account_request_limit`
- `account_monthly_limit`
- `user_request_limit`
- `user_monthly_limit`

HTTP errors use an `error` field. Validation errors also include an `errors` array.

## Testing

Backend tests use Jasmine, Supertest, and a separate PostgreSQL database named `usage_metering_test`.

For local development and testing, copy the example configuration:

```bash
cp .env.example .env
```

Edit `.env` with your local PostgreSQL credentials. Keep `.env` out of version control.

Docker Compose uses the configuration in `compose.yaml` and does not require this file.

```dotenv
DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/usage_metering
TEST_DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/usage_metering_test
PORT=3000
```

Create both databases first. Use your own database credentials. These URLs refer to a host PostgreSQL installation, not the internal Docker database.

With Node.js 22.15.0, run from the repository root:

```bash
npm ci
NODE_ENV=test npm run db:migrate
npm run db:seed:test
npm test
```

The latest local run passed **83 of 83 specs**. Tests cover API key validation, account isolation, plan management, consumption, historical usage, idempotency, and concurrency.

Do not run performance traffic and backend tests against the same test database simultaneously.

## Performance

Performance scenarios use k6 and include:

- Consumption within one account.
- Consumption across multiple accounts.
- Idempotent request replay.
- Expected rejection.
- Usage and history queries.

Response checks validate decisions, while a separate verification script compares stored counters with accepted units.

Some scenarios do not define correctness thresholds. Their check results must be reviewed manually; a successful process exit alone is not sufficient.

See [performance/README.md](performance/README.md) for results, environment details, limitations, and reproduction commands.

## Technology

- **Backend:** TypeScript, Express, Drizzle ORM.
- **Database:** PostgreSQL.
- **Frontend:** React, TypeScript, Vite, React Router, Tailwind CSS, shadcn/ui.
- **Backend tests:** Jasmine and Supertest.
- **Performance tests:** k6.
- **Local deployment:** Docker Compose and Nginx.

## Limitations

- API keys and saved replay requests are kept in browser memory and disappear on reload. Reconnect using the saved API key.
- Navigating away before account creation completes may discard the returned API key. Key recovery and rotation are not implemented.
- Historical plan-limit snapshots are not stored, so remaining allowances for previous months are returned as `null`.
- Offset pagination may shift when new records are inserted. Record lists and total counts may reflect different database snapshots.
- Per-account locking processes consumption requests sequentially within each account, limiting throughput under heavy traffic.
- Character counting happens in the browser. The backend validates submitted units without receiving or verifying the original text.
- Docker Compose is configured for local evaluation using demo database credentials and plain HTTP.

## AI Assistance

- **Lovable** generated the initial frontend.
- **Codex** assisted with frontend import, backend integration, refactoring, and code review.

Frontend work was developed on a separate branch. A required GitHub Actions check restricted changes from the `client` branch to the `client/` directory.

I reviewed changes incrementally and manually exercised the main application flows. Backend tests and frontend checks helped validate the implementation. Relevant Codex-assisted commits include co-author attribution.

## Further Documentation

- [Frontend](client/README.md)
- [Performance testing and results](performance/README.md)
