import { useBackendSession } from "@/api/use-backend-session";
import { usePageActive } from "@/hooks/use-page-active";
import type { User } from "@/types";
import { useEffect, useState } from "react";
import { useUserPlans } from "./use-user-plans";

export function useUsersPage() {
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

  return {
    apiKey,
    connectionSignal,
    active,
    plans,
    plansError,
    plansLoading,
    users,
    setRefresh,
    name,
    setName,
    planId,
    setPlanId,
    selected,
    setSelected,
    create,
    createUser,
  };
}
