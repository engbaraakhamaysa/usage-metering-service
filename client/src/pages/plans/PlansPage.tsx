import { useBackendSession } from "@/api/use-backend-session";
import { PageHeader } from "@/components/ui/states";

import { AvailablePlans } from "./components/AvailablePlans";
import { CreatePrivatePlan } from "./components/CreatePrivatePlan";
import { EditPlanDialog } from "./components/EditPlanDialog";
import { usePlansPage } from "./usePlansPage";
export function PlansPage() {
  const { connectionId } = useBackendSession();
  return <ConnectedPlansPage key={connectionId} />;
}

function ConnectedPlansPage() {
  const model = usePlansPage();
  const { update } = model;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Plans"
        description="Public plans are read-only. Private plans belong to your account and can be edited. Plans cannot be deleted."
      />
      <AvailablePlans
        apiKey={model.apiKey}
        filter={model.filter}
        setFilter={model.setFilter}
        setEditing={model.setEditing}
        rows={model.rows}
        loading={model.loading}
        error={model.error}
        setUpdate={model.setUpdate}
      />

      <CreatePrivatePlan
        apiKey={model.apiKey}
        formKey={model.formKey}
        create={model.create}
        createPlan={model.createPlan}
      />

      {update.isSuccess && (
        <p role="status" className="text-sm text-muted-foreground">
          Private plan updated.
        </p>
      )}
      <EditPlanDialog
        editing={model.editing}
        setEditing={model.setEditing}
        update={model.update}
        updatePlan={model.updatePlan}
      />
    </div>
  );
}
