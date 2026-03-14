import { useState, useEffect, useCallback } from "react";
import {
  getAll, get, put, remove, STORES, uid,
  type Item, type Employee, type Production, type Advance, type AdvanceDeduction,
  type Attendance, type DayOff, type ShiftType,
} from "@/lib/db";

// Items
export function useItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    const data = await getAll<Item>(STORES.ITEMS);
    setItems(data);
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const addItem = async (name: string, rate: number) => {
    const item: Item = { id: uid("item"), name, rate };
    await put(STORES.ITEMS, item);
    await refresh();
    return item;
  };
  const deleteItem = async (id: string) => {
    await remove(STORES.ITEMS, id);
    await refresh();
  };
  return { items, loading, refresh, addItem, deleteItem };
}

// Employees
export function useEmployees(activeOnly = false) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    const data = await getAll<Employee>(STORES.EMPLOYEES);
    setEmployees(activeOnly ? data.filter((e) => e.isActive !== false) : data);
    setLoading(false);
  }, [activeOnly]);
  useEffect(() => { refresh(); }, [refresh]);
  const addEmployee = async (name: string) => {
    const emp: Employee = { id: uid("emp"), name, isActive: true };
    await put(STORES.EMPLOYEES, emp);
    await refresh();
    return emp;
  };
  const updateEmployee = async (emp: Employee) => {
    await put(STORES.EMPLOYEES, emp);
    await refresh();
  };
  const deleteEmployee = async (id: string) => {
    await remove(STORES.EMPLOYEES, id);
    await refresh();
  };
  return { employees, loading, refresh, addEmployee, updateEmployee, deleteEmployee };
}

// Productions
export function useProductions(fromDate?: string, toDate?: string) {
  const [productions, setProductions] = useState<Production[]>([]);
  const refresh = useCallback(async () => {
    const all = await getAll<Production>(STORES.PRODUCTIONS);
    if (fromDate && toDate) {
      setProductions(all.filter((p) => p.date >= fromDate && p.date <= toDate));
    } else {
      setProductions(all);
    }
  }, [fromDate, toDate]);
  useEffect(() => { refresh(); }, [refresh]);
  const addProduction = async (data: Omit<Production, "id">) => {
    const prod: Production = { ...data, id: uid("prod") };
    await put(STORES.PRODUCTIONS, prod);
    await refresh();
    return prod;
  };
  const deleteProduction = async (id: string) => {
    await remove(STORES.PRODUCTIONS, id);
    await refresh();
  };
  return { productions, refresh, addProduction, deleteProduction };
}

// Advances
export function useAdvances(employeeId?: string, fromDate?: string, toDate?: string) {
  const [advances, setAdvances] = useState<Advance[]>([]);
  const refresh = useCallback(async () => {
    const all = await getAll<Advance>(STORES.ADVANCES);
    let filtered = all;
    if (employeeId) filtered = filtered.filter((a) => a.employeeId === employeeId);
    if (fromDate && toDate) filtered = filtered.filter((a) => a.date >= fromDate && a.date <= toDate);
    setAdvances(filtered);
  }, [employeeId, fromDate, toDate]);
  useEffect(() => { refresh(); }, [refresh]);
  const addAdvance = async (data: Omit<Advance, "id">) => {
    const adv: Advance = { ...data, id: uid("adv") };
    await put(STORES.ADVANCES, adv);
    await refresh();
    return adv;
  };
  const deleteAdvance = async (id: string) => {
    await remove(STORES.ADVANCES, id);
    await refresh();
  };
  return { advances, refresh, addAdvance, deleteAdvance };
}

// Deductions
export function useDeductions(employeeId?: string) {
  const [deductions, setDeductions] = useState<AdvanceDeduction[]>([]);
  const refresh = useCallback(async () => {
    const all = await getAll<AdvanceDeduction>(STORES.ADVANCE_DEDUCTIONS);
    setDeductions(employeeId ? all.filter((d) => d.employeeId === employeeId) : all);
  }, [employeeId]);
  useEffect(() => { refresh(); }, [refresh]);
  const saveDeduction = async (data: Omit<AdvanceDeduction, "id">) => {
    const id = `ded_${data.employeeId}_${data.periodFrom}`;
    const record: AdvanceDeduction = { ...data, id };
    await put(STORES.ADVANCE_DEDUCTIONS, record);
    await refresh();
    return record;
  };
  return { deductions, refresh, saveDeduction };
}

// Attendance
export function useAttendance(employeeId?: string) {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const refresh = useCallback(async () => {
    const all = await getAll<Attendance>(STORES.ATTENDANCE);
    setAttendance(employeeId ? all.filter((a) => a.employeeId === employeeId) : all);
  }, [employeeId]);
  useEffect(() => { refresh(); }, [refresh]);
  const setAttendanceStatus = async (empId: string, date: string, status: "present" | "absent") => {
    const id = `att_${empId}_${date}`;
    const record: Attendance = { id, employeeId: empId, date, status };
    await put(STORES.ATTENDANCE, record);
    await refresh();
  };
  const removeAttendance = async (empId: string, date: string) => {
    const id = `att_${empId}_${date}`;
    await remove(STORES.ATTENDANCE, id);
    await refresh();
  };
  return { attendance, refresh, setAttendanceStatus, removeAttendance };
}

// Day Offs
export function useDayOffs() {
  const [dayOffs, setDayOffs] = useState<DayOff[]>([]);
  const refresh = useCallback(async () => {
    const all = await getAll<DayOff>(STORES.DAY_OFFS);
    setDayOffs(all);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const addDayOff = async (date: string, reason?: string) => {
    const id = `off_${date}`;
    const record: DayOff = { id, date, reason };
    await put(STORES.DAY_OFFS, record);
    await refresh();
  };
  const removeDayOff = async (date: string) => {
    const id = `off_${date}`;
    await remove(STORES.DAY_OFFS, id);
    await refresh();
  };
  return { dayOffs, refresh, addDayOff, removeDayOff };
}

// Single employee fetch
export async function fetchEmployee(id: string): Promise<Employee | null> {
  return get<Employee>(STORES.EMPLOYEES, id);
}
