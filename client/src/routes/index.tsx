import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Usage Metering" },
      { name: "description", content: "Usage Metering demo console." },
      { property: "og:title", content: "Usage Metering" },
      { property: "og:description", content: "Usage Metering demo console." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/account" });
  },
});
