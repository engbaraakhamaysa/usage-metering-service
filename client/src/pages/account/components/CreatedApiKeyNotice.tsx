import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Check, Copy, KeyRound } from "lucide-react";

import type { useAccountPage } from "../useAccountPage";

type Props = Pick<
  ReturnType<typeof useAccountPage>,
  "newKey" | "copied" | "copy" | "hideCreatedKey"
>;
export function CreatedApiKeyNotice({ newKey, copied, copy, hideCreatedKey }: Props) {
  return (
    <>
      {" "}
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
            <Button size="sm" variant="ghost" onClick={hideCreatedKey}>
              I've saved it
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
