import { useEffect, useMemo, useRef, useState } from "react";
import { usePageActive } from "@/hooks/use-page-active";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DecisionBadge,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  NeedsApiKey,
  PageHeader,
  ReasonText,
} from "@/components/ui/states";
import { useSession } from "@/context/session";
import { LANGUAGES, simulatedTranslator, type TranslationResult } from "@/api/translation";
import { countWords, generateUuid } from "@/utils";
import type { ConsumeResult, User } from "@/types";

interface Op {
  requestId: string;
  userId: string;
  text: string;
  source: string;
  target: string;
}

export function TranslationPage() {
  const { connectionId } = useSession();
  return <TranslationContent key={connectionId} />;
}
function TranslationContent() {
  const { api, apiKey, connectionSignal } = useSession();
  const active = usePageActive();
  const [users, setUsers] = useState<{ data: User[]; isLoading: boolean; error: unknown }>({
    data: [],
    isLoading: !!apiKey,
    error: null,
  });
  useEffect(() => {
    if (!apiKey) return;
    let current = true;
    api.listUsers().then(
      (data) => {
        if (current && !connectionSignal.aborted) setUsers({ data, isLoading: false, error: null });
      },
      (error: unknown) => {
        if (current && !connectionSignal.aborted) setUsers({ data: [], isLoading: false, error });
      },
    );
    return () => {
      current = false;
    };
  }, [api, apiKey, connectionSignal]);
  const [userId, setUserId] = useState("");
  const [text, setText] = useState("");
  const [source, setSource] = useState("en");
  const [target, setTarget] = useState("fr");
  const [failTranslation, setFailTranslation] = useState(false);
  const failRef = useRef(false);
  failRef.current = failTranslation;
  const translator = useMemo(() => simulatedTranslator({ fail: () => failRef.current }), []);

  const [op, setOp] = useState<Op | null>(null);
  const [pending, setPending] = useState(false);
  const [decision, setDecision] = useState<ConsumeResult | null>(null);
  const [meterError, setMeterError] = useState<unknown>(null);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [output, setOutput] = useState<TranslationResult | null>(null);

  const words = countWords(text);
  const sameAsOp =
    op && op.userId === userId && op.text === text && op.source === source && op.target === target;

  const submit = async () => {
    if (!userId || words === 0) return;
    // Same text + languages + user => retry with the same requestId.
    const current: Op = sameAsOp ? op : { requestId: generateUuid(), userId, text, source, target };
    setOp(current);
    setPending(true);
    setDecision(null);
    setMeterError(null);
    setTranslateError(null);
    setOutput(null);
    try {
      const res = await api.consume({
        userId,
        requestId: current.requestId,
        requestedUnits: words,
      });
      if (!active.current || connectionSignal.aborted) return;
      setDecision(res);
      if (!res.accepted) return;
      try {
        const result = await translator.translate({
          text,
          sourceLanguage: source,
          targetLanguage: target,
        });
        if (active.current && !connectionSignal.aborted) setOutput(result);
      } catch (e) {
        if (active.current && !connectionSignal.aborted)
          setTranslateError(e instanceof Error ? e.message : String(e));
      }
    } catch (e) {
      if (active.current && !connectionSignal.aborted) setMeterError(e);
    } finally {
      if (active.current && !connectionSignal.aborted) setPending(false);
    }
  };

  if (!apiKey)
    return (
      <div>
        <PageHeader title="Translation" />
        <NeedsApiKey />
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Translation"
        description="Demo: metered translation. 1 word = 1 usage unit."
      />
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Units are consumed when the metering decision is accepted. A later translation failure
          does not automatically refund them. No translation provider is connected — output is
          simulated.
        </AlertDescription>
      </Alert>
      <Card>
        <CardHeader>
          <CardTitle>Translate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {users.isLoading ? (
            <LoadingState />
          ) : users.error ? (
            <ErrorState error={users.error} />
          ) : !users.data?.length ? (
            <EmptyState title="No users">Create a user on the Users page first.</EmptyState>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <Field label="User" htmlFor="t-user">
                <Select value={userId} onValueChange={setUserId}>
                  <SelectTrigger id="t-user">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.data.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="grid gap-4 grid-cols-2">
                {(
                  [
                    ["Source language", source, setSource, "t-src"],
                    ["Target language", target, setTarget, "t-tgt"],
                  ] as const
                ).map(([label, val, set, id]) => (
                  <Field key={id} label={label} htmlFor={id}>
                    <Select value={val} onValueChange={set}>
                      <SelectTrigger id={id}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((l) => (
                          <SelectItem key={l.code} value={l.code}>
                            {l.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                ))}
              </div>
              <Field
                label="Text"
                htmlFor="t-text"
                hint={`${words} word${words === 1 ? "" : "s"} = ${words} unit${words === 1 ? "" : "s"}`}
              >
                <Textarea
                  id="t-text"
                  rows={5}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </Field>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={!userId || words === 0 || pending}>
                  {pending
                    ? "Working…"
                    : sameAsOp
                      ? "Retry (same requestId)"
                      : `Translate (${words} units)`}
                </Button>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Switch checked={failTranslation} onCheckedChange={setFailTranslation} /> Simulate
                  translation failure
                </label>
              </div>
              {text.length > 0 && words === 0 && (
                <p className="text-xs text-destructive">Text must contain at least one word.</p>
              )}
              {op && (
                <p className="text-xs text-muted-foreground font-mono break-all">
                  requestId: {op.requestId}
                  {sameAsOp ? "" : " (inputs changed — next submit starts a new operation)"}
                </p>
              )}
            </form>
          )}
          {meterError != null && <ErrorState error={meterError} />}
          {decision && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              Metering decision: <DecisionBadge accepted={decision.accepted} />
              {decision.duplicate && <Badge variant="outline">duplicate</Badge>}
              <ReasonText reason={decision.rejectionReason} />
            </div>
          )}
          {translateError && (
            <Alert variant="destructive">
              <AlertDescription>
                Translation failed: {translateError}. Units were already consumed and are not
                refunded. Retry reuses the same requestId.
              </AlertDescription>
            </Alert>
          )}
          {output && (
            <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
              <Badge variant="demo">Simulated output — not a real translation</Badge>
              <p className="whitespace-pre-wrap text-sm">{output.text}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
