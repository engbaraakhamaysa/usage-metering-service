import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorState } from "@/components/ui/states";
import { PlanForm } from "./PlanForm";

import type { usePlansPage } from "../usePlansPage";
type Props = Pick<
  ReturnType<typeof usePlansPage>,
  "editing" | "setEditing" | "update" | "updatePlan"
>;
export function EditPlanDialog({ editing, setEditing, update, updatePlan }: Props) {
  return (
    <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit private plan</DialogTitle>
        </DialogHeader>
        {editing && (
          <PlanForm
            idPrefix="edit-pf"
            key={editing.id}
            withType={false}
            submitLabel="Save changes"
            pending={update.isPending}
            initial={{
              name: editing.name,
              planType: editing.planType,
              monthlyAllowance: String(editing.monthlyAllowance),
              maxUnitsPerRequest: String(editing.maxUnitsPerRequest),
            }}
            onSubmit={(v) =>
              void updatePlan(editing.id, {
                name: v.name,
                monthlyAllowance: v.monthlyAllowance,
                maxUnitsPerRequest: v.maxUnitsPerRequest,
              })
            }
          />
        )}
        {Boolean(update.error) && <ErrorState error={update.error} />}
        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
}
