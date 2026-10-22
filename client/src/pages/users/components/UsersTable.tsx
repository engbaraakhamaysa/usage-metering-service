import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/utils";

import type { useUsersPage } from "../useUsersPage";
type Props = Pick<ReturnType<typeof useUsersPage>, "plans" | "users" | "setSelected">;
export function UsersTable({ plans, users, setSelected }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
      </CardHeader>
      <CardContent>
        {users.isLoading ? (
          <LoadingState />
        ) : users.error ? (
          <ErrorState error={users.error} />
        ) : !users.data?.length ? (
          <EmptyState title="No users yet">Create your first user above.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.data.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{plans.find((p) => p.id === u.planId)?.name ?? u.planId}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(u.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelected(u.id)}>
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
