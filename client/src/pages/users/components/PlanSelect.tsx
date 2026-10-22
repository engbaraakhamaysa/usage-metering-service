import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Plan } from "@/types";

export function PlanSelect({
  id,
  plans,
  value,
  onChange,
}: {
  id: string;
  plans: Plan[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id}>
        <SelectValue placeholder="Select a user plan" />
      </SelectTrigger>
      <SelectContent>
        {plans.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name} ({p.isPublic ? "public" : "private"}) · {p.monthlyAllowance}/mo
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
