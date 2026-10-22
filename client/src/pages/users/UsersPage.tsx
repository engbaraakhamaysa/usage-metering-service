import { useBackendSession } from "@/api/use-backend-session";
import { NeedsApiKey, PageHeader } from "@/components/ui/states";

import { CreateUserForm } from "./components/CreateUserForm";
import { UserDetailsDialog } from "./components/UserDetailsDialog";
import { UsersTable } from "./components/UsersTable";
import { useUsersPage } from "./useUsersPage";
export function UsersPage() {
  const { connectionId } = useBackendSession();
  return <ConnectedUsersPage key={connectionId} />;
}

function ConnectedUsersPage() {
  const model = useUsersPage();
  const { apiKey } = model;
  if (!apiKey)
    return (
      <div>
        <PageHeader title="Users" />
        <NeedsApiKey />
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Users belong to your account. Each user has a user-type plan."
      />
      <CreateUserForm
        plans={model.plans}
        plansError={model.plansError}
        plansLoading={model.plansLoading}
        name={model.name}
        setName={model.setName}
        planId={model.planId}
        setPlanId={model.setPlanId}
        create={model.create}
        createUser={model.createUser}
      />
      <UsersTable plans={model.plans} users={model.users} setSelected={model.setSelected} />
      <UserDetailsDialog
        connectionSignal={model.connectionSignal}
        active={model.active}
        setRefresh={model.setRefresh}
        selected={model.selected}
        setSelected={model.setSelected}
      />
    </div>
  );
}
