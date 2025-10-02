// src/components/dashboard/date-range-picker.tsx
"use client";

import * as React from "react";
import { format, subDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Calendar as CalendarIcon, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
  compact?: boolean;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const mql = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener?.("change", update);
    return () => mql.removeEventListener?.("change", update);
  }, []);
  return isMobile;
}

export function DateRangePicker({
  className,
  date,
  setDate,
  compact = true,
}: DateRangePickerProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);

  const label =
    date?.from
      ? date.to
        ? `${format(date.from, "LLL dd, y")} - ${format(date.to, "LLL dd, y")}`
        : format(date.from, "LLL dd, y")
      : "Pick a date";

  // Shared trigger button
  const TriggerButton = (
    <Button
      id="date"
      variant="outline"
      onClick={() => setOpen(true)}
      className={cn(
        "h-9 w-full justify-between text-left font-normal sm:w-[240px]",
        compact ? "text-[13px]" : "text-sm",
        !date && "text-muted-foreground"
      )}
    >
      <span className="inline-flex items-center">
        <CalendarIcon className={cn("mr-2", compact ? "h-4 w-4" : "h-4 w-4")} />
        {label}
      </span>
      {date?.from ? (
        <span
          onClick={(e) => {
            e.stopPropagation();
            setDate(undefined);
          }}
          className="ml-2 inline-flex items-center rounded p-1 hover:bg-accent"
          aria-label="Clear date range"
          role="button"
        >
          <X className={cn(compact ? "h-4 w-4" : "h-4 w-4", "opacity-70")} />
        </span>
      ) : null}
    </Button>
  );

  if (isMobile) {
    // ---------- Mobile: native date inputs in a bottom-sheet dialog ----------
    const [fromStr, setFromStr] = React.useState("");
    const [toStr, setToStr] = React.useState("");
    const fromRef = React.useRef<HTMLInputElement | null>(null);
    const toRef = React.useRef<HTMLInputElement | null>(null);

    // Sync local state when dialog opens
    React.useEffect(() => {
      if (open) {
        setFromStr(date?.from ? format(date.from, "yyyy-MM-dd") : "");
        setToStr(date?.to ? format(date.to, "yyyy-MM-dd") : "");
        // small delay so keyboard can open smoothly when focusing first field
        setTimeout(() => fromRef.current?.focus(), 100);
      }
    }, [open]); // eslint-disable-line

    const apply = () => {
      if (!fromStr || !toStr) return;
      const from = new Date(fromStr);
      const to = new Date(toStr);
      if (isNaN(+from) || isNaN(+to)) return;
      const range: DateRange = from <= to ? { from, to } : { from: to, to: from };
      setDate(range);
      setOpen(false);
    };

    const setQuick = (days: number) => {
      const today = new Date();
      const from = subDays(today, days - 1); // inclusive range
      setFromStr(format(from, "yyyy-MM-dd"));
      setToStr(format(today, "yyyy-MM-dd"));
    };

    return (
      <div className={cn("grid gap-2", className)}>
        {TriggerButton}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent
            className={cn(
              "p-0 sm:max-w-[380px]",
              "sm:rounded-lg sm:p-4",
              // Bottom sheet style on mobile
              "sm:bottom-auto sm:translate-y-0"
            )}
          >
            <DialogHeader className="px-4 pt-4 sm:px-0 sm:pt-0">
              <DialogTitle className="text-base">Select date range</DialogTitle>
            </DialogHeader>

            <div className="px-4 pb-4 sm:px-0 sm:pb-0">
              {/* Quick presets */}
              <div className="mb-3 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  className="h-8 rounded-full px-3 text-xs"
                  onClick={() => setQuick(1)}
                >
                  Today
                </Button>
                <Button
                  variant="secondary"
                  className="h-8 rounded-full px-3 text-xs"
                  onClick={() => setQuick(7)}
                >
                  Last 7 days
                </Button>
                <Button
                  variant="secondary"
                  className="h-8 rounded-full px-3 text-xs"
                  onClick={() => setQuick(30)}
                >
                  Last 30 days
                </Button>
              </div>

              {/* Native date inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] text-muted-foreground">From</label>
                  <Input
                    ref={fromRef}
                    type="date"
                    value={fromStr}
                    onChange={(e) => setFromStr(e.target.value)}
                    className="h-12 text-[16px]"
                    enterKeyHint="next"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        toRef.current?.focus();
                      }
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] text-muted-foreground">To</label>
                  <Input
                    ref={toRef}
                    type="date"
                    value={toStr}
                    onChange={(e) => setToStr(e.target.value)}
                    className="h-12 text-[16px]"
                    enterKeyHint="done"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        apply();
                      }
                    }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 flex items-center justify-between">
                <Button
                  variant="ghost"
                  className="h-10 px-2 text-sm"
                  onClick={() => {
                    setFromStr("");
                    setToStr("");
                    setDate(undefined);
                    setOpen(false);
                  }}
                >
                  Clear
                </Button>
                <Button
                  className="h-10 px-4 text-sm"
                  disabled={!fromStr || !toStr}
                  onClick={apply}
                >
                  Apply
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ---------- Desktop: keep calendar popover ----------
  const handleSelect = (next: DateRange | undefined) => {
    setDate(next);
    if (next?.from && next?.to) setOpen(false);
  };

  const daySize = compact ? "h-8 w-8 text-[13px]" : "h-9 w-9 text-sm";
  const headCellText = compact ? "text-[12px]" : "text-sm";
  const navBtnSize = compact ? "h-7 w-7" : "h-8 w-8";

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{TriggerButton}</PopoverTrigger>

        <PopoverContent className={cn("w-[296px]", compact && "p-2")} align="start" sideOffset={6}>
          <Calendar
            initialFocus
            mode="range"
            numberOfMonths={1}
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleSelect}
            className={cn(compact ? "text-xs" : "text-sm", "select-none")}
            classNames={{
              months: "flex flex-col space-y-1",
              month: "space-y-1",
              caption: "flex justify-center pt-1 relative items-center",
              caption_label: "text-sm font-medium",
              nav: "space-x-1 flex items-center",
              nav_button: cn(
                navBtnSize,
                "rounded-md p-0 opacity-80 hover:opacity-100 inline-flex items-center justify-center border"
              ),
              table: "w-full border-collapse",
              head_row: "grid grid-cols-7",
              head_cell: cn("text-muted-foreground py-1", headCellText),
              row: "grid grid-cols-7",
              cell:
                "relative p-0 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
              day: cn(
                daySize,
                "rounded-md p-0 font-normal aria-selected:opacity-100"
              ),
              day_today: "underline underline-offset-2",
              day_outside: "opacity-40",
              day_disabled: "opacity-30",
              day_range_middle: "aria-selected:bg-accent",
              day_range_end: "aria-selected:bg-primary aria-selected:text-primary-foreground",
              day_selected:
                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
            }}
          />

          <div className="mt-2 flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              className="h-8 px-2 text-xs"
              onClick={() => setDate(undefined)}
            >
              Clear
            </Button>
            <Button
              className="h-8 px-3 text-xs"
              disabled={!date?.from || !date?.to}
              onClick={() => setOpen(false)}
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
