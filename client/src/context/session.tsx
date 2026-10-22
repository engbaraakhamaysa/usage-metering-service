import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { ConsumeRequest } from "@/types";
import {
  createHttpApi,
  normalizeBaseUrl,
  type ManagementApi,
  type ConsumptionDecision,
} from "@/api/http";

export type ConsumptionInput =
  | { readonly mode: "manual"; readonly request: Readonly<ConsumeRequest> }
  | { readonly mode: "text"; readonly text: string; readonly request: Readonly<ConsumeRequest> };

export type ConsumptionAttempt = ConsumptionInput & {
  decision: ConsumptionDecision | null;
  uncertain: boolean;
};

interface SessionValue {
  backendApi: ManagementApi;
  consumptionAttempt: ConsumptionAttempt | null;
  setConsumptionAttempt: (value: ConsumptionAttempt | null) => void;
  connectionId: number;
  connectionSignal: AbortSignal;
  baseUrl: string;
  setBaseUrl: (value: string) => void;
  apiKey: string | null;
  setApiKey: (value: string | null) => void;
  connectCreatedAccount: (key: string) => void;
  createdKey: string | null;
  hideCreatedKey: () => void;
}
const SessionContext = createContext<SessionValue | null>(null);

/** Credentials exist only in React memory. Every connection has its own abort signal. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [connection, setConnection] = useState(() => ({
    baseUrl: "",
    apiKey: null as string | null,
    id: 0,
    controller: new AbortController(),
  }));
  const [consumptionAttempt, setConsumptionAttempt] = useState<ConsumptionAttempt | null>(null);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const hideCreatedKey = useCallback(() => setCreatedKey(null), []);
  const { baseUrl, apiKey, controller } = connection;
  const changeConnection = (url: string, key: string | null, reveal = false) => {
    setConsumptionAttempt(null);
    controller.abort(); // Invalidate pending reads AND writes before rendering the new identity.
    setCreatedKey(reveal ? key : null);
    setConnection({
      baseUrl: url,
      apiKey: key,
      id: connection.id + 1,
      controller: new AbortController(),
    });
  };
  const backendApi = useMemo(
    () => createHttpApi({ baseUrl, apiKey }, globalThis.fetch, controller.signal),
    [baseUrl, apiKey, controller],
  );
  return (
    <SessionContext.Provider
      value={{
        backendApi,
        consumptionAttempt,
        setConsumptionAttempt,
        connectionId: connection.id,
        connectionSignal: controller.signal,
        baseUrl,
        apiKey,
        createdKey,
        hideCreatedKey,
        setApiKey: (key) => changeConnection(baseUrl, key),
        connectCreatedAccount: (key) => changeConnection(baseUrl, key, true),
        setBaseUrl: (value) => {
          const url = normalizeBaseUrl(value);
          if (url !== baseUrl) changeConnection(url, null);
        },
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside SessionProvider");
  return session;
}
