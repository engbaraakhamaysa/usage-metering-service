# Performance Test Results

## Environment

- Test dates: 2026-10-20 and 2026-10-21
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

Each preparation created ten accounts, each with one user and private
account and user plans.

Each plan had:

- Monthly allowance: 2,000,000,000 units
- Maximum units per request: 1,000

Accepted consumption requests used one unit and a new UUID request ID.

Data accumulated between runs within each test round. Performance data
from the initial round was cleaned up before preparing the current round.

## Common Method

Tests used a constant number of virtual users, without an intentional
delay between iterations.

A virtual user waited for its request to finish before starting the next
iteration. These were concurrency-based tests, not fixed-arrival-rate
tests.

For single-account scenarios, all virtual users targeted the same account
and its single user.

For multiple-account scenarios, virtual users were distributed across
the ten accounts:

- 10 VUs: one VU per account
- 50 VUs: five VUs per account

A virtual user represents a load-generating execution context, not a
separate user stored in the database.

Consumption checks verified HTTP status, the expected decision, and
whether the request was new or a duplicate.

`p95` is the response duration at or below which 95% of requests completed.

## Initial Round — 2026-10-20

### Method

Each scenario ran once for approximately ten seconds. No dedicated
warm-up was recorded for this round.

### Results

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

\*Idempotency HTTP metrics include one initial setup request and 2,366
replay requests. Replay-only latency was not separately reported.

All application response checks passed in every completed scenario.

The one-VU baseline was recorded from terminal output; its JSON summary
was not exported.

### Read Endpoint Latency

The mixed-read scenario executed these three requests sequentially in
each iteration. Its overall request rate combines all three endpoints.

| Endpoint                               |  Average |      p95 |
| -------------------------------------- | -------: | -------: |
| GET /api/usage/account                 |  9.01 ms | 14.05 ms |
| GET /api/usage/users/:userId           | 12.23 ms | 17.85 ms |
| GET /api/usage/records?page=1&limit=10 |  9.75 ms | 15.11 ms |

The scenario completed 3,175 iterations and 9,525 HTTP requests.

Only the first history page was measured. Deep pagination was not tested.

### Idempotency Verification

The setup request created one accepted record and consumed one unit.

The following 2,366 replay requests:

- Returned the original record ID
- Returned the original accepted decision
- Returned `duplicate: true`
- Did not increase usage or create additional records

### Rejection Verification

The rejected scenario submitted 1,001 units per request, exceeding the
account's per-request limit of 1,000.

All 1,438 requests:

- Returned HTTP 200 with `status: "rejected"`
- Returned `rejectionReason: "account_request_limit"`
- Created a new rejection record
- Did not increase account or user counters

A quota rejection is an expected business decision, not an HTTP failure.

### Database Verification

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

### Findings

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

## Current Version Round — 2026-10-21

### Implementation Context

The current implementation reads the account and user usage counters
in one query instead of two separate queries.

Other backend changes were also made after the initial performance
round, including usage reporting and coordination of plan updates with
consumption.

The two rounds therefore do not isolate the performance effect of
combining the counter queries. No causal speedup is claimed.

### Preliminary Measurements

Before the repeated 60-second runs, two ten-second runs were performed
against one account with 10 VUs.

| Run | Requests | Requests/s |  Average |       p95 | HTTP failures |
| --: | -------: | ---------: | -------: | --------: | ------------: |
|   1 |    1,237 |     122.89 | 80.85 ms | 106.71 ms |            0% |
|   2 |    1,367 |     135.67 | 72.90 ms |  85.40 ms |            0% |

All response checks and database verification passed.

These preliminary measurements are kept separate from the repeated
60-second measurements below.

### Repeated-Run Method

Four consumption configurations were measured:

- One account with 10 VUs
- Ten accounts with 10 VUs
- One account with 50 VUs
- Ten accounts with 50 VUs

Each configuration had three completed runs of 60 seconds.

Warm-up traffic preceded the repeated measurements. No separate warm-up
was recorded before every configuration.

The application remained running between measurements, and data
accumulated throughout the round. Configurations were run sequentially;
their order was not randomized.

### Results

| Accounts | VUs | Run | HTTP requests | Requests/s |   Average |       p95 | HTTP failures |
| -------: | --: | --: | ------------: | ---------: | --------: | --------: | ------------: |
|        1 |  10 |   1 |         8,632 |     143.72 |  69.32 ms |  81.67 ms |            0% |
|        1 |  10 |   2 |         8,459 |     140.83 |  70.74 ms |  84.15 ms |            0% |
|        1 |  10 |   3 |         8,662 |     144.22 |  69.07 ms |  81.53 ms |            0% |
|       10 |  10 |   1 |        25,281 |     421.21 |  23.54 ms |  28.93 ms |            0% |
|       10 |  10 |   2 |        25,203 |     419.96 |  23.62 ms |  28.94 ms |            0% |
|       10 |  10 |   3 |        25,086 |     417.97 |  23.73 ms |  29.17 ms |            0% |
|        1 |  50 |   1 |         8,430 |     139.68 | 356.71 ms | 394.89 ms |            0% |
|        1 |  50 |   2 |         8,071 |     133.82 | 372.44 ms | 417.02 ms |            0% |
|        1 |  50 |   3 |         7,573 |     125.46 | 397.05 ms | 446.54 ms |            0% |
|       10 |  50 |   1 |        24,702 |     411.01 | 121.36 ms | 132.09 ms |            0% |
|       10 |  50 |   2 |        24,533 |     408.25 | 122.19 ms | 135.94 ms |            0% |
|       10 |  50 |   3 |        24,787 |     412.44 | 120.95 ms | 130.64 ms |            0% |

All completed runs passed all response checks and had no interrupted
iterations. Database verification passed after every completed run.

The JSON summary for the completed ten-account, 10-VU run 2 was
accidentally overwritten by an interrupted rerun. Its completed-run
metrics above were retained from terminal output. The interrupted
rerun is excluded from the results table.

### Observed Ranges Across Three Runs

| Accounts | VUs | Requests/s range | Average latency range | Per-run p95 range |
| -------: | --: | ---------------: | --------------------: | ----------------: |
|        1 |  10 |    140.83–144.22 |        69.07–70.74 ms |    81.53–84.15 ms |
|       10 |  10 |    417.97–421.21 |        23.54–23.73 ms |    28.93–29.17 ms |
|        1 |  50 |    125.46–139.68 |      356.71–397.05 ms |  394.89–446.54 ms |
|       10 |  50 |    408.25–412.44 |      120.95–122.19 ms |  130.64–135.94 ms |

These are ranges of individual-run metrics, not confidence intervals
or percentiles calculated from pooled requests.

### Database Verification

Final cumulative totals were:

- Sum of account counters: 207,001 units
- Sum of user counters: 207,001 units
- Accepted units: 207,001
- Accepted records: 207,001
- Total records: 207,001

These totals include preliminary runs, warm-up traffic, and requests
processed during the interrupted rerun. They are not the sum of only
the twelve completed runs in the results table.

### Findings

- At 10 VUs, one account sustained 140.83–144.22 requests/s.
- At 10 VUs, ten accounts sustained 417.97–421.21 requests/s.
- Distributing load across ten accounts produced approximately three
  times the single-account throughput in this round.
- Increasing concurrency to 50 VUs increased response latency without
  increasing throughput in the measured configurations.
- Single-account throughput declined across the three 50-VU runs.
  Resource utilization and database waits were not measured, so the
  cause was not established.
- The results are consistent with contention on the shared account
  lock, but lock waits were not directly measured.
- All completed consumption requests were accepted, and stored counters
  matched accepted units.

Idempotency, rejection, and read performance scenarios were measured in
the initial round. They were not repeated in the current round.

## Verification Scope

`npm run perf:verify` checks that each performance account's usage counter
and its single user's counter match the accepted units stored for that
account.

The verification compares cumulative units across stored periods.
It does not independently verify the assignment of every record to a
monthly period.

Response checks and database verification provide complementary checks:
response checks validate the observed API outcomes, while database
verification checks stored usage consistency.

## Reproduction

### Prerequisites

- Node.js and project dependencies
- PostgreSQL test database
- `TEST_DATABASE_URL` configured
- k6 installed separately
- No other tests or clients sending requests during measurements

Apply migrations and prepare data:

```bash
NODE_ENV=test npm run db:migrate
npm run db:seed:test
npm run perf:prepare
npm run build
mkdir -p performance/results
```

The preparation script refuses to overwrite an existing fixtures file.
Clean up a previous performance run before preparing a new one.

Start the application in a separate terminal:

```bash
NODE_ENV=test PORT=3001 npm start
```

Restart the application after rebuilding if the source code changes.

### Warm-Up

Run warm-up traffic before collecting measurements:

```bash
k6 run --vus 10 --duration 15s \
  performance/scripts/consume-single-account.js
```

Warm-up traffic is excluded from reported measurement tables but remains
in the cumulative database totals.

### Repeated Consumption Measurements

The following command runs each configuration three times for 60 seconds
and verifies stored data after each completed run.

Use a unique `measurement_id` for each measurement session to avoid
overwriting earlier summary files.

```bash
measurement_id=$(date -u +%Y%m%dT%H%M%SZ)

for vus in 10 50; do
  for scenario in single-account multiple-accounts; do
    for run in 1 2 3; do
      k6 run --vus "$vus" --duration 60s \
        --summary-export="performance/results/${measurement_id}-${scenario}-${vus}vus-run${run}.json" \
        "performance/scripts/consume-${scenario}.js" || break 3

      npm run perf:verify || break 3
    done
  done
done
```

Do not run these scenarios concurrently.

The recorded current-round files use the prefix `current-`. The command
above adds a session timestamp to prevent accidental overwrites.

### Initial-Round Scenario Commands

The commands below reproduce the initial workload configurations against
the checked-out application version. Running them against a newer version
does not reproduce the original implementation.

Use a unique output filename for each new execution.

#### One Account, One VU

```bash
k6 run --vus 1 --duration 10s \
  performance/scripts/consume-single-account.js
```

#### One Account, 10 VUs

```bash
k6 run --vus 10 --duration 10s \
  --summary-export=performance/results/single-account-10vus.json \
  performance/scripts/consume-single-account.js
```

#### Ten Accounts, 10 VUs

```bash
k6 run --vus 10 --duration 10s \
  --summary-export=performance/results/multiple-accounts-10vus.json \
  performance/scripts/consume-multiple-accounts.js
```

#### One Account, 50 VUs

```bash
k6 run --vus 50 --duration 10s \
  --summary-export=performance/results/single-account-50vus.json \
  performance/scripts/consume-single-account.js
```

#### Ten Accounts, 50 VUs

```bash
k6 run --vus 50 --duration 10s \
  --summary-export=performance/results/multiple-accounts-50vus.json \
  performance/scripts/consume-multiple-accounts.js
```

#### Idempotent Replay

```bash
k6 run \
  --summary-export=performance/results/idempotency-10vus.json \
  performance/scripts/idempotency.js
```

#### Rejected Consumption

```bash
k6 run \
  --summary-export=performance/results/rejected-10vus.json \
  performance/scripts/rejected.js
```

#### Mixed Reads

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

- Measurements were local, with the load generator, application, and
  PostgreSQL competing for the same machine's resources.
- Initial-round scenarios were single ten-second runs.
- Current-round consumption scenarios had three 60-second runs each;
  this is not a long-duration stability test.
- Data volume increased between scenarios and repeated runs.
- Scenario order was not randomized.
- CPU usage, memory usage during testing, connection-pool waits, and
  database lock waits were not measured.
- The rounds used different application versions and workload durations.
  They do not isolate the performance effect of the query change.
- VU-based tests reduce their request rate when responses slow down;
  fixed-arrival-rate overload behavior was not tested.
- History performance was measured only for the first page with a limit
  of ten records in the initial round.
- Read, rejection, and idempotency performance was not remeasured after
  the subsequent backend changes.
- Results do not establish maximum production capacity or a production
  latency SLA.
- Database failures and concurrent plan updates were not exercised in
  these performance measurements.

## Cleanup

Stop the performance server, then remove the generated test data:

```bash
npm run perf:cleanup
```

This removes the performance accounts and their related data, then deletes
the fixtures file. Public plans and saved performance results are preserved.
