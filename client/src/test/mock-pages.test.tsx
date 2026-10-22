import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { SessionProvider, useSession } from "@/context/session";
import { createMockApi } from "@/mocks/mockApi";
import { ConsumptionPage } from "@/pages/consumption/ConsumptionPage";
import { RecordsPage } from "@/pages/records/RecordsPage";
import { TranslationPage } from "@/pages/translation/TranslationPage";

function ConnectDemo({ apiKey }: { apiKey: string }) {
  const { setApiKey } = useSession();
  return <button onClick={() => setApiKey(apiKey)}>Connect demo</button>;
}
async function select(id: string, name: RegExp) {
  fireEvent.keyDown(document.getElementById(id)!, { key: "ArrowDown" });
  fireEvent.click(await screen.findByRole("option", { name }));
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("preserves mock consumption replay, record details, and simulated translation without backend requests", async () => {
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  const config = { baseUrl: "", apiKey: null as string | null };
  const mock = createMockApi(() => config);
  const accountPlans = await mock.listPublicPlans("account");
  const created = await mock.createAccount({ name: "Mock SPA test", planId: accountPlans[0]!.id });
  config.apiKey = created.apiKey;
  const userPlans = await mock.listPublicPlans("user");
  await mock.createUser({ name: "Demo user", planId: userPlans[0]!.id });
  const fetcher = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", fetcher);
  render(
    <MemoryRouter initialEntries={["/consumption"]}>
      <SessionProvider>
        <ConnectDemo apiKey={created.apiKey} />
        <Link to="/records">Show records</Link>
        <Link to="/translation">Show translation</Link>
        <Routes>
          <Route path="/consumption" element={<ConsumptionPage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/translation" element={<TranslationPage />} />
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Connect demo" }));
  await screen.findByRole("combobox", { name: "userId" });
  await select("c-user", /^Demo user/);
  fireEvent.change(screen.getByLabelText("requestedUnits"), { target: { value: "3" } });
  fireEvent.click(screen.getByRole("button", { name: "Consume" }));
  await screen.findByText("Decision (HTTP 200):");
  fireEvent.click(screen.getByRole("button", { name: "Replay last request" }));
  await screen.findByText("duplicate — original decision, no new increment");
  expect((await mock.getAccountUsage()).usedUnits).toBe(3);
  fireEvent.click(screen.getByRole("link", { name: "Show records" }));
  await screen.findByRole("button", { name: "View" });
  fireEvent.click(screen.getByRole("button", { name: "View" }));
  await screen.findByRole("dialog");
  await screen.findByText("requestedUnits");
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  fireEvent.click(screen.getByRole("link", { name: "Show translation" }));
  await screen.findByRole("combobox", { name: "User" });
  await select("t-user", /^Demo user/);
  fireEvent.change(screen.getByLabelText("Text"), { target: { value: "hello world" } });
  fireEvent.click(screen.getByRole("button", { name: "Translate (2 units)" }));
  await screen.findByText("[SIMULATED en→fr] hello world", {}, { timeout: 2000 });
  fireEvent.click(screen.getByRole("switch"));
  fireEvent.click(screen.getByRole("button", { name: "Retry (same requestId)" }));
  await screen.findByText(
    /Translation failed: Simulated translation failure/,
    {},
    { timeout: 2000 },
  );
  expect((await mock.getAccountUsage()).usedUnits).toBe(5);
  expect(fetcher).not.toHaveBeenCalled();
}, 15_000);
