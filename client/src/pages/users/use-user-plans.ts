import { useBackendSession } from "@/api/use-backend-session";
import type { Plan } from "@/types";
import { useEffect, useState } from "react";

export function useUserPlans() {
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
