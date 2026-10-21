import http from "k6/http";
import { check } from "k6";

const fixtures = JSON.parse(open("../data/fixtures.json"));
const account = fixtures.accounts[0];

export const options = {
  vus: 10,
  duration: "10s",
  thresholds: {
    checks: ["rate==1"],
    http_req_failed: ["rate==0"],
  },
};

///////////////////////////////////////////////////////
// Record rejected requests without consuming units
///////////////////////////////////////////////////////
export default function () {
  const response = http.post(
    `${fixtures.baseUrl}/api/usage/consume`,
    JSON.stringify({
      userId: account.userId,
      requestId: crypto.randomUUID(),
      requestedUnits: 1_001,
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "x-api-key": account.apiKey,
      },
    },
  );

  let body;

  try {
    body = response.json();
  } catch {
    body = null;
  }

  check(response, {
    "HTTP status is 200": (res) => res.status === 200,
    "consumption is rejected": () => body?.status === "rejected",
    "reason is account request limit": () =>
      body?.rejectionReason === "account_request_limit",
    "request is new": () => body?.duplicate === false,
  });
}
