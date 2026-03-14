import { useMemo } from "react";
import { toISODate, getLastDayOfMonth } from "@/lib/dateUtils";
import type { Production, DayOff, Employee } from "@/lib/db";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DashboardCalendarProps {
  year: number;
  month: number;
  onMonthChange: (year: number, month: number) => void;
  productions: Production[];
  dayOffs: DayOff[];
  employees: Employee[];
  selectedDate: string | null;
  onDateClick: (date: string) => void;
  onToggleDayOff: (date: string) => void;
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DashboardCalendar = ({
  year, month, onMonthChange,
  productions, dayOffs, employees,
  selectedDate, onDateClick, onToggleDayOff,
}: DashboardCalendarProps) => {
  const daysInMonth = getLastDayOfMonth(year, month);
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  // For each date, how many unique employees have production entries
  const dateEntryStatus = useMemo(() => {
    const map = new Map<string, Set<string>>();
    productions.forEach((p) => {
      if (!map.has(p.date)) map.set(p.date, new Set());
      map.get(p.date)!.add(p.employeeId);
    });
    return map;
  }, [productions]);

  const dayOffSet = useMemo(() => {
    const set = new Set<string>();
    dayOffs.forEach((d) => set.add(d.date));
    return set;
  }, [dayOffs]);

  const totalEmployees = employees.length;
  const today = toISODate(new Date());

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="section-card">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => {
            const prev = month === 0 ? 11 : month - 1;
            const py = month === 0 ? year - 1 : year;
            onMonthChange(py, prev);
          }}
          className="btn-icon"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="font-heading font-bold text-lg text-foreground">
          {MONTH_NAMES[month]} {year}
        </h3>
        <button
          onClick={() => {
            const next = month === 11 ? 0 : month + 1;
            const ny = month === 11 ? year + 1 : year;
            onMonthChange(ny, next);
          }}
          className="btn-icon"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
          const isSunday = new Date(year, month, day).getDay() === 0;
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const isDayOff = dayOffSet.has(dateStr);
          const enteredEmps = dateEntryStatus.get(dateStr)?.size || 0;
          const allEntered = totalEmployees > 0 && enteredEmps >= totalEmployees;
          const someEntered = enteredEmps > 0 && !allEntered;

          return (
            <button
              key={dateStr}
              onClick={() => onDateClick(dateStr)}
              onDoubleClick={() => onToggleDayOff(dateStr)}
              className={`
                relative flex flex-col items-center justify-center rounded-lg p-1.5 min-h-[44px] text-sm transition-all
                ${isSelected ? "ring-2 ring-ring bg-primary/10" : "hover:bg-muted"}
                ${isSunday ? "text-destructive/70" : "text-foreground"}
                ${isDayOff ? "bg-destructive/10" : ""}
              `}
            >
              <span className={`text-xs leading-none ${isToday ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center" : ""}`}>
                {day}
              </span>
              <div className="flex gap-0.5 mt-0.5">
                {allEntered && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--success))]" title="All employees entered" />
                )}
                {someEntered && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--warning))]" title={`${enteredEmps}/${totalEmployees} entered`} />
                )}
                {isDayOff && (
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive" title="Day off" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[hsl(var(--success))]" /> All entered
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[hsl(var(--warning))]" /> Partial
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-destructive" /> Day off
        </div>
        <p className="text-xs italic">Double-click a date to toggle day off</p>
      </div>
    </div>
  );
};

export default DashboardCalendar;
