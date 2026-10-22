import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, Field, LoadingState } from "@/components/ui/states";
import { PlanSelect } from "./PlanSelect";

import type { useUsersPage } from "../useUsersPage";
type Props = Pick<
  ReturnType<typeof useUsersPage>,
  | "plans"
  | "plansError"
  | "plansLoading"
  | "name"
  | "setName"
  | "planId"
  | "setPlanId"
  | "create"
  | "createUser"
>;
export function CreateUserForm({
  plans,
  plansError,
  plansLoading,
  name,
  setName,
  planId,
  setPlanId,
  create,
  createUser,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create user</CardTitle>
        <CardDescription>POST /api/users</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            void createUser();
          }}
        >
          <Field label="Name" htmlFor="u-name">
            <Input
              maxLength={255}
              id="u-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="User plan" htmlFor="u-plan">
            {plansLoading ? (
              <LoadingState label="Loading user plans…" />
            ) : !plans.length && !plansError ? (
              <EmptyState title="No user plans available" />
            ) : (
              <PlanSelect id="u-plan" plans={plans} value={planId} onChange={setPlanId} />
            )}
          </Field>
          <Button
            type="submit"
            disabled={!name.trim() || !planId || create.isPending || plansLoading || !!plansError}
          >
            {create.isPending ? "Creating…" : "Create user"}
          </Button>
        </form>
        {Boolean(plansError) && <ErrorState error={plansError} />}
        {create.isSuccess && (
          <p role="status" className="text-sm text-muted-foreground">
            User created.
          </p>
        )}
        {Boolean(create.error) && <ErrorState error={create.error} />}
      </CardContent>
    </Card>
  );
}
