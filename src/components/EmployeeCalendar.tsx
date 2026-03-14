import { useMemo } from "react";
import { toISODate, getLastDayOfMonth } from "@/lib/dateUtils";
import type { Production, Attendance, DayOff } from "@/lib/db";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface EmployeeCalendarProps {
  year: number;
  month: number; // 0-indexed
  onMonthChange: (year: number, month: number) => void;
  productions: Production[];
  attendance: Attendance[];
  dayOffs: DayOff[];
  selectedDate: string | null;
  onDateClick: (date: string) => void;
  periodFrom: string;
  periodTo: string;
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const EmployeeCalendar = ({
  year, month, onMonthChange,
  productions, attendance, dayOffs,
  selectedDate, onDateClick,
  periodFrom, periodTo,
}: EmployeeCalendarProps) => {
  const daysInMonth = getLastDayOfMonth(year, month);
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const productionDates = useMemo(() => {
    const set = new Set<string>();
    productions.forEach((p) => set.add(p.date));
    return set;
  }, [productions]);

  const attendanceMap = useMemo(() => {
    const map = new Map<string, "present" | "absent">();
    attendance.forEach((a) => map.set(a.date, a.status));
    return map;
  }, [attendance]);

  const dayOffSet = useMemo(() => {
    const set = new Set<string>();
    dayOffs.forEach((d) => set.add(d.date));
    return set;
  }, [dayOffs]);

  const today = toISODate(new Date());

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="section-card">
      {/* Header */}
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

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;

          const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
          const isSunday = new Date(year, month, day).getDay() === 0;
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const inPeriod = dateStr >= periodFrom && dateStr <= periodTo;
          const hasProd = productionDates.has(dateStr);
          const attStatus = attendanceMap.get(dateStr);
          const isDayOff = dayOffSet.has(dateStr);

          return (
            <button
              key={dateStr}
              onClick={() => onDateClick(dateStr)}
              className={`
                relative flex flex-col items-center justify-center rounded-lg p-1.5 min-h-[44px] text-sm transition-all
                ${isSelected ? "ring-2 ring-ring bg-primary/10" : ""}
                ${inPeriod && !isSelected ? "bg-accent/40" : ""}
                ${!inPeriod && !isSelected ? "hover:bg-muted" : ""}
                ${isToday ? "font-bold" : ""}
                ${isSunday ? "text-destructive/70" : "text-foreground"}
                ${isDayOff ? "bg-destructive/10" : ""}
              `}
            >
              <span className={`text-xs leading-none ${isToday ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center" : ""}`}>
                {day}
              </span>
              {/* Dots row */}
              <div className="flex gap-0.5 mt-0.5">
                {hasProd && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--success))]" title="Production entry" />
                )}
                {attStatus === "present" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" title="Present" />
                )}
                {attStatus === "absent" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive" title="Absent" />
                )}
                {isDayOff && !hasProd && !attStatus && (
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" title="Day off" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[hsl(var(--success))]" /> Production
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary" /> Present
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-destructive" /> Absent
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-muted-foreground" /> Day off
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-3 rounded bg-accent/40 border border-border" /> Selected period
        </div>
      </div>
    </div>
  );
};

export default EmployeeCalendar;
