import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, ErrorState, Field, LoadingState } from "@/components/ui/states";
import { Textarea } from "@/components/ui/textarea";
import type { useConsumptionPage } from "../useConsumptionPage";

type Props = Pick<
  ReturnType<typeof useConsumptionPage>,
  | "users"
  | "userId"
  | "setUserId"
  | "text"
  | "setText"
  | "characterCount"
  | "submitText"
  | "pending"
  | "attempt"
>;

export function TextConsumption({
  users,
  userId,
  setUserId,
  text,
  setText,
  characterCount,
  submitText,
  pending,
  attempt,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Text consumption</CardTitle>
        <CardDescription>
          Metered character-count demo: one Unicode code point uses one unit. No translation or
          external text processing occurs. Only the user ID, request ID, and unit count are sent to
          the backend.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {users.loading ? (
          <LoadingState />
        ) : users.error ? (
          <ErrorState error={users.error} />
        ) : !users.data.length ? (
          <EmptyState title="No users">Create a user on the Users page first.</EmptyState>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              submitText();
            }}
          >
            <Field
              label="Text user"
              htmlFor="text-user"
              hint="The selected user also controls the usage summary and manual form."
            >
              <Select value={userId} onValueChange={setUserId} disabled={pending}>
                <SelectTrigger id="text-user">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {users.data.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              label="Text"
              htmlFor="consumption-text"
              hint="All spaces, tabs, and line breaks count, including leading/trailing whitespace. Combining marks and parts of compound emoji can count separately. Enter non-whitespace text."
              error={text.length > 0 && !text.trim() ? "Enter non-whitespace text" : null}
            >
              <Textarea
                id="consumption-text"
                dir="auto"
                rows={6}
                value={text}
                disabled={pending}
                onChange={(event) => setText(event.target.value)}
              />
            </Field>
            <p role="status" className="text-sm text-muted-foreground">
              Characters (Unicode code points): {characterCount} · Required units: {characterCount}
            </p>
            <Button
              type="submit"
              disabled={
                !userId ||
                !text.trim() ||
                characterCount === 0 ||
                characterCount > 2_147_483_647 ||
                pending ||
                !!attempt?.uncertain
              }
            >
              {pending ? "Sending…" : "Consume text"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
