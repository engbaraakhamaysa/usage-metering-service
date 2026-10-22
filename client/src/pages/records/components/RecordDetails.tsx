import type { BackendRecord } from "@/api/http";
import { useBackendSession } from "@/api/use-backend-session";
import { DecisionBadge, ErrorState, LoadingState, ReasonText } from "@/components/ui/states";
import { formatDate } from "@/utils";
import { useEffect, useState } from "react";

export function RecordDetails({ id }: { id: string }) {
  const { api, connectionSignal } = useBackendSession();
  const [r, setRecord] = useState<{
    data: BackendRecord | null;
    isLoading: boolean;
    error: unknown;
  }>({ data: null, isLoading: true, error: null });
  useEffect(() => {
    let current = true;
    api.getRecord(id).then(
      (data) => {
        if (current && !connectionSignal.aborted)
          setRecord({ data, isLoading: false, error: null });
      },
      (error: unknown) => {
        if (current && !connectionSignal.aborted)
          setRecord({ data: null, isLoading: false, error });
      },
    );
    return () => {
      current = false;
    };
  }, [api, id, connectionSignal]);
  if (r.isLoading) return <LoadingState />;
  if (r.error) return <ErrorState error={r.error} />;
  if (!r.data) return null;
  const d = r.data;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      <dt className="text-muted-foreground">id</dt>
      <dd className="font-mono text-xs break-all">{d.id}</dd>
      <dt className="text-muted-foreground">accountId</dt>
      <dd className="font-mono text-xs break-all">{d.accountId}</dd>
      <dt className="text-muted-foreground">requestId</dt>
      <dd className="font-mono text-xs break-all">{d.requestId}</dd>
      <dt className="text-muted-foreground">status</dt>
      <dd>
        <DecisionBadge accepted={d.status === "accepted"} />
      </dd>
      <dt className="text-muted-foreground">userId</dt>
      <dd className="font-mono text-xs break-all">{d.userId}</dd>
      <dt className="text-muted-foreground">requestedUnits</dt>
      <dd>{d.requestedUnits}</dd>
      <dt className="text-muted-foreground">rejectionReason</dt>
      <dd>
        <ReasonText reason={d.rejectionReason} />
      </dd>
      <dt className="text-muted-foreground">createdAt</dt>
      <dd>{formatDate(d.createdAt)}</dd>
    </dl>
  );
}
