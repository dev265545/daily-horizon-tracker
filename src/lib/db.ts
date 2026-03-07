// IndexedDB wrapper for ProdTrack

const DB_NAME = "prodtrack-db";
const DB_VERSION = 2;

export const STORES = {
  ITEMS: "items",
  EMPLOYEES: "employees",
  PRODUCTIONS: "productions",
  ADVANCES: "advances",
  ADVANCE_DEDUCTIONS: "advance_deductions",
} as const;

let dbInstance: IDBDatabase | null = null;

function createSchema(db: IDBDatabase) {
  if (!db.objectStoreNames.contains(STORES.ITEMS)) {
    db.createObjectStore(STORES.ITEMS, { keyPath: "id" });
  }
  if (!db.objectStoreNames.contains(STORES.EMPLOYEES)) {
    db.createObjectStore(STORES.EMPLOYEES, { keyPath: "id" });
  }
  if (!db.objectStoreNames.contains(STORES.PRODUCTIONS)) {
    const prodStore = db.createObjectStore(STORES.PRODUCTIONS, { keyPath: "id" });
    prodStore.createIndex("by_date", "date", { unique: false });
    prodStore.createIndex("by_employee", "employeeId", { unique: false });
    prodStore.createIndex("by_item", "itemId", { unique: false });
    prodStore.createIndex("employee_date", ["employeeId", "date"], { unique: false });
  }
  if (!db.objectStoreNames.contains(STORES.ADVANCES)) {
    const advStore = db.createObjectStore(STORES.ADVANCES, { keyPath: "id" });
    advStore.createIndex("by_employee", "employeeId", { unique: false });
    advStore.createIndex("by_date", "date", { unique: false });
  }
  if (!db.objectStoreNames.contains(STORES.ADVANCE_DEDUCTIONS)) {
    const dedStore = db.createObjectStore(STORES.ADVANCE_DEDUCTIONS, { keyPath: "id" });
    dedStore.createIndex("by_employee", "employeeId", { unique: false });
    dedStore.createIndex("employee_period", ["employeeId", "periodFrom"], { unique: true });
  }
}

export function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };
    request.onupgradeneeded = (e) => {
      createSchema((e.target as IDBOpenDBRequest).result);
    };
  });
}

function getStore(db: IDBDatabase, storeName: string, mode: IDBTransactionMode = "readonly") {
  return db.transaction(storeName, mode).objectStore(storeName);
}

export function getAll<T>(storeName: string): Promise<T[]> {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const store = getStore(db, storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  });
}

export function get<T>(storeName: string, id: string): Promise<T | null> {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const store = getStore(db, storeName);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  });
}

export function put<T>(storeName: string, record: T): Promise<void> {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const store = getStore(db, storeName, "readwrite");
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

export function remove(storeName: string, id: string): Promise<void> {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const store = getStore(db, storeName, "readwrite");
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

export function clearStore(storeName: string): Promise<void> {
  return openDB().then((db) => {
    return new Promise((resolve, reject) => {
      const store = getStore(db, storeName, "readwrite");
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

// Export/Import
export interface ExportData {
  version: number;
  schemaVersion: number;
  exportedAt: string;
  stores: {
    items: Item[];
    employees: Employee[];
    productions: Production[];
    advances: Advance[];
    advance_deductions: AdvanceDeduction[];
  };
}

export interface Item {
  id: string;
  name: string;
  rate: number;
}

export interface Employee {
  id: string;
  name: string;
  isActive: boolean;
}

export interface Production {
  id: string;
  employeeId: string;
  itemId: string;
  date: string;
  quantity: number;
  shift: "day" | "night";
}

export interface Advance {
  id: string;
  employeeId: string;
  amount: number;
  date: string;
}

export interface AdvanceDeduction {
  id: string;
  employeeId: string;
  periodFrom: string;
  periodTo: string;
  amount: number;
}

export async function exportDatabase(): Promise<ExportData> {
  const [items, employees, productions, advances, deductions] = await Promise.all([
    getAll<Item>(STORES.ITEMS),
    getAll<Employee>(STORES.EMPLOYEES),
    getAll<Production>(STORES.PRODUCTIONS),
    getAll<Advance>(STORES.ADVANCES),
    getAll<AdvanceDeduction>(STORES.ADVANCE_DEDUCTIONS),
  ]);
  return {
    version: 1,
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    stores: { items, employees, productions, advances, advance_deductions: deductions },
  };
}

export async function importDatabase(data: ExportData): Promise<void> {
  await Promise.all(Object.values(STORES).map((s) => clearStore(s)));
  const ops: Promise<void>[] = [];
  for (const item of data.stores.items || []) ops.push(put(STORES.ITEMS, item));
  for (const emp of data.stores.employees || []) ops.push(put(STORES.EMPLOYEES, emp));
  for (const prod of data.stores.productions || []) ops.push(put(STORES.PRODUCTIONS, prod));
  for (const adv of data.stores.advances || []) ops.push(put(STORES.ADVANCES, adv));
  for (const ded of data.stores.advance_deductions || []) ops.push(put(STORES.ADVANCE_DEDUCTIONS, ded));
  await Promise.all(ops);
}

export async function clearAllData(): Promise<void> {
  await Promise.all(Object.values(STORES).map((s) => clearStore(s)));
}

export function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
