/**
 * @ssm/db
 * IndexedDB wrapper for offline mutation queue.
 * Uses the native IDB API — no heavy library required.
 * Swap this implementation for SQLite (Expo SQLite / WASM) without
 * touching any consumer code — only this file changes.
 */

export interface PendingMutation {
  id:        string;          // crypto.randomUUID()
  entity:    string;          // e.g. "student", "fee_payment"
  operation: "create" | "update" | "delete";
  payload:   Record<string, unknown>;
  createdAt: number;          // Date.now()
  retries:   number;
  status:    "pending" | "syncing" | "failed";
}

const DB_NAME    = "ssm_offline_queue";
const DB_VERSION = 1;
const STORE      = "mutations";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror   = ()  => reject(req.error);
  });
}

export async function enqueueMutation(
  mutation: Omit<PendingMutation, "id" | "retries" | "status" | "createdAt">
): Promise<string> {
  const db = await openDB();
  const entry: PendingMutation = {
    ...mutation,
    id:        crypto.randomUUID(),
    retries:   0,
    status:    "pending",
    createdAt: Date.now(),
  };
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const req   = store.add(entry);
    req.onsuccess = () => resolve(entry.id);
    req.onerror   = () => reject(req.error);
  });
}

export async function getPendingMutations(): Promise<PendingMutation[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const idx   = store.index("status");
    const req   = idx.getAll("pending");
    req.onsuccess = () => resolve(req.result as PendingMutation[]);
    req.onerror   = () => reject(req.error);
  });
}

export async function updateMutationStatus(
  id: string,
  status: PendingMutation["status"],
  incrementRetry = false
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const record = getReq.result as PendingMutation | undefined;
      if (!record) { resolve(); return; }
      record.status = status;
      if (incrementRetry) record.retries += 1;
      const putReq = store.put(record);
      putReq.onsuccess = () => resolve();
      putReq.onerror   = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function deleteMutation(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, "readwrite");
    const req = tx.objectStore(STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

export async function countPending(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, "readonly");
    const idx   = tx.objectStore(STORE).index("status");
    const req   = idx.count("pending");
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}
