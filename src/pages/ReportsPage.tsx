import { useState, useMemo, useEffect } from "react";
import { useItems } from "@/hooks/useData";
import { getAll, STORES, type Production } from "@/lib/db";
import { getPeriodForDate, getPeriodsWithData } from "@/lib/dateUtils";
import { formatNumber } from "@/lib/format";

const ReportsPage = () => {
  const { items } = useItems();
  const itemMap = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items]);
  const [allProds, setAllProds] = useState<Production[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState("");

  useEffect(() => {
    getAll<Production>(STORES.PRODUCTIONS).then(setAllProds);
  }, []);

  const periods = useMemo(() => getPeriodsWithData(allProds), [allProds]);
  useEffect(() => {
    if (periods.length > 0 && !selectedPeriod) {
      const current = getPeriodForDate(new Date().toISOString().slice(0, 10));
      const match = periods.find((p) => p.from === current.from);
      setSelectedPeriod(match ? `${match.from}|${match.to}` : `${periods[periods.length - 1].from}|${periods[periods.length - 1].to}`);
    }
  }, [periods, selectedPeriod]);

  const [periodFrom, periodTo] = (selectedPeriod || "|").split("|");

  const periodProds = useMemo(() => allProds.filter((p) => p.date >= periodFrom && p.date <= periodTo), [allProds, periodFrom, periodTo]);

  const { cumulativeRows, datesDay, datesNight, byDateItemDay, byDateItemNight } = useMemo(() => {
    const byItem: Record<string, number> = {};
    const byItemDay: Record<string, number> = {};
    const byItemNight: Record<string, number> = {};
    const byDateItemDay: Record<string, number> = {};
    const byDateItemNight: Record<string, number> = {};
    periodProds.forEach((p) => {
      byItem[p.itemId] = (byItem[p.itemId] || 0) + p.quantity;
      const key = `${p.date}|${p.itemId}`;
      if (p.shift === "night") {
        byItemNight[p.itemId] = (byItemNight[p.itemId] || 0) + p.quantity;
        byDateItemNight[key] = (byDateItemNight[key] || 0) + p.quantity;
      } else {
        byItemDay[p.itemId] = (byItemDay[p.itemId] || 0) + p.quantity;
        byDateItemDay[key] = (byDateItemDay[key] || 0) + p.quantity;
      }
    });
    const itemIds = [...new Set(Object.keys(byItem))];
    const cumulativeRows = itemIds.map((itemId) => ({
      itemId, itemName: itemMap[itemId]?.name || itemId,
      dayQty: byItemDay[itemId] || 0, nightQty: byItemNight[itemId] || 0, qty: byItem[itemId],
    })).sort((a, b) => a.itemName.localeCompare(b.itemName));
    const datesDay = [...new Set(periodProds.filter((p) => p.shift !== "night").map((p) => p.date))].sort();
    const datesNight = [...new Set(periodProds.filter((p) => p.shift === "night").map((p) => p.date))].sort();
    return { cumulativeRows, datesDay, datesNight, byDateItemDay, byDateItemNight };
  }, [periodProds, itemMap]);

  if (periods.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="page-title">Production Report</h1>
        <p className="text-muted-foreground">No production data yet. Add from the Dashboard.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="page-title">Production Report</h1>
        <div>
          <label className="form-label">Period</label>
          <select value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} className="form-select min-w-[200px]">
            {periods.map((p) => <option key={p.from} value={`${p.from}|${p.to}`}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {/* Cumulative */}
      <div className="section-card">
        <h2 className="section-title mb-4">Cumulative by item</h2>
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
              {cumulativeRows.map((r, i) => (
                <tr key={i} className="table-row">
                  <td className="table-cell">{r.itemName}</td>
                  <td className="table-cell text-right">{formatNumber(r.dayQty)}</td>
                  <td className="table-cell text-right">{formatNumber(r.nightQty)}</td>
                  <td className="table-cell text-right font-medium">{formatNumber(r.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Day matrix */}
      <div className="section-card">
        <h2 className="section-title mb-4">By date – Day shift</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-border">
                <th className="table-header sticky left-0 bg-card z-10 border-r border-border">Date</th>
                {cumulativeRows.map((i) => <th key={i.itemId} className="table-header text-right whitespace-nowrap">{i.itemName}</th>)}
              </tr>
            </thead>
            <tbody>
              {datesDay.length === 0 ? (
                <tr><td colSpan={cumulativeRows.length + 1} className="table-cell text-center text-muted-foreground py-4">No day-shift production.</td></tr>
              ) : datesDay.map((date) => (
                <tr key={date} className="table-row">
                  <td className="table-cell sticky left-0 bg-card z-10 border-r border-border font-medium">{date}</td>
                  {cumulativeRows.map((i) => {
                    const qty = byDateItemDay[`${date}|${i.itemId}`];
                    return <td key={i.itemId} className="table-cell text-right">{qty ? formatNumber(qty) : "—"}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Night matrix */}
      <div className="section-card">
        <h2 className="section-title mb-4">By date – Night shift</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-border">
                <th className="table-header sticky left-0 bg-card z-10 border-r border-border">Date</th>
                {cumulativeRows.map((i) => <th key={i.itemId} className="table-header text-right whitespace-nowrap">{i.itemName}</th>)}
              </tr>
            </thead>
            <tbody>
              {datesNight.length === 0 ? (
                <tr><td colSpan={cumulativeRows.length + 1} className="table-cell text-center text-muted-foreground py-4">No night-shift production.</td></tr>
              ) : datesNight.map((date) => (
                <tr key={date} className="table-row">
                  <td className="table-cell sticky left-0 bg-card z-10 border-r border-border font-medium">{date}</td>
                  {cumulativeRows.map((i) => {
                    const qty = byDateItemNight[`${date}|${i.itemId}`];
                    return <td key={i.itemId} className="table-cell text-right">{qty ? formatNumber(qty) : "—"}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
