/**
 * SyncProvider + useSyncManager
 * React wrapper around the pure SyncManager class.
 * Exposes online/offline state and pending mutation count to all consumers.
 */
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { SyncManager, type SyncStatus } from "@ssm/sync";
import type { PendingMutation } from "@ssm/db";

// ─── Context Shape ────────────────────────────────────────────────────────────
interface SyncContextValue {
  /** Current sync status */
  status: SyncStatus;
  /** Whether the browser has network access */
  isOnline: boolean;
  /** How many mutations are waiting to be pushed */
  pendingCount: number;
  /** Queue a mutation — works offline too */
  mutate: (
    entity: string,
    operation: "create" | "update" | "delete",
    payload: Record<string, unknown>
  ) => Promise<string>;
  /** Manually trigger a flush (e.g. on reconnect) */
  flush: () => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
interface SyncProviderProps {
  children: ReactNode;
  apiBaseUrl?: string;
  /** Override for tests — inject a mock SyncManager */
  _mockManager?: SyncManager;
}

export function SyncProvider({
  children,
  apiBaseUrl = "/api",
  _mockManager,
}: SyncProviderProps) {
  const [isOnline,     setIsOnline]     = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [status,       setStatus]       = useState<SyncStatus>("idle");
  const [pendingCount, setPendingCount] = useState(0);

  const managerRef = useRef<SyncManager>(
    _mockManager ?? new SyncManager({
      apiBaseUrl,
      onMutationSuccess: () => void refreshCount(),
      onMutationError:   (m: PendingMutation) =>
        console.error("[SSM] Mutation failed permanently:", m),
    })
  );

  const refreshCount = useCallback(async () => {
    const count = await managerRef.current.getPendingCount();
    setPendingCount(count);
  }, []);

  // Track online/offline
  useEffect(() => {
    const goOnline  = () => { setIsOnline(true);  setStatus("idle");    void flush(); };
    const goOffline = () => { setIsOnline(false); setStatus("offline"); };

    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online",  goOnline);
      window.removeEventListener("offline", goOffline);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh count on mount
  useEffect(() => { void refreshCount(); }, [refreshCount]);

  const mutate = useCallback(async (
    entity: string,
    operation: "create" | "update" | "delete",
    payload: Record<string, unknown>
  ): Promise<string> => {
    const id = await managerRef.current.mutate(entity, operation, payload);
    await refreshCount();
    return id;
  }, [refreshCount]);

  const flush = useCallback(async () => {
    setStatus("syncing");
    try {
      await managerRef.current.flush();
      setStatus("idle");
    } catch {
      setStatus("error");
    } finally {
      await refreshCount();
    }
  }, [refreshCount]);

  return (
    <SyncContext.Provider value={{ status, isOnline, pendingCount, mutate, flush }}>
      {children}
    </SyncContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useSyncManager(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    throw new Error("useSyncManager must be used within <SyncProvider>");
  }
  return ctx;
}

// ─── Mock factory for tests (Vitest) ─────────────────────────────────────────
export function createMockSyncManager(
  overrides: Partial<SyncContextValue> = {}
): SyncContextValue {
  return {
    status:       "idle",
    isOnline:     true,
    pendingCount: 0,
    mutate:       async () => crypto.randomUUID(),
    flush:        async () => {},
    ...overrides,
  };
}
