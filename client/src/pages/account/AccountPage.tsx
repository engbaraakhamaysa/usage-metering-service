import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ErrorState, Field, LoadingState, NeedsApiKey, PageHeader } from "@/components/ui/states";
import { useSession } from "@/context/session";
import { mockControls } from "@/mocks/mockApi";

export function AccountPage() {
  const { api, apiKey, setApiKey, baseUrl, setBaseUrl } = useSession();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [planId, setPlanId] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [netFail, setNetFail] = useState(mockControls.simulateNetworkFailure);

  const publicPlans = useQuery({ queryKey: ["plans", "public", "account"], queryFn: () => api.listPublicPlans("account") });
  const myPlans = useQuery({ queryKey: ["plans", "me", "account", apiKey], queryFn: () => api.listMyPlans("account"), enabled: !!apiKey });
  const usage = useQuery({ queryKey: ["usage", "account", apiKey, ""], queryFn: () => api.getAccountUsage(), enabled: !!apiKey });

  const create = useMutation({
    mutationFn: () => api.createAccount({ name, planId }),
    onSuccess: (res) => {
      setNewKey(res.apiKey);
      setApiKey(res.apiKey);
      setKeyInput(res.apiKey);
      setName("");
      qc.invalidateQueries();
    },
  });
  const [switchTo, setSwitchTo] = useState("");
  const switchPlan = useMutation({
    mutationFn: () => api.updateAccountPlan(switchTo),
    onSuccess: () => { setSwitchTo(""); qc.invalidateQueries(); },
  });

  const copy = async () => {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Account" description="Create an account, connect with an API key, and manage the account plan." />

      <Card>
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>POST /api/accounts — public, no API key required.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
            onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
          >
            <Field label="Name" htmlFor="acc-name">
              <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Inc." />
            </Field>
            <Field label="Account plan" htmlFor="acc-plan">
              {publicPlans.isLoading ? <LoadingState /> : publicPlans.error ? <ErrorState error={publicPlans.error} /> : (
                <Select value={planId} onValueChange={setPlanId}>
                  <SelectTrigger id="acc-plan"><SelectValue placeholder="Select a public plan" /></SelectTrigger>
                  <SelectContent>
                    {publicPlans.data?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} · {p.monthlyAllowance}/mo · max {p.maxUnitsPerRequest}/req</SelectItem>
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
                  <code className="flex-1 break-all rounded bg-muted px-2 py-1.5 font-mono text-xs">{newKey}</code>
                  <Button size="sm" variant="outline" onClick={copy}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setNewKey(null)}>I've saved it</Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connection</CardTitle>
          <CardDescription>The key is kept in memory only and is lost on page reload. Requests send it as x-api-key.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="API Base URL" htmlFor="base-url" hint="Not used in demo mode.">
              <Input id="base-url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
            </Field>
            <Field label="API key" htmlFor="api-key">
              <Input id="api-key" type="password" autoComplete="off" value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder="um_…" />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => { setApiKey(keyInput.trim() || null); qc.invalidateQueries(); }} disabled={!keyInput.trim()}>Connect</Button>
            <Button variant="outline" onClick={() => { setApiKey(null); setKeyInput(""); qc.clear(); }} disabled={!apiKey}>Disconnect</Button>
            <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
              <Switch checked={netFail} onCheckedChange={(v) => { mockControls.simulateNetworkFailure = v; setNetFail(v); }} />
              Simulate network failure
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account plan</CardTitle>
          <CardDescription>Changing plans never resets usage.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!apiKey ? <NeedsApiKey /> : usage.isLoading ? <LoadingState /> : usage.error ? <ErrorState error={usage.error} /> : usage.data && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{usage.data.currentPlan.name}</span>
                <Badge variant={usage.data.currentPlan.isPublic ? "secondary" : "outline"}>{usage.data.currentPlan.isPublic ? "Public" : "Private"}</Badge>
                <span className="text-sm text-muted-foreground">
                  {usage.data.currentPlan.monthlyAllowance} units/month · max {usage.data.currentPlan.maxUnitsPerRequest}/request
                </span>
              </div>
              <form className="flex flex-col gap-2 md:flex-row" onSubmit={(e) => { e.preventDefault(); switchPlan.mutate(); }}>
                <Select value={switchTo} onValueChange={setSwitchTo}>
                  <SelectTrigger className="md:w-80"><SelectValue placeholder="Switch to plan…" /></SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Public</SelectLabel>
                      {publicPlans.data?.map((p) => <SelectItem key={p.id} value={p.id} disabled={p.id === usage.data.currentPlan.id}>{p.name}</SelectItem>)}
                    </SelectGroup>
                    {!!myPlans.data?.length && (
                      <SelectGroup>
                        <SelectLabel>Private (yours)</SelectLabel>
                        {myPlans.data.map((p) => <SelectItem key={p.id} value={p.id} disabled={p.id === usage.data.currentPlan.id}>{p.name}</SelectItem>)}
                      </SelectGroup>
                    )}
                  </SelectContent>
                </Select>
                <Button type="submit" disabled={!switchTo || switchPlan.isPending}>{switchPlan.isPending ? "Saving…" : "Change plan"}</Button>
              </form>
              {switchPlan.error && <ErrorState error={switchPlan.error} />}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
