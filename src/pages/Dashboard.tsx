import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useItems, useEmployees, useProductions, useAdvances, useDeductions } from "@/hooks/useData";
import { today, getPeriodForDate, dateDisplay } from "@/lib/dateUtils";
import { currency, formatNumber } from "@/lib/format";
import { getAll, STORES, type Production, type Item } from "@/lib/db";
import { Eye, Package, IndianRupee, Users } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState(today());
  const { items } = useItems();
  const { employees } = useEmployees(true);
  const period = useMemo(() => getPeriodForDate(date), [date]);

  // Daily aggregation
  const [dailyData, setDailyData] = useState<{ name: string; dayQty: number; nightQty: number; qty: number; value: number }[]>([]);
  const [totalQty, setTotalQty] = useState(0);
  const [totalValue, setTotalValue] = useState(0);

  useEffect(() => {
    (async () => {
      const allProds = await getAll<Production>(STORES.PRODUCTIONS);
      const dayProds = allProds.filter((p) => p.date === date);
      const itemMap = Object.fromEntries(items.map((i) => [i.id, i]));
      const totals: Record<string, number> = {};
      const day: Record<string, number> = {};
      const night: Record<string, number> = {};
      dayProds.forEach((p) => {
        totals[p.itemId] = (totals[p.itemId] || 0) + p.quantity;
        if (p.shift === "night") night[p.itemId] = (night[p.itemId] || 0) + p.quantity;
        else day[p.itemId] = (day[p.itemId] || 0) + p.quantity;
      });
      let tq = 0, tv = 0;
      const rows = Object.keys(totals).map((itemId) => {
        const item = itemMap[itemId];
        const rate = item?.rate || 0;
        const qty = totals[itemId];
        tq += qty;
        tv += qty * rate;
        return { name: item?.name || itemId, dayQty: day[itemId] || 0, nightQty: night[itemId] || 0, qty, value: qty * rate };
      });
      setDailyData(rows);
      setTotalQty(tq);
      setTotalValue(tv);
    })();
  }, [date, items]);

  // Quick add
  const [quickEmp, setQuickEmp] = useState("");
  const [quickItem, setQuickItem] = useState("");
  const [quickShift, setQuickShift] = useState<"day" | "night">("day");
  const [quickQty, setQuickQty] = useState(1);
  const [quickDate, setQuickDate] = useState(today());
  const { addProduction } = useProductions();

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickEmp || !quickItem) return;
    await addProduction({ employeeId: quickEmp, itemId: quickItem, date: quickDate, quantity: quickQty, shift: quickShift });
    setQuickQty(1);
    // Refresh daily
    setDate((d) => d); // trigger re-render
  };

  // Salary summary
  const [salaryRows, setSalaryRows] = useState<{ id: string; name: string; gross: number; advanceToCut: number; net: number }[]>([]);

  useEffect(() => {
    (async () => {
      const allProds = await getAll<Production>(STORES.PRODUCTIONS);
      const allAdvances = await getAll<import("@/lib/db").Advance>(STORES.ADVANCES);
      const allDeductions = await getAll<import("@/lib/db").AdvanceDeduction>(STORES.ADVANCE_DEDUCTIONS);
      const itemMap = Object.fromEntries(items.map((i) => [i.id, i]));

      const rows = employees.map((emp) => {
        const empProds = allProds.filter((p) => p.employeeId === emp.id && p.date >= period.from && p.date <= period.to);
        const gross = empProds.reduce((s, p) => s + p.quantity * (itemMap[p.itemId]?.rate || 0), 0);
        const ded = allDeductions.find((d) => d.employeeId === emp.id && d.periodFrom === period.from && d.periodTo === period.to);
        const advanceToCut = ded?.amount ?? 0;
        return { id: emp.id, name: emp.name, gross, advanceToCut, net: Math.max(0, gross - advanceToCut) };
      });
      setSalaryRows(rows);
    })();
  }, [employees, items, period]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="page-title">Dashboard</h1>
        <div className="flex items-center gap-3">
          <label className="form-label mb-0">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="form-input" />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Production today</span>
          </div>
          <p className="text-3xl font-bold font-heading text-foreground">{formatNumber(totalQty)}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <IndianRupee className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Value today</span>
          </div>
          <p className="text-3xl font-bold font-heading text-foreground">{currency(totalValue)}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Active employees</span>
          </div>
          <p className="text-3xl font-bold font-heading text-foreground">{employees.length}</p>
        </div>
      </div>

      {/* Daily production */}
      <div className="section-card">
        <h2 className="section-title mb-4">Daily production by item</h2>
        {dailyData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No production for this date.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="table-header">Item</th>
                  <th className="table-header text-right">Day</th>
                  <th className="table-header text-right">Night</th>
                  <th className="table-header text-right">Total</th>
                  <th className="table-header text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {dailyData.map((r, i) => (
                  <tr key={i} className="table-row">
                    <td className="table-cell">{r.name}</td>
                    <td className="table-cell text-right">{formatNumber(r.dayQty)}</td>
                    <td className="table-cell text-right">{formatNumber(r.nightQty)}</td>
                    <td className="table-cell text-right font-medium">{formatNumber(r.qty)}</td>
                    <td className="table-cell text-right">{currency(r.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick add */}
      <div className="section-card">
        <h2 className="section-title mb-4">Quick add production</h2>
        <form onSubmit={handleQuickAdd} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="form-label">Employee</label>
            <select value={quickEmp} onChange={(e) => setQuickEmp(e.target.value)} className="form-select w-44">
              <option value="">Select…</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Item</label>
            <select value={quickItem} onChange={(e) => setQuickItem(e.target.value)} className="form-select w-52">
              <option value="">Select…</option>
              {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Shift</label>
            <select value={quickShift} onChange={(e) => setQuickShift(e.target.value as "day" | "night")} className="form-select">
              <option value="day">Day</option>
              <option value="night">Night</option>
            </select>
          </div>
          <div>
            <label className="form-label">Qty</label>
            <input type="number" min="1" value={quickQty} onChange={(e) => setQuickQty(parseInt(e.target.value) || 1)} className="form-input w-20" />
          </div>
          <div>
            <label className="form-label">Date</label>
            <input type="date" value={quickDate} onChange={(e) => setQuickDate(e.target.value)} className="form-input" />
          </div>
          <button type="submit" className="btn-primary">Add</button>
        </form>
      </div>

      {/* Salary summary */}
      <div className="section-card">
        <h2 className="section-title mb-1">Salary summary</h2>
        <p className="text-sm text-muted-foreground mb-4">{period.label}</p>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-border">
                <th className="table-header">Employee</th>
                <th className="table-header text-right">Gross</th>
                <th className="table-header text-right">Advance to cut</th>
                <th className="table-header text-right">Net</th>
                <th className="table-header w-12"></th>
              </tr>
            </thead>
            <tbody>
              {salaryRows.map((r) => (
                <tr key={r.id} className="table-row cursor-pointer" onClick={() => navigate(`/employee/${r.id}`)}>
                  <td className="table-cell">{r.name}</td>
                  <td className="table-cell text-right">{currency(r.gross)}</td>
                  <td className="table-cell text-right">{currency(r.advanceToCut)}</td>
                  <td className="table-cell text-right font-semibold">{currency(r.net)}</td>
                  <td className="table-cell">
                    <button className="btn-icon" title="View">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {salaryRows.length === 0 && (
                <tr><td colSpan={5} className="table-cell text-muted-foreground text-center py-6">No employees yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
