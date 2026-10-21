import http from "k6/http";
import { check } from "k6";

const fixtures = JSON.parse(open("../data/fixtures.json"));
const account = fixtures.accounts[0];

export const options = {
  vus: 1,
  duration: "10s",
};

///////////////////////////////////////////////////////
// Consume one unit using a new request ID
///////////////////////////////////////////////////////
export default function () {
  const response = http.post(
    `${fixtures.baseUrl}/api/usage/consume`,
    JSON.stringify({
      userId: account.userId,
      requestId: crypto.randomUUID(),
      requestedUnits: 1,
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
    "consumption is accepted": () => body?.status === "accepted",
    "request is new": () => body?.duplicate === false,
  });
}
