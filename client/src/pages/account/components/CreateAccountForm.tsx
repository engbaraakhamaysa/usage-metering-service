import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, ErrorState, Field, LoadingState } from "@/components/ui/states";
import { CreatedApiKeyNotice } from "./CreatedApiKeyNotice";

import type { useAccountPage } from "../useAccountPage";
type Props = Pick<
  ReturnType<typeof useAccountPage>,
  | "newKey"
  | "hideCreatedKey"
  | "name"
  | "setName"
  | "planId"
  | "setPlanId"
  | "copied"
  | "publicPlans"
  | "create"
  | "createAccount"
  | "copy"
>;
export function CreateAccountForm({
  newKey,
  hideCreatedKey,
  name,
  setName,
  planId,
  setPlanId,
  copied,
  publicPlans,
  create,
  createAccount,
  copy,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>POST /api/accounts — public, no API key required.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            void createAccount();
          }}
        >
          <Field label="Name" htmlFor="acc-name">
            <Input
              id="acc-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Inc."
              maxLength={255}
            />
          </Field>
          <Field label="Account plan" htmlFor="acc-plan">
            {publicPlans.isLoading ? (
              <LoadingState />
            ) : publicPlans.error ? (
              <ErrorState error={publicPlans.error} />
            ) : !publicPlans.data?.length ? (
              <EmptyState title="No public account plans" />
            ) : (
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger id="acc-plan">
                  <SelectValue placeholder="Select a public plan" />
                </SelectTrigger>
                <SelectContent>
                  {publicPlans.data?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} · {p.monthlyAllowance}/mo · max {p.maxUnitsPerRequest}/req
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>
          <Button type="submit" disabled={!name.trim() || !planId || create.isPending}>
            {create.isPending ? "Creating…" : "Create account"}
          </Button>
        </form>
        {Boolean(create.error) && <ErrorState error={create.error} />}
        <CreatedApiKeyNotice
          newKey={newKey}
          copied={copied}
          copy={copy}
          hideCreatedKey={hideCreatedKey}
        />
      </CardContent>
    </Card>
  );
}
