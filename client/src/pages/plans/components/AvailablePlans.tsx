import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { usePlansPage } from "../usePlansPage";
type Props = Pick<
  ReturnType<typeof usePlansPage>,
  "apiKey" | "filter" | "setFilter" | "setEditing" | "rows" | "loading" | "error" | "setUpdate"
>;
export function AvailablePlans({
  apiKey,
  filter,
  setFilter,
  setEditing,
  rows,
  loading,
  error,
  setUpdate,
}: Props) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Available plans</CardTitle>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="account">account</SelectItem>
            <SelectItem value="user">user</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} />
        ) : rows.length === 0 ? (
          <EmptyState title="No plans" />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Monthly allowance</TableHead>
                  <TableHead className="text-right">Max / request</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      <Badge variant={p.isPublic ? "secondary" : "outline"}>
                        {p.isPublic ? "Public" : "Private"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs">{p.planType}</code>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{p.monthlyAllowance}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.maxUnitsPerRequest}
                    </TableCell>
                    <TableCell className="text-right">
                      {p.isPublic ? (
                        <span className="text-xs text-muted-foreground">Read-only</span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setUpdate({ isPending: false, isSuccess: false, error: null });
                            setEditing(p);
                          }}
                        >
                          Edit
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {!apiKey && (
          <p className="mt-3 text-xs text-muted-foreground">
            Connect an API key to see your private plans.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
