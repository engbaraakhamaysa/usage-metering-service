import type { BackendUsage } from "@/api/http";
import { useBackendSession } from "@/api/use-backend-session";
import { currentMonth } from "@/utils";
import { useEffect, useState } from "react";

export function useUsage(userId: string) {
  const { api, apiKey, connectionSignal } = useBackendSession();
  const [month, setMonth] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [accountUsage, setAccountUsage] = useState<UsageState>(emptyUsage);
  const [userUsage, setUserUsage] = useState<UsageState>(emptyUsage);
  const maxMonth = currentMonth();
  const monthError =
    month && (!/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(month) || month > maxMonth)
      ? "Use a valid YYYY-MM month, not in the future"
      : null;
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

  return { month, setMonth, setRefresh, accountUsage, userUsage, maxMonth, monthError };
}

export type UsageState = { data: BackendUsage | null; loading: boolean; error: unknown };
const emptyUsage: UsageState = { data: null, loading: true, error: null };
