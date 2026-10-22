import { useBackendSession } from "@/api/use-backend-session";
import { PageHeader } from "@/components/ui/states";

import { AccountPlanCard } from "./components/AccountPlanCard";
import { ConnectionForm } from "./components/ConnectionForm";
import { CreateAccountForm } from "./components/CreateAccountForm";
import { useAccountPage } from "./useAccountPage";
export function AccountPage() {
  const { connectionId } = useBackendSession();
  return <ConnectedAccountPage key={connectionId} />;
}
function ConnectedAccountPage() {
  const model = useAccountPage();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Account"
        description="Create an account, connect with an API key, and manage the account plan."
      />

      <CreateAccountForm
        newKey={model.newKey}
        hideCreatedKey={model.hideCreatedKey}
        name={model.name}
        setName={model.setName}
        planId={model.planId}
        setPlanId={model.setPlanId}
        copied={model.copied}
        publicPlans={model.publicPlans}
        create={model.create}
        createAccount={model.createAccount}
        copy={model.copy}
      />

      <ConnectionForm
        apiKey={model.apiKey}
        setApiKey={model.setApiKey}
        setBaseUrl={model.setBaseUrl}
        hideCreatedKey={model.hideCreatedKey}
        setPlanId={model.setPlanId}
        keyInput={model.keyInput}
        setKeyInput={model.setKeyInput}
        urlInput={model.urlInput}
        setUrlInput={model.setUrlInput}
        urlError={model.urlError}
        setUrlError={model.setUrlError}
        setSwitchTo={model.setSwitchTo}
        pendingConnection={model.pendingConnection}
      />

      <AccountPlanCard
        apiKey={model.apiKey}
        switchTo={model.switchTo}
        setSwitchTo={model.setSwitchTo}
        publicPlans={model.publicPlans}
        myPlans={model.myPlans}
        usage={model.usage}
        switchPlan={model.switchPlan}
        changePlan={model.changePlan}
        currentPlan={model.currentPlan}
      />
    </div>
  );
}
