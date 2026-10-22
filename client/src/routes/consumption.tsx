import { createFileRoute } from "@tanstack/react-router";
import { ConsumptionPage } from "@/pages/consumption/ConsumptionPage";

export const Route = createFileRoute("/consumption")({
  head: () => ({
    meta: [
      { title: "Consumption · Usage Metering" },
      { name: "description", content: "Consumption — Usage Metering demo console." },
      { property: "og:title", content: "Consumption · Usage Metering" },
      { property: "og:description", content: "Consumption — Usage Metering demo console." },
    ],
  }),
  component: ConsumptionPage,
});
