/**
 * @ssm/sync
 * SyncManager — pure business logic layer.
 * No React here. The useSyncManager hook wraps this in a React context.
 *
 * Architecture:
 *   UI action → useSyncManager.mutate() → enqueue to IDB → attempt cloud push
 *                                           ↳ if offline: stays queued
 *                                           ↳ if online:  flush immediately
 */

import {
  enqueueMutation,
  getPendingMutations,
  updateMutationStatus,
  deleteMutation,
  countPending,
  type PendingMutation,
} from "@ssm/db";

export type SyncStatus = "idle" | "syncing" | "error" | "offline";

export interface SyncManagerOptions {
  /** Called after each successful cloud push — use to invalidate React Query cache */
  onMutationSuccess?: (mutation: PendingMutation) => void;
  /** Called when a mutation permanently fails (retries > maxRetries) */
  onMutationError?:   (mutation: PendingMutation, error: unknown) => void;
  /** How many times to retry before marking as failed */
  maxRetries?: number;
  /** Cloud API base URL */
  apiBaseUrl?: string;
}

const DEFAULT_MAX_RETRIES = 3;

export class SyncManager {
  private options: Required<SyncManagerOptions>;
  private isFlushing = false;

  constructor(options: SyncManagerOptions = {}) {
    this.options = {
      onMutationSuccess: options.onMutationSuccess ?? (() => {}),
      onMutationError:   options.onMutationError   ?? (() => {}),
      maxRetries:        options.maxRetries         ?? DEFAULT_MAX_RETRIES,
      apiBaseUrl:        options.apiBaseUrl         ?? "/api",
    };
  }

  /** Queue a mutation. Call this from any UI action instead of fetch() directly. */
  async mutate(
    entity: PendingMutation["entity"],
    operation: PendingMutation["operation"],
    payload: Record<string, unknown>
  ): Promise<string> {
    const id = await enqueueMutation({ entity, operation, payload });
    // Try to flush immediately if we're online
    if (navigator.onLine) void this.flush();
    return id;
  }

  /** Push all pending mutations to the cloud in FIFO order. */
  async flush(): Promise<void> {
    if (this.isFlushing) return;
    this.isFlushing = true;

    try {
      const pending = await getPendingMutations();

      for (const mutation of pending) {
        await updateMutationStatus(mutation.id, "syncing");
        try {
          await this.pushToCloud(mutation);
          await deleteMutation(mutation.id);
          this.options.onMutationSuccess(mutation);
        } catch (err) {
          const retried = mutation.retries + 1;
          if (retried >= this.options.maxRetries) {
            await updateMutationStatus(mutation.id, "failed", true);
            this.options.onMutationError(mutation, err);
          } else {
            await updateMutationStatus(mutation.id, "pending", true);
          }
        }
      }
    } finally {
      this.isFlushing = false;
    }
  }

  async getPendingCount(): Promise<number> {
    return countPending();
  }

  private async pushToCloud(mutation: PendingMutation): Promise<void> {
    const { apiBaseUrl } = this.options;
    const url = `${apiBaseUrl}/${mutation.entity}${
      mutation.operation === "update" || mutation.operation === "delete"
        ? `/${mutation.payload["id"] as string}`
        : ""
    }`;

    const method: Record<PendingMutation["operation"], string> = {
      create: "POST",
      update: "PATCH",
      delete: "DELETE",
    };

    const res = await fetch(url, {
      method: method[mutation.operation],
      headers: { "Content-Type": "application/json" },
      body: mutation.operation !== "delete"
        ? JSON.stringify(mutation.payload)
        : undefined,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }
  }
}
