import { createFileRoute } from "@tanstack/react-router";
import { RecordsPage } from "@/pages/records/RecordsPage";

export const Route = createFileRoute("/records")({
  head: () => ({
    meta: [
      { title: "Records · Usage Metering" },
      { name: "description", content: "Records — Usage Metering demo console." },
      { property: "og:title", content: "Records · Usage Metering" },
      { property: "og:description", content: "Records — Usage Metering demo console." },
    ],
  }),
  component: RecordsPage,
});
