import { createFileRoute } from "@tanstack/react-router";
import { AccountPage } from "@/pages/account/AccountPage";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Account · Usage Metering" },
      { name: "description", content: "Account — Usage Metering demo console." },
      { property: "og:title", content: "Account · Usage Metering" },
      { property: "og:description", content: "Account — Usage Metering demo console." },
    ],
  }),
  component: AccountPage,
});
