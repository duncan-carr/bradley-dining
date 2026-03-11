"use client";

import { localToday, formatDateISO } from "@/lib/date";

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  maxDate?: string;
}

export default function DatePicker({ value, onChange, maxDate }: DatePickerProps) {
  const today = localToday();

  const shift = (days: number) => {
    const d = new Date(value + "T12:00:00");
    d.setDate(d.getDate() + days);
    const iso = formatDateISO(d);
    if (maxDate && iso > maxDate) return;
    onChange(iso);
  };

  const dateObj = new Date(value + "T12:00:00");
  const weekday = dateObj.toLocaleDateString("en-US", { weekday: "short" });
  const monthDay = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const isToday = value === today;
  const atMax = maxDate ? value >= maxDate : false;

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => shift(-1)}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-surface-warm hover:text-foreground active:scale-90"
        aria-label="Previous day"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="flex h-9 min-w-24 flex-col items-center justify-center rounded-xl bg-surface-warm px-3 select-none sm:min-w-28 sm:px-4">
        <span className="text-[0.6rem] font-semibold tracking-wide text-muted-foreground uppercase leading-tight sm:text-xs">
          {isToday ? "Today" : weekday}
        </span>
        <span className="text-xs font-semibold text-foreground leading-tight sm:text-sm">{monthDay}</span>
      </div>

      <button
        onClick={() => shift(1)}
        disabled={atMax}
        className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-surface-warm hover:text-foreground disabled:opacity-25 disabled:pointer-events-none active:scale-90"
        aria-label="Next day"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
