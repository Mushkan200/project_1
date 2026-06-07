from __future__ import annotations

from pathlib import Path
import json
import csv
import math
from statistics import mean
import pandas as pd

OUTPUT_DIR = Path("output")
OUTPUT_DIR.mkdir(exist_ok=True)

SOURCE_FILE = "students.csv"
JSON_OUT = OUTPUT_DIR / "student_data.json"
CSV_OUT = OUTPUT_DIR / "student_summary.csv"

def calc_band(marks: float) -> str:
    if marks >= 85:
        return "Distinction"
    if marks >= 70:
        return "Merit"
    if marks >= 40:
        return "Pass"
    return "At-Risk"

def safe_float(value, default=0.0):
    try:
        if value is None or (isinstance(value, str) and not value.strip()):
            return default
        return float(value)
    except Exception:
        return default

def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    rename_map = {
        "ID": "id",
        "Student ID": "id",
        "Name": "name",
        "Full Name": "name",
        "Class": "className",
        "Class Name": "className",
        "marks": "marks",
        "Marks": "marks",
        "attendance": "attendance",
        "Attendance": "attendance",
        "study_hours": "studyHours",
        "study hrs": "studyHours",
        "Study Hrs": "studyHours",
        "Study Hours": "studyHours",
        "band": "band",
        "Band": "band",
    }
    cols = {c: rename_map.get(c, c) for c in df.columns}
    df = df.rename(columns=cols)
    return df

def clean_students(df: pd.DataFrame) -> pd.DataFrame:
    df = normalize_columns(df.copy())

    required = ["name", "className", "marks", "attendance"]
    for col in required:
        if col not in df.columns:
            df[col] = ""

    if "studyHours" not in df.columns:
        df["studyHours"] = 0

    if "id" not in df.columns:
        df["id"] = [f"ST{str(i+1).zfill(3)}" for i in range(len(df))]

    df["name"] = df["name"].astype(str).str.strip()
    df["className"] = df["className"].astype(str).str.strip()
    df["marks"] = df["marks"].apply(safe_float).clip(0, 100)
    df["attendance"] = df["attendance"].apply(safe_float).clip(0, 100)
    df["studyHours"] = df["studyHours"].apply(safe_float).clip(0, 20)

    df["band"] = df["band"].astype(str).str.strip()
    df.loc[df["band"].isin(["", "nan", "None"]), "band"] = df["marks"].apply(calc_band)

    df = df[df["name"].ne("") & df["className"].ne("")].copy()
    df["id"] = df["id"].astype(str).str.strip()
    df.loc[df["id"].isin(["", "nan", "None"]), "id"] = [f"ST{str(i+1).zfill(3)}" for i in range(len(df))]

    return df.reset_index(drop=True)

def correlation(x, y):
    if len(x) < 2 or len(y) < 2:
        return 0.0
    sx = pd.Series(x, dtype="float64")
    sy = pd.Series(y, dtype="float64")
    value = sx.corr(sy)
    return round(float(value), 2) if pd.notna(value) else 0.0

def build_summary(df: pd.DataFrame) -> dict:
    class_summary = (
        df.groupby("className", as_index=False)
          .agg(
              students=("id", "count"),
              avgMarks=("marks", "mean"),
              avgAttendance=("attendance", "mean"),
              avgStudyHours=("studyHours", "mean"),
          )
          .sort_values("avgMarks", ascending=False)
    )

    band_order = ["Distinction", "Merit", "Pass", "At-Risk"]
    band_counts = df["band"].value_counts().reindex(band_order, fill_value=0).reset_index()
    band_counts.columns = ["band", "count"]

    risk_df = df[df["marks"] < 40].copy()

    top_class = None
    if not class_summary.empty:
        row = class_summary.iloc[0]
        top_class = {
            "className": row["className"],
            "avgMarks": round(float(row["avgMarks"]), 1),
            "students": int(row["students"]),
        }

    top_student = None
    if not df.empty:
        s = df.sort_values(["marks", "attendance"], ascending=[False, False]).iloc[0]
        top_student = {
            "id": s["id"],
            "name": s["name"],
            "className": s["className"],
            "marks": float(s["marks"]),
            "attendance": float(s["attendance"]),
            "studyHours": float(s["studyHours"]),
            "band": s["band"],
        }

    summary = {
        "meta": {
            "students": int(len(df)),
            "classes": int(df["className"].nunique()),
            "bands": band_order,
            "avgMarks": round(float(df["marks"].mean()), 1) if len(df) else 0,
            "avgAttendance": round(float(df["attendance"].mean()), 1) if len(df) else 0,
            "avgStudyHours": round(float(df["studyHours"].mean()), 1) if len(df) else 0,
            "riskCount": int(len(risk_df)),
            "attendanceMarksCorrelation": correlation(df["attendance"], df["marks"]),
        },
        "students": df.to_dict(orient="records"),
        "classSummary": class_summary.round({
            "avgMarks": 1,
            "avgAttendance": 1,
            "avgStudyHours": 1,
        }).to_dict(orient="records"),
        "bandSummary": band_counts.to_dict(orient="records"),
        "topClass": top_class,
        "topStudent": top_student,
        "riskStudents": risk_df.to_dict(orient="records"),
    }
    return summary

def export_summary_csv(summary: dict):
    rows = []
    for item in summary["classSummary"]:
        rows.append({
            "type": "class",
            "name": item["className"],
            "students": item["students"],
            "avgMarks": item["avgMarks"],
            "avgAttendance": item["avgAttendance"],
            "avgStudyHours": item["avgStudyHours"],
            "band": "",
        })
    for item in summary["bandSummary"]:
        rows.append({
            "type": "band",
            "name": item["band"],
            "students": item["count"],
            "avgMarks": "",
            "avgAttendance": "",
            "avgStudyHours": "",
            "band": item["band"],
        })
    pd.DataFrame(rows).to_csv(CSV_OUT, index=False)

def load_input() -> pd.DataFrame:
    path = Path(SOURCE_FILE)
    if not path.exists():
        sample = pd.DataFrame([
            {"id":"ST001","name":"Aarav","className":"BCA 1","marks":86,"attendance":92,"studyHours":4.1},
            {"id":"ST002","name":"Diya","className":"BCA 1","marks":78,"attendance":88,"studyHours":3.4},
            {"id":"ST003","name":"Kunal","className":"BCA 2","marks":64,"attendance":74,"studyHours":2.7},
            {"id":"ST004","name":"Ananya","className":"B.Tech CSE","marks":91,"attendance":95,"studyHours":4.5},
        ])
        return sample
    return pd.read_csv(path)

def main():
    df = load_input()
    df = clean_students(df)
    summary = build_summary(df)

    with open(JSON_OUT, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    export_summary_csv(summary)
    print(f"Wrote {JSON_OUT}")
    print(f"Wrote {CSV_OUT}")

if __name__ == "__main__":
    main()
