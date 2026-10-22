import type { BackendRecords } from "@/api/http";
import { useBackendSession } from "@/api/use-backend-session";
import { useEffect, useState } from "react";

export function useRecordsPage() {
  const { api, apiKey, connectionSignal } = useBackendSession();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(10);
  const [selected, setSelected] = useState<string | null>(null);
  const [q, setRecords] = useState<{
    data: BackendRecords | null;
    isLoading: boolean;
    error: unknown;
  }>({ data: null, isLoading: !!apiKey, error: null });
  useEffect(() => {
    if (!apiKey) return;
    let current = true;
    setRecords({ data: null, isLoading: true, error: null });
    api.listRecords(page, limit).then(
      (data) => {
        if (current && !connectionSignal.aborted)
          setRecords({ data, isLoading: false, error: null });
      },
      (error: unknown) => {
        if (current && !connectionSignal.aborted)
          setRecords({ data: null, isLoading: false, error });
      },
    );
    return () => {
      current = false;
    };
  }, [api, apiKey, connectionSignal, page, limit]);

  return { apiKey, page, setPage, limit, setLimit, selected, setSelected, q };
}
