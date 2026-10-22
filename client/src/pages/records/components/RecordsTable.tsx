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
  DecisionBadge,
  EmptyState,
  ErrorState,
  LoadingState,
  ReasonText,
} from "@/components/ui/states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/utils";

import type { useRecordsPage } from "../useRecordsPage";
type Props = Pick<
  ReturnType<typeof useRecordsPage>,
  "page" | "setPage" | "limit" | "setLimit" | "setSelected" | "q"
>;
export function RecordsTable({ page, setPage, limit, setLimit, setSelected, q }: Props) {
  return (
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
        ) : !q.data?.records.length ? (
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
                {q.data.records.map((r) => (
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
              Total {q.data.pagination.total} · Page {q.data.pagination.page} of{" "}
              {q.data.pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1 || q.isLoading}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= q.data.pagination.totalPages || q.isLoading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const SIZES = [10, 25, 50, 100] as const;
