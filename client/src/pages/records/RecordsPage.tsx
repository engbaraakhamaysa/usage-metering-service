import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DecisionBadge,
  EmptyState,
  ErrorState,
  LoadingState,
  NeedsApiKey,
  PageHeader,
  ReasonText,
} from "@/components/ui/states";
import { useSession } from "@/context/session";
import { formatDate } from "@/utils";

const SIZES = [10, 25, 50, 100] as const;

function RecordDetails({ id }: { id: string }) {
  const { api, apiKey } = useSession();
  const r = useQuery({ queryKey: ["record", id, apiKey], queryFn: () => api.getRecord(id) });
  if (r.isLoading) return <LoadingState />;
  if (r.error) return <ErrorState error={r.error} />;
  if (!r.data) return null;
  const d = r.data;
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      <dt className="text-muted-foreground">id</dt>
      <dd className="font-mono text-xs break-all">{d.id}</dd>
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

export function RecordsPage() {
  const { api, apiKey } = useSession();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(10);
  const [selected, setSelected] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["records", apiKey, page, limit],
    queryFn: () => api.listRecords(page, limit),
    enabled: !!apiKey,
  });

  if (!apiKey)
    return (
      <div>
        <PageHeader title="Records" />
        <NeedsApiKey />
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader title="Records" description="Consumption records, newest first." />
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Usage records</CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Per page</span>
            <Select
              value={String(limit)}
              onValueChange={(v) => {
                setLimit(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIZES.map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {q.isLoading ? (
            <LoadingState />
          ) : q.error ? (
            <ErrorState error={q.error} />
          ) : !q.data?.data.length ? (
            <EmptyState title="No records yet">
              Submit a consumption request to create one.
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>status</TableHead>
                    <TableHead>userId</TableHead>
                    <TableHead className="text-right">requestedUnits</TableHead>
                    <TableHead>rejectionReason</TableHead>
                    <TableHead>createdAt</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {q.data.data.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <DecisionBadge accepted={r.status === "accepted"} />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.userId.slice(0, 8)}…</TableCell>
                      <TableCell className="text-right tabular-nums">{r.requestedUnits}</TableCell>
                      <TableCell>
                        <ReasonText reason={r.rejectionReason} />
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {formatDate(r.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setSelected(r.id)}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {q.data && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">
                Total {q.data.total} · Page {q.data.page} of {q.data.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1 || q.isFetching}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= q.data.totalPages || q.isFetching}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record details</DialogTitle>
          </DialogHeader>
          {selected && <RecordDetails id={selected} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
