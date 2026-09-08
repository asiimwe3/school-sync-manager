/**
 * Fees — record payments (Cash / MTN MoMo / Airtel Money / Bank), live
 * balances per student, full payment history. All amounts UGX integers.
 */
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatUGXRaw, formatDate } from "@ssm/utils";
import { useSyncManager } from "../providers/SyncProvider";
import { useDB, mutateDB, uuid, currentTerm, type FeePaymentRecord } from "../store";

const paymentFormSchema = z.object({
  studentId: z.string().min(1, "Select a student"),
  amount: z.coerce
    .number({ error: "Enter an amount" })
    .int("UGX amounts are whole numbers")
    .positive("Amount must be positive"),
  method: z.enum(["CASH", "MTN_MOMO", "AIRTEL_MONEY", "BANK"], {
    error: "Select a payment method",
  }),
  reference: z.string().max(60).optional(),
});
type PaymentFormInput = z.input<typeof paymentFormSchema>;
type PaymentFormOutput = z.output<typeof paymentFormSchema>;

export function Fees(): React.JSX.Element {
  const db = useDB();
  const { mutate } = useSyncManager();
  const [receipt, setReceipt] = useState<FeePaymentRecord | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<PaymentFormInput, unknown, PaymentFormOutput>({ resolver: zodResolver(paymentFormSchema) });

  const balances = useMemo(() =>
    db.students
      .map((s) => {
        const cls = db.classes.find((c) => c.id === s.classId);
        return { s, cls, balance: Math.max(0, (cls?.termFee ?? 0) - s.feesPaid) };
      })
      .sort((a, b) => b.balance - a.balance),
  [db]);

  const history = useMemo(() =>
    [...db.payments].sort((a, b) => b.paidAt.localeCompare(a.paidAt)),
  [db]);

  const onSubmit = handleSubmit(async (data: PaymentFormOutput) => {
    const payment: FeePaymentRecord = {
      id: uuid(),
      studentId: data.studentId,
      amount: data.amount,
      method: data.method,
      reference: data.reference === "" ? undefined : data.reference,
      paidAt: new Date().toISOString(),
    };
    mutateDB((d) => ({
      ...d,
      payments: [payment, ...d.payments],
      students: d.students.map((s) =>
        s.id === payment.studentId ? { ...s, feesPaid: s.feesPaid + payment.amount } : s
      ),
    }));
    await mutate("fee_payment", "create", payment as unknown as Record<string, unknown>);
    setReceipt(payment);
    reset();
    window.setTimeout(() => setReceipt(null), 6000);
  });

  const studentName = (id: string): string =>
    db.students.find((s) => s.id === id)?.fullName ?? "Unknown";

  return (
    <div className="grid-2">
      <div className="panel" style={{ marginTop: 0 }}>
        <h3>➕ Record payment</h3>
        {receipt && (
          <p className="pill ok" style={{ padding: 8, textAlign: "center" }}>
            ✓ Receipt: {studentName(receipt.studentId)} — UGX {formatUGXRaw(receipt.amount)} via{" "}
            {receipt.method.replace("_", " ")}
          </p>
        )}
        <form onSubmit={(e) => void onSubmit(e)}>
          <div className="field">
            <label>STUDENT</label>
            <select defaultValue="" {...register("studentId")}>
              <option value="" disabled>Select student…</option>
              {db.students.map((s) => {
                const cls = db.classes.find((c) => c.id === s.classId);
                return <option key={s.id} value={s.id}>{s.fullName} ({cls?.name ?? "no class"})</option>;
              })}
            </select>
            {errors.studentId && <span className="err">{errors.studentId.message}</span>}
          </div>
          <div className="field">
            <label>AMOUNT (UGX)</label>
            <input type="number" placeholder="e.g. 250000" {...register("amount")} />
            {errors.amount && <span className="err">{errors.amount.message}</span>}
          </div>
          <div className="grid-2">
            <div className="field">
              <label>METHOD</label>
              <select defaultValue="CASH" {...register("method")}>
                <option value="CASH">Cash</option>
                <option value="MTN_MOMO">MTN MoMo</option>
                <option value="AIRTEL_MONEY">Airtel Money</option>
                <option value="BANK">Bank</option>
              </select>
            </div>
            <div className="field">
              <label>REFERENCE (OPTIONAL)</label>
              <input placeholder="MP-… / TRX-…" {...register("reference")} />
            </div>
          </div>
          <button className="btn gold" type="submit" disabled={isSubmitting}>
            Record payment
          </button>
        </form>

        <h3 style={{ marginTop: 22 }}>Balances — {currentTerm()}</h3>
        <div className="table-wrap">
          <table className="ssm">
            <thead>
              <tr><th>Student</th><th>Term fee</th><th>Paid</th><th>Balance</th></tr>
            </thead>
            <tbody>
              {balances.map(({ s, cls, balance }) => (
                <tr key={s.id}>
                  <td>{s.fullName}</td>
                  <td>{cls ? formatUGXRaw(cls.termFee) : "—"}</td>
                  <td>{formatUGXRaw(s.feesPaid)}</td>
                  <td>
                    {balance === 0
                      ? <span className="pill ok">Cleared</span>
                      : <span className="pill bad">UGX {formatUGXRaw(balance)}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 0 }}>
        <h3>🧾 Payment history ({history.length})</h3>
        <div className="table-wrap">
          <table className="ssm">
            <thead>
              <tr><th>Date</th><th>Student</th><th>Amount</th><th>Method</th></tr>
            </thead>
            <tbody>
              {history.length === 0 && (
                <tr><td colSpan={4} style={{ color: "#718096" }}>No payments yet.</td></tr>
              )}
              {history.map((p) => (
                <tr key={p.id}>
                  <td>{formatDate(p.paidAt)}</td>
                  <td>{studentName(p.studentId)}</td>
                  <td style={{ fontWeight: 700 }}>{formatUGXRaw(p.amount)}</td>
                  <td>
                    <span className="pill info">{p.method.replace("_", " ")}</span>
                    {p.reference && <div style={{ fontSize: 11, color: "#718096", marginTop: 3 }}>{p.reference}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
