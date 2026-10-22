import { useBackendSession } from "@/api/use-backend-session";
import { NeedsApiKey, PageHeader } from "@/components/ui/states";

import { RecordDetailsDialog } from "./components/RecordDetailsDialog";
import { RecordsTable } from "./components/RecordsTable";
import { useRecordsPage } from "./useRecordsPage";
export function RecordsPage() {
  const { connectionId } = useBackendSession();
  return <RecordsContent key={connectionId} />;
}
function RecordsContent() {
  const model = useRecordsPage();
  const { apiKey } = model;
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
      <RecordsTable
        page={model.page}
        setPage={model.setPage}
        limit={model.limit}
        setLimit={model.setLimit}
        setSelected={model.setSelected}
        q={model.q}
      />
      <RecordDetailsDialog selected={model.selected} setSelected={model.setSelected} />
    </div>
  );
}
