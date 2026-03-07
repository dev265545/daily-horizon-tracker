const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function pad(n: number) { return String(n).padStart(2, "0"); }

export function toISODate(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function today(): string {
  return toISODate(new Date());
}

export function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export interface Period {
  from: string;
  to: string;
  label: string;
  year?: number;
  month?: number;
}

export function getPeriodForDate(date: string | Date): Period {
  const d = typeof date === "string" ? new Date(date + "T12:00:00") : new Date(date);
  const y = d.getFullYear();
  const m = d.getMonth();
  const day = d.getDate();
  if (day <= 15) {
    return {
      from: `${y}-${pad(m + 1)}-01`,
      to: `${y}-${pad(m + 1)}-15`,
      label: `1–15 ${monthNames[m]} ${y}`,
      year: y, month: m,
    };
  }
  const lastDay = getLastDayOfMonth(y, m);
  return {
    from: `${y}-${pad(m + 1)}-16`,
    to: `${y}-${pad(m + 1)}-${pad(lastDay)}`,
    label: `16–${lastDay} ${monthNames[m]} ${y}`,
    year: y, month: m,
  };
}

export function getPeriods(count = 24): Period[] {
  const now = new Date();
  const periods: Period[] = [];
  const monthsBack = Math.ceil(count / 2);
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const lastDay = getLastDayOfMonth(y, m);
    periods.push({
      from: `${y}-${pad(m + 1)}-01`,
      to: `${y}-${pad(m + 1)}-15`,
      label: `1–15 ${monthNames[m]} ${y}`,
    });
    periods.push({
      from: `${y}-${pad(m + 1)}-16`,
      to: `${y}-${pad(m + 1)}-${pad(lastDay)}`,
      label: `16–${lastDay} ${monthNames[m]} ${y}`,
    });
  }
  return periods.slice(-count);
}

export function getPeriodsWithData(records: { date: string }[], maxPeriods = 24): Period[] {
  const keys = new Set<string>();
  records.forEach((r) => {
    if (r.date) {
      const p = getPeriodForDate(r.date);
      keys.add(`${p.from}|${p.to}`);
    }
  });
  return getPeriods(maxPeriods).filter((p) => keys.has(`${p.from}|${p.to}`));
}

export function dateDisplay(isoDate: string): string {
  if (!isoDate) return "—";
  const d = new Date(isoDate + "T12:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
