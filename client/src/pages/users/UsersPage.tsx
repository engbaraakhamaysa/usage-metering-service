import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  NeedsApiKey,
  PageHeader,
} from "@/components/ui/states";
import { useBackendSession } from "@/api/use-backend-session";
import { formatDate } from "@/utils";
import type { Plan } from "@/types";

function useUserPlans() {
  const { api, apiKey, backendScope } = useBackendSession();
  const pub = useQuery({
    queryKey: [...backendScope, "plans", "public", "user"],
    retry: false,
    queryFn: () => api.listPublicPlans("user"),
  });
  const mine = useQuery({
    queryKey: [...backendScope, "plans", "me", "user"],
    retry: false,
    queryFn: () => api.listMyPlans("user"),
    enabled: !!apiKey,
  });
  const plans: Plan[] = apiKey ? (mine.data ?? []) : (pub.data ?? []);
  return {
    plans,
    error: pub.error ?? mine.error,
    loading: pub.isLoading || (!!apiKey && mine.isLoading),
  };
}

function PlanSelect({
  id,
  plans,
  value,
  onChange,
}: {
  id: string;
  plans: Plan[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id}>
        <SelectValue placeholder="Select a user plan" />
      </SelectTrigger>
      <SelectContent>
        {plans.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name} ({p.isPublic ? "public" : "private"}) · {p.monthlyAllowance}/mo
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function UserDetails({ id }: { id: string }) {
  const { api, apiKey, backendScope } = useBackendSession();
  const qc = useQueryClient();
  const { plans, error: plansError, loading: plansLoading } = useUserPlans();
  const user = useQuery({
    queryKey: [...backendScope, "user", id],
    retry: false,
    queryFn: () => api.getUser(id),
  });
  const [planId, setPlanId] = useState("");
  const change = useMutation({
    mutationKey: ["backend", "user-plan"],
    mutationFn: () => api.updateUserPlan(id, planId),
    onSuccess: () => {
      setPlanId("");
      qc.invalidateQueries();
    },
  });
  if (user.isLoading) return <LoadingState />;
  if (user.error) return <ErrorState error={user.error} />;
  if (!user.data) return null;
  const plan = plans.find((p) => p.id === user.data.planId);
  return (
    <div className="space-y-4 text-sm">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        <dt className="text-muted-foreground">ID</dt>
        <dd className="font-mono text-xs break-all">{user.data.id}</dd>
        <dt className="text-muted-foreground">Name</dt>
        <dd>{user.data.name}</dd>
        <dt className="text-muted-foreground">Plan</dt>
        <dd>{plan?.name ?? user.data.planId}</dd>
        <dt className="text-muted-foreground">Created</dt>
        <dd>{formatDate(user.data.createdAt)}</dd>
      </dl>
      {plansLoading && <LoadingState label="Loading user plans…" />}
      {plansError && <ErrorState error={plansError} />}
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          change.mutate();
        }}
      >
        <Field
          label="Change plan"
          htmlFor="ud-plan"
          hint="Usage is not reset when the plan changes."
        >
          <PlanSelect
            id="ud-plan"
            plans={plans.filter((p) => p.id !== user.data.planId)}
            value={planId}
            onChange={setPlanId}
          />
        </Field>
        <Button
          type="submit"
          disabled={!planId || change.isPending || plansLoading || !!plansError}
        >
          {change.isPending ? "Saving…" : "Change plan"}
        </Button>
      </form>
      {change.isSuccess && (
        <p role="status" className="text-sm text-muted-foreground">
          User plan updated.
        </p>
      )}
      {change.error && <ErrorState error={change.error} />}
    </div>
  );
}

export function UsersPage() {
  const { backendScope } = useBackendSession();
  return <ConnectedUsersPage key={JSON.stringify(backendScope)} />;
}

function ConnectedUsersPage() {
  const { api, apiKey, backendScope } = useBackendSession();
  const qc = useQueryClient();
  const { plans, error: plansError, loading: plansLoading } = useUserPlans();
  const users = useQuery({
    queryKey: [...backendScope, "users"],
    retry: false,
    queryFn: api.listUsers,
    enabled: !!apiKey,
  });
  const [name, setName] = useState("");
  const [planId, setPlanId] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const create = useMutation({
    mutationKey: ["backend", "create-user"],
    mutationFn: () => api.createUser({ name, planId }),
    onSuccess: () => {
      setName("");
      setPlanId("");
      qc.invalidateQueries({ queryKey: [...backendScope, "users"] });
    },
  });

  if (!apiKey)
    return (
      <div>
        <PageHeader title="Users" />
        <NeedsApiKey />
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Users belong to your account. Each user has a user-type plan."
      />
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
              create.mutate();
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
          {plansError && <ErrorState error={plansError} />}
          {create.isSuccess && (
            <p role="status" className="text-sm text-muted-foreground">
              User created.
            </p>
          )}
          {create.error && <ErrorState error={create.error} />}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          {users.isLoading ? (
            <LoadingState />
          ) : users.error ? (
            <ErrorState error={users.error} />
          ) : !users.data?.length ? (
            <EmptyState title="No users yet">Create your first user above.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.data.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>
                        {plans.find((p) => p.id === u.planId)?.name ?? u.planId}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(u.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setSelected(u.id)}>
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User details</DialogTitle>
          </DialogHeader>
          {selected && <UserDetails id={selected} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
