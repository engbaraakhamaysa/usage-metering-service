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

import type { useConsumptionPage } from "../useConsumptionPage";
type Props = Pick<
  ReturnType<typeof useConsumptionPage>,
  | "attempt"
  | "users"
  | "userId"
  | "setUserId"
  | "units"
  | "setUnits"
  | "pending"
  | "validUnits"
  | "submitNew"
>;
export function ManualConsumption({
  attempt,
  users,
  userId,
  setUserId,
  units,
  setUnits,
  pending,
  validUnits,
  submitNew,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual consumption</CardTitle>
        <CardDescription>
          Each Consume click starts a new request. Retry/replay sends the exact saved payload, even
          if inputs have changed. Decisions apply to the current UTC month; completing one returns
          the usage display to that month.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {users.loading ? (
          <LoadingState />
        ) : users.error ? (
          <ErrorState error={users.error} />
        ) : !users.data.length ? (
          <EmptyState title="No users">Create a user on the Users page first.</EmptyState>
        ) : (
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              submitNew();
            }}
          >
            <Field label="userId" htmlFor="c-user">
              <Select value={userId} onValueChange={setUserId} disabled={pending}>
                <SelectTrigger id="c-user">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.data.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              label="requestedUnits"
              htmlFor="c-units"
              error={units && !validUnits ? "Must be an integer from 1 to 2147483647" : null}
            >
              <Input
                id="c-units"
                inputMode="numeric"
                value={units}
                disabled={pending}
                onChange={(event) => setUnits(event.target.value)}
              />
            </Field>
            <div className="md:col-span-2 flex flex-wrap gap-2">
              <Button
                type="submit"
                disabled={!userId || !validUnits || pending || !!attempt?.uncertain}
              >
                {pending ? "Sending…" : "Consume"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
