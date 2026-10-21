# Performance Test Results

## Environment

- Test date: 2026-10-20
- Execution: local
- CPU: Intel Core i7-1065G7, 4 physical cores / 8 logical CPUs
- Memory: approximately 14 GiB reported by the operating system
- Node.js: 22.15.0
- PostgreSQL server: 18.6 (Ubuntu 18.6-0ubuntu0.26.04.1)
- k6: v2.3.0+dirty, installed through Snap
- Application: compiled TypeScript, executed with Node.js
- Database: dedicated `usage_metering_test` database
- API address: http://localhost:3001
- Load generator, application, and database ran on the same machine.

## Test Data

Ten accounts were created, each with one user and private account/user plans.

Each plan had:

- Monthly allowance: 2,000,000,000 units
- Maximum units per request: 1,000

Accepted consumption requests used one unit and a new UUID request ID.

Data accumulated between runs. The database was not reset between
scenarios.

## Method

Each scenario used a constant number of virtual users for approximately
10 seconds, without an intentional delay between iterations.

A virtual user waited for its request to finish before starting the next
iteration. These were concurrency-based tests, not fixed-arrival-rate
tests.

For multiple-account scenarios, virtual users were distributed across
the ten accounts:

- 10 VUs: one VU per account
- 50 VUs: five VUs per account

Consumption checks verified HTTP status, the expected decision, and
whether the request was new or a duplicate.

## Results

| Scenario             | VUs | Accounts | HTTP requests | Requests/s |    Average |        p95 | HTTP failures |
| -------------------- | --: | -------: | ------------: | ---------: | ---------: | ---------: | ------------: |
| New consumption      |   1 |        1 |         1,166 |     116.54 |    8.36 ms |   11.82 ms |            0% |
| New consumption      |  10 |        1 |         1,292 |     128.34 |   77.46 ms |   90.84 ms |            0% |
| New consumption      |  10 |       10 |         3,503 |     349.69 |   28.37 ms |   36.46 ms |            0% |
| New consumption      |  50 |        1 |         1,277 |     123.65 |  397.72 ms |  447.49 ms |            0% |
| New consumption      |  50 |       10 |         3,393 |     335.67 |  147.94 ms |  193.79 ms |            0% |
| Idempotent replay    |  10 |        1 |       2,367\* |   235.40\* | 42.09 ms\* | 52.51 ms\* |            0% |
| Rejected consumption |  10 |        1 |         1,438 |     142.99 |   69.51 ms |   87.64 ms |            0% |
| Mixed reads          |  10 |       10 |         9,525 |     950.56 |   10.33 ms |   16.08 ms |            0% |

`p95` is the response duration at or below which 95% of requests completed.

\*Idempotency HTTP metrics include one initial setup request and 2,366
replay requests. Replay-only latency was not separately reported.

All application response checks passed in every completed scenario.

The one-VU baseline was recorded from terminal output; its JSON summary
was not exported.

## Read Endpoint Latency

The mixed-read scenario executed these three requests sequentially in
each iteration. Its overall request rate combines all three endpoints.

| Endpoint                               |  Average |      p95 |
| -------------------------------------- | -------: | -------: |
| GET /api/usage/account                 |  9.01 ms | 14.05 ms |
| GET /api/usage/users/:userId           | 12.23 ms | 17.85 ms |
| GET /api/usage/records?page=1&limit=10 |  9.75 ms | 15.11 ms |

The scenario completed 3,175 iterations and 9,525 HTTP requests.

Only the first history page was measured. Deep pagination was not tested.

## Idempotency Verification

The setup request created one accepted record and consumed one unit.

The following 2,366 replay requests:

- Returned the original record ID
- Returned the original accepted decision
- Returned `duplicate: true`
- Did not increase usage or create additional records

## Rejection Verification

The rejected scenario submitted 1,001 units per request, exceeding the
account's per-request limit of 1,000.

All 1,438 requests:

- Returned HTTP 200 with `status: "rejected"`
- Returned `rejectionReason: "account_request_limit"`
- Created a new rejection record
- Did not increase account or user counters

A quota rejection is an expected business decision, not an HTTP failure.

## Database Verification

After the accepted consumption scenarios and idempotency setup:

- Accepted records: 10,632
- Accepted units: 10,632
- Sum of account counters: 10,632
- Sum of user counters: 10,632

After the rejected scenario:

- Total records: 12,070
- Accepted records: 10,632
- Rejected records: 1,438
- Accepted units and counters remained at 10,632

The read scenario left all totals unchanged.

`npm run perf:verify` confirmed that each performance account's counter
and its single user's counter matched their accepted units.

The verification script compares cumulative units across stored periods.
It does not independently verify the assignment of every record to a
monthly period.

## Findings

- Distributing requests across ten accounts produced approximately
  2.7 times the throughput of targeting one account at the same VU count.
- Increasing concurrency from 10 to 50 VUs increased latency without
  improving throughput in these runs.
- This behavior is consistent with per-account serialization during
  consumption. Database lock waits were not directly measured.
- Idempotent replays avoided additional consumption and record creation.
- Rejected requests preserved counters while recording rejection history.
- Read requests completed without changing stored usage data.

These findings describe the measured local scenarios and do not establish
maximum production capacity.

## Reproduction

### Prerequisites

- Node.js and project dependencies
- PostgreSQL test database
- `TEST_DATABASE_URL` configured
- k6 installed separately

Apply migrations and prepare data:

```bash
NODE_ENV=test npm run db:migrate
npm run db:seed:test
npm run perf:prepare
npm run build
```

The preparation script refuses to overwrite an existing fixtures file.
Clean up a previous performance run before preparing a new one.

Start the application in a separate terminal:

```bash
NODE_ENV=test PORT=3001 npm start
```

### Baseline: One Account, One VU

```bash
k6 run --vus 1 --duration 10s \
  performance/scripts/consume-single-account.js
```

### One Account, 10 VUs

```bash
k6 run --vus 10 --duration 10s \
  --summary-export=performance/results/single-account-10vus.json \
  performance/scripts/consume-single-account.js
```

### Ten Accounts, 10 VUs

```bash
k6 run --vus 10 --duration 10s \
  --summary-export=performance/results/multiple-accounts-10vus.json \
  performance/scripts/consume-multiple-accounts.js
```

### One Account, 50 VUs

```bash
k6 run --vus 50 --duration 10s \
  --summary-export=performance/results/single-account-50vus.json \
  performance/scripts/consume-single-account.js
```

### Ten Accounts, 50 VUs

```bash
k6 run --vus 50 --duration 10s \
  --summary-export=performance/results/multiple-accounts-50vus.json \
  performance/scripts/consume-multiple-accounts.js
```

### Idempotent Replay

```bash
k6 run \
  --summary-export=performance/results/idempotency-10vus.json \
  performance/scripts/idempotency.js
```

### Rejected Consumption

```bash
k6 run \
  --summary-export=performance/results/rejected-10vus.json \
  performance/scripts/rejected.js
```

### Mixed Reads

```bash
k6 run \
  --summary-export=performance/results/reads-10vus.json \
  performance/scripts/reads.js
```

### Verify Stored Data

After each scenario finishes, while no other requests are being sent:

```bash
npm run perf:verify
```

Exact request counts may differ between runs. Compare counter changes
with the accepted units generated by each run.

`performance/data/fixtures.json` contains test API keys and must remain
excluded from version control.

## Limitations

- These are short, single-run local measurements.
- No dedicated warm-up or repeated-run statistical analysis was performed.
- Data volume increased between scenarios.
- The load generator competed with the application and database for
  local resources.
- CPU usage, memory usage during testing, connection-pool waits, and
  database lock waits were not measured.
- VU-based tests reduce their request rate when responses slow down;
  fixed-arrival-rate overload behavior was not tested.
- History performance was measured only for the first page with a limit
  of ten records.
- Results do not establish a production latency SLA.
- Long-duration stability, database failures, and concurrent plan updates
  were not tested in this performance round.

## Cleanup

Stop the performance server, then remove the generated test data:

```bash
npm run perf:cleanup
```

This removes the performance accounts and their related data, then deletes
the fixtures file. Public plans and saved performance results are preserved.
