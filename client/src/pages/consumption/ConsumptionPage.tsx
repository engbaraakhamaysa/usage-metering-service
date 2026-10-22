import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
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
  NeedsApiKey,
  PageHeader,
  ReasonText,
} from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/context/session";
import { currentMonth, formatDate, generateUuid, parsePositiveInt } from "@/utils";
import type { ConsumeRequest, ConsumeResult } from "@/types";

const ACCOUNT = "__account__";

export function ConsumptionPage() {
  const { api, apiKey } = useSession();
  const qc = useQueryClient();
  const users = useQuery({
    queryKey: ["users", apiKey],
    queryFn: api.listUsers,
    enabled: !!apiKey,
  });

  const [scope, setScope] = useState(ACCOUNT);
  const [month, setMonth] = useState("");
  const maxMonth = currentMonth();
  const monthError = month && month > maxMonth ? "Future months are not allowed" : null;
  const usage = useQuery({
    queryKey: ["usage", scope, apiKey, month],
    queryFn: () =>
      scope === ACCOUNT
        ? api.getAccountUsage(month || undefined)
        : api.getUserUsage(scope, month || undefined),
    enabled: !!apiKey && !monthError,
  });

  // operation state
  const [userId, setUserId] = useState("");
  const [units, setUnits] = useState("");
  const [requestId, setRequestId] = useState(() => generateUuid());
  const [last, setLast] = useState<{ req: ConsumeRequest; result: ConsumeResult } | null>(null);
  const parsedUnits = parsePositiveInt(units);
  const newOp = () => setRequestId(generateUuid());

  const consume = useMutation({
    mutationFn: (req: ConsumeRequest) => api.consume(req).then((result) => ({ req, result })),
    onSuccess: (r) => {
      setLast(r);
      qc.invalidateQueries({ queryKey: ["usage"] });
      qc.invalidateQueries({ queryKey: ["records"] });
    },
  });

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
        description="Inspect usage and submit manual consumption requests."
      />
      <Card>
        <CardHeader>
          <CardTitle>Usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Scope" htmlFor="scope">
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger id="scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ACCOUNT}>Account</SelectItem>
                  {users.data?.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      User: {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              label="Month (optional, YYYY-MM)"
              htmlFor="month"
              error={monthError}
              hint="Empty = current month"
            >
              <div className="flex gap-2">
                <Input
                  id="month"
                  type="month"
                  max={maxMonth}
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                />
                {month && (
                  <Button variant="ghost" onClick={() => setMonth("")}>
                    Clear
                  </Button>
                )}
              </div>
            </Field>
          </div>
          {monthError ? null : usage.isLoading ? (
            <LoadingState />
          ) : usage.error ? (
            <ErrorState error={usage.error} />
          ) : (
            usage.data && (
              <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {[
                  ["usedUnits", usage.data.usedUnits],
                  ["remainingUnits", usage.data.remainingUnits ?? "Not applicable"],
                  [
                    "currentPlan",
                    `${usage.data.currentPlan.name} (${usage.data.currentPlan.monthlyAllowance}/mo)`,
                  ],
                  ["periodStart", formatDate(usage.data.periodStart)],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg border p-3">
                    <dt className="font-mono text-xs text-muted-foreground">{k}</dt>
                    <dd className="mt-1 font-semibold tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
            )
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual consumption</CardTitle>
          <CardDescription>
            POST /api/usage/consume. Must satisfy both account and user limits. Changing any field
            starts a new operation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {users.isLoading ? (
            <LoadingState />
          ) : users.error ? (
            <ErrorState error={users.error} />
          ) : !users.data?.length ? (
            <EmptyState title="No users">Create a user on the Users page first.</EmptyState>
          ) : (
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (parsedUnits && userId)
                  consume.mutate({ userId, requestId, requestedUnits: parsedUnits });
              }}
            >
              <Field label="userId" htmlFor="c-user">
                <Select
                  value={userId}
                  onValueChange={(v) => {
                    setUserId(v);
                    newOp();
                  }}
                >
                  <SelectTrigger id="c-user">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.data.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field
                label="requestedUnits"
                htmlFor="c-units"
                error={units && !parsedUnits ? "Must be a positive integer" : null}
              >
                <Input
                  id="c-units"
                  inputMode="numeric"
                  value={units}
                  onChange={(e) => {
                    setUnits(e.target.value);
                    newOp();
                  }}
                />
              </Field>
              <div className="md:col-span-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">requestId:</span>
                <code className="font-mono text-xs break-all">{requestId}</code>
                <Button type="button" size="sm" variant="ghost" onClick={newOp}>
                  <RefreshCw className="h-3 w-3" /> New
                </Button>
              </div>
              <div className="md:col-span-2 flex flex-wrap gap-2">
                <Button type="submit" disabled={!userId || !parsedUnits || consume.isPending}>
                  {consume.isPending ? "Sending…" : "Consume"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!last || consume.isPending}
                  onClick={() => last && consume.mutate(last.req)}
                >
                  Replay last request
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!last || !userId || !parsedUnits || consume.isPending}
                  onClick={() =>
                    last &&
                    parsedUnits &&
                    consume.mutate({
                      userId,
                      requestedUnits: parsedUnits,
                      requestId: last.req.requestId,
                    })
                  }
                >
                  Reuse last requestId with current data (409 test)
                </Button>
              </div>
            </form>
          )}
          {consume.error && <ErrorState error={consume.error} />}
          {last && !consume.error && (
            <div className="rounded-lg border p-4 space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">Decision (HTTP 200):</span>
                <DecisionBadge accepted={last.result.accepted} />
                {last.result.duplicate && (
                  <Badge variant="outline">duplicate — original decision, no new increment</Badge>
                )}
              </div>
              <div>
                rejectionReason: <ReasonText reason={last.result.rejectionReason} />
              </div>
              <div className="text-muted-foreground font-mono text-xs break-all">
                requestId {last.req.requestId} · userId {last.req.userId} · units{" "}
                {last.req.requestedUnits}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
