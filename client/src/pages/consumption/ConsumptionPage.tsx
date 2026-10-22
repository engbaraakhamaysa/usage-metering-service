import { useBackendSession } from "@/api/use-backend-session";
import { NeedsApiKey, PageHeader } from "@/components/ui/states";

import { ManualConsumption } from "./components/ManualConsumption";
import { UsageCard } from "./components/UsageCard";
import { useConsumptionPage } from "./useConsumptionPage";
export function ConsumptionPage() {
  const { connectionId } = useBackendSession();
  return <ConsumptionContent key={connectionId} />;
}
function ConsumptionContent() {
  const model = useConsumptionPage();
  const { apiKey } = model;
  if (!apiKey)
    return (
      <div>
        <PageHeader title="Consumption" />
        <NeedsApiKey />
      </div>
    );
  return (
    <div className="space-y-6">
      <PageHeader
        title="Consumption"
        description="Inspect usage and submit consumption requests to the backend."
      />
      <UsageCard
        users={model.users}
        userId={model.userId}
        setUserId={model.setUserId}
        month={model.month}
        setMonth={model.setMonth}
        setRefresh={model.setRefresh}
        accountUsage={model.accountUsage}
        userUsage={model.userUsage}
        pending={model.pending}
        maxMonth={model.maxMonth}
        monthError={model.monthError}
      />
      <ManualConsumption
        attempt={model.attempt}
        setConsumptionAttempt={model.setConsumptionAttempt}
        users={model.users}
        userId={model.userId}
        setUserId={model.setUserId}
        units={model.units}
        setUnits={model.setUnits}
        pending={model.pending}
        mutationError={model.mutationError}
        setMutationError={model.setMutationError}
        validUnits={model.validUnits}
        runConsume={model.runConsume}
        submitNew={model.submitNew}
      />
    </div>
  );
}
