import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState, NeedsApiKey } from "@/components/ui/states";
import { PlanForm } from "./PlanForm";

import type { usePlansPage } from "../usePlansPage";
type Props = Pick<ReturnType<typeof usePlansPage>, "apiKey" | "formKey" | "create" | "createPlan">;
export function CreatePrivatePlan({ apiKey, formKey, create, createPlan }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create private plan</CardTitle>
        <CardDescription>POST /api/plans</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!apiKey ? (
          <NeedsApiKey />
        ) : (
          <>
            <PlanForm
              key={formKey}
              withType
              submitLabel="Create plan"
              pending={create.isPending}
              initial={{
                name: "",
                planType: "user",
                monthlyAllowance: "",
                maxUnitsPerRequest: "",
              }}
              onSubmit={(v) => void createPlan(v)}
            />
            {create.isSuccess && (
              <p role="status" className="text-sm text-muted-foreground">
                Private plan created.
              </p>
            )}
            {Boolean(create.error) && <ErrorState error={create.error} />}
          </>
        )}
      </CardContent>
    </Card>
  );
}
