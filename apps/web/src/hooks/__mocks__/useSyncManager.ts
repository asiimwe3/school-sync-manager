/**
 * Mock for useSyncManager — use in Vitest tests.
 * Import path: vi.mock("../../providers/SyncProvider")
 *
 * Usage in test:
 *   import { createMockSyncManager } from "@ssm/lib/../providers/SyncProvider";
 *   vi.mock("../../providers/SyncProvider", () => ({
 *     useSyncManager: () => createMockSyncManager({ pendingCount: 3 }),
 *   }));
 */
export const useSyncManager = () => ({
  status:       "idle" as const,
  isOnline:     true,
  pendingCount: 0,
  mutate:       async () => crypto.randomUUID(),
  flush:        async () => {},
});
