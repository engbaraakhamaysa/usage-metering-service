import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DecisionBadge, ErrorState, ReasonText } from "@/components/ui/states";

import type { useConsumptionPage } from "../useConsumptionPage";
type Props = Pick<
  ReturnType<typeof useConsumptionPage>,
  | "attempt"
  | "pending"
  | "runConsume"
  | "setConsumptionAttempt"
  | "mutationError"
  | "setMutationError"
>;
export function SavedAttempt({
  attempt,
  pending,
  runConsume,
  setConsumptionAttempt,
  mutationError,
  setMutationError,
}: Props) {
  if (!attempt && !mutationError) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Last consumption request</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {attempt && (
          <div className="space-y-3 rounded-lg border p-4 text-sm">
            <p className="font-medium">
              Saved {attempt.mode} request — replay resends this snapshot.
            </p>
            {attempt.mode === "text" && (
              <div>
                <p className="text-muted-foreground">Original text (kept only in memory)</p>
                <pre
                  aria-label="Saved text snapshot"
                  dir="auto"
                  className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-muted p-3 font-sans"
                >
                  {attempt.text}
                </pre>
              </div>
            )}
            <p className="font-mono text-xs break-all">
              requestId {attempt.request.requestId} · userId {attempt.request.userId} · units{" "}
              {attempt.request.requestedUnits}
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => void runConsume(attempt)}
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
