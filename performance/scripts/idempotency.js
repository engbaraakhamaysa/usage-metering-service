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

const params = {
  headers: {
    "Content-Type": "application/json",
    "x-api-key": account.apiKey,
  },
};

///////////////////////////////////////////////////////
// Create the original accepted request before measurement
///////////////////////////////////////////////////////
export function setup() {
  const body = {
    userId: account.userId,
    requestId: crypto.randomUUID(),
    requestedUnits: 1,
  };

  const response = http.post(
    `${fixtures.baseUrl}/api/usage/consume`,
    JSON.stringify(body),
    params,
  );

  if (response.status !== 200) {
    throw new Error(`Setup failed with HTTP ${response.status}`);
  }

  const record = response.json();

  if (record.status !== "accepted" || record.duplicate !== false) {
    throw new Error("Setup did not create a new accepted request");
  }

  return {
    body,
    recordId: record.id,
  };
}

///////////////////////////////////////////////////////
// Replay the same request without consuming more units
///////////////////////////////////////////////////////
export default function (data) {
  const response = http.post(
    `${fixtures.baseUrl}/api/usage/consume`,
    JSON.stringify(data.body),
    {
      ...params,
      tags: {
        phase: "replay",
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
    "original accepted decision is returned": () => body?.status === "accepted",
    "request is a duplicate": () => body?.duplicate === true,
    "original record is returned": () => body?.id === data.recordId,
  });
}
