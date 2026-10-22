import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { SessionProvider, useSession } from "@/context/session";
import { AccountPage } from "@/pages/account/AccountPage";
import { PlansPage } from "@/pages/plans/PlansPage";
import { UsersPage } from "@/pages/users/UsersPage";

const timestamp = "2026-10-22T00:00:00Z";
const starter = {
  id: "starter",
  name: "Starter",
  planType: "account",
  monthlyAllowance: 1000,
  maxUnitsPerRequest: 100,
  ownerAccountId: null as string | null,
  createdAt: timestamp,
};
const basic = { ...starter, id: "basic", name: "Basic", planType: "user" };
const privateAccount = {
  ...starter,
  id: "private-account",
  name: "Private account",
  ownerAccountId: "owner",
};
const privateUser = { ...basic, id: "private-user", name: "Private user", ownerAccountId: "owner" };
const account = { id: "owner", name: "Acme", planId: starter.id, createdAt: timestamp };
let plans: (typeof starter)[];
let users: Array<typeof account & { accountId: string }>;
let fetcher: ReturnType<typeof vi.fn<typeof fetch>>;
let fail: { path: string; status: number; error: string; errors?: unknown } | null;

function SessionControls() {
  const { apiKey, setApiKey, setBaseUrl } = useSession();
  return (
    <>
      <button onClick={() => setApiKey("test-key")}>Use test key</button>
      <button onClick={() => setApiKey("second-test-key")}>Change identity</button>
      <button onClick={() => setApiKey(null)}>Disconnect session</button>
      <button onClick={() => setBaseUrl("/other")}>Change backend</button>
      <output data-testid="connection">{apiKey ? "connected" : "disconnected"}</output>
    </>
  );
}
function mount(page: ReactNode) {
  return render(
    <MemoryRouter>
      <SessionProvider>
        <SessionControls />
        {page}
      </SessionProvider>
    </MemoryRouter>,
  );
}

async function connect() {
  fireEvent.click(await screen.findByRole("button", { name: "Use test key" }));
}
async function select(id: string, name: RegExp) {
  fireEvent.keyDown(document.getElementById(id)!, { key: "ArrowDown" });
  fireEvent.click(await screen.findByRole("option", { name }));
}
function fill(id: string, value: string) {
  fireEvent.change(document.getElementById(id)!, { target: { value } });
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
  plans = [starter, basic, privateAccount, privateUser];
  users = [];
  fail = null;
  fetcher = vi.fn<typeof fetch>(async (input, options) => {
    const url = new URL(String(input), "http://frontend.test");
    const path = url.pathname;
    const method = options?.method ?? "GET";
    const response = (value: unknown, status = 200) =>
      new Response(JSON.stringify(value), { status });
    if (fail?.path === path)
      return response({ error: fail.error, errors: fail.errors }, fail.status);
    const body = options?.body ? JSON.parse(String(options.body)) : {};
    if ((path === "/api/plans" && method === "GET") || path === "/api/plans/me") {
      return response(
        plans.filter(
          (p) =>
            (path.endsWith("/me") || p.ownerAccountId === null) &&
            (!url.searchParams.has("planType") || p.planType === url.searchParams.get("planType")),
        ),
      );
    }
    if (path === "/api/accounts" && method === "POST")
      return response({ ...account, ...body, apiKey: "created-test-key" }, 201);
    if (path === "/api/usage/account")
      return response({ currentPlan: plans.find((p) => p.id === account.planId) });
    if (path === "/api/accounts/me/plan") {
      account.planId = body.planId;
      return response(account);
    }
    if (path === "/api/plans" && method === "POST") {
      const plan = { ...privateUser, ...body, id: "new-plan" };
      plans.push(plan);
      return response(plan, 201);
    }
    if (path.startsWith("/api/plans/") && method === "PATCH") {
      const plan = plans.find((p) => p.id === path.split("/").at(-1))!;
      Object.assign(plan, body);
      return response(plan);
    }
    if (path === "/api/users" && method === "GET") return response(users);
    if (path === "/api/users" && method === "POST") {
      const user = { ...account, ...body, id: "user-1", accountId: "owner" };
      users.push(user);
      return response(user, 201);
    }
    if (path.startsWith("/api/users/")) {
      const user = users.find((u) => u.id === path.split("/")[3]);
      if (method === "PATCH") Object.assign(user!, body);
      return response(user);
    }
    return response({ error: "Unexpected test endpoint" }, 500);
  });
  vi.stubGlobal("fetch", fetcher);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  account.planId = "starter";
});

describe("Connected pages with mocked HTTP responses (not a live backend)", () => {
  it("creates an account from public plans, retains the returned key, changes plans, and disconnects", async () => {
    mount(<AccountPage />);
    await screen.findByRole("combobox", { name: "Account plan" });
    fill("acc-name", "Acme");
    await select("acc-plan", /^Starter/);
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await screen.findByText("Your API key — shown only once");
    await screen.findByText(/1000 units\/month/);
    const switcher = screen.getAllByRole("combobox").at(-1)!;
    fireEvent.keyDown(switcher, { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("option", { name: "Private account" }));
    fireEvent.click(screen.getByRole("button", { name: "Change plan" }));
    await screen.findByText("Account plan updated.");
    const patch = fetcher.mock.calls.find(([url]) => String(url).endsWith("/accounts/me/plan"));
    expect(new Headers(patch?.[1]?.headers).get("x-api-key")).toBe("created-test-key");
    expect(patch?.[1]?.body).toBe('{"planId":"private-account"}');
    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));
    await screen.findByText("No API key connected");
    expect(screen.queryByText("Your API key — shown only once")).toBeNull();
  });
  it("lists public and owned plans once and creates and edits private plans", async () => {
    mount(<PlansPage />);
    await connect();
    await screen.findByText("Private user");
    expect(screen.getAllByRole("cell", { name: "Starter" })).toHaveLength(1);
    fill("pf-name", "Created plan");
    fill("pf-ma", "100");
    fill("pf-mr", "10");
    fireEvent.click(screen.getByRole("button", { name: "Create plan" }));
    await screen.findByRole("cell", { name: "Created plan" });
    const row = screen.getByRole("row", { name: /Created plan/ });
    fireEvent.click(within(row).getByRole("button", { name: "Edit" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: "Edited plan" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));
    await screen.findByRole("cell", { name: "Edited plan" });
    expect(screen.getByText("Private plan updated.")).toBeInTheDocument();
  });
  it("shows an empty user list, creates a user, fetches details, and updates the user plan", async () => {
    mount(<UsersPage />);
    await connect();
    await screen.findByText("No users yet");
    fill("u-name", "First user");
    await select("u-plan", /^Basic/);
    fireEvent.click(screen.getByRole("button", { name: "Create user" }));
    await screen.findByRole("cell", { name: "First user" });
    fireEvent.click(screen.getByRole("button", { name: "Details" }));
    const dialog = await screen.findByRole("dialog");
    await within(dialog).findByText("First user");
    await select("ud-plan", /^Private user/);
    fireEvent.click(within(dialog).getByRole("button", { name: "Change plan" }));
    await screen.findByText("User plan updated.");
    expect(
      fetcher.mock.calls.some(
        ([url, options]) => url === "/api/users/user-1" && options?.method === "GET",
      ),
    ).toBe(true);
    expect(fetcher.mock.calls.find(([url]) => url === "/api/users/user-1/plan")?.[1]?.body).toBe(
      '{"planId":"private-user"}',
    );
  });
  it("displays backend authentication and server errors without mock fallback", async () => {
    fail = { path: "/api/users", status: 401, error: "Invalid API key" };
    mount(<UsersPage />);
    await connect();
    await screen.findByText("Invalid API key");
    expect(screen.queryByText("No users yet")).toBeNull();

    fail = { path: "/api/users", status: 500, error: "Internal server error" };
    fireEvent.click(screen.getByRole("button", { name: "Change identity" }));
    await screen.findByText("Internal server error");
    expect(screen.queryByText("Invalid API key")).toBeNull();
  });
  it("reports duplicate private plans without treating the failed write as success", async () => {
    mount(<PlansPage />);
    await connect();
    await screen.findByText("Private user");
    fail = {
      path: "/api/plans",
      status: 409,
      error: "Plan name already exists for this account and type",
    };
    fill("pf-name", "Duplicate");
    fill("pf-ma", "100");
    fill("pf-mr", "10");
    fireEvent.click(screen.getByRole("button", { name: "Create plan" }));
    await screen.findByText("Plan name already exists for this account and type");
    expect(screen.queryByText("Private plan created.")).toBeNull();
  });
  it("displays a backend 404 for a user removed before opening details", async () => {
    users = [{ ...account, id: "user-1", name: "Existing user", accountId: "owner" }];
    mount(<UsersPage />);
    await connect();
    await screen.findByRole("cell", { name: "Existing user" });
    fail = { path: "/api/users/user-1", status: 404, error: "User not found" };
    fireEvent.click(screen.getByRole("button", { name: "Details" }));
    await screen.findByText("User not found");
    expect(screen.queryByRole("button", { name: "Change plan" })).toBeNull();
  });
  it("shows validation issues and resets authentication when changing backend", async () => {
    mount(<UsersPage />);
    await connect();
    await screen.findByText("No users yet");
    fail = {
      path: "/api/users",
      status: 400,
      error: "Validation failed",
      errors: [{ path: ["name"], message: "User name must be at most 255 characters" }],
    };
    fill("u-name", "User");
    await select("u-plan", /^Basic/);
    fireEvent.click(screen.getByRole("button", { name: "Create user" }));
    await screen.findByText(/name: User name must be at most 255 characters/);
    fireEvent.click(screen.getByRole("button", { name: "Change backend" }));
    await waitFor(() => expect(screen.getByTestId("connection")).toHaveTextContent("disconnected"));
    expect(screen.queryByText("Validation failed")).toBeNull();
  });
  it("ignores delayed account-A reads after connecting account B, even if the transport ignores abort", async () => {
    const normalFetch = fetcher.getMockImplementation()!;
    let resolveOld!: (response: Response) => void;
    let oldSignal: AbortSignal | null | undefined;
    fetcher.mockImplementation((url, options) => {
      if (url === "/api/users" && new Headers(options?.headers).get("x-api-key") === "test-key") {
        oldSignal = options?.signal;
        return new Promise<Response>((resolve) => {
          resolveOld = resolve;
        });
      }
      if (url === "/api/users")
        return Promise.resolve(
          new Response(
            JSON.stringify([{ ...account, id: "second", name: "Account B user", accountId: "B" }]),
          ),
        );
      return normalFetch(url, options);
    });
    mount(<UsersPage />);
    await connect();
    await waitFor(() => expect(resolveOld).toBeTypeOf("function"));
    fireEvent.click(screen.getByRole("button", { name: "Change identity" }));
    await screen.findByRole("cell", { name: "Account B user" });
    expect(oldSignal?.aborted).toBe(true);
    await act(async () =>
      resolveOld(
        new Response(JSON.stringify([{ ...account, name: "Late account A user", accountId: "A" }])),
      ),
    );
    expect(screen.queryByText("Late account A user")).toBeNull();
    expect(screen.getByRole("cell", { name: "Account B user" })).toBeInTheDocument();
  });
  it.each(["Disconnect session", "Change backend"])(
    "clears private data and ignores delayed reads on %s",
    async (button) => {
      const normalFetch = fetcher.getMockImplementation()!;
      let resolveOld!: (response: Response) => void;
      let oldSignal: AbortSignal | null | undefined;
      fetcher.mockImplementation((url, options) => {
        if (url === "/api/users") {
          oldSignal = options?.signal;
          return new Promise<Response>((resolve) => {
            resolveOld = resolve;
          });
        }
        return normalFetch(url, options);
      });
      mount(<UsersPage />);
      await connect();
      await waitFor(() => expect(resolveOld).toBeTypeOf("function"));
      fireEvent.click(screen.getByRole("button", { name: button }));
      await screen.findByText("No API key connected");
      expect(oldSignal?.aborted).toBe(true);
      await act(async () =>
        resolveOld(
          new Response(
            JSON.stringify([{ ...account, name: "Late private user", accountId: "owner" }]),
          ),
        ),
      );
      expect(screen.queryByText("Late private user")).toBeNull();
      expect(screen.getByTestId("connection")).toHaveTextContent("disconnected");
    },
  );
  it("ignores delayed writes after disconnection and clears mutation results", async () => {
    const normalFetch = fetcher.getMockImplementation()!;
    let resolveWrite!: (response: Response) => void;
    fetcher.mockImplementation((url, options) => {
      if (url === "/api/users" && options?.method === "POST")
        return new Promise<Response>((resolve) => {
          resolveWrite = resolve;
        });
      return normalFetch(url, options);
    });
    mount(<UsersPage />);
    await connect();
    await screen.findByText("No users yet");
    fill("u-name", "Delayed user");
    await select("u-plan", /^Basic/);
    fireEvent.click(screen.getByRole("button", { name: "Create user" }));
    await waitFor(() => expect(resolveWrite).toBeTypeOf("function"));
    fireEvent.click(screen.getByRole("button", { name: "Disconnect session" }));
    await screen.findByText("No API key connected");
    await act(async () =>
      resolveWrite(
        new Response(JSON.stringify({ ...account, name: "Delayed user", accountId: "owner" }), {
          status: 201,
        }),
      ),
    );
    expect(screen.queryByText("User created.")).toBeNull();
    expect(screen.queryByText("Delayed user")).toBeNull();
  });
  it("does not connect a late account-creation response after navigation", async () => {
    const normalFetch = fetcher.getMockImplementation()!;
    let resolveWrite!: (response: Response) => void;
    fetcher.mockImplementation((url, options) => {
      if (url === "/api/accounts")
        return new Promise<Response>((resolve) => {
          resolveWrite = resolve;
        });
      return normalFetch(url, options);
    });
    mount(
      <>
        <Link to="/away">Leave page</Link>
        <Routes>
          <Route path="/" element={<AccountPage />} />
          <Route path="/away" element={<p>Away</p>} />
        </Routes>
      </>,
    );
    await screen.findByRole("combobox", { name: "Account plan" });
    fill("acc-name", "Delayed account");
    await select("acc-plan", /^Starter/);
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(resolveWrite).toBeTypeOf("function"));
    fireEvent.click(screen.getByRole("link", { name: "Leave page" }));
    await screen.findByText("Away");
    await act(async () =>
      resolveWrite(
        new Response(JSON.stringify({ ...account, apiKey: "late-created-key" }), { status: 201 }),
      ),
    );
    expect(screen.getByTestId("connection")).toHaveTextContent("disconnected");
    expect(screen.queryByText("Your API key — shown only once")).toBeNull();
  });
  it("refreshes the user list after a successful plan write even when its dialog was closed", async () => {
    users = [
      { ...account, id: "user-1", name: "Existing user", accountId: "owner", planId: "basic" },
    ];
    const normalFetch = fetcher.getMockImplementation()!;
    let resolveWrite!: (response: Response) => void;
    fetcher.mockImplementation((url, options) => {
      if (url === "/api/users/user-1/plan")
        return new Promise<Response>((resolve) => {
          resolveWrite = resolve;
        });
      return normalFetch(url, options);
    });
    mount(<UsersPage />);
    await connect();
    await screen.findByRole("cell", { name: "Existing user" });
    fireEvent.click(screen.getByRole("button", { name: "Details" }));
    await screen.findByRole("combobox", { name: "Change plan" });
    await select("ud-plan", /^Private user/);
    fireEvent.click(screen.getByRole("button", { name: "Change plan" }));
    await waitFor(() => expect(resolveWrite).toBeTypeOf("function"));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    users[0]!.planId = "private-user";
    await act(async () => resolveWrite(new Response(JSON.stringify(users[0]))));
    await screen.findByRole("cell", { name: "Private user" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
