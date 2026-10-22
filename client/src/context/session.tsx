import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import type { ApiClient, ApiConfig } from "@/api/client";
import { createMockApi } from "@/mocks/mockApi";

interface SessionValue {
  api: ApiClient;
  baseUrl: string;
  setBaseUrl: (v: string) => void;
  apiKey: string | null;
  setApiKey: (v: string | null) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

/** API key lives only in React memory: never persisted, never logged. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [baseUrl, setBaseUrl] = useState("http://localhost:3000");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const cfg = useRef<ApiConfig>({ baseUrl, apiKey });
  cfg.current = { baseUrl, apiKey };
  const api = useMemo(() => createMockApi(() => cfg.current), []);
  return (
    <SessionContext.Provider value={{ api, baseUrl, setBaseUrl, apiKey, setApiKey }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const v = useContext(SessionContext);
  if (!v) throw new Error("useSession must be used inside SessionProvider");
  return v;
}
