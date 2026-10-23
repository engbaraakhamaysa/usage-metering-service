# Performance Testing

Performance tests measure consumption, request replay, expected rejection, and usage queries. Response checks validate API decisions, while database verification compares stored counters with accepted units.

## Environment

- Test dates: October 20–21, 2026.
- CPU: Intel Core i7-1065G7, 4 physical cores / 8 logical CPUs.
- Memory: approximately 14 GiB.
- Node.js: 22.15.0.
- PostgreSQL: 18.6.
- k6: v2.3.0+dirty, installed through Snap.
- Application: compiled TypeScript running with Node.js.
- Database: `usage_metering_test`.
- API: `http://localhost:3001`.

The application, database, and load generator ran locally on the same machine. These results were not collected through Docker.

## Test Data and Method

Preparation creates ten accounts, each with one user and private account/user plans.

Each plan has:

- Monthly allowance: 2,000,000,000 units.
- Maximum units per request: 1,000.

Accepted requests consume one unit and use a new UUID.

Tests use a constant number of virtual users without an intentional delay. Each virtual user waits for its request to complete before sending another.

- **Single account:** all virtual users target the same account and user.
- **Multiple accounts:** virtual users are distributed across ten accounts.
- A virtual user is a load-generating execution context, not a separate database user.

`p95` is the response duration at or below which 95% of requests completed.

## Scenarios

| Script                         | Purpose                                                   |
| ------------------------------ | --------------------------------------------------------- |
| `consume-single-account.js`    | New consumption requests targeting one account            |
| `consume-multiple-accounts.js` | New consumption requests distributed across accounts      |
| `idempotency.js`               | Repeated requests using the same request ID               |
| `rejected.js`                  | Requests exceeding the account per-request limit          |
| `reads.js`                     | Account usage, user usage, and first-page history queries |

A quota rejection is an expected business decision, not an HTTP failure.

## Initial Results — October 20

Each scenario ran once for approximately ten seconds. No dedicated warm-up was recorded.

| Scenario             | VUs | Accounts | HTTP requests | Requests/s |    Average |        p95 |
| -------------------- | --: | -------: | ------------: | ---------: | ---------: | ---------: |
| New consumption      |   1 |        1 |         1,166 |     116.54 |    8.36 ms |   11.82 ms |
| New consumption      |  10 |        1 |         1,292 |     128.34 |   77.46 ms |   90.84 ms |
| New consumption      |  10 |       10 |         3,503 |     349.69 |   28.37 ms |   36.46 ms |
| New consumption      |  50 |        1 |         1,277 |     123.65 |  397.72 ms |  447.49 ms |
| New consumption      |  50 |       10 |         3,393 |     335.67 |  147.94 ms |  193.79 ms |
| Idempotent replay    |  10 |        1 |       2,367\* |   235.40\* | 42.09 ms\* | 52.51 ms\* |
| Rejected consumption |  10 |        1 |         1,438 |     142.99 |   69.51 ms |   87.64 ms |
| Mixed reads          |  10 |       10 |         9,525 |     950.56 |   10.33 ms |   16.08 ms |

All response checks passed, with zero HTTP failures.

\*Idempotency metrics include one initial setup request and 2,366 replay requests. Replay-only latency was not measured separately.

The one-VU baseline was retained from terminal output; no JSON summary was exported.

### Read Latency

The mixed-read scenario performs three requests sequentially per iteration.

| Endpoint                                 |  Average |      p95 |
| ---------------------------------------- | -------: | -------: |
| `GET /api/usage/account`                 |  9.01 ms | 14.05 ms |
| `GET /api/usage/users/:userId`           | 12.23 ms | 17.85 ms |
| `GET /api/usage/records?page=1&limit=10` |  9.75 ms | 15.11 ms |

The combined request rate is not the throughput of a single endpoint. Deep pagination was not measured.

### Correctness Verification

Idempotent replay returned the original record and decision with `duplicate: true`, without additional usage or records.

Rejected requests submitted 1,001 units against an account per-request limit of 1,000. All returned `account_request_limit`, created rejection records, and left counters unchanged.

After accepted traffic and idempotency setup:

- Accepted records and units: **10,632**.
- Sum of account counters: **10,632**.
- Sum of user counters: **10,632**.

After rejected traffic:

- Total records: **12,070**.
- Rejected records: **1,438**.
- Accepted units and both counter totals remained **10,632**.

Read requests left these totals unchanged.

## Repeated Results — October 21

Each configuration ran three times for 60 seconds. Warm-up traffic preceded the repeated measurements, but no separate warm-up was recorded before every configuration.

The application remained running, data accumulated, and configuration order was not randomized.

| Accounts | VUs | Run | Requests | Requests/s |   Average |       p95 |
| -------- | --: | --: | -------: | ---------: | --------: | --------: |
| 1        |  10 |   1 |    8,632 |     143.72 |  69.32 ms |  81.67 ms |
| 1        |  10 |   2 |    8,459 |     140.83 |  70.74 ms |  84.15 ms |
| 1        |  10 |   3 |    8,662 |     144.22 |  69.07 ms |  81.53 ms |
| 10       |  10 |   1 |   25,281 |     421.21 |  23.54 ms |  28.93 ms |
| 10       |  10 |   2 |   25,203 |     419.96 |  23.62 ms |  28.94 ms |
| 10       |  10 |   3 |   25,086 |     417.97 |  23.73 ms |  29.17 ms |
| 1        |  50 |   1 |    8,430 |     139.68 | 356.71 ms | 394.89 ms |
| 1        |  50 |   2 |    8,071 |     133.82 | 372.44 ms | 417.02 ms |
| 1        |  50 |   3 |    7,573 |     125.46 | 397.05 ms | 446.54 ms |
| 10       |  50 |   1 |   24,702 |     411.01 | 121.36 ms | 132.09 ms |
| 10       |  50 |   2 |   24,533 |     408.25 | 122.19 ms | 135.94 ms |
| 10       |  50 |   3 |   24,787 |     412.44 | 120.95 ms | 130.64 ms |

All completed runs passed response checks and database verification, with zero HTTP failures and no interrupted iterations.

The JSON summary for ten accounts, 10 VUs, run 2 was overwritten by an interrupted rerun. Its completed-run metrics were retained from terminal output. The interrupted rerun is excluded from the table.

Two preliminary ten-second runs with one account and 10 VUs measured:

| Run | Requests | Requests/s |  Average |       p95 |
| --- | -------: | ---------: | -------: | --------: |
| 1   |    1,237 |     122.89 | 80.85 ms | 106.71 ms |
| 2   |    1,367 |     135.67 | 72.90 ms |  85.40 ms |

Both passed response checks and database verification.

Final cumulative accepted units, accepted records, account counters, and user counters all equalled **207,001**. This includes preliminary runs, warm-up, and traffic processed during the interrupted rerun—not only the twelve completed measurements.

### Findings

- At 10 VUs, ten accounts achieved approximately three times the throughput of one account.
- Increasing concurrency to 50 VUs increased latency without improving throughput.
- This is consistent with per-account serialization, but database lock waits were not directly measured.
- Multiple backend changes occurred between rounds, so the results do not isolate the effect of any single code change.
- Read, rejection, and idempotency scenarios were not repeated in this round.

## History Index Evaluation

A B-tree index supports:

```sql
(account_id, created_at DESC NULLS LAST, id DESC NULLS LAST)
```

The query uses matching ordering:

```sql
ORDER BY created_at DESC NULLS LAST, id DESC NULLS LAST
```

The table contained 81,931 records, with 15,602 belonging to the selected account. The query retrieved the newest ten records with OFFSET 0.

Measurements used `EXPLAIN (ANALYZE, BUFFERS)` without adding records between query measurements.

| Configuration                | Execution time | Query plan                       |
| ---------------------------- | -------------: | -------------------------------- |
| Before index, measurement 1  |       5.027 ms | Sequential scan and top-N sort   |
| Before index, measurement 2  |       7.292 ms | Sequential scan and top-N sort   |
| Index with original ordering |       5.803 ms | Bitmap heap scan and top-N sort  |
| Index with matching ordering |       0.039 ms | Index scan without separate sort |

Matching the query's NULL ordering to the index allowed a direct ordered index scan.

The **0.039 ms** result is one SQL execution measurement. It excludes planning, the separate COUNT query, and HTTP processing. It is not an average or proof of an equivalent API latency improvement.

### Consumption Before and After the Index

Each run used ten accounts, ten VUs, and a 60-second duration.

| Index state | Run | Requests | Requests/s |  Average |      p95 |
| ----------- | --: | -------: | ---------: | -------: | -------: |
| Before      |   1 |   23,426 |     390.36 | 25.41 ms | 33.55 ms |
| Before      |   2 |   25,539 |     425.50 | 23.31 ms | 29.64 ms |
| Before      |   3 |   24,746 |     412.30 | 24.06 ms | 30.41 ms |
| After       |   1 |   23,781 |     396.25 | 25.03 ms | 31.71 ms |
| After       |   2 |   26,241 |     437.23 | 22.69 ms | 27.23 ms |
| After       |   3 |   26,449 |     440.04 | 22.54 ms | 26.59 ms |

All checks and database verification passed, with zero HTTP failures.

Final accepted units, account usage, user usage, and record count all equalled **158,402**, including 8,220 records generated before these six runs.

No clear consumption slowdown was observed. This does not establish that index maintenance is free or that the index caused higher throughput. The dataset grew, the server was restarted before the after-index runs, and cache/resource conditions were not controlled.

The index was retained for its demonstrated first-page history query benefit.

## Reproduce the Tests

### Requirements

- Node.js 22.15.0 and installed project dependencies.
- PostgreSQL database named `usage_metering_test`.
- `TEST_DATABASE_URL` configured in the root `.env`.
- k6 installed separately.

Run commands from the repository root. Do not run backend tests or other traffic against the test database during measurements.

### 1. Prepare

```bash
npm ci
NODE_ENV=test npm run db:migrate
npm run db:seed:test
npm run perf:prepare
npm run build
mkdir -p performance/results
```

Preparation refuses to overwrite an existing fixtures file. Clean up a previous preparation before creating another.

### 2. Start the Performance Server

In a separate terminal:

```bash
NODE_ENV=test PORT=3001 npm start
```

Restart this process after rebuilding if the code changes.

### 3. Warm Up

```bash
k6 run --vus 10 --duration 15s \
  performance/scripts/consume-single-account.js
```

Warm-up traffic is excluded from measurement tables but remains in database totals.

### 4. Run a Scenario

One account:

```bash
k6 run --vus 10 --duration 60s \
  performance/scripts/consume-single-account.js
```

Ten accounts:

```bash
k6 run --vus 10 --duration 60s \
  performance/scripts/consume-multiple-accounts.js
```

Change `--vus` to `50` to reproduce the higher-concurrency configuration.

Other scenarios:

```bash
k6 run performance/scripts/idempotency.js
k6 run performance/scripts/rejected.js
k6 run performance/scripts/reads.js
```

Run scenarios sequentially, not concurrently.

### 5. Save Results

Use a unique filename to avoid overwriting previous evidence:

```bash
measurement_id=$(date -u +%Y%m%dT%H%M%SZ)

k6 run --vus 10 --duration 60s \
  --summary-export="performance/results/${measurement_id}-multiple-accounts-10vus.json" \
  performance/scripts/consume-multiple-accounts.js
```

For repeated measurements, run each configuration three times and use a different output filename for each run.

### 6. Verify Stored Data

After each scenario, while no other traffic is running:

```bash
npm run perf:verify
```

Verification compares each performance account's counter and its single user's counter with accepted units in its records.

It checks cumulative totals across stored periods. It does not independently verify the month assignment of every record.

The accepted-consumption scripts report checks without correctness thresholds. Review the check results and HTTP failure rate manually; a successful process exit alone does not prove that every check passed.

### 7. Clean Up

Stop the performance server, then run:

```bash
npm run perf:cleanup
```

This removes the generated performance accounts and related data, then deletes the fixtures file. Public plans and saved result files are preserved.

`performance/data/fixtures.json` contains test API keys and must remain excluded from version control. Use the cleanup script rather than deleting this file manually.

## Limitations

- All components competed for resources on one local machine.
- Initial measurements were single ten-second runs; repeated consumption measurements were three 60-second runs per configuration.
- These are not long-duration stability or fixed-arrival-rate overload tests.
- Dataset size increased during testing, and scenario order was not randomized.
- CPU, memory, connection-pool waits, and database lock waits were not measured.
- Deep history pagination was not benchmarked.
- Database failures and concurrent plan changes were not exercised by these load scenarios.
- Results do not establish maximum production capacity or a production latency SLA.

## Related Documentation

- [Main README](../README.md)
- [Frontend](../client/README.md)
