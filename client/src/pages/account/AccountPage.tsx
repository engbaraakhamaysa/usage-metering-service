import { useState } from "react";
import { useIsMutating, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  NeedsApiKey,
  PageHeader,
} from "@/components/ui/states";
import { useBackendSession } from "@/api/use-backend-session";
import { normalizeBaseUrl } from "@/api/http";

export function AccountPage() {
  const { api, apiKey, setApiKey, baseUrl, setBaseUrl, backendScope } = useBackendSession();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [planId, setPlanId] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [urlInput, setUrlInput] = useState(baseUrl);
  const [urlError, setUrlError] = useState<Error | null>(null);
  const pendingConnection = useIsMutating({ mutationKey: ["backend"] }) > 0;

  const publicPlans = useQuery({
    queryKey: [...backendScope, "plans", "public", "account"],
    retry: false,
    queryFn: () => api.listPublicPlans("account"),
  });
  const myPlans = useQuery({
    queryKey: [...backendScope, "plans", "me", "account"],
    retry: false,
    queryFn: () => api.listMyPlans("account"),
    enabled: !!apiKey,
  });
  const usage = useQuery({
    queryKey: [...backendScope, "account-plan"],
    retry: false,
    queryFn: () => api.getAccountPlan(),
    enabled: !!apiKey,
  });

  const create = useMutation({
    mutationKey: ["backend", "create-account"],
    mutationFn: () => api.createAccount({ name, planId }),
    onSuccess: (res) => {
      setNewKey(res.apiKey);
      setApiKey(res.apiKey);
      setKeyInput(res.apiKey);
      setName("");
      setSwitchTo("");
      qc.invalidateQueries();
    },
  });
  const [switchTo, setSwitchTo] = useState("");
  const switchPlan = useMutation({
    mutationKey: ["backend", "account-plan"],
    mutationFn: () => api.updateAccountPlan(switchTo),
    onSuccess: () => {
      setSwitchTo("");
      qc.invalidateQueries();
    },
  });

  const currentPlan = myPlans.data?.find((plan) => plan.id === usage.data?.id);

  const copy = async () => {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account"
        description="Create an account, connect with an API key, and manage the account plan."
      />

      <Card>
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>POST /api/accounts — public, no API key required.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate();
            }}
          >
            <Field label="Name" htmlFor="acc-name">
              <Input
                id="acc-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Inc."
                maxLength={255}
              />
            </Field>
            <Field label="Account plan" htmlFor="acc-plan">
              {publicPlans.isLoading ? (
                <LoadingState />
              ) : publicPlans.error ? (
                <ErrorState error={publicPlans.error} />
              ) : !publicPlans.data?.length ? (
                <EmptyState title="No public account plans" />
              ) : (
                <Select value={planId} onValueChange={setPlanId}>
                  <SelectTrigger id="acc-plan">
                    <SelectValue placeholder="Select a public plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {publicPlans.data?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} · {p.monthlyAllowance}/mo · max {p.maxUnitsPerRequest}/req
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>
            <Button type="submit" disabled={!name.trim() || !planId || create.isPending}>
              {create.isPending ? "Creating…" : "Create account"}
            </Button>
          </form>
          {create.error && <ErrorState error={create.error} />}
          {newKey && (
            <Alert>
              <KeyRound className="h-4 w-4" />
              <AlertTitle>Your API key — shown only once</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>Copy and store it securely now. It cannot be displayed again.</p>
                <div className="flex gap-2">
                  <code className="flex-1 break-all rounded bg-muted px-2 py-1.5 font-mono text-xs">
                    {newKey}
                  </code>
                  <Button size="sm" variant="outline" onClick={copy}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{" "}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setNewKey(null)}>
                  I've saved it
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connection</CardTitle>
          <CardDescription>
            The key is kept in memory only and is lost on page reload. Requests send it as
            x-api-key.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {urlError && <ErrorState error={urlError} />}
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="API Base URL"
              htmlFor="base-url"
              hint="Blank uses the same-origin /api proxy. Apply a URL before connecting a key."
            >
              <Input
                id="base-url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                disabled={pendingConnection}
              />
              <Button
                variant="outline"
                disabled={pendingConnection}
                onClick={() => {
                  try {
                    const url = normalizeBaseUrl(urlInput);
                    setBaseUrl(url);
                    setUrlInput(url);
                    setUrlError(null);
                    setNewKey(null);
                    setKeyInput("");
                    setPlanId("");
                    setSwitchTo("");
                    create.reset();
                    switchPlan.reset();
                  } catch (error) {
                    setUrlError(error instanceof Error ? error : new Error("Invalid URL"));
                  }
                }}
              >
                Apply URL
              </Button>
            </Field>
            <Field label="API key" htmlFor="api-key">
              <Input
                id="api-key"
                type="password"
                autoComplete="off"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="um_…"
              />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                setNewKey(null);
                setSwitchTo("");
                create.reset();
                switchPlan.reset();
                setApiKey(keyInput.trim() || null);
                qc.invalidateQueries();
              }}
              disabled={!keyInput.trim() || pendingConnection}
            >
              Connect
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setNewKey(null);
                setSwitchTo("");
                create.reset();
                switchPlan.reset();
                setApiKey(null);
                setKeyInput("");
                qc.clear();
              }}
              disabled={!apiKey || pendingConnection}
            >
              Disconnect
            </Button>
          </div>
        </CardContent>
      </Card>

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
                    switchPlan.mutate();
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
                          <SelectItem key={p.id} value={p.id} disabled={p.id === usage.data.id}>
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
                              <SelectItem key={p.id} value={p.id} disabled={p.id === usage.data.id}>
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
                {switchPlan.error && <ErrorState error={switchPlan.error} />}
              </>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
