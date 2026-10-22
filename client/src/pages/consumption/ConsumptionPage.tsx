import { useBackendSession } from "@/api/use-backend-session";
import { NeedsApiKey, PageHeader } from "@/components/ui/states";
import { SavedAttempt } from "./components/SavedAttempt";
import { TextConsumption } from "./components/TextConsumption";

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
      <TextConsumption
        users={model.users}
        userId={model.userId}
        setUserId={model.setUserId}
        text={model.text}
        setText={model.setText}
        wordCount={model.wordCount}
        submitText={model.submitText}
        pending={model.pending}
        attempt={model.attempt}
      />
      <ManualConsumption
        attempt={model.attempt}
        users={model.users}
        userId={model.userId}
        setUserId={model.setUserId}
        units={model.units}
        setUnits={model.setUnits}
        pending={model.pending}
        validUnits={model.validUnits}
        submitNew={model.submitNew}
      />
      <SavedAttempt
        attempt={model.attempt}
        pending={model.pending}
        runConsume={model.runConsume}
        setConsumptionAttempt={model.setConsumptionAttempt}
        mutationError={model.mutationError}
        setMutationError={model.setMutationError}
      />
    </div>
  );
}
