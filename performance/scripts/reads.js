import http from "k6/http";
import { check } from "k6";
import { Trend } from "k6/metrics";

const fixtures = JSON.parse(open("../data/fixtures.json"));

const accountDuration = new Trend("account_read_duration", true);
const userDuration = new Trend("user_read_duration", true);
const recordsDuration = new Trend("records_read_duration", true);

export const options = {
  vus: 10,
  duration: "10s",
  thresholds: {
    checks: ["rate==1"],
    http_req_failed: ["rate==0"],
  },
};

///////////////////////////////////////////////////////
// Parse JSON responses without interrupting checks
///////////////////////////////////////////////////////
function parseBody(response) {
  try {
    return response.json();
  } catch {
    return null;
  }
}

///////////////////////////////////////////////////////
// Read usage counters and the first page of history
///////////////////////////////////////////////////////
export default function () {
  const account = fixtures.accounts[(__VU - 1) % fixtures.accounts.length];

  const params = {
    headers: {
      "x-api-key": account.apiKey,
    },
  };

  const accountResponse = http.get(
    `${fixtures.baseUrl}/api/usage/account`,
    params,
  );

  accountDuration.add(accountResponse.timings.duration);

  const accountBody = parseBody(accountResponse);

  check(accountResponse, {
    "account usage returns 200": (res) => res.status === 200,
    "account usage belongs to the account": () =>
      accountBody?.accountId === account.accountId,
    "account usage is non-negative": () =>
      typeof accountBody?.usedUnits === "number" && accountBody.usedUnits >= 0,
  });

  const userResponse = http.get(
    `${fixtures.baseUrl}/api/usage/users/${account.userId}`,
    params,
  );

  userDuration.add(userResponse.timings.duration);

  const userBody = parseBody(userResponse);

  check(userResponse, {
    "user usage returns 200": (res) => res.status === 200,
    "user usage belongs to the account and user": () =>
      userBody?.accountId === account.accountId &&
      userBody?.userId === account.userId,
    "user usage matches account usage": () =>
      typeof userBody?.usedUnits === "number" &&
      userBody.usedUnits === accountBody?.usedUnits,
  });

  const recordsResponse = http.get(
    `${fixtures.baseUrl}/api/usage/records?page=1&limit=10`,
    params,
  );

  recordsDuration.add(recordsResponse.timings.duration);

  const recordsBody = parseBody(recordsResponse);

  check(recordsResponse, {
    "history returns 200": (res) => res.status === 200,
    "history has valid pagination": () =>
      recordsBody?.pagination?.page === 1 &&
      recordsBody?.pagination?.limit === 10,
    "history contains only this account's records": () =>
      Array.isArray(recordsBody?.records) &&
      recordsBody.records.length <= 10 &&
      recordsBody.records.every(
        (record) => record.accountId === account.accountId,
      ),
  });
}
