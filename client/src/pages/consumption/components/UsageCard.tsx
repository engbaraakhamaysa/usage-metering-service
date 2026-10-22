import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/ui/states";
import { RefreshCw } from "lucide-react";
import { UsageSummary } from "./UsageSummary";

import type { useConsumptionPage } from "../useConsumptionPage";
type Props = Pick<
  ReturnType<typeof useConsumptionPage>,
  | "users"
  | "userId"
  | "setUserId"
  | "month"
  | "setMonth"
  | "setRefresh"
  | "accountUsage"
  | "userUsage"
  | "pending"
  | "maxMonth"
  | "monthError"
>;
export function UsageCard({
  users,
  userId,
  setUserId,
  month,
  setMonth,
  setRefresh,
  accountUsage,
  userUsage,
  pending,
  maxMonth,
  monthError,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="User usage (optional)" htmlFor="scope">
            <Select
              value={userId || "__account__"}
              onValueChange={(value) => setUserId(value === "__account__" ? "" : value)}
              disabled={pending}
            >
              <SelectTrigger id="scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__account__">Account only</SelectItem>
                {users.data.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    User: {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field
            label="Month (optional, YYYY-MM)"
            htmlFor="month"
            error={monthError}
            hint="Empty = current UTC month"
          >
            <div className="flex gap-2">
              <Input
                id="month"
                type="month"
                max={maxMonth}
                value={month}
                disabled={pending}
                onChange={(event) => setMonth(event.target.value)}
              />
              {month && (
                <Button variant="ghost" disabled={pending} onClick={() => setMonth("")}>
                  Clear
                </Button>
              )}
            </div>
          </Field>
        </div>
        {!monthError && (
          <>
            <UsageSummary title="Account usage" value={accountUsage} />
            {userId && <UsageSummary title="User usage" value={userUsage} />}
          </>
        )}
        <Button
          variant="outline"
          onClick={() => setRefresh((value) => value + 1)}
          disabled={!!monthError}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh usage
        </Button>
      </CardContent>
    </Card>
  );
}
