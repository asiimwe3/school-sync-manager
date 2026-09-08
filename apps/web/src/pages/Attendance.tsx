/**
 * Attendance — daily register per class. Offline-first: marks are saved
 * locally and queued through the sync layer.
 */
import { useState } from "react";
import { useDB, mutateDB, todayKey, type AttendanceStatus } from "../store";

export function Attendance(): React.JSX.Element {
  const db = useDB();
  const [classId, setClassId] = useState<string>(db.classes[0]?.id ?? "");
  const [date, setDate] = useState<string>(todayKey());
  const [saved, setSaved] = useState(false);

  const roster = db.students
    .filter((s) => s.classId === classId)
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
  const dayRecord = db.attendance[date] ?? {};

  function setStatusFor(studentId: string, status: AttendanceStatus): void {
    setSaved(false);
    mutateDB((d) => ({
      ...d,
      attendance: { ...d.attendance, [date]: { ...(d.attendance[date] ?? {}), [studentId]: status } },
    }));
  }

  function markAllPresent(): void {
    setSaved(false);
    mutateDB((d) => {
      const row: Record<string, AttendanceStatus> = { ...(d.attendance[date] ?? {}) };
      roster.forEach((s) => { row[s.id] = "P"; });
      return { ...d, attendance: { ...d.attendance, [date]: row } };
    });
  }

  function save(): void {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  const counts = roster.reduce(
    (acc, s) => {
      const st = dayRecord[s.id];
      if (st === "P") acc.present++;
      else if (st === "A") acc.absent++;
      else if (st === "L") acc.late++;
      return acc;
    },
    { present: 0, absent: 0, late: 0 }
  );

  return (
    <div>
      <div className="panel" style={{ marginTop: 0, display: "flex", gap: 14, alignItems: "end", flexWrap: "wrap" }}>
        <div className="field" style={{ margin: 0 }}>
          <label>CLASS</label>
          <select value={classId} onChange={(e) => setClassId(e.target.value)}>
            {db.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>DATE</label>
          <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setSaved(false); }} />
        </div>
        <button className="btn ghost" onClick={markAllPresent}>All present ✓</button>
        <button className="btn gold" onClick={save}>{saved ? "Saved ✓" : "Save register"}</button>
      </div>

      <div className="panel">
        <h3>
          Daily register — {roster.length} students
          <span style={{ float: "right", fontSize: 12, fontWeight: 600 }}>
            <span className="pill ok"> {counts.present} present </span>{" "}
            <span className="pill warn"> {counts.late} late </span>{" "}
            <span className="pill bad"> {counts.absent} absent </span>
          </span>
        </h3>
        <div className="table-wrap">
          <table className="ssm">
            <thead>
              <tr><th>#</th><th>Student</th><th>Guardian</th><th>Mark</th></tr>
            </thead>
            <tbody>
              {roster.length === 0 && (
                <tr><td colSpan={4} style={{ color: "#718096" }}>No students in this class.</td></tr>
              )}
              {roster.map((s, i) => {
                const status = dayRecord[s.id];
                return (
                  <tr key={s.id}>
                    <td style={{ color: "#718096" }}>{i + 1}</td>
                    <td><strong>{s.fullName}</strong></td>
                    <td style={{ fontSize: 12.5 }}>{s.guardianPhone}</td>
                    <td>
                      <div className="chip-row">
                        {(["P", "L", "A"] as const).map((st) => (
                          <button
                            key={st}
                            className={`chip ${status === st ? `on-${st}` : ""}`}
                            onClick={() => setStatusFor(s.id, st)}
                          >
                            {st === "P" ? "Present" : st === "L" ? "Late" : "Absent"}
                          </button>
                        ))}
                      </div>
                    </td>
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
