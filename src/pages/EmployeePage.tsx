import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchEmployee, useProductions, useAdvances, useDeductions, useItems, useAttendance, useDayOffs } from "@/hooks/useData";
import { today, getPeriodForDate, getLastDayOfMonth } from "@/lib/dateUtils";
import { currency, formatNumber } from "@/lib/format";
import { getAll, put, STORES, SHIFT_HOURS, type Employee, type Production, type Advance, type AdvanceDeduction, type ShiftType } from "@/lib/db";
import { dateDisplay } from "@/lib/dateUtils";
import { ArrowLeft, Trash2, Check, X, UserCheck, CalendarDays, IndianRupee, Clock } from "lucide-react";
import EmployeeCalendar from "@/components/EmployeeCalendar";

const EmployeePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { items } = useItems();
  const itemMap = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items]);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [allProductions, setAllProductions] = useState<Production[]>([]);
  const [allAdvances, setAllAdvances] = useState<Advance[]>([]);
  const [allDeductions, setAllDeductions] = useState<AdvanceDeduction[]>([]);
  const { attendance, setAttendanceStatus, removeAttendance } = useAttendance(id);
  const { dayOffs } = useDayOffs();

  // Calendar state
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(today());

  // Derived period from calendar month (two 15-day periods)
  const period = useMemo(() => getPeriodForDate(selectedDate || today()), [selectedDate]);

  const loadData = useCallback(async () => {
    if (!id) return;
    const emp = await fetchEmployee(id);
    setEmployee(emp);
    const prods = await getAll<Production>(STORES.PRODUCTIONS);
    const advs = await getAll<Advance>(STORES.ADVANCES);
    const deds = await getAll<AdvanceDeduction>(STORES.ADVANCE_DEDUCTIONS);
    setAllProductions(prods.filter((p) => p.employeeId === id));
    setAllAdvances(advs.filter((a) => a.employeeId === id));
    setAllDeductions(deds.filter((d) => d.employeeId === id));
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Shift & salary config
  const shift = employee?.shift || "8AM-8PM";
  const monthlySalary = employee?.monthlySalary || 0;
  const shiftHours = SHIFT_HOURS[shift as ShiftType] || 12;
  const daysInMonth = getLastDayOfMonth(calYear, calMonth);
  const dailyRate = monthlySalary > 0 ? monthlySalary / daysInMonth : 0;
  const hourlyRate = dailyRate > 0 ? dailyRate / shiftHours : 0;

  const handleUpdateShift = async (newShift: ShiftType) => {
    if (!employee) return;
    const updated = { ...employee, shift: newShift };
    await put(STORES.EMPLOYEES, updated);
    setEmployee(updated);
  };

  const handleUpdateSalary = async (newSalary: number) => {
    if (!employee) return;
    const updated = { ...employee, monthlySalary: newSalary };
    await put(STORES.EMPLOYEES, updated);
    setEmployee(updated);
  };

  // Attendance for current month
  const monthAttendance = useMemo(() => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const prefix = `${calYear}-${pad(calMonth + 1)}`;
    return attendance.filter((a) => a.date.startsWith(prefix));
  }, [attendance, calYear, calMonth]);

  const daysPresent = monthAttendance.filter((a) => a.status === "present").length;
  const daysAbsent = monthAttendance.filter((a) => a.status === "absent").length;
  const earnedSundays = Math.floor(daysPresent / 6);
  const totalPaidDays = daysPresent + earnedSundays;
  const calculatedSalary = totalPaidDays * dailyRate;

  // Day off set for this month
  const monthDayOffSet = useMemo(() => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const prefix = `${calYear}-${pad(calMonth + 1)}`;
    return new Set(dayOffs.filter((d) => d.date.startsWith(prefix)).map((d) => d.date));
  }, [dayOffs, calYear, calMonth]);

  // Period productions
  const periodProds = useMemo(() => allProductions.filter((p) => p.date >= period.from && p.date <= period.to), [allProductions, period]);
  const periodAdvances = useMemo(() => allAdvances.filter((a) => a.date >= period.from && a.date <= period.to), [allAdvances, period]);
  const currentDeduction = useMemo(() => allDeductions.find((d) => d.periodFrom === period.from && d.periodTo === period.to), [allDeductions, period]);

  const gross = useMemo(() => periodProds.reduce((s, p) => s + p.quantity * (itemMap[p.itemId]?.rate || 0), 0), [periodProds, itemMap]);
  const advanceToCut = currentDeduction?.amount ?? 0;
  const net = Math.max(0, gross - advanceToCut);

  // Quick attendance toggle for selected date
  const selectedDateAtt = useMemo(() => {
    if (!selectedDate) return null;
    return attendance.find((a) => a.date === selectedDate) || null;
  }, [attendance, selectedDate]);

  const handleMarkPresent = async () => {
    if (!id || !selectedDate) return;
    await setAttendanceStatus(id, selectedDate, "present");
  };
  const handleMarkAbsent = async () => {
    if (!id || !selectedDate) return;
    await setAttendanceStatus(id, selectedDate, "absent");
  };
  const handleClearAttendance = async () => {
    if (!id || !selectedDate) return;
    await removeAttendance(id, selectedDate);
  };

  // Add production
  const [prodItem, setProdItem] = useState("");
  const [prodShift, setProdShift] = useState<"day" | "night">("day");
  const [prodQty, setProdQty] = useState(1);
  const { addProduction, deleteProduction } = useProductions();

  const handleAddProd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !prodItem || !selectedDate) return;
    await addProduction({ employeeId: id, itemId: prodItem, date: selectedDate, quantity: prodQty, shift: prodShift });
    setProdQty(1);
    await loadData();
  };

  // Add advance
  const [advAmount, setAdvAmount] = useState(0);
  const { addAdvance, deleteAdvance } = useAdvances();

  const handleAddAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !advAmount || !selectedDate) return;
    await addAdvance({ employeeId: id, amount: advAmount, date: selectedDate });
    setAdvAmount(0);
    await loadData();
  };

  // Settlement
  const [cutAmount, setCutAmount] = useState(0);
  useEffect(() => { setCutAmount(advanceToCut); }, [advanceToCut]);
  const { saveDeduction } = useDeductions(id);
  const handleSaveSettlement = async () => {
    if (!id) return;
    await saveDeduction({ employeeId: id, periodFrom: period.from, periodTo: period.to, amount: cutAmount });
    await loadData();
  };

  // Selected date productions
  const selectedDateProds = useMemo(() => {
    if (!selectedDate) return [];
    return allProductions.filter((p) => p.date === selectedDate);
  }, [allProductions, selectedDate]);

  // Cumulative by item for period
  const cumulativeByItem = useMemo(() => {
    const byItem: Record<string, { day: number; night: number; total: number }> = {};
    periodProds.forEach((p) => {
      if (!byItem[p.itemId]) byItem[p.itemId] = { day: 0, night: 0, total: 0 };
      byItem[p.itemId].total += p.quantity;
      if (p.shift === "night") byItem[p.itemId].night += p.quantity;
      else byItem[p.itemId].day += p.quantity;
    });
    return Object.entries(byItem).map(([itemId, data]) => ({
      name: itemMap[itemId]?.name || itemId, ...data,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [periodProds, itemMap]);

  if (!employee) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <button onClick={() => navigate("/")} className="btn-ghost flex items-center gap-1 mb-2 text-primary">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>
        <h1 className="page-title">{employee.name}</h1>
      </div>

      {/* Top row: Shift & Salary config */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Shift</span>
          </div>
          <select
            value={shift}
            onChange={(e) => handleUpdateShift(e.target.value as ShiftType)}
            className="form-select w-full"
          >
            <option value="8AM-8PM">8AM–8PM (12h)</option>
            <option value="9AM-8PM">9AM–8PM (11h)</option>
            <option value="9AM-7PM">9AM–7PM (10h)</option>
          </select>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-2">
            <IndianRupee className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Monthly salary</span>
          </div>
          <input
            type="number"
            min="0"
            value={monthlySalary}
            onChange={(e) => handleUpdateSalary(Number(e.target.value))}
            className="form-input w-full"
            placeholder="₹0"
          />
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground mb-1">Daily rate</p>
          <p className="text-xl font-bold font-heading text-foreground">{currency(dailyRate)}</p>
          <p className="text-xs text-muted-foreground mt-1">{daysInMonth} days in {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][calMonth]}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground mb-1">Hourly rate</p>
          <p className="text-xl font-bold font-heading text-foreground">{currency(hourlyRate)}</p>
          <p className="text-xs text-muted-foreground mt-1">{shiftHours}h shift</p>
        </div>
      </div>

      {/* Main layout: Calendar + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <EmployeeCalendar
            year={calYear}
            month={calMonth}
            onMonthChange={(y, m) => { setCalYear(y); setCalMonth(m); }}
            productions={allProductions}
            attendance={attendance}
            dayOffs={dayOffs}
            selectedDate={selectedDate}
            onDateClick={setSelectedDate}
            periodFrom={period.from}
            periodTo={period.to}
          />
        </div>

        {/* Right sidebar: attendance stats */}
        <div className="space-y-4">
          {/* Monthly attendance summary */}
          <div className="section-card">
            <h3 className="section-title mb-3 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-primary" />
              Attendance — {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][calMonth]}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Days present</span>
                <span className="font-semibold text-foreground">{daysPresent}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Days absent</span>
                <span className="font-semibold text-foreground">{daysAbsent}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Earned Sundays</span>
                <span className="font-semibold text-foreground">{earnedSundays}</span>
              </div>
              <p className="text-xs text-muted-foreground italic">1 Sunday earned per 6 working days</p>
              <div className="border-t border-border pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total paid days</span>
                  <span className="font-bold text-foreground">{totalPaidDays}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-muted-foreground">Calculated salary</span>
                  <span className="font-bold text-lg text-foreground">{currency(calculatedSalary)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Selected date actions */}
          {selectedDate && (
            <div className="section-card">
              <h3 className="section-title mb-3 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" />
                {dateDisplay(selectedDate)}
              </h3>

              {/* Attendance toggle */}
              <div className="mb-3">
                <p className="text-xs text-muted-foreground mb-2">Attendance</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleMarkPresent}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      selectedDateAtt?.status === "present"
                        ? "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" /> Present
                  </button>
                  <button
                    onClick={handleMarkAbsent}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      selectedDateAtt?.status === "absent"
                        ? "bg-destructive text-destructive-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    <X className="w-3.5 h-3.5" /> Absent
                  </button>
                  {selectedDateAtt && (
                    <button onClick={handleClearAttendance} className="btn-ghost text-xs">Clear</button>
                  )}
                </div>
              </div>

              {/* Day's productions */}
              {selectedDateProds.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-muted-foreground mb-1">Productions</p>
                  {selectedDateProds.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm py-1 border-b border-border last:border-0">
                      <span>{itemMap[p.itemId]?.name || p.itemId} ({p.shift})</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{p.quantity}</span>
                        <button onClick={async () => { await deleteProduction(p.id); await loadData(); }} className="text-destructive hover:text-destructive/80">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add production for selected date */}
      <div className="section-card">
        <h2 className="section-title mb-4">Add production {selectedDate ? `— ${dateDisplay(selectedDate)}` : ""}</h2>
        <form onSubmit={handleAddProd} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="form-label">Item</label>
            <select value={prodItem} onChange={(e) => setProdItem(e.target.value)} className="form-select w-52">
              <option value="">Select…</option>
              {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Shift</label>
            <select value={prodShift} onChange={(e) => setProdShift(e.target.value as "day" | "night")} className="form-select">
              <option value="day">Day</option>
              <option value="night">Night</option>
            </select>
          </div>
          <div>
            <label className="form-label">Qty</label>
            <input type="number" min="1" value={prodQty} onChange={(e) => setProdQty(parseInt(e.target.value) || 1)} className="form-input w-20" />
          </div>
          <button type="submit" className="btn-primary" disabled={!selectedDate}>Add</button>
        </form>
      </div>

      {/* Add advance */}
      <div className="section-card">
        <h2 className="section-title mb-4">Add advance {selectedDate ? `— ${dateDisplay(selectedDate)}` : ""}</h2>
        <form onSubmit={handleAddAdvance} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="form-label">Amount (₹)</label>
            <input type="number" min="0" value={advAmount} onChange={(e) => setAdvAmount(Number(e.target.value))} className="form-input w-32" />
          </div>
          <button type="submit" className="btn-primary" disabled={!selectedDate}>Add advance</button>
        </form>
      </div>

      {/* Period summary */}
      <div className="section-card">
        <h2 className="section-title mb-1">Period: {period.label}</h2>
        <div className="grid grid-cols-3 gap-4 text-sm mt-3">
          <div>
            <span className="text-muted-foreground">Gross:</span>{" "}
            <span className="font-semibold text-foreground">{currency(gross)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Advance cut:</span>{" "}
            <span className="font-semibold text-foreground">{currency(advanceToCut)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Net:</span>{" "}
            <span className="font-bold text-foreground">{currency(net)}</span>
          </div>
        </div>
      </div>

      {/* Settlement */}
      <div className="section-card">
        <h2 className="section-title mb-4">Period settlement</h2>
        <div className="space-y-3 max-w-xl">
          <div>
            <label className="form-label">Advance to cut this period (₹)</label>
            <input type="number" min="0" value={cutAmount} onChange={(e) => setCutAmount(Number(e.target.value))} className="form-input w-40" />
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-border">
            <span className="font-medium">Net</span>
            <span className="font-bold text-lg">{currency(Math.max(0, gross - cutAmount))}</span>
          </div>
          <button onClick={handleSaveSettlement} className="btn-primary">Save settlement</button>
        </div>
      </div>

      {/* Production summary table */}
      <div className="section-card">
        <h2 className="section-title mb-4">Production summary — {period.label}</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-border">
                <th className="table-header">Item</th>
                <th className="table-header text-right">Day</th>
                <th className="table-header text-right">Night</th>
                <th className="table-header text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {cumulativeByItem.map((r, i) => (
                <tr key={i} className="table-row">
                  <td className="table-cell">{r.name}</td>
                  <td className="table-cell text-right">{formatNumber(r.day)}</td>
                  <td className="table-cell text-right">{formatNumber(r.night)}</td>
                  <td className="table-cell text-right font-medium">{formatNumber(r.total)}</td>
                </tr>
              ))}
              {cumulativeByItem.length === 0 && (
                <tr><td colSpan={4} className="table-cell text-center text-muted-foreground py-4">No production.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EmployeePage;
