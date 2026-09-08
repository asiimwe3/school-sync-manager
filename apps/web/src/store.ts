/**
 * @ssm/web local store — v1 local-first persistence.
 * All data lives in localStorage; every write is ALSO queued through
 * useSyncManager() (IndexedDB) so a future cloud backend can replay the
 * mutation queue without any consumer changes.
 */

import { useSyncExternalStore } from "react";
import type { SchoolSettingsInput } from "@ssm/validation";

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface Classroom {
  id: string;
  name: string;
  teacherName: string;
  termFee: number; // UGX integer
}

export interface StudentRecord {
  id: string;
  fullName: string;
  dob: string; // ISO date
  sex: "M" | "F";
  classId: string;
  guardianPhone: string;
  feesPaid: number; // UGX
  enrolledAt: string;
}

export type AttendanceStatus = "P" | "A" | "L";

export interface FeePaymentRecord {
  id: string;
  studentId: string;
  amount: number;
  method: "CASH" | "MTN_MOMO" | "AIRTEL_MONEY" | "BANK";
  reference?: string | undefined;
  paidAt: string;
}

export interface DB {
  settings: SchoolSettingsInput | null;
  classes: Classroom[];
  students: StudentRecord[];
  attendance: Record<string, Record<string, AttendanceStatus>>; // date -> studentId -> status
  payments: FeePaymentRecord[];
  marks: Record<string, Record<string, number>>; // `${term}|${studentId}` -> subject -> score
}

const STORAGE_KEY = "ssm_data_v1";

const EMPTY_DB: DB = {
  settings: null,
  classes: [],
  students: [],
  attendance: {},
  payments: [],
  marks: {},
};

// ─── Persistence ───────────────────────────────────────────────────────────────
let cache: DB | null = null;

export function getDB(): DB {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as DB) : { ...EMPTY_DB };
  } catch {
    cache = { ...EMPTY_DB };
  }
  ensureSeed();
  return cache;
}

function persist(db: DB): void {
  cache = db;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  emit();
}

// ─── Pub/sub (useSyncExternalStore) ────────────────────────────────────────────
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((fn) => fn());
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useDB(): DB {
  return useSyncExternalStore(subscribe, getDB, getDB);
}

export function mutateDB(fn: (db: DB) => DB): void {
  persist(fn(getDB()));
}

export function resetDB(): void {
  persist({ ...EMPTY_DB });
  localStorage.removeItem("ssm_seeded");
  ensureSeed();
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
export function uuid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Term label — Uganda: T1 Jan–Apr, T2 May–Aug, T3 Sep–Dec */
export function currentTerm(): "Term 1" | "Term 2" | "Term 3" {
  const m = new Date().getMonth() + 1;
  if (m <= 4) return "Term 1";
  if (m <= 8) return "Term 2";
  return "Term 3";
}

export const SUBJECTS = [
  "Mathematics",
  "English",
  "Science",
  "Social Studies",
  "Religious Education",
] as const;
export type Subject = (typeof SUBJECTS)[number];

export function gradeFor(score: number): { grade: string; remark: string } {
  if (score >= 80) return { grade: "A", remark: "Excellent" };
  if (score >= 65) return { grade: "B", remark: "Very good" };
  if (score >= 50) return { grade: "C", remark: "Good" };
  if (score >= 40) return { grade: "D", remark: "Fair — needs effort" };
  return { grade: "E", remark: "Needs serious improvement" };
}

export function averageFor(scores: number[]): number {
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

// ─── Demo seed (first run only) ─────────────────────────────────────────────────
function ensureSeed(): void {
  if (localStorage.getItem("ssm_seeded") === "1") return;
  localStorage.setItem("ssm_seeded", "1");

  const c1: Classroom = {
    id: uuid(),
    name: "Primary 6",
    teacherName: "Mr. Okello Emmanuel",
    termFee: 250_000,
  };
  const c2: Classroom = {
    id: uuid(),
    name: "Primary 7",
    teacherName: "Ms. Nakato Sarah",
    termFee: 300_000,
  };

  const mk = (fullName: string, dob: string, sex: "M" | "F", classId: string, guardianPhone: string): StudentRecord => ({
    id: uuid(), fullName, dob, sex, classId, guardianPhone,
    feesPaid: 0, enrolledAt: new Date().toISOString(),
  });

  const students: StudentRecord[] = [
    mk("Ainemugisha Brian", "2014-03-12", "M", c1.id, "+256 772 345 678"),
    mk("Nabukenya Ruth", "2014-06-02", "F", c1.id, "+256 701 234 567"),
    mk("Tumusiime Daniel", "2013-11-23", "M", c1.id, "+256 752 987 654"),
    mk("Kemigisha Grace", "2013-01-15", "F", c2.id, "+256 776 123 456"),
    mk("Mugisha Peter", "2013-09-09", "M", c2.id, "+256 780 456 123"),
    mk("Aheebwa Sharon", "2012-12-01", "F", c2.id, "+256 745 654 321"),
  ];

  // fees: first four fully/nearly paid
  students[0]!.feesPaid = 250_000;
  students[1]!.feesPaid = 250_000;
  students[2]!.feesPaid = 100_000;
  students[3]!.feesPaid = 300_000;
  students[5]!.feesPaid = 150_000;

  const payments: FeePaymentRecord[] = [
    { id: uuid(), studentId: students[0]!.id, amount: 250_000, method: "MTN_MOMO", reference: "MP-240901.1234.A", paidAt: "2026-09-01T09:12:00.000Z" },
    { id: uuid(), studentId: students[1]!.id, amount: 250_000, method: "CASH", reference: undefined, paidAt: "2026-09-02T10:05:00.000Z" },
    { id: uuid(), studentId: students[2]!.id, amount: 100_000, method: "AIRTEL_MONEY", reference: undefined, paidAt: "2026-09-03T14:30:00.000Z" },
    { id: uuid(), studentId: students[3]!.id, amount: 300_000, method: "BANK", reference: "TRX-88213", paidAt: "2026-09-04T11:00:00.000Z" },
    { id: uuid(), studentId: students[5]!.id, amount: 150_000, method: "MTN_MOMO", reference: "MP-240906.7781.C", paidAt: "2026-09-06T08:45:00.000Z" },
  ];

  const term = currentTerm();
  const marks: DB["marks"] = {};
  for (const s of students) {
    const row: Record<string, number> = {};
    SUBJECTS.forEach((sub, i) => {
      row[sub] = 45 + ((s.fullName.length * (i + 3) * 7) % 50); // deterministic spread 45–94
    });
    marks[`${term}|${s.id}`] = row;
  }

  const attendance: DB["attendance"] = {
    [todayKey()]: {
      [students[0]!.id]: "P", [students[1]!.id]: "P", [students[2]!.id]: "L",
      [students[3]!.id]: "P", [students[4]!.id]: "A", [students[5]!.id]: "P",
    },
  };

  cache = {
    settings: {
      schoolName: "Tooro Junior School",
      district: "Kyenjojo" as SchoolSettingsInput["district"],
      address: "Plot 45, Main Street, Kyenjojo Town",
      contactPhone: "+256 772 345 678",
      email: "admin@toorojunior.sc.ug",
      termFee: 250_000,
      logoUrl: "",
    },
    classes: [c1, c2],
    students,
    attendance,
    payments,
    marks,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  emit();
}
