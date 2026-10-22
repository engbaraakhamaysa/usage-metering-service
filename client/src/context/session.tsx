import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type { ApiClient, ApiConfig } from "@/api/client";
import { useQueryClient } from "@tanstack/react-query";
import { createHttpApi, normalizeBaseUrl, type ManagementApi } from "@/api/http";
import { createMockApi } from "@/mocks/mockApi";

interface SessionValue {
  api: ApiClient;
  backendApi: ManagementApi;
  backendScope: readonly [string, string, number];
  baseUrl: string;
  setBaseUrl: (v: string) => void;
  apiKey: string | null;
  setApiKey: (v: string | null) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

/** API key lives only in React memory: never persisted, never logged. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [baseUrl, updateBaseUrl] = useState("");
  const [apiKey, updateApiKey] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const resetConnection = () => {
    void qc.cancelQueries();
    qc.clear();
    setRevision((value) => value + 1);
  };
  const setApiKey = (value: string | null) => {
    resetConnection();
    updateApiKey(value);
  };
  const setBaseUrl = (value: string) => {
    const normalized = normalizeBaseUrl(value);
    if (normalized === baseUrl) return;
    resetConnection();
    updateBaseUrl(normalized);
    // Never carry an existing key to a newly configured backend.
    updateApiKey(null);
  };
  const backendApi = useMemo(() => createHttpApi({ baseUrl, apiKey }), [baseUrl, apiKey]);
  const backendScope = ["backend", baseUrl, revision] as const;
  const cfg = useRef<ApiConfig>({ baseUrl, apiKey });
  cfg.current = { baseUrl, apiKey };
  const api = useMemo(() => createMockApi(() => cfg.current), []);
  return (
    <SessionContext.Provider
      value={{ api, backendApi, backendScope, baseUrl, setBaseUrl, apiKey, setApiKey }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const v = useContext(SessionContext);
  if (!v) throw new Error("useSession must be used inside SessionProvider");
  return v;
}
