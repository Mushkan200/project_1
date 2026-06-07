const API_BASE = "http://localhost:5000"; // Flask server (optional)
const USE_API  = true;                   // Set true to enable backend sync
const PAGE_SIZE = 10;

/* ---- STATE ---- */
let allStudents      = [];
let filteredStudents = [];
let currentPage      = 1;
let editingId        = null;    // null = adding, string = editing
let parsedCSVRows    = [];      // holds CSV rows before import
let marksChart, bandsChart, scatterChart;

/* ---- ID COUNTER ---- */
let idCounter = 1001;
function nextId() { return "S" + idCounter++; }

function getBand(marks) {
  if (marks >= 75) return "Distinction";
  if (marks >= 60) return "Merit";
  if (marks >= 40) return "Pass";
  return "At-Risk";
}

function markColor(m) {
  return m >= 75 ? "#6ee7b7" : m >= 60 ? "#818cf8" : m >= 40 ? "#fb923c" : "#f87171";
}

const NAMES = [
  "Aarav","Aisha","Arjun","Bhavna","Chirag","Deepika","Dev","Fatima",
  "Gaurav","Hina","Ishan","Jyoti","Karan","Lakshmi","Manav","Neha",
  "Omkar","Pooja","Rahul","Riya","Sahil","Sanya","Tanvi","Uday",
  "Varun","Vidya","Yash","Zara","Rohan","Priya","Amit","Simran",
  "Kunal","Meera","Nikhil","Anjali","Rohit","Kavya","Sumit","Divya",
  "Aditya","Nisha","Vivek","Sneha","Kartik","Ananya","Siddharth","Akash"
];

function rand(min, max) { return Math.round(Math.random() * (max - min) + min); }

const CLASS_PROFILES = {
  "Class A": { mu: 73, sd: 13 },
  "Class B": { mu: 65, sd: 15 },
  "Class C": { mu: 57, sd: 16 },
  "Class D": { mu: 52, sd: 18 },
};

function seedData() {
  allStudents = [];
  idCounter   = 1001;

  Object.entries(CLASS_PROFILES).forEach(([cls, { mu, sd }]) => {
    const count = rand(10, 14);
    for (let i = 0; i < count; i++) {
      const marks   = Math.min(100, Math.max(0, Math.round(mu + (Math.random() - 0.5) * 2 * sd)));
      const attend  = Math.min(100, Math.max(50, marks + rand(-15, 20)));
      const hours   = Math.min(12, Math.max(1, Math.round((marks / 100) * 9 + (Math.random() - 0.5) * 4)));
      const name    = NAMES[Math.floor(Math.random() * NAMES.length)] + " " +
                      String.fromCharCode(65 + Math.floor(Math.random() * 26)) + ".";
      allStudents.push({ id: nextId(), name, cls, marks, attend, hours, band: getBand(marks) });
    }
  });

  filteredStudents = [...allStudents];
  currentPage = 1;
  rebuildClassFilter();
  updateAll();
  showToast("✓ " + allStudents.length + " sample students loaded");

  if (USE_API) syncToServer(allStudents);
}

function openModal(id) {
  document.getElementById(id).classList.add("open");
  if (id === "add-modal" && !editingId) {
    clearForm();
    document.getElementById("modal-title").textContent = "Add New Student";
  }
}

function closeModal(id) {
  document.getElementById(id).classList.remove("open");
  if (id === "add-modal") { editingId = null; clearForm(); }
  if (id === "csv-modal") { parsedCSVRows = []; document.getElementById("csv-preview").innerHTML = ""; document.getElementById("csv-import-btn").disabled = true; }
}

function closeModalOutside(event, id) {
  if (event.target.id === id) closeModal(id);
}

function clearForm() {
  ["inp-name","inp-class","inp-marks","inp-attend","inp-hours"].forEach(id => {
    document.getElementById(id).value = "";
    document.getElementById(id).classList.remove("error");
  });
  ["err-name","err-class","err-marks","err-attend"].forEach(id => {
    document.getElementById(id).textContent = "";
  });
  document.getElementById("band-preview").textContent = "—";
  document.getElementById("band-preview").className = "band-preview";
}

/* Live band preview as user types marks */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("inp-marks").addEventListener("input", function () {
    const v = parseFloat(this.value);
    const preview = document.getElementById("band-preview");
    if (isNaN(v) || v < 0 || v > 100) {
      preview.textContent = "—";
      preview.className = "band-preview";
    } else {
      const b = getBand(v);
      preview.textContent = b;
      preview.className = "band-preview band-badge band-" + b.replace(" ", "-");
    }
  });
  initCharts();
  seedData();
});

function validateForm() {
  let valid = true;
  const fields = [
    { id: "inp-name",   err: "err-name",   label: "Name",       check: v => v.trim().length >= 2 },
    { id: "inp-class",  err: "err-class",  label: "Class",      check: v => v.trim().length >= 1 },
    { id: "inp-marks",  err: "err-marks",  label: "Marks",      check: v => !isNaN(v) && v >= 0 && v <= 100 },
    { id: "inp-attend", err: "err-attend", label: "Attendance", check: v => !isNaN(v) && v >= 0 && v <= 100 },
  ];
  fields.forEach(({ id, err, label, check }) => {
    const el  = document.getElementById(id);
    const val = el.value;
    const ok  = check(parseFloat(val) || val);
    el.classList.toggle("error", !ok);
    document.getElementById(err).textContent = ok ? "" : `${label} is required and must be valid.`;
    if (!ok) valid = false;
  });
  return valid;
}

function submitStudent() {
  if (!validateForm()) return;

  const name   = document.getElementById("inp-name").value.trim();
  const cls    = document.getElementById("inp-class").value.trim();
  const marks  = Math.round(parseFloat(document.getElementById("inp-marks").value));
  const attend = Math.round(parseFloat(document.getElementById("inp-attend").value));
  const hoursV = document.getElementById("inp-hours").value;
  const hours  = hoursV ? Math.max(1, Math.min(20, Math.round(parseFloat(hoursV)))) : 5;
  const band   = getBand(marks);

  if (editingId) {
    // Edit existing
    const idx = allStudents.findIndex(s => s.id === editingId);
    if (idx !== -1) {
      allStudents[idx] = { id: editingId, name, cls, marks, attend, hours, band };
      if (USE_API) updateOnServer(allStudents[idx]);
      showToast("✓ Student updated");
    }
  } else {
    // Add new
    const student = { id: nextId(), name, cls, marks, attend, hours, band };
    allStudents.push(student);
    if (USE_API) addToServer(student);
    showToast("✓ Student added — " + name);
  }

  closeModal("add-modal");
  rebuildClassFilter();
  applyFilters();
}

function openEditModal(id) {
  const s = allStudents.find(x => x.id === id);
  if (!s) return;
  editingId = id;
  document.getElementById("modal-title").textContent = "Edit Student";
  document.getElementById("inp-name").value   = s.name;
  document.getElementById("inp-class").value  = s.cls;
  document.getElementById("inp-marks").value  = s.marks;
  document.getElementById("inp-attend").value = s.attend;
  document.getElementById("inp-hours").value  = s.hours;
  const preview = document.getElementById("band-preview");
  preview.textContent = s.band;
  preview.className = "band-preview band-badge band-" + s.band.replace(" ", "-");
  openModal("add-modal");
}

function deleteStudent(id) {
  allStudents = allStudents.filter(s => s.id !== id);
  if (USE_API) deleteOnServer(id);
  rebuildClassFilter();
  applyFilters();
  showToast("Student removed");
}

function clearAllData() {
  if (!allStudents.length) return;
  if (!confirm("Clear all student data?")) return;
  allStudents = []; filteredStudents = [];
  idCounter = 1001;
  currentPage = 1;
  rebuildClassFilter();
  updateAll();
  showToast("All data cleared");
}

function rebuildClassFilter() {
  const sel = document.getElementById("f-class");
  const current = sel.value;
  const classes = [...new Set(allStudents.map(s => s.cls))].sort();
  sel.innerHTML = '<option value="all">All Classes</option>' +
    classes.map(c => `<option${current === c ? " selected" : ""}>${c}</option>`).join("");

  // Datalist for add form
  const dl = document.getElementById("class-suggestions");
  dl.innerHTML = classes.map(c => `<option value="${c}"/>`).join("");
}

function applyFilters() {
  const cls      = document.getElementById("f-class").value;
  const band     = document.getElementById("f-band").value;
  const minAtt   = +document.getElementById("f-attend").value;
  const sort     = document.getElementById("f-sort").value;
  const search   = document.getElementById("search-input").value.toLowerCase();

  filteredStudents = allStudents.filter(s => {
    if (cls !== "all" && s.cls !== cls) return false;
    if (band !== "all" && s.band !== band) return false;
    if (s.attend < minAtt) return false;
    if (search && !s.name.toLowerCase().includes(search) && !s.id.toLowerCase().includes(search)) return false;
    return true;
  });

  const sortFns = {
    marks:  (a, b) => b.marks - a.marks,
    attend: (a, b) => b.attend - a.attend,
    hours:  (a, b) => b.hours - a.hours,
    name:   (a, b) => a.name.localeCompare(b.name),
  };
  filteredStudents.sort(sortFns[sort] || sortFns.marks);

  currentPage = 1;
  updateAll();
}

function resetFilters() {
  document.getElementById("f-class").value  = "all";
  document.getElementById("f-band").value   = "all";
  document.getElementById("f-attend").value = 0;
  document.getElementById("att-val").textContent = "0";
  document.getElementById("f-sort").value   = "marks";
  document.getElementById("search-input").value = "";
  filteredStudents = [...allStudents];
  currentPage = 1;
  updateAll();
}

function updateAll() {
  updateKPIs();
  updateCharts();
  updateTable();
  updateInsights();
}

/* ---- KPIs ---- */
function updateKPIs() {
  const s = filteredStudents;
  document.getElementById("kpi-total").textContent = s.length;
  if (!s.length) {
    document.getElementById("kpi-marks").textContent  = "—";
    document.getElementById("kpi-attend").textContent = "—";
    document.getElementById("kpi-risk").textContent   = "0";
    return;
  }
  const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  document.getElementById("kpi-marks").textContent  = avg(s.map(x => x.marks)).toFixed(1) + "%";
  document.getElementById("kpi-attend").textContent = avg(s.map(x => x.attend)).toFixed(1) + "%";
  document.getElementById("kpi-risk").textContent   = s.filter(x => x.band === "At-Risk").length;
}

function initCharts() {
  Chart.defaults.color = "#e2e8f0";
  Chart.defaults.font  = { family: "'DM Sans', sans-serif", size: 11 };

  marksChart = new Chart(document.getElementById("chart-marks"), {
    type: "bar",
    data: {
      labels: [],
      datasets: [{
        label: "Avg Marks",
        data: [],
        backgroundColor: ["#6ee7b7","#818cf8","#fb923c","#f87171"],
        borderRadius: 7,
        borderSkipped: false,
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: "#2a2f3e" } },
        y: { grid: { color: "#2a2f3e" }, min: 0, max: 100 },
      },
      animation: { duration: 500 },
    }
  });

  bandsChart = new Chart(document.getElementById("chart-bands"), {
    type: "doughnut",
    data: {
      labels: ["Distinction","Merit","Pass","At-Risk"],
      datasets: [{
        data: [0,0,0,0],
        backgroundColor: ["#6ee7b7","#818cf8","#fb923c","#f87171"],
        borderWidth: 0,
      }]
    },
    options: {
      plugins: { legend: { position: "bottom", labels: { boxWidth: 10, padding: 14 } } },
      cutout: "65%",
      animation: { duration: 500 },
    }
  });

  scatterChart = new Chart(document.getElementById("chart-scatter"), {
    type: "scatter",
    data: {
      datasets: [{
        label: "Students",
        data: [],
        backgroundColor: "rgba(129,140,248,0.65)",
        pointRadius: 5,
        pointHoverRadius: 7,
      }]
    },
    options: {
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              const s = filteredStudents.find(x => x.attend === ctx.parsed.x && x.marks === ctx.parsed.y);
              return s ? `${s.name} | ${ctx.parsed.x}% att | ${ctx.parsed.y}% marks` : `${ctx.parsed.x}% | ${ctx.parsed.y}%`;
            }
          }
        }
      },
      scales: {
        x: { grid: { color: "#2a2f3e" }, title: { display: true, text: "Attendance (%)" }, min: 0, max: 100 },
        y: { grid: { color: "#2a2f3e" }, title: { display: true, text: "Marks (%)" }, min: 0, max: 100 },
      },
      animation: { duration: 400 },
    }
  });
}

function updateCharts() {
  const s = filteredStudents;
  if (!s.length) return;

  // Dynamic classes from data
  const classes = [...new Set(allStudents.map(x => x.cls))].sort();
  const colors  = ["#6ee7b7","#818cf8","#fb923c","#f87171","#38bdf8","#a78bfa"];
  marksChart.data.labels = classes;
  marksChart.data.datasets[0].data = classes.map(cls => {
    const sub = s.filter(x => x.cls === cls);
    return sub.length ? +(sub.reduce((a, b) => a + b.marks, 0) / sub.length).toFixed(1) : null;
  });
  marksChart.data.datasets[0].backgroundColor = classes.map((_, i) => colors[i % colors.length]);
  marksChart.update();

  const bands = ["Distinction","Merit","Pass","At-Risk"];
  bandsChart.data.datasets[0].data = bands.map(b => s.filter(x => x.band === b).length);
  bandsChart.update();

  scatterChart.data.datasets[0].data = s.map(x => ({ x: x.attend, y: x.marks }));
  scatterChart.update();
}

function updateTable() {
  const s      = filteredStudents;
  const total  = s.length;
  const pages  = Math.ceil(total / PAGE_SIZE) || 1;
  currentPage  = Math.min(currentPage, pages);
  const start  = (currentPage - 1) * PAGE_SIZE;
  const slice  = s.slice(start, start + PAGE_SIZE);

  document.getElementById("table-count").textContent = total + " record" + (total !== 1 ? "s" : "");

  const tbody = document.getElementById("table-body");
  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="empty-state">No students match the current filters.</td></tr>`;
  } else {
    tbody.innerHTML = slice.map(st => `
      <tr>
        <td style="color:var(--muted);font-size:0.76rem">${st.id}</td>
        <td style="font-weight:500">${escHtml(st.name)}</td>
        <td>${escHtml(st.cls)}</td>
        <td>
          ${st.marks}%
          <span class="progress-bar-wrap">
            <span class="progress-bar" style="width:${st.marks}%;background:${markColor(st.marks)}"></span>
          </span>
        </td>
        <td>${st.attend}%</td>
        <td>${st.hours}h</td>
        <td><span class="band-badge band-${st.band.replace(" ","-")}">${st.band}</span></td>
        <td>
          <div class="row-actions">
            <button class="row-btn" onclick="openEditModal('${st.id}')">✏ Edit</button>
            <button class="row-btn del" onclick="deleteStudent('${st.id}')">✕</button>
          </div>
        </td>
      </tr>`).join("");
  }

  // Pagination
  document.getElementById("page-info").textContent = `Page ${currentPage} of ${pages}`;
  const btns = document.getElementById("page-btns");
  const maxVisible = 5;
  let paginHTML = `<button class="page-btn" onclick="goPage(${currentPage - 1})" ${currentPage === 1 ? "disabled" : ""}>‹</button>`;
  for (let i = 1; i <= pages; i++) {
    if (pages > maxVisible && i > 2 && i < pages - 1 && Math.abs(i - currentPage) > 1) {
      if (i === 3 || i === pages - 2) paginHTML += `<span style="color:var(--muted);padding:0 4px">…</span>`;
      continue;
    }
    paginHTML += `<button class="page-btn${i === currentPage ? " active" : ""}" onclick="goPage(${i})">${i}</button>`;
  }
  paginHTML += `<button class="page-btn" onclick="goPage(${currentPage + 1})" ${currentPage === pages ? "disabled" : ""}>›</button>`;
  btns.innerHTML = paginHTML;
}

function goPage(p) {
  currentPage = p;
  updateTable();
  document.getElementById("filters-section").scrollIntoView({ behavior: "smooth", block: "start" });
}

function updateInsights() {
  const s = filteredStudents;
  if (!s.length) return;

  // Top class
  const classes = [...new Set(s.map(x => x.cls))];
  let best = null, bestAvg = -1;
  classes.forEach(cls => {
    const sub = s.filter(x => x.cls === cls);
    const avg = sub.reduce((a, b) => a + b.marks, 0) / sub.length;
    if (avg > bestAvg) { bestAvg = avg; best = cls; }
  });
  document.getElementById("ins-top").textContent = best
    ? `${best} leads with ${bestAvg.toFixed(1)}% average`
    : "—";

  // At-risk rate
  const riskPct = (s.filter(x => x.band === "At-Risk").length / s.length * 100).toFixed(0);
  document.getElementById("ins-risk").textContent = `${riskPct}% of students need support (marks < 40%)`;

  // Attendance vs marks correlation
  const hi = s.filter(x => x.attend >= 80);
  const lo = s.filter(x => x.attend < 80);
  if (hi.length && lo.length) {
    const hiAvg = (hi.reduce((a, b) => a + b.marks, 0) / hi.length).toFixed(1);
    const loAvg = (lo.reduce((a, b) => a + b.marks, 0) / lo.length).toFixed(1);
    document.getElementById("ins-corr").textContent =
      `≥80% attendance avg: ${hiAvg}% marks vs ${loAvg}% for lower attendance`;
  } else {
    document.getElementById("ins-corr").textContent = "Not enough data to compare groups.";
  }

  // Study hours
  const avgH = (s.reduce((a, b) => a + b.hours, 0) / s.length).toFixed(1);
  const distStudents = s.filter(x => x.band === "Distinction");
  const distH = distStudents.length
    ? (distStudents.reduce((a, b) => a + b.hours, 0) / distStudents.length).toFixed(1)
    : null;
  document.getElementById("ins-hours").textContent = distH
    ? `Avg ${avgH}h/wk overall; Distinction students average ${distH}h`
    : `Average study time: ${avgH} hours per week`;
}

function handleDrop(e) {
  e.preventDefault();
  document.getElementById("drop-zone").classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file && file.name.endsWith(".csv")) parseCSVFile(file);
  else showToast("Please drop a .csv file", true);
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) parseCSVFile(file);
}

function parseCSVFile(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    const lines  = e.target.result.trim().split(/\r?\n/);
    const header = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
    const rows   = [];
    const errors = [];

    lines.slice(1).forEach((line, idx) => {
      if (!line.trim()) return;
      const vals = line.split(",").map(v => v.trim());
      const row  = {};
      header.forEach((h, i) => { row[h] = vals[i] ?? ""; });

      // Map flexible header names
      const name   = row.name || row.student_name || row.full_name || "";
      const cls    = row.class || row.class_name || row.section || "";
      const marks  = parseFloat(row.marks || row.score || row.grade || "");
      const attend = parseFloat(row.attendance || row.attendance_pct || row.attendance_percent || "");
      const hours  = parseFloat(row.study_hours || row.hours || row.study_hrs || "") || 5;

      if (!name || !cls || isNaN(marks) || isNaN(attend)) {
        errors.push(`Row ${idx + 2}: missing/invalid data`);
        return;
      }
      if (marks < 0 || marks > 100 || attend < 0 || attend > 100) {
        errors.push(`Row ${idx + 2}: marks/attendance out of range`);
        return;
      }
      rows.push({ name, cls, marks: Math.round(marks), attend: Math.round(attend), hours: Math.min(20, Math.max(1, Math.round(hours))) });
    });

    parsedCSVRows = rows;
    const preview = document.getElementById("csv-preview");
    if (rows.length === 0) {
      preview.innerHTML = `<p style="color:var(--danger)">No valid rows found. Check column names.</p>`;
      document.getElementById("csv-import-btn").disabled = true;
    } else {
      const errHTML = errors.length ? `<p style="color:var(--accent3);margin-top:6px">${errors.length} row(s) skipped: ${errors.slice(0,3).join("; ")}</p>` : "";
      preview.innerHTML = `
        <p style="color:var(--accent);margin-bottom:6px">✓ ${rows.length} valid rows found${errors.length ? `, ${errors.length} skipped` : ""}</p>
        <table>
          <thead><tr><th>Name</th><th>Class</th><th>Marks</th><th>Attend</th></tr></thead>
          <tbody>${rows.slice(0,5).map(r => `<tr><td>${escHtml(r.name)}</td><td>${escHtml(r.cls)}</td><td>${r.marks}%</td><td>${r.attend}%</td></tr>`).join("")}
          ${rows.length > 5 ? `<tr><td colspan="4" style="color:var(--muted)">…and ${rows.length - 5} more</td></tr>` : ""}
          </tbody>
        </table>${errHTML}`;
      document.getElementById("csv-import-btn").disabled = false;
    }
  };
  reader.readAsText(file);
}

function importCSV() {
  if (!parsedCSVRows.length) return;
  const append = document.getElementById("csv-append").checked;
  if (!append) { allStudents = []; idCounter = 1001; }

  parsedCSVRows.forEach(r => {
    allStudents.push({
      id: nextId(), name: r.name, cls: r.cls,
      marks: r.marks, attend: r.attend, hours: r.hours,
      band: getBand(r.marks)
    });
  });

  if (USE_API) syncToServer(allStudents);

  closeModal("csv-modal");
  rebuildClassFilter();
  applyFilters();
  showToast(`✓ ${parsedCSVRows.length} students imported`);
  parsedCSVRows = [];
}

function exportCSV() {
  if (!filteredStudents.length) { showToast("No data to export", true); return; }
  const header = "ID,Name,Class,Marks,Attendance,Study Hours,Band\n";
  const rows   = filteredStudents.map(s =>
    `${s.id},"${s.name}",${s.cls},${s.marks},${s.attend},${s.hours},${s.band}`
  ).join("\n");
  const blob = new Blob([header + rows], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "student_performance.csv";
  a.click();
  showToast("✓ CSV exported (" + filteredStudents.length + " records)");
}

let toastTimer;
function showToast(msg, isError = false) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.toggle("error", isError);
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function syncToServer(students) {
  try {
    await fetch(`${API_BASE}/students/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(students),
    });
  } catch (e) { console.warn("API sync failed:", e); }
}

async function addToServer(student) {
  try {
    await fetch(`${API_BASE}/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(student),
    });
  } catch (e) { console.warn("API add failed:", e); }
}

async function updateOnServer(student) {
  try {
    await fetch(`${API_BASE}/students/${student.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(student),
    });
  } catch (e) { console.warn("API update failed:", e); }
}

async function deleteOnServer(id) {
  try {
    await fetch(`${API_BASE}/students/${id}`, { method: "DELETE" });
  } catch (e) { console.warn("API delete failed:", e); }
}

async function loadFromServer() {
  try {
    const res  = await fetch(`${API_BASE}/students`);
    const data = await res.json();
    allStudents = data;
    filteredStudents = [...allStudents];
    rebuildClassFilter();
    updateAll();
    showToast("✓ Loaded " + allStudents.length + " students from server");
  } catch (e) {
    console.warn("Could not load from server, using seed data:", e);
    seedData();
  }
}
