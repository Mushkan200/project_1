# project_1
# Student Performance Insights Dashboard

An analytics dashboard for exploring student performance data with KPI cards, interactive charts, filters, and a responsive layout that works smoothly on desktop, tablet, and mobile devices.

## Overview

This project presents student performance data in a clean, user-friendly interface designed for easy analysis. It combines a polished dark visual style with responsive design so the dashboard remains readable and usable across different screen sizes.

## Key Features

- Responsive layout for desktop, tablet, and mobile.
- Interactive filters for class, performance band, attendance, and sorting.
- KPI cards for quick summary metrics.
- Plotly charts with responsive resizing.
- Insight cards that explain patterns in simple language.
- Student table with CSV export.
- Theme toggle for light and dark modes.

## Mobile Responsive Upgrade

The dashboard was improved for mobile use by:
- Stacking sections vertically on smaller screens.
- Making buttons and select inputs touch-friendly.
- Reducing chart margins and font sizes for smaller displays.
- Hiding or simplifying chart elements that take too much space on mobile.
- Keeping the table horizontally scrollable instead of breaking the layout.

These changes help the website stay usable on phones and tablets without needing a separate mobile version.

## File Structure

- `index.html` — page structure and content.
- `styles.css` — dark premium styling and responsive layout rules.
- `script.js` — data processing, filters, charts, and CSV export.
- `analytics.py` — Python data cleaning, grouping, and prediction logic.
- `student_data.csv` — input dataset for analysis.

## Technologies Used

- HTML5
- CSS3
- JavaScript
- Plotly.js
- Python
- Pandas
- scikit-learn

## Python Analytics

Python is used for:
- Cleaning and preparing the student dataset.
- Creating performance bands with `pandas.cut`.
- Calculating average marks, attendance, and at-risk counts.
- Training a simple `RandomForestRegressor` model for prediction.

## Responsive Design Notes

The dashboard uses a mobile-first responsive approach with CSS Grid, Flexbox, and media queries. The layout adapts to different screen widths, while Plotly charts are configured to resize fluidly so the dashboard remains readable on smaller devices.

## Future Improvements

- Add search for individual students.
- Add downloadable reports in PDF format.
- Connect the dashboard to a live backend or database.
- Add more chart types and deeper academic insights.

## License

This project is open for personal and educational use.
