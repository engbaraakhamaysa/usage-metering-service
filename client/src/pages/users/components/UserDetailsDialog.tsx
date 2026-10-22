import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserDetails } from "./UserDetails";

import type { useUsersPage } from "../useUsersPage";
type Props = Pick<
  ReturnType<typeof useUsersPage>,
  "connectionSignal" | "active" | "setRefresh" | "selected" | "setSelected"
>;
export function UserDetailsDialog({
  connectionSignal,
  active,
  setRefresh,
  selected,
  setSelected,
}: Props) {
  return (
    <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>User details</DialogTitle>
        </DialogHeader>
        {selected && (
          <UserDetails
            key={selected}
            id={selected}
            onChanged={() => {
              if (active.current && !connectionSignal.aborted) setRefresh((value) => value + 1);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
