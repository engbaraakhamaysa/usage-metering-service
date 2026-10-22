import { createFileRoute } from "@tanstack/react-router";
import { PlansPage } from "@/pages/plans/PlansPage";

export const Route = createFileRoute("/plans")({
  head: () => ({
    meta: [
      { title: "Plans · Usage Metering" },
      { name: "description", content: "Plans — Usage Metering demo console." },
      { property: "og:title", content: "Plans · Usage Metering" },
      { property: "og:description", content: "Plans — Usage Metering demo console." },
    ],
  }),
  component: PlansPage,
});
