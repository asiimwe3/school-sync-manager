/**
 * SyncStatusBar — shows online/offline state + pending mutation count.
 * Drop this into any layout to give users confidence in data safety.
 */
"use client";

import { useSyncManager } from "@ssm/lib/../../../apps/web/src/providers/SyncProvider";

const STATUS_CONFIG = {
  idle:    { color: "#38a169", icon: "✓", label: "Synced" },
  syncing: { color: "#d69e2e", icon: "↻", label: "Syncing…" },
  error:   { color: "#e53e3e", icon: "⚠", label: "Sync error" },
  offline: { color: "#718096", icon: "⊘", label: "Offline" },
} as const;

export function SyncStatusBar() {
  const { status, isOnline, pendingCount, flush } = useSyncManager();
  const cfg = STATUS_CONFIG[status];

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "6px 14px", borderRadius: 50,
        background: isOnline ? "#f0fff4" : "#f7fafc",
        border: `1px solid ${cfg.color}22`,
        fontSize: 13, fontWeight: 600,
      }}
    >
      <span style={{ color: cfg.color, fontSize: 16 }}>{cfg.icon}</span>
      <span style={{ color: cfg.color }}>{cfg.label}</span>
      {pendingCount > 0 && (
        <span
          style={{
            background: "#d69e2e", color: "#fff",
            borderRadius: 50, padding: "1px 7px", fontSize: 11,
          }}
        >
          {pendingCount} pending
        </span>
      )}
      {status === "error" && (
        <button
          onClick={() => void flush()}
          style={{
            background: "#e53e3e", color: "#fff", border: "none",
            borderRadius: 50, padding: "2px 10px", fontSize: 11,
            cursor: "pointer",
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
