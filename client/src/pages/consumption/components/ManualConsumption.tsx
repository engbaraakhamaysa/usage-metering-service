import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import {
  DecisionBadge,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  ReasonText,
} from "@/components/ui/states";

import type { useConsumptionPage } from "../useConsumptionPage";
type Props = Pick<
  ReturnType<typeof useConsumptionPage>,
  | "attempt"
  | "setConsumptionAttempt"
  | "users"
  | "userId"
  | "setUserId"
  | "units"
  | "setUnits"
  | "pending"
  | "mutationError"
  | "setMutationError"
  | "validUnits"
  | "runConsume"
  | "submitNew"
>;
export function ManualConsumption({
  attempt,
  setConsumptionAttempt,
  users,
  userId,
  setUserId,
  units,
  setUnits,
  pending,
  mutationError,
  setMutationError,
  validUnits,
  runConsume,
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
        {attempt && (
          <div className="space-y-3 rounded-lg border p-4 text-sm">
            <p className="font-mono text-xs break-all">
              requestId {attempt.request.requestId} · userId {attempt.request.userId} · units{" "}
              {attempt.request.requestedUnits}
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => void runConsume(attempt.request)}
            >
              Retry / replay last request
            </Button>
            {attempt.uncertain && !pending && (
              <Alert>
                <AlertTitle>Consumption result is uncertain</AlertTitle>
                <AlertDescription>
                  The request may already have been processed. Retry the saved payload to get its
                  original decision without double counting. Starting another request may consume
                  additional units.
                </AlertDescription>
                <Button
                  className="mt-3"
                  variant="outline"
                  onClick={() => {
                    setConsumptionAttempt({ ...attempt, uncertain: false });
                    setMutationError(null);
                  }}
                >
                  Start a new request anyway
                </Button>
              </Alert>
            )}
            {attempt.decision && (
              <section aria-label="Consumption decision" className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">Last confirmed decision (HTTP 200):</span>
                  <DecisionBadge accepted={attempt.decision.status === "accepted"} />
                  <Badge variant="outline">
                    {attempt.decision.duplicate ? "duplicate — no new increment" : "not duplicate"}
                  </Badge>
                </div>
                <div>
                  rejectionReason: <ReasonText reason={attempt.decision.rejectionReason} />
                </div>
                <p className="font-mono text-xs break-all">recordId: {attempt.decision.id}</p>
              </section>
            )}
          </div>
        )}
        {Boolean(mutationError) && (
          <section aria-label="Consumption request error">
            <ErrorState error={mutationError} />
          </section>
        )}
      </CardContent>
    </Card>
  );
}
