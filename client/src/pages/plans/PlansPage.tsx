import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { useSession } from "@/context/session";
import { parsePositiveInt } from "@/utils";
import type { Plan, PlanType } from "@/types";

const LIMIT_ERR = "Must be a positive integer";

function PlanForm({
  initial,
  onSubmit,
  pending,
  submitLabel,
  withType,
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
}) {
  const [v, setV] = useState(initial);
  const [touched, setTouched] = useState(false);
  const ma = parsePositiveInt(v.monthlyAllowance);
  const mr = parsePositiveInt(v.maxUnitsPerRequest);
  const valid = !!v.name.trim() && ma !== null && mr !== null;
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
      <Field label="Name" htmlFor="pf-name" error={touched && !v.name.trim() ? "Required" : null}>
        <Input id="pf-name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
      </Field>
      {withType && (
        <Field label="Plan type" htmlFor="pf-type">
          <Select value={v.planType} onValueChange={(t) => setV({ ...v, planType: t as PlanType })}>
            <SelectTrigger id="pf-type">
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
        htmlFor="pf-ma"
        error={touched && ma === null ? LIMIT_ERR : null}
      >
        <Input
          id="pf-ma"
          inputMode="numeric"
          value={v.monthlyAllowance}
          onChange={(e) => setV({ ...v, monthlyAllowance: e.target.value })}
        />
      </Field>
      <Field
        label="Max units per request"
        htmlFor="pf-mr"
        error={touched && mr === null ? LIMIT_ERR : null}
      >
        <Input
          id="pf-mr"
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
  const { api, apiKey } = useSession();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | PlanType>("all");
  const [editing, setEditing] = useState<Plan | null>(null);
  const [formKey, setFormKey] = useState(0);
  const pt = filter === "all" ? undefined : filter;

  const pub = useQuery({
    queryKey: ["plans", "public", pt],
    queryFn: () => api.listPublicPlans(pt),
  });
  const mine = useQuery({
    queryKey: ["plans", "me", pt, apiKey],
    queryFn: () => api.listMyPlans(pt),
    enabled: !!apiKey,
  });
  const create = useMutation({
    mutationFn: api.createPlan,
    onSuccess: () => {
      setFormKey((k) => k + 1);
      qc.invalidateQueries({ queryKey: ["plans"] });
    },
  });
  const update = useMutation({
    mutationFn: (v: {
      id: string;
      name: string;
      monthlyAllowance: number;
      maxUnitsPerRequest: number;
    }) =>
      api.updatePlan(v.id, {
        name: v.name,
        monthlyAllowance: v.monthlyAllowance,
        maxUnitsPerRequest: v.maxUnitsPerRequest,
      }),
    onSuccess: () => {
      setEditing(null);
      qc.invalidateQueries();
    },
  });

  const rows: Plan[] = [...(pub.data ?? []), ...(mine.data ?? [])];
  const loading = pub.isLoading || (!!apiKey && mine.isLoading);
  const error = pub.error ?? mine.error;

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
                              update.reset();
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
                onSubmit={(v) => create.mutate(v)}
              />
              {create.error && <ErrorState error={create.error} />}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit private plan</DialogTitle>
          </DialogHeader>
          {editing && (
            <PlanForm
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
              onSubmit={(v) => update.mutate({ id: editing.id, ...v })}
            />
          )}
          {update.error && <ErrorState error={update.error} />}
          <DialogFooter />
        </DialogContent>
      </Dialog>
    </div>
  );
}
