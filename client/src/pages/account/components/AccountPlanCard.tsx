import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ErrorState, LoadingState, NeedsApiKey } from "@/components/ui/states";

import type { useAccountPage } from "../useAccountPage";
type Props = Pick<
  ReturnType<typeof useAccountPage>,
  | "apiKey"
  | "switchTo"
  | "setSwitchTo"
  | "publicPlans"
  | "myPlans"
  | "usage"
  | "switchPlan"
  | "changePlan"
  | "currentPlan"
>;
export function AccountPlanCard({
  apiKey,
  switchTo,
  setSwitchTo,
  publicPlans,
  myPlans,
  usage,
  switchPlan,
  changePlan,
  currentPlan,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account plan</CardTitle>
        <CardDescription>Changing plans never resets usage.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!apiKey ? (
          <NeedsApiKey />
        ) : usage.isLoading || myPlans.isLoading ? (
          <LoadingState />
        ) : usage.error || myPlans.error ? (
          <ErrorState error={usage.error ?? myPlans.error} />
        ) : (
          usage.data && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{usage.data.name}</span>
                <Badge variant={currentPlan?.isPublic ? "secondary" : "outline"}>
                  {currentPlan?.isPublic ? "Public" : "Private"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {usage.data.monthlyAllowance} units/month · max {usage.data.maxUnitsPerRequest}
                  /request
                </span>
              </div>
              <form
                className="flex flex-col gap-2 md:flex-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  void changePlan();
                }}
              >
                <Select value={switchTo} onValueChange={setSwitchTo}>
                  <SelectTrigger className="md:w-80">
                    <SelectValue placeholder="Switch to plan…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Public</SelectLabel>
                      {publicPlans.data?.map((p) => (
                        <SelectItem key={p.id} value={p.id} disabled={p.id === usage.data?.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    {!!myPlans.data?.some((p) => !p.isPublic) && (
                      <SelectGroup>
                        <SelectLabel>Private (yours)</SelectLabel>
                        {myPlans.data
                          ?.filter((p) => !p.isPublic)
                          .map((p) => (
                            <SelectItem key={p.id} value={p.id} disabled={p.id === usage.data?.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
                <Button type="submit" disabled={!switchTo || switchPlan.isPending}>
                  {switchPlan.isPending ? "Saving…" : "Change plan"}
                </Button>
              </form>
              {switchPlan.isSuccess && (
                <p role="status" className="text-sm text-muted-foreground">
                  Account plan updated.
                </p>
              )}
              {Boolean(switchPlan.error) && <ErrorState error={switchPlan.error} />}
            </>
          )
        )}
      </CardContent>
    </Card>
  );
}
