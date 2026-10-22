import { useSession } from "@/context/session";

/** Connected pages opt into HTTP; legacy pages continue using the mock API. */
export function useBackendSession() {
  const session = useSession();
  return { ...session, api: session.backendApi };
}
