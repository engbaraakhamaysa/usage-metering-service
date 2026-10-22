import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RecordDetails } from "./RecordDetails";

import type { useRecordsPage } from "../useRecordsPage";
type Props = Pick<ReturnType<typeof useRecordsPage>, "selected" | "setSelected">;
export function RecordDetailsDialog({ selected, setSelected }: Props) {
  return (
    <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record details</DialogTitle>
        </DialogHeader>
        {selected && <RecordDetails key={selected} id={selected} />}
      </DialogContent>
    </Dialog>
  );
}
