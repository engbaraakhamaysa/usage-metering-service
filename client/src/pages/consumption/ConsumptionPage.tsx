import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useBackendSession } from "@/api/use-backend-session";
import { ApiError } from "@/api/errors";
import type { BackendUsage } from "@/api/http";
import { usePageActive } from "@/hooks/use-page-active";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  DecisionBadge,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  NeedsApiKey,
  PageHeader,
  ReasonText,
} from "@/components/ui/states";
import { currentMonth, formatDate, generateUuid, parsePositiveInt } from "@/utils";
import type { ConsumeRequest, User } from "@/types";

type UsageState = { data: BackendUsage | null; loading: boolean; error: unknown };
const emptyUsage: UsageState = { data: null, loading: true, error: null };

function UsageSummary({ title, value }: { title: string; value: UsageState }) {
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

export function ConsumptionPage() {
  const { connectionId } = useBackendSession();
  return <ConsumptionContent key={connectionId} />;
}
function ConsumptionContent() {
  const {
    api,
    apiKey,
    connectionSignal,
    consumptionAttempt: attempt,
    setConsumptionAttempt,
  } = useBackendSession();
  const active = usePageActive();
  const inFlight = useRef(false);
  const [users, setUsers] = useState<{ data: User[]; loading: boolean; error: unknown }>({
    data: [],
    loading: !!apiKey,
    error: null,
  });
  const [userId, setUserId] = useState(attempt?.request.userId ?? "");
  const [units, setUnits] = useState("");
  const [month, setMonth] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [accountUsage, setAccountUsage] = useState<UsageState>(emptyUsage);
  const [userUsage, setUserUsage] = useState<UsageState>(emptyUsage);
  const [pending, setPending] = useState(false);
  const [mutationError, setMutationError] = useState<unknown>(null);
  const maxMonth = currentMonth();
  const monthError =
    month && (!/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(month) || month > maxMonth)
      ? "Use a valid YYYY-MM month, not in the future"
      : null;
  const parsedUnits = parsePositiveInt(units);
  const validUnits = parsedUnits !== null && parsedUnits <= 2_147_483_647;

  useEffect(() => {
    if (!apiKey) return;
    let current = true;
    api.listUsers().then(
      (data) => {
        if (current && !connectionSignal.aborted) setUsers({ data, loading: false, error: null });
      },
      (error: unknown) => {
        if (current && !connectionSignal.aborted) setUsers({ data: [], loading: false, error });
      },
    );
    return () => {
      current = false;
    };
  }, [api, apiKey, connectionSignal]);
  useEffect(() => {
    if (!apiKey || monthError) return;
    let current = true;
    setAccountUsage(emptyUsage);
    api.getAccountUsage(month || undefined).then(
      (data) => {
        if (current && !connectionSignal.aborted)
          setAccountUsage({ data, loading: false, error: null });
      },
      (error: unknown) => {
        if (current && !connectionSignal.aborted)
          setAccountUsage({ data: null, loading: false, error });
      },
    );
    return () => {
      current = false;
    };
  }, [api, apiKey, connectionSignal, month, monthError, refresh]);
  useEffect(() => {
    if (!apiKey || !userId || monthError) return;
    let current = true;
    setUserUsage(emptyUsage);
    api.getUserUsage(userId, month || undefined).then(
      (data) => {
        if (current && !connectionSignal.aborted)
          setUserUsage({ data, loading: false, error: null });
      },
      (error: unknown) => {
        if (current && !connectionSignal.aborted)
          setUserUsage({ data: null, loading: false, error });
      },
    );
    return () => {
      current = false;
    };
  }, [api, apiKey, connectionSignal, userId, month, monthError, refresh]);

  const runConsume = async (input: ConsumeRequest) => {
    if (inFlight.current || connectionSignal.aborted) return;
    inFlight.current = true;
    const request = { ...input }; // Snapshot: replay never reads the edited form.
    const confirmed = attempt?.request.requestId === request.requestId ? attempt.decision : null;
    setPending(true);
    setMutationError(null);
    setConsumptionAttempt({ request, decision: confirmed, uncertain: true });
    try {
      const decision = await api.consume(request);
      if (!active.current || connectionSignal.aborted) return;
      setConsumptionAttempt({ request, decision, uncertain: false });
      // Counters are read in independent effects; refresh failures never become write errors.
      setMonth("");
      setRefresh((value) => value + 1);
    } catch (error) {
      if (!active.current || connectionSignal.aborted) return;
      setMutationError(error);
      setConsumptionAttempt({
        request,
        decision: confirmed,
        uncertain: !(error instanceof ApiError) || error.status >= 500,
      });
    } finally {
      inFlight.current = false;
      if (active.current && !connectionSignal.aborted) setPending(false);
    }
  };
  const submitNew = () => {
    if (
      inFlight.current ||
      pending ||
      attempt?.uncertain ||
      !validUnits ||
      !userId ||
      parsedUnits === null
    )
      return;
    void runConsume({ userId, requestedUnits: parsedUnits, requestId: generateUuid() });
  };

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
      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="User usage (optional)" htmlFor="scope">
              <Select
                value={userId || "__account__"}
                onValueChange={(value) => setUserId(value === "__account__" ? "" : value)}
                disabled={pending}
              >
                <SelectTrigger id="scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__account__">Account only</SelectItem>
                  {users.data.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      User: {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              label="Month (optional, YYYY-MM)"
              htmlFor="month"
              error={monthError}
              hint="Empty = current UTC month"
            >
              <div className="flex gap-2">
                <Input
                  id="month"
                  type="month"
                  max={maxMonth}
                  value={month}
                  disabled={pending}
                  onChange={(event) => setMonth(event.target.value)}
                />
                {month && (
                  <Button variant="ghost" disabled={pending} onClick={() => setMonth("")}>
                    Clear
                  </Button>
                )}
              </div>
            </Field>
          </div>
          {!monthError && (
            <>
              <UsageSummary title="Account usage" value={accountUsage} />
              {userId && <UsageSummary title="User usage" value={userUsage} />}
            </>
          )}
          <Button
            variant="outline"
            onClick={() => setRefresh((value) => value + 1)}
            disabled={!!monthError}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh usage
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Manual consumption</CardTitle>
          <CardDescription>
            Each Consume click starts a new request. Retry/replay sends the exact saved payload,
            even if inputs have changed. Decisions apply to the current UTC month; completing one
            returns the usage display to that month.
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
                      {attempt.decision.duplicate
                        ? "duplicate — no new increment"
                        : "not duplicate"}
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
    </div>
  );
}
