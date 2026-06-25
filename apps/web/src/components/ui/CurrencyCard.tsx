/**
 * CurrencyCard — dashboard stat card.
 * Uses formatUGX() from @ssm/utils for compact display (e.g. UGX 5M).
 * Raw integers NEVER rendered here — only the utility function output.
 */
"use client";

import { formatUGX } from "@ssm/utils";

interface CurrencyCardProps {
  label:      string;
  amountUGX:  number;
  icon?:      string;
  trend?:     "up" | "down" | "neutral";
  trendLabel?: string;
}

export function CurrencyCard({
  label, amountUGX, icon = "💰", trend = "neutral", trendLabel,
}: CurrencyCardProps) {
  const trendColor = trend === "up" ? "#38a169" : trend === "down" ? "#e53e3e" : "#718096";
  const trendIcon  = trend === "up" ? "↑" : trend === "down" ? "↓" : "–";

  return (
    <div style={{
      background: "#fff", borderRadius: 16,
      border: "1px solid #e2e8f0", padding: "20px 24px",
      display: "flex", flexDirection: "column", gap: 8,
      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, color: "#718096", fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 22 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#1a202c", letterSpacing: "-0.5px" }}>
        {formatUGX(amountUGX)}
      </div>
      {trendLabel && (
        <div style={{ fontSize: 12, color: trendColor, fontWeight: 600 }}>
          {trendIcon} {trendLabel}
        </div>
      )}
    </div>
  );
}
