import { useEffect, useState } from "react";
import { usePageActive } from "@/hooks/use-page-active";
import type { CreatePlanInput, UpdatePlanInput } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  NeedsApiKey,
  PageHeader,
} from "@/components/ui/states";
import { useBackendSession } from "@/api/use-backend-session";
import { parsePositiveInt } from "@/utils";
import type { Plan, PlanType } from "@/types";

const LIMIT_ERR = "Must be an integer from 1 to 2147483647";

function PlanForm({
  initial,
  onSubmit,
  pending,
  submitLabel,
  withType,
  idPrefix = "pf",
}: {
  initial: {
    name: string;
    planType: PlanType;
    monthlyAllowance: string;
    maxUnitsPerRequest: string;
  };
  onSubmit: (v: {
    name: string;
    planType: PlanType;
    monthlyAllowance: number;
    maxUnitsPerRequest: number;
  }) => void;
  pending: boolean;
  submitLabel: string;
  withType: boolean;
  idPrefix?: string;
}) {
  const [v, setV] = useState(initial);
  const [touched, setTouched] = useState(false);
  const ma = parsePositiveInt(v.monthlyAllowance);
  const mr = parsePositiveInt(v.maxUnitsPerRequest);
  const valid =
    !!v.name.trim() && ma !== null && mr !== null && ma <= 2_147_483_647 && mr <= 2_147_483_647;
  return (
    <form
      className="grid gap-4 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (valid)
          onSubmit({
            name: v.name.trim(),
            planType: v.planType,
            monthlyAllowance: ma,
            maxUnitsPerRequest: mr,
          });
      }}
    >
      <Field
        label="Name"
        htmlFor={`${idPrefix}-name`}
        error={touched && !v.name.trim() ? "Required" : null}
      >
        <Input
          maxLength={255}
          id={`${idPrefix}-name`}
          value={v.name}
          onChange={(e) => setV({ ...v, name: e.target.value })}
        />
      </Field>
      {withType && (
        <Field label="Plan type" htmlFor={`${idPrefix}-type`}>
          <Select value={v.planType} onValueChange={(t) => setV({ ...v, planType: t as PlanType })}>
            <SelectTrigger id={`${idPrefix}-type`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="account">account</SelectItem>
              <SelectItem value="user">user</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      )}
      <Field
        label="Monthly allowance"
        htmlFor={`${idPrefix}-ma`}
        error={touched && (ma === null || ma > 2_147_483_647) ? LIMIT_ERR : null}
      >
        <Input
          id={`${idPrefix}-ma`}
          inputMode="numeric"
          value={v.monthlyAllowance}
          onChange={(e) => setV({ ...v, monthlyAllowance: e.target.value })}
        />
      </Field>
      <Field
        label="Max units per request"
        htmlFor={`${idPrefix}-mr`}
        error={touched && (mr === null || mr > 2_147_483_647) ? LIMIT_ERR : null}
      >
        <Input
          id={`${idPrefix}-mr`}
          inputMode="numeric"
          value={v.maxUnitsPerRequest}
          onChange={(e) => setV({ ...v, maxUnitsPerRequest: e.target.value })}
        />
      </Field>
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function PlansPage() {
  const { connectionId } = useBackendSession();
  return <ConnectedPlansPage key={connectionId} />;
}

function ConnectedPlansPage() {
  const { api, apiKey, connectionId } = useBackendSession();
  const active = usePageActive();
  const { connectionSignal } = useBackendSession();
  const [filter, setFilter] = useState<"all" | PlanType>("all");
  const [editing, setEditing] = useState<Plan | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [rows, setRows] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [create, setCreate] = useState({
    isPending: false,
    isSuccess: false,
    error: null as unknown,
  });
  const [update, setUpdate] = useState({
    isPending: false,
    isSuccess: false,
    error: null as unknown,
  });
  useEffect(() => {
    let current = true;
    setRows([]);
    setLoading(true);
    setError(null);
    const type = filter === "all" ? undefined : filter;
    const request = apiKey ? api.listMyPlans(type) : api.listPublicPlans(type);
    request
      .then(
        (data) => {
          if (current && !connectionSignal.aborted) setRows(data);
        },
        (cause: unknown) => {
          if (current && !connectionSignal.aborted) setError(cause);
        },
      )
      .finally(() => {
        if (current && !connectionSignal.aborted) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [api, apiKey, connectionSignal, filter, refresh]);
  const createPlan = async (input: CreatePlanInput) => {
    setCreate({ isPending: true, isSuccess: false, error: null });
    try {
      await api.createPlan(input);
      if (!active.current || connectionSignal.aborted) return;
      setCreate({ isPending: false, isSuccess: true, error: null });
      setFormKey((value) => value + 1);
      setRefresh((value) => value + 1);
    } catch (cause) {
      if (active.current && !connectionSignal.aborted)
        setCreate({ isPending: false, isSuccess: false, error: cause });
    }
  };
  const updatePlan = async (id: string, input: UpdatePlanInput) => {
    setUpdate({ isPending: true, isSuccess: false, error: null });
    try {
      await api.updatePlan(id, input);
      if (!active.current || connectionSignal.aborted) return;
      setUpdate({ isPending: false, isSuccess: true, error: null });
      setEditing(null);
      setRefresh((value) => value + 1);
    } catch (cause) {
      if (active.current && !connectionSignal.aborted)
        setUpdate({ isPending: false, isSuccess: false, error: cause });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plans"
        description="Public plans are read-only. Private plans belong to your account and can be edited. Plans cannot be deleted."
      />
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Available plans</CardTitle>
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="account">account</SelectItem>
              <SelectItem value="user">user</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState error={error} />
          ) : rows.length === 0 ? (
            <EmptyState title="No plans" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Monthly allowance</TableHead>
                    <TableHead className="text-right">Max / request</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>
                        <Badge variant={p.isPublic ? "secondary" : "outline"}>
                          {p.isPublic ? "Public" : "Private"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs">{p.planType}</code>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.monthlyAllowance}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {p.maxUnitsPerRequest}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.isPublic ? (
                          <span className="text-xs text-muted-foreground">Read-only</span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setUpdate({ isPending: false, isSuccess: false, error: null });
                              setEditing(p);
                            }}
                          >
                            Edit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {!apiKey && (
            <p className="mt-3 text-xs text-muted-foreground">
              Connect an API key to see your private plans.
            </p>
          )}
        </CardContent>
      </Card>

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

      {update.isSuccess && (
        <p role="status" className="text-sm text-muted-foreground">
          Private plan updated.
        </p>
      )}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit private plan</DialogTitle>
          </DialogHeader>
          {editing && (
            <PlanForm
              idPrefix="edit-pf"
              key={editing.id}
              withType={false}
              submitLabel="Save changes"
              pending={update.isPending}
              initial={{
                name: editing.name,
                planType: editing.planType,
                monthlyAllowance: String(editing.monthlyAllowance),
                maxUnitsPerRequest: String(editing.maxUnitsPerRequest),
              }}
              onSubmit={(v) =>
                void updatePlan(editing.id, {
                  name: v.name,
                  monthlyAllowance: v.monthlyAllowance,
                  maxUnitsPerRequest: v.maxUnitsPerRequest,
                })
              }
            />
          )}
          {Boolean(update.error) && <ErrorState error={update.error} />}
          <DialogFooter />
        </DialogContent>
      </Dialog>
    </div>
  );
}
