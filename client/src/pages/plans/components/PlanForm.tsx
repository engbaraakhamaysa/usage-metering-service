import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/ui/states";
import type { PlanType } from "@/types";
import { parsePositiveInt } from "@/utils";
import { useState } from "react";

const LIMIT_ERR = "Must be an integer from 1 to 2147483647";

export function PlanForm({
  initial,
  onSubmit,
  pending,
  submitLabel,
  withType,
  idPrefix = "pf",
}: {
  initial: {
    name: string;
    planType: PlanType;
    monthlyAllowance: string;
    maxUnitsPerRequest: string;
  };
  onSubmit: (v: {
    name: string;
    planType: PlanType;
    monthlyAllowance: number;
    maxUnitsPerRequest: number;
  }) => void;
  pending: boolean;
  submitLabel: string;
  withType: boolean;
  idPrefix?: string;
}) {
  const [v, setV] = useState(initial);
  const [touched, setTouched] = useState(false);
  const ma = parsePositiveInt(v.monthlyAllowance);
  const mr = parsePositiveInt(v.maxUnitsPerRequest);
  const valid =
    !!v.name.trim() && ma !== null && mr !== null && ma <= 2_147_483_647 && mr <= 2_147_483_647;
  return (
    <form
      className="grid gap-4 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (valid)
          onSubmit({
            name: v.name.trim(),
            planType: v.planType,
            monthlyAllowance: ma,
            maxUnitsPerRequest: mr,
          });
      }}
    >
      <Field
        label="Name"
        htmlFor={`${idPrefix}-name`}
        error={touched && !v.name.trim() ? "Required" : null}
      >
        <Input
          maxLength={255}
          id={`${idPrefix}-name`}
          value={v.name}
          onChange={(e) => setV({ ...v, name: e.target.value })}
        />
      </Field>
      {withType && (
        <Field label="Plan type" htmlFor={`${idPrefix}-type`}>
          <Select value={v.planType} onValueChange={(t) => setV({ ...v, planType: t as PlanType })}>
            <SelectTrigger id={`${idPrefix}-type`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="account">account</SelectItem>
              <SelectItem value="user">user</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      )}
      <Field
        label="Monthly allowance"
        htmlFor={`${idPrefix}-ma`}
        error={touched && (ma === null || ma > 2_147_483_647) ? LIMIT_ERR : null}
      >
        <Input
          id={`${idPrefix}-ma`}
          inputMode="numeric"
          value={v.monthlyAllowance}
          onChange={(e) => setV({ ...v, monthlyAllowance: e.target.value })}
        />
      </Field>
      <Field
        label="Max units per request"
        htmlFor={`${idPrefix}-mr`}
        error={touched && (mr === null || mr > 2_147_483_647) ? LIMIT_ERR : null}
      >
        <Input
          id={`${idPrefix}-mr`}
          inputMode="numeric"
          value={v.maxUnitsPerRequest}
          onChange={(e) => setV({ ...v, maxUnitsPerRequest: e.target.value })}
        />
      </Field>
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
