import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchEmployee, useProductions, useAdvances, useDeductions, useItems } from "@/hooks/useData";
import { today, getPeriodForDate, getPeriodsWithData } from "@/lib/dateUtils";
import { currency, formatNumber } from "@/lib/format";
import { getAll, STORES, type Employee, type Production, type Advance, type AdvanceDeduction } from "@/lib/db";
import { dateDisplay } from "@/lib/dateUtils";
import { ArrowLeft, Trash2, Printer } from "lucide-react";

const EmployeePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { items } = useItems();
  const itemMap = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items]);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [allProductions, setAllProductions] = useState<Production[]>([]);
  const [allAdvances, setAllAdvances] = useState<Advance[]>([]);
  const [allDeductions, setAllDeductions] = useState<AdvanceDeduction[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("");

  const loadData = async () => {
    if (!id) return;
    const emp = await fetchEmployee(id);
    setEmployee(emp);
    const prods = await getAll<Production>(STORES.PRODUCTIONS);
    const advs = await getAll<Advance>(STORES.ADVANCES);
    const deds = await getAll<AdvanceDeduction>(STORES.ADVANCE_DEDUCTIONS);
    setAllProductions(prods.filter((p) => p.employeeId === id));
    setAllAdvances(advs.filter((a) => a.employeeId === id));
    setAllDeductions(deds.filter((d) => d.employeeId === id));
  };

  useEffect(() => { loadData(); }, [id]);

  const periods = useMemo(() => {
    const withData = getPeriodsWithData([...allProductions, ...allAdvances]);
    const current = getPeriodForDate(today());
    if (!withData.some((p) => p.from === current.from)) withData.push(current);
    return withData;
  }, [allProductions, allAdvances]);

  useEffect(() => {
    if (periods.length > 0 && !selectedPeriod) {
      const current = getPeriodForDate(today());
      const match = periods.find((p) => p.from === current.from);
      setSelectedPeriod(match ? `${match.from}|${match.to}` : `${periods[periods.length - 1].from}|${periods[periods.length - 1].to}`);
    }
  }, [periods, selectedPeriod]);

  const [periodFrom, periodTo] = selectedPeriod.split("|");

  const periodProds = useMemo(() => allProductions.filter((p) => p.date >= periodFrom && p.date <= periodTo), [allProductions, periodFrom, periodTo]);
  const periodAdvances = useMemo(() => allAdvances.filter((a) => a.date >= periodFrom && a.date <= periodTo), [allAdvances, periodFrom, periodTo]);
  const currentDeduction = useMemo(() => allDeductions.find((d) => d.periodFrom === periodFrom && d.periodTo === periodTo), [allDeductions, periodFrom, periodTo]);

  const gross = useMemo(() => periodProds.reduce((s, p) => s + p.quantity * (itemMap[p.itemId]?.rate || 0), 0), [periodProds, itemMap]);
  const totalAdvancePaid = useMemo(() => allAdvances.reduce((s, a) => s + a.amount, 0), [allAdvances]);
  const advanceToCut = currentDeduction?.amount ?? 0;
  const net = Math.max(0, gross - advanceToCut);

  // Settlement
  const [cutAmount, setCutAmount] = useState(0);
  useEffect(() => { setCutAmount(advanceToCut); }, [advanceToCut]);

  const { saveDeduction } = useDeductions(id);
  const handleSaveSettlement = async () => {
    if (!id) return;
    await saveDeduction({ employeeId: id, periodFrom, periodTo, amount: cutAmount });
    await loadData();
  };

  // Add production
  const [prodItem, setProdItem] = useState("");
  const [prodShift, setProdShift] = useState<"day" | "night">("day");
  const [prodQty, setProdQty] = useState(1);
  const [prodDate, setProdDate] = useState(today());
  const { addProduction, deleteProduction } = useProductions();

  const handleAddProd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !prodItem) return;
    await addProduction({ employeeId: id, itemId: prodItem, date: prodDate, quantity: prodQty, shift: prodShift });
    setProdQty(1);
    await loadData();
  };

  // Add advance
  const [advAmount, setAdvAmount] = useState(0);
  const [advDate, setAdvDate] = useState(today());
  const { addAdvance, deleteAdvance } = useAdvances();

  const handleAddAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !advAmount) return;
    await addAdvance({ employeeId: id, amount: advAmount, date: advDate });
    setAdvAmount(0);
    await loadData();
  };

  // Cumulative by item
  const cumulativeByItem = useMemo(() => {
    const byItem: Record<string, { day: number; night: number; total: number }> = {};
    periodProds.forEach((p) => {
      if (!byItem[p.itemId]) byItem[p.itemId] = { day: 0, night: 0, total: 0 };
      byItem[p.itemId].total += p.quantity;
      if (p.shift === "night") byItem[p.itemId].night += p.quantity;
      else byItem[p.itemId].day += p.quantity;
    });
    return Object.entries(byItem).map(([itemId, data]) => ({
      name: itemMap[itemId]?.name || itemId,
      ...data,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [periodProds, itemMap]);

  if (!employee) return <div className="p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <button onClick={() => navigate("/")} className="btn-ghost flex items-center gap-1 mb-2 text-primary">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </button>
        <h1 className="page-title">{employee.name}</h1>
      </div>

      {/* Salary overview */}
      <div className="section-card">
        <h2 className="section-title mb-4">Salary (15-day periods)</h2>
        <div className="flex flex-wrap gap-3 items-end mb-4">
          <div>
            <label className="form-label">Period</label>
            <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="form-select min-w-[200px]">
              {periods.map((p) => <option key={p.from} value={`${p.from}|${p.to}`}>{p.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Gross:</span>{" "}
            <span className="font-semibold text-foreground">{currency(gross)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Advance to cut:</span>{" "}
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
        <h2 className="section-title mb-1">Period settlement</h2>
        <p className="text-sm text-muted-foreground mb-4">Set advance to cut this period. Net = Gross − Advance to cut.</p>
        <div className="space-y-3 max-w-xl">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Gross</span>
            <span className="font-semibold">{currency(gross)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total advance paid (all time)</span>
            <span className="font-semibold">{currency(totalAdvancePaid)}</span>
          </div>
          <div>
            <label className="form-label">Advance to cut this period (₹)</label>
            <input type="number" min="0" value={cutAmount} onChange={(e) => setCutAmount(Number(e.target.value))} className="form-input w-40" />
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-border">
            <span className="font-medium">Net this period</span>
            <span className="font-bold text-lg">{currency(Math.max(0, gross - cutAmount))}</span>
          </div>
          <button onClick={handleSaveSettlement} className="btn-primary">Save settlement</button>
        </div>
      </div>

      {/* Add production */}
      <div className="section-card">
        <h2 className="section-title mb-4">Add production</h2>
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
          <div>
            <label className="form-label">Date</label>
            <input type="date" value={prodDate} onChange={(e) => setProdDate(e.target.value)} className="form-input" />
          </div>
          <button type="submit" className="btn-primary">Add</button>
        </form>
      </div>

      {/* Add advance */}
      <div className="section-card">
        <h2 className="section-title mb-4">Add advance</h2>
        <form onSubmit={handleAddAdvance} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="form-label">Amount (₹)</label>
            <input type="number" min="0" value={advAmount} onChange={(e) => setAdvAmount(Number(e.target.value))} className="form-input w-32" />
          </div>
          <div>
            <label className="form-label">Date</label>
            <input type="date" value={advDate} onChange={(e) => setAdvDate(e.target.value)} className="form-input" />
          </div>
          <button type="submit" className="btn-primary">Add advance</button>
        </form>
      </div>

      {/* Cumulative by item */}
      <div className="section-card">
        <h2 className="section-title mb-4">Production summary</h2>
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
                <tr><td colSpan={4} className="table-cell text-center text-muted-foreground py-4">No production in this period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Production entries */}
      <div className="section-card">
        <h2 className="section-title mb-4">Production entries</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-border">
                <th className="table-header">Date</th>
                <th className="table-header">Item</th>
                <th className="table-header">Shift</th>
                <th className="table-header text-right">Qty</th>
                <th className="table-header text-right">Value</th>
                <th className="table-header w-12"></th>
              </tr>
            </thead>
            <tbody>
              {periodProds.sort((a, b) => a.date.localeCompare(b.date)).map((p) => (
                <tr key={p.id} className="table-row">
                  <td className="table-cell">{dateDisplay(p.date)}</td>
                  <td className="table-cell">{itemMap[p.itemId]?.name || p.itemId}</td>
                  <td className="table-cell capitalize">{p.shift}</td>
                  <td className="table-cell text-right">{formatNumber(p.quantity)}</td>
                  <td className="table-cell text-right">{currency(p.quantity * (itemMap[p.itemId]?.rate || 0))}</td>
                  <td className="table-cell">
                    <button onClick={async () => { await deleteProduction(p.id); await loadData(); }} className="btn-icon text-destructive" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {periodProds.length === 0 && (
                <tr><td colSpan={6} className="table-cell text-center text-muted-foreground py-4">No entries.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Advances in period */}
      <div className="section-card">
        <h2 className="section-title mb-4">Advances in period</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-border">
                <th className="table-header">Date</th>
                <th className="table-header text-right">Amount</th>
                <th className="table-header w-12"></th>
              </tr>
            </thead>
            <tbody>
              {periodAdvances.map((a) => (
                <tr key={a.id} className="table-row">
                  <td className="table-cell">{dateDisplay(a.date)}</td>
                  <td className="table-cell text-right">{currency(a.amount)}</td>
                  <td className="table-cell">
                    <button onClick={async () => { await deleteAdvance(a.id); await loadData(); }} className="btn-icon text-destructive" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {periodAdvances.length === 0 && (
                <tr><td colSpan={3} className="table-cell text-center text-muted-foreground py-4">No advances.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EmployeePage;
