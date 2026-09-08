/**
 * Dashboard — overview stats + recent payments.
 */
import { CurrencyCard } from "../components/ui/CurrencyCard";
import { useDB, todayKey, currentTerm } from "../store";
import { formatDate } from "@ssm/utils";

export function Dashboard(): React.JSX.Element {
  const db = useDB();

  const collected = db.payments.reduce((sum, p) => sum + p.amount, 0);
  const owed = db.students.reduce((sum, s) => {
    const cls = db.classes.find((c) => c.id === s.classId);
    return sum + Math.max(0, (cls?.termFee ?? 0) - s.feesPaid);
  }, 0);

  const today = db.attendance[todayKey()] ?? {};
  const marked = Object.keys(today).length;
  const present = Object.values(today).filter((s) => s !== "A").length;

  const recent = [...db.payments]
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt))
    .slice(0, 6);

  return (
    <div>
      <div className="cards">
        <CurrencyCard label="Fees collected" amountUGX={collected} icon="💰" trendLabel={`${db.payments.length} payments recorded`} />
        <CurrencyCard label="Fees outstanding" amountUGX={owed} icon="⏳" trend={owed > 0 ? "down" : "neutral"} trendLabel="Term balances" />
        <div className="stat-card">
          <div className="label">Students</div>
          <div className="value">{db.students.length}</div>
          <div className="hint">{db.classes.length} classes · {currentTerm()}</div>
        </div>
        <div className="stat-card">
          <div className="label">Attendance today</div>
          <div className="value">
            {marked > 0 ? `${Math.round((present / marked) * 100)}%` : "—"}
          </div>
          <div className="hint">{present} present of {marked} marked</div>
        </div>
      </div>

      <div className="panel">
        <h3>Recent fee payments</h3>
        <div className="table-wrap">
          <table className="ssm">
            <thead>
              <tr><th>Student</th><th>Amount</th><th>Method</th><th>Date</th></tr>
            </thead>
            <tbody>
              {recent.length === 0 && (
                <tr><td colSpan={4} style={{ color: "#718096" }}>No payments yet — record one on the Fees page.</td></tr>
              )}
              {recent.map((p) => {
                const s = db.students.find((st) => st.id === p.studentId);
                return (
                  <tr key={p.id}>
                    <td>{s?.fullName ?? "Unknown"}</td>
                    <td style={{ fontWeight: 700 }}>{`UGX ${p.amount.toLocaleString("en-UG")}`}</td>
                    <td><span className="pill info">{p.method.replace("_", " ")}</span></td>
                    <td>{formatDate(p.paidAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
