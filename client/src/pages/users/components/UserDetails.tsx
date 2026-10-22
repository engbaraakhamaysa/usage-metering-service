import { useBackendSession } from "@/api/use-backend-session";
import { Button } from "@/components/ui/button";
import { ErrorState, Field, LoadingState } from "@/components/ui/states";
import { usePageActive } from "@/hooks/use-page-active";
import type { User } from "@/types";
import { formatDate } from "@/utils";
import { useEffect, useState } from "react";
import { useUserPlans } from "../use-user-plans";
import { PlanSelect } from "./PlanSelect";

export function UserDetails({ id, onChanged }: { id: string; onChanged: () => void }) {
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
