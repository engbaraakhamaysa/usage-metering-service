import type { CreatePlanInput, UpdatePlanInput } from "@/api/client";
import { useBackendSession } from "@/api/use-backend-session";
import { usePageActive } from "@/hooks/use-page-active";
import type { Plan, PlanType } from "@/types";
import { useEffect, useState } from "react";

export function usePlansPage() {
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

  return {
    apiKey,
    filter,
    setFilter,
    editing,
    setEditing,
    formKey,
    rows,
    loading,
    error,
    create,
    update,
    setUpdate,
    createPlan,
    updatePlan,
  };
}
