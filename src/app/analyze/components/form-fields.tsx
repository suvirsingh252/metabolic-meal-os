"use client";

import { type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface TextInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function TextInput({ id, label, value, onChange }: TextInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </div>
  );
}

interface TextareaInputProps extends TextInputProps {
  rows: number;
}

export function TextareaInput({
  id,
  label,
  value,
  onChange,
  rows
}: TextareaInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        value={value}
      />
    </div>
  );
}

interface EnumSelectProps<TValue extends string> {
  id: string;
  label: string;
  options: readonly TValue[];
  value: TValue;
  onChange: (value: TValue) => void;
}

export function EnumSelect<TValue extends string>({
  id,
  label,
  options,
  value,
  onChange
}: EnumSelectProps<TValue>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select
        id={id}
        onChange={(event) => onChange(event.target.value as TValue)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </Select>
    </div>
  );
}

interface BooleanInputProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function BooleanInput({
  id,
  label,
  checked,
  onChange
}: BooleanInputProps) {
  return (
    <label
      className="flex items-center gap-3 rounded-xl bg-background/70 p-3 text-sm font-medium"
      htmlFor={id}
    >
      <Checkbox
        checked={checked}
        id={id}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

interface ScoreInputProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
}

export function ScoreInput({ id, label, value, onChange }: ScoreInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}{" "}
        <span className="font-normal text-muted-foreground">{value}/10</span>
      </Label>
      <Input
        id={id}
        max={10}
        min={1}
        onChange={(event) => {
          const num = parseInt(event.target.value, 10);
          if (!isNaN(num)) onChange(Math.min(10, Math.max(1, num)));
        }}
        step={1}
        type="number"
        value={value}
      />
    </div>
  );
}

interface CollapsibleSectionProps {
  title: string;
  description: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleSection({
  title,
  description,
  children,
  defaultOpen = false
}: CollapsibleSectionProps) {
  return (
    <details
      className="group rounded-2xl bg-background/70 p-4"
      open={defaultOpen}
    >
      <summary className="cursor-pointer list-none">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="font-medium text-foreground">{title}</p>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
          <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
        </div>
      </summary>
      <div className="mt-5 space-y-4">{children}</div>
    </details>
  );
}
