import { useSession } from "@/context/session";

/** The authenticated HTTP client and the current in-memory connection. */
export function useBackendSession() {
  const session = useSession();
  return { ...session, api: session.backendApi };
}
