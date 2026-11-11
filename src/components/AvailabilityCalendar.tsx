import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PropertyRequest } from "@/lib/properties";
import { cn } from "@/utils/cn";

const iso = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function AvailabilityCalendar({
  requests,
  startDate,
  endDate,
  onChange,
}: {
  requests: PropertyRequest[];
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}) {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const approved = requests.filter((request) => request.status === "approved" && request.startDate && request.endDate);
  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [month]);
  const today = iso(new Date());

  const isBooked = (value: string) => approved.some((request) => value >= request.startDate && value < request.endDate);
  const select = (value: string) => {
    if (value < today || isBooked(value)) return;
    if (!startDate || (startDate && endDate) || value <= startDate) onChange(value, "");
    else onChange(startDate, value);
  };

  return (
    <div className="rounded-xl border border-line bg-paper/50 p-2.5">
      <div className="flex items-center justify-between">
        <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded p-1 text-ink-faint hover:bg-white" aria-label="Previous month"><ChevronLeft className="h-3.5 w-3.5" /></button>
        <span className="font-mono text-[9px] uppercase tracking-wide text-ink-soft">{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
        <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded p-1 text-ink-faint hover:bg-white" aria-label="Next month"><ChevronRight className="h-3.5 w-3.5" /></button>
      </div>
      <div className="mt-2 grid grid-cols-7 gap-0.5 text-center font-mono text-[7.5px] uppercase text-ink-faint">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <span key={index}>{day}</span>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-0.5">
        {cells.map((date) => {
          const value = iso(date);
          const booked = isBooked(value);
          const selected = value === startDate || value === endDate || (startDate && endDate && value > startDate && value < endDate);
          return (
            <button
              key={value}
              disabled={booked || value < today}
              onClick={() => select(value)}
              className={cn(
                "aspect-square rounded text-[9px] transition",
                date.getMonth() !== month.getMonth() ? "text-ink-faint/35" : "text-ink-soft",
                selected ? "bg-ink text-white" : booked ? "cursor-not-allowed bg-red-50 text-red-300 line-through" : value < today ? "text-ink-faint/25" : "hover:bg-accent-soft hover:text-accent",
              )}
              title={booked ? "Already booked" : value}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[8px] leading-relaxed text-ink-faint">Approved stays block dates in red. Select check-in, then check-out.</p>
    </div>
  );
}
