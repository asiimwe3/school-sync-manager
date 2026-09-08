/**
 * Marks & Reports — enter per-subject marks, auto-grade, and print an
 * official report card (report-card system folded in as a module).
 */
import { useMemo, useState } from "react";
import { useSyncManager } from "../providers/SyncProvider";
import {
  useDB, mutateDB, currentTerm, SUBJECTS, gradeFor, averageFor,
  type Subject,
} from "../store";
import { formatDate } from "@ssm/utils";

const TERMS = ["Term 1", "Term 2", "Term 3"] as const;

export function Reports(): React.JSX.Element {
  const db = useDB();
  const { mutate } = useSyncManager();
  const [term, setTerm] = useState<string>(currentTerm());
  const [classId, setClassId] = useState<string>(db.classes[0]?.id ?? "");
  const [studentId, setStudentId] = useState<string>("");
  const [flash, setFlash] = useState<string>("");

  const roster = useMemo(
    () => db.students.filter((s) => s.classId === classId).sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [db.students, classId]
  );

  const activeStudent = studentId || roster[0]?.id || "";
  const markKey = `${term}|${activeStudent}`;
  const marks = db.marks[markKey] ?? {};

  function setMark(subject: Subject, score: number): void {
    mutateDB((d) => ({
      ...d,
      marks: {
        ...d.marks,
        [markKey]: { ...(d.marks[markKey] ?? {}), [subject]: Number.isNaN(score) ? 0 : Math.max(0, Math.min(100, score)) },
      },
    }));
  }

  async function saveMarks(): Promise<void> {
    await mutate("marks", "update", { id: markKey, scores: marks });
    setFlash("Marks saved ✓");
    window.setTimeout(() => setFlash(""), 2500);
  }

  // Class positions for the term (by average)
  const positions = useMemo(() => {
    const entries = roster
      .map((s) => {
        const row = db.marks[`${term}|${s.id}`] ?? {};
        const scores = SUBJECTS.map((sub) => row[sub]).filter((v): v is number => typeof v === "number");
        return { id: s.id, avg: averageFor(scores) };
      })
      .sort((a, b) => b.avg - a.avg);
    return new Map(entries.map((e, i) => [e.id, i + 1]));
  }, [roster, db.marks, term]);

  const student = db.students.find((s) => s.id === activeStudent);
  const cls = db.classes.find((c) => c.id === classId);
  const scores = SUBJECTS.map((sub) => marks[sub]).filter((v): v is number => typeof v === "number");
  const avg = averageFor(scores);
  const overall = gradeFor(avg);
  const pos = positions.get(activeStudent);

  // attendance summary for this student
  const attDays = Object.entries(db.attendance);
  const attSummary = attDays.reduce(
    (acc, [, row]) => {
      const st = row[activeStudent];
      if (st) { acc.total++; if (st !== "A") acc.present++; }
      return acc;
    },
    { total: 0, present: 0 }
  );

  const feeBalance = student ? Math.max(0, (cls?.termFee ?? 0) - student.feesPaid) : 0;

  return (
    <div>
      <div className="panel no-print" style={{ marginTop: 0, display: "flex", gap: 14, alignItems: "end", flexWrap: "wrap" }}>
        <div className="field" style={{ margin: 0 }}>
          <label>TERM</label>
          <select value={term} onChange={(e) => setTerm(e.target.value)}>
            {TERMS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>CLASS</label>
          <select value={classId} onChange={(e) => { setClassId(e.target.value); setStudentId(""); }}>
            {db.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>STUDENT</label>
          <select value={activeStudent} onChange={(e) => setStudentId(e.target.value)}>
            {roster.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
          </select>
        </div>
        <button className="btn gold" onClick={() => void saveMarks()}>Save marks</button>
        {flash && <span className="pill ok">{flash}</span>}
      </div>

      <div className="grid-2 no-print" style={{ marginTop: 18 }}>
        <div className="panel" style={{ marginTop: 0 }}>
          <h3>✏️ Enter marks (0–100)</h3>
          {SUBJECTS.map((sub) => (
            <div className="field" key={sub}>
              <label>{sub.toUpperCase()}</label>
              <input
                type="number" min={0} max={100}
                value={marks[sub] ?? ""}
                onChange={(e) => setMark(sub, Number(e.target.value))}
              />
            </div>
          ))}
          <p style={{ fontSize: 12, color: "#718096" }}>
            Marks save instantly to this device; the Save button queues them for cloud sync.
          </p>
        </div>

        <div className="panel" style={{ marginTop: 0 }}>
          <h3>📈 Class standings — {term}</h3>
          <div className="table-wrap">
            <table className="ssm">
              <thead><tr><th>#</th><th>Student</th><th>Average</th><th>Grade</th></tr></thead>
              <tbody>
                {roster.map((s) => {
                  const row = db.marks[`${term}|${s.id}`] ?? {};
                  const sc = SUBJECTS.map((sub) => row[sub]).filter((v): v is number => typeof v === "number");
                  const a = averageFor(sc);
                  const g = gradeFor(a);
                  return (
                    <tr key={s.id} style={s.id === activeStudent ? { background: "#fffbe6" } : undefined}>
                      <td>{positions.get(s.id)}</td>
                      <td><strong>{s.fullName}</strong></td>
                      <td>{a}%</td>
                      <td><span className={g.grade === "E" ? "pill bad" : g.grade === "A" ? "pill ok" : "pill info"}>{g.grade}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── Printable report card ─── */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
        <div className="print-root">
          <div className="report-head">
            <div>
              <h2>{db.settings?.schoolName ?? "School Sync Manager"}</h2>
              <div style={{ fontSize: 12 }}>
                {db.settings?.address ?? "—"}{db.settings?.district ? `, ${db.settings.district} District` : ""}
              </div>
              <div style={{ fontSize: 12 }}>☎ {db.settings?.contactPhone ?? "—"} · {db.settings?.email ?? "—"}</div>
            </div>
            <div className="report-meta">
              <strong>TERMLY REPORT CARD</strong>
              <div>{term} — {new Date().getFullYear()}</div>
              <div>Issued {formatDate(new Date())}</div>
            </div>
          </div>

          {student ? (
            <div className="report-card">
              <table>
                <tbody>
                  <tr>
                    <th>Name</th><td>{student.fullName}</td>
                    <th>Sex</th><td>{student.sex === "M" ? "Male" : "Female"}</td>
                  </tr>
                  <tr>
                    <th>Class</th><td>{cls?.name ?? "—"} ({cls?.teacherName ?? "—"})</td>
                    <th>DOB</th><td>{formatDate(student.dob)}</td>
                  </tr>
                </tbody>
              </table>

              <table>
                <thead>
                  <tr><th>Subject</th><th>Score</th><th>Grade</th><th>Remark</th></tr>
                </thead>
                <tbody>
                  {SUBJECTS.map((sub) => {
                    const sc = marks[sub];
                    if (typeof sc !== "number") {
                      return <tr key={sub}><td>{sub}</td><td colSpan={3} style={{ color: "#a0aec0" }}>Not assessed</td></tr>;
                    }
                    const g = gradeFor(sc);
                    return (
                      <tr key={sub}>
                        <td>{sub}</td><td>{sc}%</td><td>{g.grade}</td><td>{g.remark}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <table>
                <tbody>
                  <tr>
                    <th>Total</th><td>{scores.reduce((a, b) => a + b, 0)} / {scores.length * 100}</td>
                    <th>Average</th><td>{avg}%</td>
                  </tr>
                  <tr>
                    <th>Overall grade</th><td>{overall.grade} ({overall.remark})</td>
                    <th>Position in class</th><td>{pos ? `${pos} of ${roster.length}` : "—"}</td>
                  </tr>
                  <tr>
                    <th>Attendance</th><td>{attSummary.total > 0 ? `${attSummary.present}/${attSummary.total} days present` : "No records"}</td>
                    <th>Fees</th><td>{feeBalance === 0 ? "Fully paid" : `UGX ${feeBalance.toLocaleString("en-UG")} balance`}</td>
                  </tr>
                </tbody>
              </table>

              <p style={{ marginTop: 10 }}><strong>Class teacher's comment:</strong>{" "}
                {avg >= 75
                  ? "An excellent term. Keep up the outstanding performance."
                  : avg >= 50
                  ? "A good term overall. More effort in weaker subjects will raise the average."
                  : "Below expectations. Extra revision at home is strongly advised."}
              </p>

              <div className="sign-line">
                <div>Class teacher</div>
                <div>Head teacher</div>
                <div>Parent / guardian</div>
              </div>
            </div>
          ) : (
            <p>No student selected.</p>
          )}
        </div>
      </div>

      <div className="no-print" style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
        <button className="btn" onClick={() => window.print()}>🖨️ Print report card</button>
      </div>
    </div>
  );
}
