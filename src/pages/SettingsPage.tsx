import { useState, useRef } from "react";
import { useItems, useEmployees } from "@/hooks/useData";
import { exportDatabase, importDatabase, clearAllData, type ExportData } from "@/lib/db";
import { verifyMasterPassword, setAppPassword } from "@/lib/auth";
import { Trash2, Download, Upload, Shield, AlertTriangle } from "lucide-react";

const SettingsPage = () => {
  const { items, addItem, deleteItem } = useItems();
  const { employees, addEmployee, deleteEmployee } = useEmployees(false);

  const [itemName, setItemName] = useState("");
  const [itemRate, setItemRate] = useState(0);
  const [empName, setEmpName] = useState("");
  const [msg, setMsg] = useState("");
  const [msgError, setMsgError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const showMsg = (text: string, isError = false) => { setMsg(text); setMsgError(isError); };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) return;
    await addItem(itemName.trim(), itemRate);
    setItemName(""); setItemRate(0);
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim()) return;
    await addEmployee(empName.trim());
    setEmpName("");
  };

  const handleExport = async () => {
    const data = await exportDatabase();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `prodtrack-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showMsg("Export downloaded.");
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    try {
      const raw = await file.text();
      const data: ExportData = JSON.parse(raw);
      if (!data.stores) { showMsg("Invalid file format.", true); return; }
      if (!confirm("Import will replace all current data. Continue?")) return;
      await importDatabase(data);
      showMsg("Import complete. Refresh to see data.");
      window.location.reload();
    } catch (err: any) {
      showMsg("Import failed: " + (err?.message || err), true);
    }
  };

  const handleChangePassword = async () => {
    const master = prompt("Enter master password to change login password");
    if (!master) return;
    if (!verifyMasterPassword(master)) { showMsg("Incorrect master password.", true); return; }
    const newPw = prompt("Enter new password");
    if (!newPw) return;
    const confirm2 = prompt("Confirm new password");
    if (newPw !== confirm2) { showMsg("Passwords don't match.", true); return; }
    await setAppPassword(newPw.trim());
    showMsg("Password updated.");
  };

  const handleDeleteAll = async () => {
    if (!confirm("Delete ALL data? This cannot be undone.")) return;
    const master = prompt("Enter master password");
    if (!master || !verifyMasterPassword(master)) { showMsg("Incorrect master password.", true); return; }
    const confirmText = prompt('Type DELETE to confirm');
    if (confirmText !== "DELETE") { showMsg("Cancelled.", true); return; }
    await clearAllData();
    showMsg("All data deleted. Refresh the page.");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="page-title">Settings & Data</h1>

      {msg && (
        <div className={`p-3 rounded-xl text-sm ${msgError ? "bg-destructive/10 text-destructive" : "bg-accent text-accent-foreground"}`}>
          {msg}
        </div>
      )}

      {/* Items */}
      <div className="section-card">
        <h2 className="section-title mb-4">Items (products)</h2>
        <form onSubmit={handleAddItem} className="flex flex-wrap gap-3 items-end mb-4">
          <div>
            <label className="form-label">Name</label>
            <input value={itemName} onChange={(e) => setItemName(e.target.value)} className="form-input w-52" placeholder="Item name" />
          </div>
          <div>
            <label className="form-label">Rate (₹)</label>
            <input type="number" min="0" value={itemRate} onChange={(e) => setItemRate(Number(e.target.value))} className="form-input w-24" />
          </div>
          <button type="submit" className="btn-primary">Add item</button>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-border">
                <th className="table-header">Name</th>
                <th className="table-header text-right">Rate</th>
                <th className="table-header w-12"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="table-row">
                  <td className="table-cell">{i.name}</td>
                  <td className="table-cell text-right">₹{i.rate}</td>
                  <td className="table-cell">
                    <button onClick={() => { if (confirm("Delete this item?")) deleteItem(i.id); }} className="btn-icon text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employees */}
      <div className="section-card">
        <h2 className="section-title mb-4">Employees</h2>
        <form onSubmit={handleAddEmployee} className="flex flex-wrap gap-3 items-end mb-4">
          <div>
            <label className="form-label">Name</label>
            <input value={empName} onChange={(e) => setEmpName(e.target.value)} className="form-input w-52" placeholder="Employee name" />
          </div>
          <button type="submit" className="btn-primary">Add employee</button>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-border">
                <th className="table-header">Name</th>
                <th className="table-header">Status</th>
                <th className="table-header w-12"></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id} className="table-row">
                  <td className="table-cell">{e.name}</td>
                  <td className="table-cell">{e.isActive !== false ? <span className="badge-success">Active</span> : <span className="badge-warning">Inactive</span>}</td>
                  <td className="table-cell">
                    <button onClick={() => { if (confirm("Delete this employee?")) deleteEmployee(e.id); }} className="btn-icon text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export/Import */}
      <div className="section-card">
        <h2 className="section-title mb-4">Export / Import</h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" /> Export database
          </button>
          <button onClick={() => fileRef.current?.click()} className="btn-secondary flex items-center gap-2">
            <Upload className="w-4 h-4" /> Import database
          </button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        </div>
      </div>

      {/* Security */}
      <div className="section-card">
        <h2 className="section-title mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" /> Security
        </h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleChangePassword} className="btn-secondary">Change password</button>
          <button onClick={handleDeleteAll} className="btn-destructive flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Delete all data
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
