import type { BackendUsage } from "@/api/http";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { formatDate } from "@/utils";

import type { UsageState } from "../useUsage";

export function UsageSummary({ title, value }: { title: string; value: UsageState }) {
  return (
    <section aria-label={title} className="space-y-2">
      <h3 className="font-medium">{title}</h3>
      {value.loading ? (
        <LoadingState />
      ) : value.error ? (
        <>
          <p className="text-sm text-muted-foreground">
            Usage could not be refreshed. This does not change any confirmed consumption decision.
          </p>
          <ErrorState error={value.error} />
        </>
      ) : (
        value.data && (
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              ["usedUnits", value.data.usedUnits],
              ["remainingUnits", value.data.remainingUnits ?? "Not applicable (historical month)"],
              [
                "currentPlan",
                `${value.data.currentPlan.name} (${value.data.currentPlan.monthlyAllowance}/mo; max ${value.data.currentPlan.maxUnitsPerRequest}/request)`,
              ],
              ["periodStart", formatDate(value.data.periodStart)],
            ].map(([key, text]) => (
              <div key={key} className="rounded-lg border p-3">
                <dt className="font-mono text-xs text-muted-foreground">{key}</dt>
                <dd className="mt-1 font-semibold tabular-nums">{text}</dd>
              </div>
            ))}
          </dl>
        )
      )}
    </section>
  );
}
