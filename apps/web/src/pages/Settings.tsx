/**
 * Settings — school profile (existing SchoolSettingsForm with district
 * combobox + Zod) and class management.
 */
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SchoolSettingsForm } from "../components/forms/SchoolSettingsForm";
import { useSyncManager } from "../providers/SyncProvider";
import { useDB, mutateDB, uuid, resetDB, type Classroom } from "../store";
import type { SchoolSettingsInput } from "@ssm/validation";
import { formatUGXRaw } from "@ssm/utils";

const classFormSchema = z.object({
  name: z.string().min(2, "e.g. Primary 6"),
  teacherName: z.string().min(3, "Enter the class teacher's name"),
  termFee: z.coerce
    .number({ error: "Enter the term fee" })
    .int("UGX amounts are whole numbers")
    .positive("Fee must be positive"),
});
type ClassFormInput = z.input<typeof classFormSchema>;
type ClassFormOutput = z.output<typeof classFormSchema>;

function ClassManager(): React.JSX.Element {
  const db = useDB();
  const { mutate } = useSyncManager();
  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<ClassFormInput, unknown, ClassFormOutput>({ resolver: zodResolver(classFormSchema) });

  const onSubmit = handleSubmit(async (data: ClassFormOutput) => {
    const cls: Classroom = { id: uuid(), ...data };
    mutateDB((d) => ({ ...d, classes: [...d.classes, cls] }));
    await mutate("class", "create", cls as unknown as Record<string, unknown>);
    reset();
  });

  function removeClass(c: Classroom): void {
    const count = db.students.filter((s) => s.classId === c.id).length;
    if (!window.confirm(`Remove ${c.name}${count > 0 ? ` and its ${count} student(s)` : ""}?`)) return;
    mutateDB((d) => ({
      ...d,
      classes: d.classes.filter((x) => x.id !== c.id),
      students: d.students.filter((s) => s.classId !== c.id),
    }));
    void mutate("class", "delete", { id: c.id });
  }

  return (
    <div className="panel">
      <h3>🏫 Classes ({db.classes.length})</h3>
      <div className="table-wrap">
        <table className="ssm">
          <thead><tr><th>Class</th><th>Teacher</th><th>Term fee</th><th>Students</th><th></th></tr></thead>
          <tbody>
            {db.classes.length === 0 && (
              <tr><td colSpan={5} style={{ color: "#718096" }}>No classes yet — add the first one.</td></tr>
            )}
            {db.classes.map((c) => (
              <tr key={c.id}>
                <td><strong>{c.name}</strong></td>
                <td>{c.teacherName}</td>
                <td>UGX {formatUGXRaw(c.termFee)}</td>
                <td>{db.students.filter((s) => s.classId === c.id).length}</td>
                <td><button className="btn danger small" onClick={() => removeClass(c)}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ marginTop: 20 }}>➕ Add class</h3>
      <form onSubmit={(e) => void onSubmit(e)}>
        <div className="grid-2">
          <div className="field">
            <label>CLASS NAME</label>
            <input placeholder="Primary 6" {...register("name")} />
            {errors.name && <span className="err">{errors.name.message}</span>}
          </div>
          <div className="field">
            <label>CLASS TEACHER</label>
            <input placeholder="Mr. Okello Emmanuel" {...register("teacherName")} />
            {errors.teacherName && <span className="err">{errors.teacherName.message}</span>}
          </div>
        </div>
        <div className="field" style={{ maxWidth: 260 }}>
          <label>TERM FEE (UGX)</label>
          <input type="number" placeholder="250000" {...register("termFee")} />
          {errors.termFee && <span className="err">{errors.termFee.message}</span>}
        </div>
        <button className="btn gold" type="submit">Add class</button>
      </form>
    </div>
  );
}

export function Settings(): React.JSX.Element {
  const db = useDB();
  const { mutate } = useSyncManager();

  return (
    <div className="grid-2">
      <div className="panel" style={{ marginTop: 0 }}>
        <h3>⚙️ School profile</h3>
        <SchoolSettingsForm
          schoolId="local"
          defaultValues={db.settings ?? undefined}
          onSave={(data: SchoolSettingsInput) => {
            mutateDB((d) => ({ ...d, settings: data }));
          }}
          onSuccess={() => { /* profile saved locally + queued for cloud */ }}
        />
        {db.settings && (
          <p style={{ fontSize: 12, color: "#718096", marginTop: 8 }}>
            Saved profile: {db.settings.schoolName}, {db.settings.district} — term fee UGX {formatUGXRaw(db.settings.termFee)}
          </p>
        )}
      </div>
      <div>
        <ClassManager />
        <div className="panel">
          <h3>🧪 Data</h3>
          <p style={{ fontSize: 13, color: "#718096" }}>
            All data lives on this device (offline-first). Every change is queued for a future cloud backend.
          </p>
          <button
            className="btn danger"
            onClick={() => {
              if (window.confirm("Erase all data on this device and reload the demo seed?")) {
                resetDB();
                void mutate("reset", "delete", { scope: "local" });
              }
            }}
          >
            Reset local data
          </button>
        </div>
      </div>
    </div>
  );
}
