import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { App } from "@/App";

function HistoryControls() {
  const navigate = useNavigate();
  return (
    <>
      <button onClick={() => navigate(-1)}>Back</button>
      <button onClick={() => navigate(1)}>Forward</button>
    </>
  );
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function mount(path: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async () => new Response("[]")),
  );
  render(
    <MemoryRouter initialEntries={[path]}>
      <HistoryControls />
      <App />
    </MemoryRouter>,
  );
}
describe("SPA routing", () => {
  it.each([
    ["/", "Account"],
    ["/account", "Account"],
    ["/plans", "Plans"],
    ["/users", "Users"],
    ["/consumption", "Consumption"],
    ["/records", "Records"],
    ["/translation", "Translation"],
  ])("loads %s directly", async (path, title) => {
    mount(path!);
    expect(await screen.findByRole("heading", { name: title! })).toBeInTheDocument();
  });
  it("navigates through links and browser history", async () => {
    mount("/account");
    fireEvent.click(screen.getByRole("link", { name: "Plans" }));
    await screen.findByRole("heading", { name: "Plans" });
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await screen.findByRole("heading", { name: "Account" });
    fireEvent.click(screen.getByRole("button", { name: "Forward" }));
    await screen.findByRole("heading", { name: "Plans" });
  });
  it("preserves the not-found page", async () => {
    mount("/missing");
    await screen.findByRole("heading", { name: "Page not found" });
    fireEvent.click(screen.getByRole("link", { name: "Go home" }));
    await screen.findByRole("heading", { name: "Account" });
  });
});
