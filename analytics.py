import sqlite3
import json
import csv
import io
import os
from datetime import datetime
from flask import Flask, jsonify, request, Response, abort
from flask_cors import CORS

# ── CONFIG ────────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)                            # allow requests from the frontend origin
DB_PATH = "students.db"             # SQLite file; created automatically
PORT    = 5000
DEBUG   = True

# ── DATABASE SETUP ────────────────────────────────────────────────────────────

def get_db():
    """Return a thread-local SQLite connection with row_factory."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create the students table if it doesn't exist."""
    with get_db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS students (
                id          TEXT PRIMARY KEY,
                name        TEXT NOT NULL,
                cls         TEXT NOT NULL,
                marks       INTEGER NOT NULL CHECK(marks >= 0 AND marks <= 100),
                attend      INTEGER NOT NULL CHECK(attend >= 0 AND attend <= 100),
                hours       INTEGER NOT NULL DEFAULT 5,
                band        TEXT NOT NULL,
                created_at  TEXT DEFAULT (datetime('now'))
            )
        """)
        conn.commit()

# ── HELPERS ───────────────────────────────────────────────────────────────────

def get_band(marks: int) -> str:
    if marks >= 75: return "Distinction"
    if marks >= 60: return "Merit"
    if marks >= 40: return "Pass"
    return "At-Risk"


def row_to_dict(row) -> dict:
    return dict(row)


def validate_student(data: dict) -> list[str]:
    """Return a list of validation error messages (empty = valid)."""
    errors = []
    if not data.get("name") or len(str(data["name"]).strip()) < 2:
        errors.append("'name' is required (min 2 chars)")
    if not data.get("cls") or len(str(data["cls"]).strip()) < 1:
        errors.append("'cls' (class) is required")
    try:
        m = int(data["marks"])
        if not (0 <= m <= 100):
            errors.append("'marks' must be 0–100")
    except (KeyError, ValueError, TypeError):
        errors.append("'marks' must be an integer 0–100")
    try:
        a = int(data["attend"])
        if not (0 <= a <= 100):
            errors.append("'attend' must be 0–100")
    except (KeyError, ValueError, TypeError):
        errors.append("'attend' must be an integer 0–100")
    return errors


# ── ROUTES ────────────────────────────────────────────────────────────────────

@app.route("/health")
def health():
    return jsonify({"status": "ok", "db": DB_PATH, "timestamp": datetime.utcnow().isoformat()})


# ── GET all students ──────────────────────────────────────────────────────────
@app.route("/students", methods=["GET"])
def get_students():
    """
    Query params:
        class       filter by class name
        band        filter by band
        min_attend  minimum attendance %
        sort        marks|attend|hours|name (default: marks desc)
        search      name/id substring search
    """
    cls        = request.args.get("class")
    band       = request.args.get("band")
    min_attend = request.args.get("min_attend", 0, type=int)
    sort       = request.args.get("sort", "marks")
    search     = request.args.get("search", "").lower()

    sort_map = {
        "marks":  "marks DESC",
        "attend": "attend DESC",
        "hours":  "hours DESC",
        "name":   "name ASC",
    }
    order = sort_map.get(sort, "marks DESC")

    query = "SELECT * FROM students WHERE attend >= ?"
    params = [min_attend]

    if cls:
        query  += " AND cls = ?"
        params.append(cls)
    if band:
        query  += " AND band = ?"
        params.append(band)
    if search:
        query  += " AND (LOWER(name) LIKE ? OR LOWER(id) LIKE ?)"
        params += [f"%{search}%", f"%{search}%"]

    query += f" ORDER BY {order}"

    with get_db() as conn:
        rows = conn.execute(query, params).fetchall()

    return jsonify([row_to_dict(r) for r in rows])


# ── POST one student ──────────────────────────────────────────────────────────
@app.route("/students", methods=["POST"])
def add_student():
    data   = request.get_json(silent=True) or {}
    errors = validate_student(data)
    if errors:
        return jsonify({"error": "Validation failed", "details": errors}), 400

    marks  = int(data["marks"])
    attend = int(data["attend"])
    hours  = max(1, min(20, int(data.get("hours", 5))))
    band   = get_band(marks)

    # Auto-generate ID
    with get_db() as conn:
        row = conn.execute("SELECT COUNT(*) AS cnt FROM students").fetchone()
        new_id = f"S{1001 + row['cnt']}"
        conn.execute(
            "INSERT INTO students (id, name, cls, marks, attend, hours, band) VALUES (?,?,?,?,?,?,?)",
            (new_id, data["name"].strip(), data["cls"].strip(), marks, attend, hours, band)
        )
        conn.commit()
        student = row_to_dict(conn.execute("SELECT * FROM students WHERE id=?", (new_id,)).fetchone())

    return jsonify(student), 201


# ── POST bulk (replace all) ───────────────────────────────────────────────────
@app.route("/students/bulk", methods=["POST"])
def bulk_replace():
    """
    Replace all students with a provided list.
    Accepts: [ { name, cls, marks, attend, hours } ] or
             [ { id, name, cls, marks, attend, hours, band } ]
    """
    data = request.get_json(silent=True)
    if not isinstance(data, list):
        return jsonify({"error": "Expected a JSON array of students"}), 400

    rows   = []
    errors = []
    for i, item in enumerate(data):
        errs = validate_student(item)
        if errs:
            errors.append({"row": i, "errors": errs})
            continue
        marks  = int(item["marks"])
        attend = int(item["attend"])
        hours  = max(1, min(20, int(item.get("hours", 5))))
        rows.append((
            item.get("id") or f"S{1001 + i}",
            str(item["name"]).strip(),
            str(item["cls"]).strip(),
            marks, attend, hours,
            get_band(marks)
        ))

    with get_db() as conn:
        conn.execute("DELETE FROM students")
        conn.executemany(
            "INSERT OR REPLACE INTO students (id, name, cls, marks, attend, hours, band) VALUES (?,?,?,?,?,?,?)",
            rows
        )
        conn.commit()

    response = {"imported": len(rows), "skipped": len(errors)}
    if errors:
        response["validation_errors"] = errors
    return jsonify(response), 200


# ── PUT update one student ────────────────────────────────────────────────────
@app.route("/students/<student_id>", methods=["PUT"])
def update_student(student_id):
    with get_db() as conn:
        existing = conn.execute("SELECT * FROM students WHERE id=?", (student_id,)).fetchone()
    if not existing:
        abort(404, description=f"Student {student_id} not found")

    data   = request.get_json(silent=True) or {}
    errors = validate_student(data)
    if errors:
        return jsonify({"error": "Validation failed", "details": errors}), 400

    marks  = int(data["marks"])
    attend = int(data["attend"])
    hours  = max(1, min(20, int(data.get("hours", 5))))
    band   = get_band(marks)

    with get_db() as conn:
        conn.execute(
            "UPDATE students SET name=?, cls=?, marks=?, attend=?, hours=?, band=? WHERE id=?",
            (data["name"].strip(), data["cls"].strip(), marks, attend, hours, band, student_id)
        )
        conn.commit()
        student = row_to_dict(conn.execute("SELECT * FROM students WHERE id=?", (student_id,)).fetchone())

    return jsonify(student)


# ── DELETE one student ────────────────────────────────────────────────────────
@app.route("/students/<student_id>", methods=["DELETE"])
def delete_student(student_id):
    with get_db() as conn:
        result = conn.execute("DELETE FROM students WHERE id=?", (student_id,))
        conn.commit()
    if result.rowcount == 0:
        abort(404, description=f"Student {student_id} not found")
    return jsonify({"deleted": student_id})


# ── GET CSV export ────────────────────────────────────────────────────────────
@app.route("/students/export", methods=["GET"])
def export_csv():
    """Download all students as a CSV file."""
    with get_db() as conn:
        rows = conn.execute("SELECT id, name, cls, marks, attend, hours, band FROM students ORDER BY cls, marks DESC").fetchall()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Name", "Class", "Marks", "Attendance", "Study Hours", "Band"])
    for row in rows:
        writer.writerow([row["id"], row["name"], row["cls"], row["marks"], row["attend"], row["hours"], row["band"]])

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=student_performance.csv"}
    )


# ── STATS endpoint ────────────────────────────────────────────────────────────
@app.route("/students/stats", methods=["GET"])
def get_stats():
    """Return aggregated KPIs for the dashboard."""
    with get_db() as conn:
        total  = conn.execute("SELECT COUNT(*) AS n FROM students").fetchone()["n"]
        if total == 0:
            return jsonify({"total": 0, "avg_marks": None, "avg_attend": None, "at_risk": 0, "by_class": [], "by_band": []})

        agg    = conn.execute("SELECT AVG(marks) AS am, AVG(attend) AS aa FROM students").fetchone()
        risk   = conn.execute("SELECT COUNT(*) AS n FROM students WHERE band='At-Risk'").fetchone()["n"]

        by_class = conn.execute(
            "SELECT cls, AVG(marks) AS avg_marks, COUNT(*) AS count FROM students GROUP BY cls ORDER BY avg_marks DESC"
        ).fetchall()
        by_band  = conn.execute(
            "SELECT band, COUNT(*) AS count FROM students GROUP BY band"
        ).fetchall()

    return jsonify({
        "total":      total,
        "avg_marks":  round(agg["am"], 1) if agg["am"] else None,
        "avg_attend": round(agg["aa"], 1) if agg["aa"] else None,
        "at_risk":    risk,
        "by_class":   [dict(r) for r in by_class],
        "by_band":    [dict(r) for r in by_band],
    })


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": str(e)}), 404

@app.errorhandler(400)
def bad_request(e):
    return jsonify({"error": str(e)}), 400

@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == "__main__":
    init_db()
    print(f"\n🚀  Student Performance API running at http://localhost:{PORT}")
    print(f"📂  Database: {os.path.abspath(DB_PATH)}")
    print(f"📋  Endpoints:")
    print(f"    GET    /students          — list all")
    print(f"    POST   /students          — add one")
    print(f"    POST   /students/bulk     — replace all")
    print(f"    PUT    /students/<id>     — update")
    print(f"    DELETE /students/<id>     — delete")
    print(f"    GET    /students/export   — download CSV")
    print(f"    GET    /students/stats    — aggregated KPIs")
    print(f"    GET    /health            — health check\n")
    app.run(host="0.0.0.0", port=PORT, debug=DEBUG)
