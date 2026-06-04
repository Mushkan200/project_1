import pandas as pd
from sklearn.ensemble import RandomForestRegressor

df = pd.read_csv("student_data.csv")

df["performance_band"] = pd.cut(
    df["marks"],
    bins=[0, 50, 65, 80, 100],
    labels=["Needs Support", "Average", "Good", "Excellent"],
    include_lowest=True
)

avg_marks = round(df["marks"].mean(), 1)
avg_attendance = round(df["attendance"].mean(), 1)
at_risk_students = df[(df["marks"] < 60) | (df["attendance"] < 75)]

X = df[["attendance", "study_hours"]]
y = df["marks"]
model = RandomForestRegressor(random_state=42)
model.fit(X, y)

predicted_score = model.predict([[85, 3.5]])[0]

print("Average marks:", avg_marks)
print("Average attendance:", avg_attendance)
print("At-risk students:", len(at_risk_students))
print("Predicted score:", round(predicted_score, 2))
