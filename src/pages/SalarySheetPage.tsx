import { useState, useMemo } from "react";
import { useEmployees } from "@/hooks/useData";
import { currency, formatDecimal } from "@/lib/format";
import { Calculator } from "lucide-react";

const MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

const SHIFT_TYPES = [
  { label: "8AM-8PM", hours: 12 },
  { label: "9AM-8PM", hours: 11 },
  { label: "9AM-7PM", hours: 10 },
];

interface SalaryEntry {
  id: string;
  empName: string;
  designation: string;
  month: string;
  shiftType: string;
  salary: number;
  totalDaysWorking: number;
  paidSundays: number;
  holidays: number;
  advancePaid: number;
}

function getDaysInMonth(month: string, year: number): number {
  const idx = MONTHS.indexOf(month);
  if (idx < 0) return 30;
  return new Date(year, idx + 1, 0).getDate();
}

const SalarySheetPage = () => {
  const { employees } = useEmployees(true);
  const [entries, setEntries] = useState<SalaryEntry[]>([]);
  const [selectedYear] = useState(new Date().getFullYear());

  // Form state
  const [empName, setEmpName] = useState("");
  const [designation, setDesignation] = useState("");
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [shiftType, setShiftType] = useState(SHIFT_TYPES[0].label);
  const [salary, setSalary] = useState(10000);
  const [daysWorking, setDaysWorking] = useState(26);
  const [paidSundays, setPaidSundays] = useState(4);
  const [holidays, setHolidays] = useState(0);
  const [advancePaid, setAdvancePaid] = useState(0);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim()) return;
    const entry: SalaryEntry = {
      id: Date.now().toString(),
      empName: empName.trim(),
      designation: designation.trim(),
      month,
      shiftType,
      salary,
      totalDaysWorking: daysWorking,
      paidSundays,
      holidays,
      advancePaid,
    };
    setEntries((prev) => [...prev, entry]);
    setEmpName("");
    setDesignation("");
    setAdvancePaid(0);
  };

  const removeEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const calculations = useMemo(() => {
    return entries.map((entry) => {
      const daysInMonth = getDaysInMonth(entry.month, selectedYear);
      const dailyWage = entry.salary / daysInMonth;
      const shift = SHIFT_TYPES.find((s) => s.label === entry.shiftType);
      const hoursPerDay = shift?.hours || 12;
      const ratePerHour = dailyWage / hoursPerDay;
      const effectiveDays = entry.totalDaysWorking + entry.paidSundays + entry.holidays;
      const grossAmount = dailyWage * effectiveDays;
      const finalAmount = grossAmount - entry.advancePaid;
      return {
        ...entry,
        daysInMonth,
        dailyWage,
        hoursPerDay,
        ratePerHour,
        effectiveDays,
        grossAmount,
        finalAmount,
      };
    });
  }, [entries, selectedYear]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Calculator className="w-7 h-7 text-primary" />
        <h1 className="page-title">Salary Sheet</h1>
      </div>

      {/* Add entry form */}
      <div className="section-card">
        <h2 className="section-title mb-4">Add salary entry</h2>
        <form onSubmit={handleAdd} className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="form-label">Employee Name</label>
            <input value={empName} onChange={(e) => setEmpName(e.target.value)} className="form-input w-full" placeholder="Name" required />
          </div>
          <div>
            <label className="form-label">Designation</label>
            <input value={designation} onChange={(e) => setDesignation(e.target.value)} className="form-input w-full" placeholder="Designation" />
          </div>
          <div>
            <label className="form-label">Month</label>
            <select value={month} onChange={(e) => setMonth(e.target.value)} className="form-select w-full">
              {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Shift Type</label>
            <select value={shiftType} onChange={(e) => setShiftType(e.target.value)} className="form-select w-full">
              {SHIFT_TYPES.map((s) => <option key={s.label} value={s.label}>{s.label} ({s.hours}h)</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Monthly Salary (₹)</label>
            <input type="number" min="0" value={salary} onChange={(e) => setSalary(Number(e.target.value))} className="form-input w-full" />
          </div>
          <div>
            <label className="form-label">Days Working</label>
            <input type="number" min="0" max="31" value={daysWorking} onChange={(e) => setDaysWorking(Number(e.target.value))} className="form-input w-full" />
          </div>
          <div>
            <label className="form-label">Paid Sundays</label>
            <input type="number" min="0" max="5" value={paidSundays} onChange={(e) => setPaidSundays(Number(e.target.value))} className="form-input w-full" />
          </div>
          <div>
            <label className="form-label">Holidays</label>
            <input type="number" min="0" max="10" value={holidays} onChange={(e) => setHolidays(Number(e.target.value))} className="form-input w-full" />
          </div>
          <div>
            <label className="form-label">Advance Paid (₹)</label>
            <input type="number" min="0" value={advancePaid} onChange={(e) => setAdvancePaid(Number(e.target.value))} className="form-input w-full" />
          </div>
          <div className="col-span-2 md:col-span-3 flex items-end">
            <button type="submit" className="btn-primary">Add Entry</button>
          </div>
        </form>
      </div>

      {/* Shift reference */}
      <div className="section-card">
        <h2 className="section-title mb-3">Shift Categories</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SHIFT_TYPES.map((s) => (
            <div key={s.label} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border">
              <span className="text-sm font-medium text-foreground">{s.label}</span>
              <span className="text-sm text-muted-foreground">{s.hours} hours/day</span>
            </div>
          ))}
        </div>
      </div>

      {/* Salary table */}
      {calculations.length > 0 && (
        <div className="section-card">
          <h2 className="section-title mb-4">Salary Sheet</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="table-header">Sr.</th>
                  <th className="table-header">Name</th>
                  <th className="table-header">Designation</th>
                  <th className="table-header">Month</th>
                  <th className="table-header">Shift</th>
                  <th className="table-header text-right">Salary</th>
                  <th className="table-header text-right">Daily Wage</th>
                  <th className="table-header text-right">₹/Hour</th>
                  <th className="table-header text-right">Days</th>
                  <th className="table-header text-right">Sundays</th>
                  <th className="table-header text-right">Holidays</th>
                  <th className="table-header text-right">Advance</th>
                  <th className="table-header text-right">Amount</th>
                  <th className="table-header w-10"></th>
                </tr>
              </thead>
              <tbody>
                {calculations.map((c, i) => (
                  <tr key={c.id} className="table-row">
                    <td className="table-cell">{i + 1}</td>
                    <td className="table-cell font-medium">{c.empName}</td>
                    <td className="table-cell">{c.designation || "—"}</td>
                    <td className="table-cell">{c.month}</td>
                    <td className="table-cell">{c.shiftType}</td>
                    <td className="table-cell text-right">{currency(c.salary)}</td>
                    <td className="table-cell text-right">{currency(Math.round(c.dailyWage))}</td>
                    <td className="table-cell text-right">₹{formatDecimal(c.ratePerHour)}</td>
                    <td className="table-cell text-right">{c.totalDaysWorking}</td>
                    <td className="table-cell text-right">{c.paidSundays}</td>
                    <td className="table-cell text-right">{c.holidays}</td>
                    <td className="table-cell text-right">{currency(c.advancePaid)}</td>
                    <td className="table-cell text-right font-bold">{currency(Math.round(c.finalAmount))}</td>
                    <td className="table-cell">
                      <button onClick={() => removeEntry(c.id)} className="btn-icon text-destructive" title="Remove">
                        <span className="text-xs">✕</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Formulas explanation */}
          <div className="mt-4 p-4 rounded-xl bg-muted/30 border border-border text-xs text-muted-foreground space-y-1">
            <p><strong>Daily Wage</strong> = Monthly Salary ÷ Days in Month</p>
            <p><strong>Rate Per Hour</strong> = Daily Wage ÷ Shift Hours</p>
            <p><strong>Amount</strong> = (Daily Wage × (Days Working + Paid Sundays + Holidays)) − Advance Paid</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalarySheetPage;
