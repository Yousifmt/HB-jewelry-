// src/components/dashboard/date-range-picker.tsx
"use client";

import * as React from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Calendar as CalendarIcon, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
  compact?: boolean;
}

export function DateRangePicker({
  className,
  date,
  setDate,
  compact = true,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  // نغلق تلقائيًا عند اكتمال المدى
  const handleSelect = (next: DateRange | undefined) => {
    setDate(next);
    if (next?.from && next?.to) setOpen(false);
  };

  const clearRange = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDate(undefined);
  };

  const applyIfComplete = () => {
    if (date?.from && date?.to) setOpen(false);
  };

  const label =
    date?.from
      ? date.to
        ? `${format(date.from, "LLL dd, y")} - ${format(date.to, "LLL dd, y")}`
        : format(date.from, "LLL dd, y")
      : "Pick a date";

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "h-8 w-full justify-between text-left font-normal sm:w-[240px]",
              compact ? "text-xs" : "text-sm",
              !date && "text-muted-foreground"
            )}
          >
            <span className="inline-flex items-center">
              <CalendarIcon className={cn("mr-2", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
              {label}
            </span>

            {date?.from ? (
              <span
                onClick={clearRange}
                className="ml-2 inline-flex items-center rounded p-1 hover:bg-accent"
                aria-label="Clear date range"
                role="button"
              >
                <X className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4", "opacity-70")} />
              </span>
            ) : null}
          </Button>
        </PopoverTrigger>

        <PopoverContent className={cn("w-[280px] p-2", compact && "p-2")} align="start" sideOffset={6}>
          {/* From / To inputs (عرض فقط) */}
          <div className="mb-2 grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="block text-[10px] text-muted-foreground">From</label>
              <Input
                readOnly
                value={date?.from ? format(date.from, "LLL dd, y") : ""}
                placeholder="Select start"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] text-muted-foreground">To</label>
              <Input
                readOnly
                value={date?.to ? format(date.to, "LLL dd, y") : ""}
                placeholder="Select end"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <Calendar
            initialFocus
            mode="range"
            numberOfMonths={1} // ✅ تقويم واحد
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleSelect}
            className={cn(compact ? "text-xs" : "text-sm", "select-none")}
            classNames={{
              months: "flex flex-col space-y-1",
              month: "space-y-1",
              caption: "flex justify-center pt-1 relative items-center",
              caption_label: "text-xs font-medium",
              nav: "space-x-1 flex items-center",
              nav_button:
                "h-6 w-6 rounded-md p-0 opacity-80 hover:opacity-100 inline-flex items-center justify-center border",
              table: "w-full border-collapse",
              head_row: "grid grid-cols-7",
              head_cell: "text-muted-foreground py-1 text-[10px]",
              row: "grid grid-cols-7",
              cell:
                "relative p-0 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
              day: "h-6 w-6 rounded-md p-0 font-normal aria-selected:opacity-100 text-[11px]",
              day_today: "underline underline-offset-2",
              day_outside: "opacity-40",
              day_disabled: "opacity-30",
              day_range_middle: "aria-selected:bg-accent",
              day_range_end: "aria-selected:bg-primary aria-selected:text-primary-foreground",
              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
            }}
          />

          {/* أزرار أسفل التقويم */}
          <div className="mt-2 flex items-center justify-between gap-2">
            <Button variant="ghost" className="h-8 px-2 text-xs" onClick={() => clearRange()}>
              Clear
            </Button>
            <Button
              className="h-8 px-3 text-xs"
              disabled={!date?.from || !date?.to}
              onClick={applyIfComplete}
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
