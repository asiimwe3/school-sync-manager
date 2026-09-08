/**
 * Students — register students with Ugandan phone + district validation,
 * per-class balances, offline sync queue.
 */
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ugandaPhoneSchema, UGANDAN_DISTRICTS } from "@ssm/validation";
import { formatUgandaPhone } from "@ssm/utils";
import { useSyncManager } from "../providers/SyncProvider";
import { useDB, mutateDB, uuid, type StudentRecord } from "../store";

const studentFormSchema = z.object({
  fullName: z.string().min(3, "Enter the student's full name"),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Select a date of birth")
    .refine((d) => new Date(d) < new Date(), "DOB cannot be in the future"),
  sex: z.enum(["M", "F"], { error: "Select sex" }),
  classId: z.string().min(1, "Select a class"),
  guardianDistrict: z.enum(UGANDAN_DISTRICTS, { error: "Select a district" }),
  guardianPhone: ugandaPhoneSchema,
});

type StudentFormInput = z.infer<typeof studentFormSchema>;

export function Students(): React.JSX.Element {
  const db = useDB();
  const { mutate } = useSyncManager();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<StudentFormInput>({ resolver: zodResolver(studentFormSchema) });

  const rows = useMemo(() => {
    return [...db.students]
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
      .map((s) => {
        const cls = db.classes.find((c) => c.id === s.classId);
        const balance = Math.max(0, (cls?.termFee ?? 0) - s.feesPaid);
        return { s, cls, balance };
      });
  }, [db]);

  const onSubmit = handleSubmit(async (data) => {
    const student: StudentRecord = {
      id: uuid(),
      fullName: data.fullName,
      dob: data.dob,
      sex: data.sex,
      classId: data.classId,
      guardianPhone: data.guardianPhone,
      feesPaid: 0,
      enrolledAt: new Date().toISOString(),
    };
    mutateDB((d) => ({ ...d, students: [...d.students, student] }));
    await mutate("student", "create", student as unknown as Record<string, unknown>);
    reset();
  });

  function removeStudent(s: StudentRecord): void {
    if (!window.confirm(`Remove ${s.fullName}? This cannot be undone.`)) return;
    mutateDB((d) => ({
      ...d,
      students: d.students.filter((st) => st.id !== s.id),
      payments: d.payments.filter((p) => p.studentId !== s.id),
    }));
    void mutate("student", "delete", { id: s.id });
  }

  return (
    <div className="grid-2">
      <div className="panel" style={{ marginTop: 0 }}>
        <h3>➕ Register student</h3>
        <form onSubmit={(e) => void onSubmit(e)}>
          <div className="field">
            <label>FULL NAME</label>
            <input placeholder="e.g. Ainemugisha Brian" {...register("fullName")} />
            {errors.fullName && <span className="err">{errors.fullName.message}</span>}
          </div>
          <div className="grid-2">
            <div className="field">
              <label>DATE OF BIRTH</label>
              <input type="date" {...register("dob")} />
              {errors.dob && <span className="err">{errors.dob.message}</span>}
            </div>
            <div className="field">
              <label>SEX</label>
              <select defaultValue="" {...register("sex")}>
                <option value="" disabled>Select…</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
              {errors.sex && <span className="err">{errors.sex.message}</span>}
            </div>
          </div>
          <div className="field">
            <label>CLASS</label>
            <select defaultValue="" {...register("classId")}>
              <option value="" disabled>Select class…</option>
              {db.classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name} — {c.teacherName}</option>
              ))}
            </select>
            {errors.classId && <span className="err">{errors.classId.message}</span>}
          </div>
          <div className="grid-2">
            <div className="field">
              <label>GUARDIAN DISTRICT</label>
              <select defaultValue="" {...register("guardianDistrict")}>
                <option value="" disabled>Select district…</option>
                {UGANDAN_DISTRICTS.map((dist) => (
                  <option key={dist} value={dist}>{dist}</option>
                ))}
              </select>
              {errors.guardianDistrict && <span className="err">{errors.guardianDistrict.message}</span>}
            </div>
            <div className="field">
              <label>GUARDIAN PHONE</label>
              <input placeholder="0772 345 678 / +256 772…" {...register("guardianPhone")} />
              {errors.guardianPhone && <span className="err">{errors.guardianPhone.message}</span>}
            </div>
          </div>
          <button className="btn gold" type="submit" disabled={isSubmitting}>
            Register student
          </button>
        </form>
      </div>

      <div className="panel" style={{ marginTop: 0 }}>
        <h3>🎓 Enrolled ({db.students.length})</h3>
        <div className="table-wrap">
          <table className="ssm">
            <thead>
              <tr><th>Name</th><th>Class</th><th>Guardian</th><th>Balance</th><th></th></tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={5} style={{ color: "#718096" }}>No students yet — register the first one.</td></tr>
              )}
              {rows.map(({ s, cls, balance }) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.fullName}</strong>
                    <div style={{ fontSize: 12, color: "#718096" }}>{s.sex === "M" ? "Male" : "Female"}</div>
                  </td>
                  <td>{cls?.name ?? "—"}</td>
                  <td style={{ fontSize: 12.5 }}>{formatUgandaPhone(s.guardianPhone)}</td>
                  <td>
                    {balance === 0 ? (
                      <span className="pill ok">Cleared</span>
                    ) : (
                      <span className="pill bad">UGX {balance.toLocaleString("en-UG")}</span>
                    )}
                  </td>
                  <td>
                    <button className="btn danger small" onClick={() => removeStudent(s)}>✕</button>
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
