import { createFileRoute } from "@tanstack/react-router";
import { UsersPage } from "@/pages/users/UsersPage";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "Users · Usage Metering" },
      { name: "description", content: "Users — Usage Metering demo console." },
      { property: "og:title", content: "Users · Usage Metering" },
      { property: "og:description", content: "Users — Usage Metering demo console." },
    ],
  }),
  component: UsersPage,
});
