import { useEffect, useState } from "react";
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
import type { Plan, User } from "@/types";

function useUserPlans() {
  const { api, apiKey, connectionSignal } = useBackendSession();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let current = true;
    const request = apiKey ? api.listMyPlans("user") : api.listPublicPlans("user");
    request
      .then(
        (data) => {
          if (current && !connectionSignal.aborted) setPlans(data);
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
  }, [api, apiKey, connectionSignal]);
  return { plans, error, loading };
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

function UserDetails({ id, onChanged }: { id: string; onChanged: () => void }) {
  const { api, connectionSignal } = useBackendSession();
  const active = usePageActive();
  const { plans, error: plansError, loading: plansLoading } = useUserPlans();
  const [user, setUser] = useState<{ data: User | null; isLoading: boolean; error: unknown }>({
    data: null,
    isLoading: true,
    error: null,
  });
  const [planId, setPlanId] = useState("");
  const [change, setChange] = useState({
    isPending: false,
    isSuccess: false,
    error: null as unknown,
  });
  useEffect(() => {
    let current = true;
    api.getUser(id).then(
      (data) => {
        if (current && !connectionSignal.aborted) setUser({ data, isLoading: false, error: null });
      },
      (error: unknown) => {
        if (current && !connectionSignal.aborted) setUser({ data: null, isLoading: false, error });
      },
    );
    return () => {
      current = false;
    };
  }, [api, id, connectionSignal]);
  const changePlan = async () => {
    setChange({ isPending: true, isSuccess: false, error: null });
    try {
      const data = await api.updateUserPlan(id, planId);
      if (connectionSignal.aborted) return;
      // The list still needs refreshing if this dialog was closed while saving.
      onChanged();
      if (!active.current) return;
      setUser({ data, isLoading: false, error: null });
      setPlanId("");
      setChange({ isPending: false, isSuccess: true, error: null });
    } catch (error) {
      if (active.current && !connectionSignal.aborted)
        setChange({ isPending: false, isSuccess: false, error });
    }
  };
  if (user.isLoading) return <LoadingState />;
  if (user.error) return <ErrorState error={user.error} />;
  if (!user.data) return null;
  const plan = plans.find((p) => p.id === user.data?.planId);
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
      {Boolean(plansError) && <ErrorState error={plansError} />}
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          void changePlan();
        }}
      >
        <Field
          label="Change plan"
          htmlFor="ud-plan"
          hint="Usage is not reset when the plan changes."
        >
          <PlanSelect
            id="ud-plan"
            plans={plans.filter((p) => p.id !== user.data?.planId)}
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
      {Boolean(change.error) && <ErrorState error={change.error} />}
    </div>
  );
}

export function UsersPage() {
  const { connectionId } = useBackendSession();
  return <ConnectedUsersPage key={connectionId} />;
}

function ConnectedUsersPage() {
  const { api, apiKey, connectionSignal } = useBackendSession();
  const active = usePageActive();
  const { plans, error: plansError, loading: plansLoading } = useUserPlans();
  const [users, setUsers] = useState<{ data: User[]; isLoading: boolean; error: unknown }>({
    data: [],
    isLoading: !!apiKey,
    error: null,
  });
  const [refresh, setRefresh] = useState(0);
  const [name, setName] = useState("");
  const [planId, setPlanId] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [create, setCreate] = useState({
    isPending: false,
    isSuccess: false,
    error: null as unknown,
  });
  useEffect(() => {
    if (!apiKey) return;
    let current = true;
    setUsers({ data: [], isLoading: true, error: null });
    api.listUsers().then(
      (data) => {
        if (current && !connectionSignal.aborted) setUsers({ data, isLoading: false, error: null });
      },
      (error: unknown) => {
        if (current && !connectionSignal.aborted) setUsers({ data: [], isLoading: false, error });
      },
    );
    return () => {
      current = false;
    };
  }, [api, apiKey, connectionSignal, refresh]);
  const createUser = async () => {
    setCreate({ isPending: true, isSuccess: false, error: null });
    try {
      await api.createUser({ name, planId });
      if (!active.current || connectionSignal.aborted) return;
      setName("");
      setPlanId("");
      setCreate({ isPending: false, isSuccess: true, error: null });
      setRefresh((value) => value + 1);
    } catch (error) {
      if (active.current && !connectionSignal.aborted)
        setCreate({ isPending: false, isSuccess: false, error });
    }
  };

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
          {selected && (
            <UserDetails
              key={selected}
              id={selected}
              onChanged={() => {
                if (active.current && !connectionSignal.aborted) setRefresh((value) => value + 1);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
