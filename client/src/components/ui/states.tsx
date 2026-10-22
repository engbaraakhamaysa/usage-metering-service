import { AlertTriangle, Inbox, KeyRound, Loader2, WifiOff } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { NetworkError, describeError } from "@/api/errors";
import type { RejectionReason } from "@/types";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground justify-center">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  const { title, detail } = describeError(error);
  const Icon = error instanceof NetworkError ? WifiOff : AlertTriangle;
  return (
    <Alert variant="destructive">
      <Icon className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{detail}</AlertDescription>
    </Alert>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-10 text-center">
      <Inbox className="h-6 w-6 text-muted-foreground" />
      <p className="font-medium">{title}</p>
      {children && <div className="text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function NeedsApiKey() {
  return (
    <Alert>
      <KeyRound className="h-4 w-4" />
      <AlertTitle>No API key connected</AlertTitle>
      <AlertDescription>
        Create an account or enter an API key on the{" "}
        <Link to="/account" className="underline font-medium">
          Account
        </Link>{" "}
        page.
      </AlertDescription>
    </Alert>
  );
}

export function DecisionBadge({ accepted }: { accepted: boolean }) {
  return (
    <Badge variant={accepted ? "success" : "warning"}>{accepted ? "Accepted" : "Rejected"}</Badge>
  );
}

export function ReasonText({ reason }: { reason: RejectionReason | null }) {
  return reason ? (
    <code className="font-mono text-xs">{reason}</code>
  ) : (
    <span className="text-muted-foreground">—</span>
  );
}

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string | null;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
