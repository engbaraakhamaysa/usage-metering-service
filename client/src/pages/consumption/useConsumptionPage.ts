import { ApiError } from "@/api/errors";
import { useBackendSession } from "@/api/use-backend-session";
import { usePageActive } from "@/hooks/use-page-active";
import type { ConsumeRequest, User } from "@/types";
import { generateUuid, parsePositiveInt } from "@/utils";
import { useEffect, useRef, useState } from "react";
import { useUsage } from "./useUsage";

export function useConsumptionPage() {
  const {
    api,
    apiKey,
    connectionSignal,
    consumptionAttempt: attempt,
    setConsumptionAttempt,
  } = useBackendSession();
  const active = usePageActive();
  const inFlight = useRef(false);
  const [users, setUsers] = useState<{ data: User[]; loading: boolean; error: unknown }>({
    data: [],
    loading: !!apiKey,
    error: null,
  });
  const [userId, setUserId] = useState(attempt?.request.userId ?? "");
  const [units, setUnits] = useState("");
  const { month, setMonth, setRefresh, accountUsage, userUsage, maxMonth, monthError } =
    useUsage(userId);
  const [pending, setPending] = useState(false);
  const [mutationError, setMutationError] = useState<unknown>(null);
  const parsedUnits = parsePositiveInt(units);
  const validUnits = parsedUnits !== null && parsedUnits <= 2_147_483_647;

  useEffect(() => {
    if (!apiKey) return;
    let current = true;
    api.listUsers().then(
      (data) => {
        if (current && !connectionSignal.aborted) setUsers({ data, loading: false, error: null });
      },
      (error: unknown) => {
        if (current && !connectionSignal.aborted) setUsers({ data: [], loading: false, error });
      },
    );
    return () => {
      current = false;
    };
  }, [api, apiKey, connectionSignal]);
  const runConsume = async (input: ConsumeRequest) => {
    if (inFlight.current || connectionSignal.aborted) return;
    inFlight.current = true;
    const request = { ...input }; // Snapshot: replay never reads the edited form.
    const confirmed = attempt?.request.requestId === request.requestId ? attempt.decision : null;
    setPending(true);
    setMutationError(null);
    setConsumptionAttempt({ request, decision: confirmed, uncertain: true });
    try {
      const decision = await api.consume(request);
      if (!active.current || connectionSignal.aborted) return;
      setConsumptionAttempt({ request, decision, uncertain: false });
      // Counters are read in independent effects; refresh failures never become write errors.
      setMonth("");
      setRefresh((value) => value + 1);
    } catch (error) {
      if (!active.current || connectionSignal.aborted) return;
      setMutationError(error);
      setConsumptionAttempt({
        request,
        decision: confirmed,
        uncertain: !(error instanceof ApiError) || error.status >= 500,
      });
    } finally {
      inFlight.current = false;
      if (active.current && !connectionSignal.aborted) setPending(false);
    }
  };
  const submitNew = () => {
    if (
      inFlight.current ||
      pending ||
      attempt?.uncertain ||
      !validUnits ||
      !userId ||
      parsedUnits === null
    )
      return;
    void runConsume({ userId, requestedUnits: parsedUnits, requestId: generateUuid() });
  };

  return {
    apiKey,
    attempt,
    setConsumptionAttempt,
    users,
    userId,
    setUserId,
    units,
    setUnits,
    month,
    setMonth,
    setRefresh,
    accountUsage,
    userUsage,
    pending,
    mutationError,
    setMutationError,
    maxMonth,
    monthError,
    validUnits,
    runConsume,
    submitNew,
  };
}
