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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface DateRangePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
  compact?: boolean;
}

/* ---------- Utils ---------- */
function useMountedAndIsMobile() {
  const [mounted, setMounted] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(max-width: 639px)");
    const upd = () => setIsMobile(mq.matches);
    upd();
    mq.addEventListener?.("change", upd);
    return () => mq.removeEventListener?.("change", upd);
  }, []);

  return { mounted, isMobile };
}

/* ---------- Trigger Button (shared) ---------- */
function RangeTrigger({
  label,
  hasValue,
  onOpen,
  onClear,
  className,
  compact,
}: {
  label: string;
  hasValue: boolean;
  onOpen: () => void;
  onClear: (e: React.MouseEvent) => void;
  className?: string;
  compact?: boolean;
}) {
  return (
    <Button
      id="date"
      type="button"
      variant="outline"
      onClick={onOpen}
      className={cn(
        "h-9 w-full justify-between text-left font-normal sm:w-[240px]",
        compact ? "text-[13px]" : "text-sm",
        !hasValue && "text-muted-foreground",
        className
      )}
    >
      <span className="inline-flex items-center">
        <CalendarIcon className="mr-2 h-4 w-4" />
        {label}
      </span>
      {hasValue ? (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onClear(e);
          }}
          className="ml-2 inline-flex items-center rounded p-1 hover:bg-accent"
          aria-label="Clear date range"
          role="button"
        >
          <X className="h-4 w-4 opacity-70" />
        </span>
      ) : null}
    </Button>
  );
}

/* ---------- Mobile Picker (child component) ---------- */
function MobileRangePicker({
  date,
  setDate,
  compact,
  label,
  className,
}: {
  date: DateRange | undefined;
  setDate: (d: DateRange | undefined) => void;
  compact?: boolean;
  label: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [fromStr, setFromStr] = React.useState(date?.from ? format(date.from, "yyyy-MM-dd") : "");
  const [toStr, setToStr] = React.useState(date?.to ? format(date.to, "yyyy-MM-dd") : "");
  const fromRef = React.useRef<HTMLInputElement | null>(null);
  const toRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (open) {
      setFromStr(date?.from ? format(date.from, "yyyy-MM-dd") : "");
      setToStr(date?.to ? format(date.to, "yyyy-MM-dd") : "");
      setTimeout(() => fromRef.current?.focus(), 80);
    }
    // re-sync if `date` changes while closed
  }, [open, date?.from, date?.to]);

  const apply = () => {
    if (!fromStr || !toStr) return;
    const a = new Date(fromStr);
    const b = new Date(toStr);
    if (isNaN(+a) || isNaN(+b)) return;
    const r: DateRange = a <= b ? { from: a, to: b } : { from: b, to: a };
    setDate(r);
    setOpen(false);
  };

  const preset = (days: number) => {
    const today = new Date();
    const start = subDays(today, days - 1);
    setFromStr(format(start, "yyyy-MM-dd"));
    setToStr(format(today, "yyyy-MM-dd"));
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <RangeTrigger
        label={label}
        hasValue={Boolean(date?.from)}
        onOpen={() => setOpen(true)}
        onClear={() => setDate(undefined)}
        compact={compact}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 sm:max-w-[380px] sm:p-4">
          <DialogHeader className="px-4 pt-4 sm:px-0 sm:pt-0">
            <DialogTitle className="text-base">Select date range</DialogTitle>
          </DialogHeader>

          <div className="px-4 pb-4 sm:px-0 sm:pb-0">
            {/* Presets */}
            <div className="mb-3 flex flex-wrap gap-2">
              <Button variant="secondary" className="h-8 rounded-full px-3 text-xs" onClick={() => preset(1)}>
                Today
              </Button>
              <Button variant="secondary" className="h-8 rounded-full px-3 text-xs" onClick={() => preset(7)}>
                Last 7 days
              </Button>
              <Button variant="secondary" className="h-8 rounded-full px-3 text-xs" onClick={() => preset(30)}>
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
              <Button className="h-10 px-4 text-sm" disabled={!fromStr || !toStr} onClick={apply}>
                Apply
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Desktop Picker (child component) ---------- */
function DesktopRangePicker({
  date,
  setDate,
  compact,
  label,
  className,
}: {
  date: DateRange | undefined;
  setDate: (d: DateRange | undefined) => void;
  compact?: boolean;
  label: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);

  const daySize = compact ? "h-8 w-8 text-[13px]" : "h-9 w-9 text-sm";
  const headCellText = compact ? "text-[12px]" : "text-sm";
  const navBtnSize = compact ? "h-7 w-7" : "h-8 w-8";

  const handleSelect = (next: DateRange | undefined) => {
    setDate(next);
    if (next?.from && next?.to) setOpen(false);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <RangeTrigger
            label={label}
            hasValue={Boolean(date?.from)}
            onOpen={() => setOpen(true)}
            onClear={() => setDate(undefined)}
            compact={compact}
          />
        </PopoverTrigger>

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
              day: cn(daySize, "rounded-md p-0 font-normal aria-selected:opacity-100"),
              day_today: "underline underline-offset-2",
              day_outside: "opacity-40",
              day_disabled: "opacity-30",
              day_range_middle: "aria-selected:bg-accent",
              day_range_end: "aria-selected:bg-primary aria-selected:text-primary-foreground",
              day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
            }}
          />

          <div className="mt-2 flex items-center justify-between gap-2">
            <Button type="button" variant="ghost" className="h-8 px-2 text-xs" onClick={() => setDate(undefined)}>
              Clear
            </Button>
            <Button
              type="button"
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

/* ---------- Parent decides which child to render (no conditional hooks here) ---------- */
export function DateRangePicker({
  className,
  date,
  setDate,
  compact = true,
}: DateRangePickerProps) {
  const { mounted, isMobile } = useMountedAndIsMobile();

  const label = React.useMemo(() => {
    if (date?.from) {
      if (date.to) return `${format(date.from, "LLL dd, y")} - ${format(date.to, "LLL dd, y")}`;
      return format(date.from, "LLL dd, y");
    }
    return "Pick a date";
  }, [date?.from, date?.to]);

  // Pre-mount: render a stable trigger (prevents hydration mismatches)
  if (!mounted) {
    return (
      <div className={cn("grid gap-2", className)}>
        <RangeTrigger
          label={label}
          hasValue={Boolean(date?.from)}
          onOpen={() => {}}
          onClear={() => {}}
          compact={compact}
        />
      </div>
    );
  }

  return isMobile ? (
    <MobileRangePicker
      className={className}
      date={date}
      setDate={setDate}
      compact={compact}
      label={label}
    />
  ) : (
    <DesktopRangePicker
      className={className}
      date={date}
      setDate={setDate}
      compact={compact}
      label={label}
    />
  );
}
