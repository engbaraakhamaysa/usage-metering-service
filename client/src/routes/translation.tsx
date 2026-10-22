import { createFileRoute } from "@tanstack/react-router";
import { TranslationPage } from "@/pages/translation/TranslationPage";

export const Route = createFileRoute("/translation")({
  head: () => ({
    meta: [
      { title: "Translation · Usage Metering" },
      { name: "description", content: "Translation — Usage Metering demo console." },
      { property: "og:title", content: "Translation · Usage Metering" },
      { property: "og:description", content: "Translation — Usage Metering demo console." },
    ],
  }),
  component: TranslationPage,
});
