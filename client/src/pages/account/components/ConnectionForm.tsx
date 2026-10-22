import { normalizeBaseUrl } from "@/api/http";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ErrorState, Field } from "@/components/ui/states";

import type { useAccountPage } from "../useAccountPage";
type Props = Pick<
  ReturnType<typeof useAccountPage>,
  | "apiKey"
  | "setApiKey"
  | "setBaseUrl"
  | "hideCreatedKey"
  | "setPlanId"
  | "keyInput"
  | "setKeyInput"
  | "urlInput"
  | "setUrlInput"
  | "urlError"
  | "setUrlError"
  | "setSwitchTo"
  | "pendingConnection"
>;
export function ConnectionForm({
  apiKey,
  setApiKey,
  setBaseUrl,
  hideCreatedKey,
  setPlanId,
  keyInput,
  setKeyInput,
  urlInput,
  setUrlInput,
  urlError,
  setUrlError,
  setSwitchTo,
  pendingConnection,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Connection</CardTitle>
        <CardDescription>
          The key is kept in memory only and is lost on page reload. Requests send it as x-api-key.
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
                  hideCreatedKey();
                  setKeyInput("");
                  setPlanId("");
                  setSwitchTo("");
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
              hideCreatedKey();
              setSwitchTo("");

              setApiKey(keyInput.trim() || null);
            }}
            disabled={!keyInput.trim() || pendingConnection}
          >
            Connect
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              hideCreatedKey();
              setSwitchTo("");

              setApiKey(null);
              setKeyInput("");
            }}
            disabled={!apiKey || pendingConnection}
          >
            Disconnect
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
