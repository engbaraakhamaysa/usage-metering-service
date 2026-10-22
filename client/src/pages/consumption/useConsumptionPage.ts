import { ApiError } from "@/api/errors";
import { useBackendSession } from "@/api/use-backend-session";
import type { ConsumptionInput } from "@/context/session";
import { usePageActive } from "@/hooks/use-page-active";
import type { User } from "@/types";
import { countCharacters, generateUuid, parsePositiveInt } from "@/utils";
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
  const [text, setText] = useState("");
  const characterCount = countCharacters(text);
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
  const runConsume = async (input: ConsumptionInput) => {
    if (inFlight.current || connectionSignal.aborted) return;
    inFlight.current = true;
    // Freeze the logical input. Only its three request fields go to the backend.
    const saved = Object.freeze({ ...input, request: Object.freeze({ ...input.request }) });
    const { request } = saved;
    const confirmed = attempt?.request.requestId === request.requestId ? attempt.decision : null;
    setPending(true);
    setMutationError(null);
    setConsumptionAttempt({ ...saved, decision: confirmed, uncertain: true });
    try {
      const decision = await api.consume(request);
      if (!active.current || connectionSignal.aborted) return;
      setConsumptionAttempt({ ...saved, decision, uncertain: false });
      // Counters are read in independent effects; refresh failures never become write errors.
      setMonth("");
      setRefresh((value) => value + 1);
    } catch (error) {
      if (!active.current || connectionSignal.aborted) return;
      setMutationError(error);
      setConsumptionAttempt({
        ...saved,
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
    void runConsume({
      mode: "manual",
      request: { userId, requestedUnits: parsedUnits, requestId: generateUuid() },
    });
  };

  const submitText = () => {
    if (
      inFlight.current ||
      pending ||
      attempt?.uncertain ||
      !userId ||
      !text.trim() ||
      characterCount < 1 ||
      characterCount > 2_147_483_647
    )
      return;
    void runConsume({
      mode: "text",
      text,
      request: { userId, requestedUnits: characterCount, requestId: generateUuid() },
    });
  };

  return {
    apiKey,
    text,
    setText,
    characterCount,
    submitText,
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
