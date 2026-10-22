import type { ManagementApi } from "@/api/http";
import { useBackendSession } from "@/api/use-backend-session";
import { usePageActive } from "@/hooks/use-page-active";
import type { Plan } from "@/types";
import { useEffect, useState } from "react";

export function useAccountPage() {
  const {
    api,
    apiKey,
    setApiKey,
    baseUrl,
    setBaseUrl,
    connectionSignal,
    createdKey: newKey,
    hideCreatedKey,
    connectCreatedAccount,
  } = useBackendSession();
  const active = usePageActive();
  const [name, setName] = useState("");
  const [planId, setPlanId] = useState("");
  const [copied, setCopied] = useState(false);
  const [keyInput, setKeyInput] = useState(apiKey ?? "");
  const [urlInput, setUrlInput] = useState(baseUrl);
  const [urlError, setUrlError] = useState<Error | null>(null);
  const [switchTo, setSwitchTo] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [publicPlans, setPublicPlans] = useState<{
    data: Plan[];
    isLoading: boolean;
    error: unknown;
  }>({ data: [], isLoading: true, error: null });
  const [myPlans, setMyPlans] = useState<{ data: Plan[]; isLoading: boolean; error: unknown }>({
    data: [],
    isLoading: !!apiKey,
    error: null,
  });
  const [usage, setUsage] = useState<{
    data: Awaited<ReturnType<ManagementApi["getAccountPlan"]>> | null;
    isLoading: boolean;
    error: unknown;
  }>({ data: null, isLoading: !!apiKey, error: null });
  const [create, setCreate] = useState({ isPending: false, error: null as unknown });
  const [switchPlan, setSwitchPlan] = useState({
    isPending: false,
    isSuccess: false,
    error: null as unknown,
  });
  const pendingConnection = create.isPending || switchPlan.isPending;
  useEffect(() => {
    let current = true;
    setPublicPlans({ data: [], isLoading: true, error: null });
    api.listPublicPlans("account").then(
      (data) => {
        if (current && !connectionSignal.aborted)
          setPublicPlans({ data, isLoading: false, error: null });
      },
      (error: unknown) => {
        if (current && !connectionSignal.aborted)
          setPublicPlans({ data: [], isLoading: false, error });
      },
    );
    return () => {
      current = false;
    };
  }, [api, connectionSignal]);
  useEffect(() => {
    if (!apiKey) return;
    let current = true;
    setMyPlans({ data: [], isLoading: true, error: null });
    setUsage({ data: null, isLoading: true, error: null });
    Promise.all([api.listMyPlans("account"), api.getAccountPlan()]).then(
      ([plans, plan]) => {
        if (current && !connectionSignal.aborted) {
          setMyPlans({ data: plans, isLoading: false, error: null });
          setUsage({ data: plan, isLoading: false, error: null });
        }
      },
      (error: unknown) => {
        if (current && !connectionSignal.aborted) {
          setMyPlans({ data: [], isLoading: false, error });
          setUsage({ data: null, isLoading: false, error });
        }
      },
    );
    return () => {
      current = false;
    };
  }, [api, apiKey, connectionSignal, refresh]);
  const createAccount = async () => {
    if (create.isPending) return;
    setCreate({ isPending: true, error: null });
    try {
      const response = await api.createAccount({ name, planId });
      if (active.current && !connectionSignal.aborted) connectCreatedAccount(response.apiKey);
    } catch (error) {
      if (active.current && !connectionSignal.aborted) setCreate({ isPending: false, error });
    }
  };
  const changePlan = async () => {
    setSwitchPlan({ isPending: true, isSuccess: false, error: null });
    try {
      await api.updateAccountPlan(switchTo);
      if (!active.current || connectionSignal.aborted) return;
      setSwitchTo("");
      setSwitchPlan({ isPending: false, isSuccess: true, error: null });
      setRefresh((value) => value + 1);
    } catch (error) {
      if (active.current && !connectionSignal.aborted)
        setSwitchPlan({ isPending: false, isSuccess: false, error });
    }
  };
  const currentPlan = myPlans.data.find((plan) => plan.id === usage.data?.id);

  const copy = async () => {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    if (!active.current || connectionSignal.aborted) return;
    setCopied(true);
    setTimeout(() => {
      if (active.current && !connectionSignal.aborted) setCopied(false);
    }, 1500);
  };

  return {
    apiKey,
    setApiKey,
    setBaseUrl,
    newKey,
    hideCreatedKey,
    name,
    setName,
    planId,
    setPlanId,
    copied,
    keyInput,
    setKeyInput,
    urlInput,
    setUrlInput,
    urlError,
    setUrlError,
    switchTo,
    setSwitchTo,
    publicPlans,
    myPlans,
    usage,
    create,
    switchPlan,
    pendingConnection,
    createAccount,
    changePlan,
    currentPlan,
    copy,
  };
}
