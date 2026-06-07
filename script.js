let students = [];
let filtered = [];
let page = 1;
const pageSize = 10;
let editModeId = null;
let csvBuffer = [];
let charts = {};

const el = id => document.getElementById(id);

function toast(msg, type='info'){
  const t = el('toast');
  t.textContent = msg;
  t.style.borderColor = type === 'error' ? 'rgba(251,113,133,.45)' : 'rgba(124,140,255,.35)';
  t.classList.add('show');
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

function calcBand(marks){
  if (marks >= 85) return 'Distinction';
  if (marks >= 70) return 'Merit';
  if (marks >= 40) return 'Pass';
  return 'At-Risk';
}

function clamp(v, min, max){ return Math.min(max, Math.max(min, Number.isFinite(v) ? v : min)); }

function normalizeStudent(s, idxFallback = 1){
  const name = String(s.name ?? s.Name ?? '').trim();
  const cls = String(s.class ?? s.Class ?? s.className ?? s.ClassName ?? '').trim();
  const marks = Number(s.marks ?? s.Marks ?? 0);
  const attendance = Number(s.attendance ?? s.Attendance ?? 0);
  const study = Number(s.study_hours ?? s.studyHours ?? s.study ?? s["study hrs"] ?? s["Study Hrs"] ?? 0);
  const id = String(s.id ?? s.ID ?? `ST${String(idxFallback).padStart(3,'0')}`).trim();
  const band = s.band || calcBand(marks);

  return {
    id,
    name,
    className: cls,
    marks: clamp(marks, 0, 100),
    attendance: clamp(attendance, 0, 100),
    studyHours: clamp(study || 0, 0, 20) || 0,
    band
  };
}

function seedData(){
  students = [
    normalizeStudent({id:'ST001',name:'Aarav',class:'BCA 1',marks:86,attendance:92,study_hours:4.1},1),
    normalizeStudent({id:'ST002',name:'Diya',class:'BCA 1',marks:78,attendance:88,study_hours:3.4},2),
    normalizeStudent({id:'ST003',name:'Kunal',class:'BCA 2',marks:64,attendance:74,study_hours:2.7},3),
    normalizeStudent({id:'ST004',name:'Ananya',class:'B.Tech CSE',marks:91,attendance:95,study_hours:4.5},4),
    normalizeStudent({id:'ST005',name:'Rohan',class:'B.Tech CSE',marks:58,attendance:69,study_hours:2.2},5),
    normalizeStudent({id:'ST006',name:'Ishita',class:'BBA',marks:72,attendance:82,study_hours:3.0},6),
    normalizeStudent({id:'ST007',name:'Neha',class:'B.Com',marks:81,attendance:87,study_hours:3.6},7),
    normalizeStudent({id:'ST008',name:'Yash',class:'BCA 2',marks:67,attendance:78,study_hours:2.8},8),
    normalizeStudent({id:'ST009',name:'Meera',class:'BBA',marks:75,attendance:84,study_hours:3.1},9),
    normalizeStudent({id:'ST010',name:'Kabir',class:'B.Com',marks:54,attendance:65,study_hours:1.9},10),
    normalizeStudent({id:'ST011',name:'Tanya',class:'BCA 1',marks:83,attendance:90,study_hours:3.9},11),
    normalizeStudent({id:'ST012',name:'Vivek',class:'B.Tech CSE',marks:70,attendance:80,study_hours:3.1},12)
  ];
  page = 1;
  refreshAll();
  toast('Sample data loaded');
}

function clearAllData(){
  if(!confirm('Clear all student data?')) return;
  students = [];
  page = 1;
  refreshAll();
  toast('All data cleared', 'error');
}

function openModal(id){
  const modal = el(id);
  modal.classList.add('open');
  document.body.classList.add('modal-open');
  if(id === 'add-modal'){
    if(!editModeId) resetForm();
    setTimeout(() => el('inp-name').focus(), 50);
  }
}

function closeModal(id){
  el(id).classList.remove('open');
  document.body.classList.remove('modal-open');
  if(id === 'add-modal'){
    editModeId = null;
    el('modal-title').textContent = 'Add New Student';
  }
}

function closeModalOutside(event, id){
  if(event.target.id === id) closeModal(id);
}

function resetForm(){
  ['edit-id','inp-name','inp-class','inp-marks','inp-attend','inp-hours','err-name','err-class','err-marks','err-attend'].forEach(id => {
    const node = el(id);
    if(node) node.value !== undefined ? node.value = '' : node.textContent = '';
  });
  el('band-preview').textContent = '—';
}

function validateStudent(){
  const name = el('inp-name').value.trim();
  const cls = el('inp-class').value.trim();
  const marks = Number(el('inp-marks').value);
  const attend = Number(el('inp-attend').value);
  const hours = Number(el('inp-hours').value || 0);
  let ok = true;

  const setErr = (id, msg) => { el(id).textContent = msg; if(msg) ok = false; };
  setErr('err-name', name ? '' : 'Name is required.');
  setErr('err-class', cls ? '' : 'Class is required.');
  setErr('err-marks', Number.isFinite(marks) && marks >= 0 && marks <= 100 ? '' : 'Marks must be between 0 and 100.');
  setErr('err-attend', Number.isFinite(attend) && attend >= 0 && attend <= 100 ? '' : 'Attendance must be between 0 and 100.');

  if(Number.isFinite(hours) && hours > 20) {
    ok = false;
    toast('Study hours must be 20 or less', 'error');
  }
  return ok;
}

function submitStudent(){
  if(!validateStudent()) return;

  const student = normalizeStudent({
    id: editModeId || `ST${String(students.length + 1).padStart(3,'0')}`,
    name: el('inp-name').value.trim(),
    class: el('inp-class').value.trim(),
    marks: Number(el('inp-marks').value),
    attendance: Number(el('inp-attend').value),
    study_hours: Number(el('inp-hours').value || 0)
  }, students.length + 1);

  if(editModeId){
    students = students.map(s => s.id === editModeId ? student : s);
    toast('Student updated');
  }else{
    students.push(student);
    toast('Student added');
  }

  closeModal('add-modal');
  refreshAll();
}

function editStudent(id){
  const s = students.find(x => x.id === id);
  if(!s) return;
  editModeId = id;
  el('modal-title').textContent = 'Edit Student';
  el('edit-id').value = id;
  el('inp-name').value = s.name;
  el('inp-class').value = s.className;
  el('inp-marks').value = s.marks;
  el('inp-attend').value = s.attendance;
  el('inp-hours').value = s.studyHours;
  el('band-preview').textContent = s.band;
  openModal('add-modal');
}

function deleteStudent(id){
  if(!confirm('Delete this student?')) return;
  students = students.filter(s => s.id !== id);
  refreshAll();
  toast('Student deleted', 'error');
}

function applyFilters(){
  const q = el('search-input').value.trim().toLowerCase();
  const classVal = el('f-class').value;
  const bandVal = el('f-band').value;
  const minAttend = Number(el('f-attend').value);
  const sortBy = el('f-sort').value;

  filtered = students.filter(s => {
    const matchesQ = !q || s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q);
    const matchesClass = classVal === 'all' || s.className === classVal;
    const matchesBand = bandVal === 'all' || s.band === bandVal;
    const matchesAttend = s.attendance >= minAttend;
    return matchesQ && matchesClass && matchesBand && matchesAttend;
  });

  filtered.sort((a,b) => {
    if(sortBy === 'marks') return b.marks - a.marks;
    if(sortBy === 'attend') return b.attendance - a.attendance;
    if(sortBy === 'hours') return b.studyHours - a.studyHours;
    return a.name.localeCompare(b.name);
  });

  page = Math.min(page, Math.max(1, Math.ceil(filtered.length / pageSize) || 1));
  renderAll();
}

function resetFilters(){
  el('f-class').value = 'all';
  el('f-band').value = 'all';
  el('f-attend').value = 0;
  el('att-val').textContent = 0;
  el('f-sort').value = 'marks';
  el('search-input').value = '';
  applyFilters();
  toast('Filters reset');
}

function updateClassOptions(){
  const classes = [...new Set(students.map(s => s.className))].sort();
  el('f-class').innerHTML = `<option value="all">All Classes</option>` + classes.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  el('class-suggestions').innerHTML = classes.map(c => `<option value="${escapeHtml(c)}"></option>`).join('');
}

function avg(arr, key){
  if(!arr.length) return 0;
  return +(arr.reduce((sum, s) => sum + Number(s[key]), 0) / arr.length).toFixed(1);
}

function correlation(xs, ys){
  if(xs.length < 2 || ys.length < 2) return 0;
  const mx = xs.reduce((a,b)=>a+b,0) / xs.length;
  const my = ys.reduce((a,b)=>a+b,0) / ys.length;
  let num = 0, dx = 0, dy = 0;
  for(let i=0;i<xs.length;i++){
    const a = xs[i] - mx, b = ys[i] - my;
    num += a*b; dx += a*a; dy += b*b;
  }
  return dx && dy ? +(num / Math.sqrt(dx * dy)).toFixed(2) : 0;
}

function renderKPIs(data){
  el('kpi-total').textContent = data.length;
  el('kpi-marks').textContent = data.length ? avg(data, 'marks').toFixed(1) + '%' : '—';
  el('kpi-attend').textContent = data.length ? avg(data, 'attendance').toFixed(1) + '%' : '—';
  el('kpi-risk').textContent = data.filter(s => s.marks < 40).length;
}

function renderInsights(data){
  if(!data.length){
    el('ins-top').textContent = '—';
    el('ins-risk').textContent = '—';
    el('ins-corr').textContent = '—';
    el('ins-hours').textContent = '—';
    return;
  }

  const classes = [...new Set(data.map(s => s.className))];
  const classAvgs = classes.map(c => ({ className:c, avgMarks:avg(data.filter(s => s.className === c), 'marks') }))
    .sort((a,b) => b.avgMarks - a.avgMarks);

  const topClass = classAvgs[0];
  const riskRate = ((data.filter(s => s.marks < 40).length / data.length) * 100).toFixed(1);
  const corr = correlation(data.map(s => s.attendance), data.map(s => s.marks));
  const studyAvg = avg(data, 'studyHours');

  el('ins-top').textContent = `${topClass.className} (${topClass.avgMarks.toFixed(1)}% avg marks)`;
  el('ins-risk').textContent = `${riskRate}% of students are at risk`;
  el('ins-corr').textContent = `Correlation: ${corr}`;
  el('ins-hours').textContent = `${studyAvg.toFixed(1)} hrs/week average`;
}

function colorByIndex(idx){
  const palette = ['#7c8cff','#33d0c7','#a855f7','#ff8ccf','#fbbf24','#34d399','#fb7185','#60a5fa'];
  return palette[idx % palette.length];
}

function destroyCharts(){
  Object.values(charts).forEach(ch => ch && ch.destroy && ch.destroy());
  charts = {};
}

function renderCharts(data){
  destroyCharts();

  const classGroups = [...new Set(data.map(s => s.className))];
  const classMarks = classGroups.map(c => avg(data.filter(s => s.className === c), 'marks'));
  const bandOrder = ['Distinction', 'Merit', 'Pass', 'At-Risk'];
  const bandCounts = bandOrder.map(b => data.filter(s => s.band === b).length);

  const scatterData = data.map(s => ({
    x: s.attendance,
    y: s.marks,
    label: s.name,
    cls: s.className,
    hours: s.studyHours
  }));

  charts.marks = new Chart(el('chart-marks'), {
    type:'bar',
    data:{
      labels:classGroups,
      datasets:[{
        label:'Average Marks',
        data:classMarks,
        borderRadius:14,
        borderSkipped:false,
        backgroundColor:classMarks.map((v,i) => colorByIndex(i))
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      animation:{duration:900,easing:'easeOutQuart'},
      plugins:{
        legend:{display:false},
        tooltip:{
          callbacks:{
            label:ctx => ` ${ctx.raw}% average marks`
          }
        }
      },
      scales:{
        x:{grid:{display:false}, ticks:{color:'#9eb0c8'}},
        y:{beginAtZero:true, grid:{color:'rgba(255,255,255,.08)'}, ticks:{color:'#9eb0c8', callback:v => v + '%'}}
      }
    }
  });

  charts.bands = new Chart(el('chart-bands'), {
    type:'doughnut',
    data:{
      labels:bandOrder,
      datasets:[{
        data:bandCounts,
        borderWidth:0,
        hoverOffset:8,
        backgroundColor:['#fb7185','#fbbf24','#33d0c7','#7c8cff']
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      cutout:'66%',
      animation:{duration:900,easing:'easeOutQuart'},
      plugins:{
        legend:{
          position: window.innerWidth < 700 ? 'bottom' : 'right',
          labels:{color:'#edf4ff', usePointStyle:true, pointStyle:'circle', padding:16}
        },
        tooltip:{callbacks:{label:ctx => ` ${ctx.label}: ${ctx.raw} students`}}
      }
    }
  });

  charts.scatter = new Chart(el('chart-scatter'), {
    type:'scatter',
    data:{
      datasets:[{
        label:'Students',
        data:scatterData,
        pointRadius: scatterData.map(s => Math.max(4, 4 + s.hours * 0.7)),
        pointHoverRadius: scatterData.map(s => Math.max(6, 6 + s.hours * 0.7)),
        backgroundColor:scatterData.map((s,i) => colorByIndex(i)),
        borderColor:'rgba(255,255,255,.25)',
        borderWidth:1
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      animation:{duration:900,easing:'easeOutQuart'},
      plugins:{
        legend:{display:false},
        tooltip:{
          callbacks:{
            label:ctx => `${ctx.raw.label} · ${ctx.raw.cls} · Attendance ${ctx.raw.x}% · Marks ${ctx.raw.y}% · Study ${ctx.raw.hours} hrs`
          }
        }
      },
      scales:{
        x:{title:{display:true,text:'Attendance %',color:'#edf4ff'}, grid:{color:'rgba(255,255,255,.08)'}, ticks:{color:'#9eb0c8'}},
        y:{title:{display:true,text:'Marks %',color:'#edf4ff'}, beginAtZero:true, grid:{color:'rgba(255,255,255,.08)'}, ticks:{color:'#9eb0c8'}}
      }
    }
  });
}

function renderTable(data){
  const total = data.length;
  el('table-count').textContent = `${total} record${total === 1 ? '' : 's'}`;
  const start = (page - 1) * pageSize;
  const pageData = data.slice(start, start + pageSize);
  el('page-info').textContent = total ? `Page ${page} of ${Math.max(1, Math.ceil(total / pageSize))}` : 'No pages';

  el('page-btns').innerHTML = '';
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  for(let i=1;i<=totalPages;i++){
    const b = document.createElement('button');
    b.textContent = i;
    b.className = i === page ? 'active' : '';
    b.onclick = () => { page = i; renderTable(filtered); };
    el('page-btns').appendChild(b);
  }

  if(!pageData.length){
    el('table-body').innerHTML = `<tr><td colspan="8" class="empty-state">No data matches the current filters.</td></tr>`;
    return;
  }

  el('table-body').innerHTML = pageData.map(s => `
    <tr class="clickable" onclick="editStudent('${s.id}')">
      <td>${escapeHtml(s.id)}</td>
      <td>${escapeHtml(s.name)}</td>
      <td>${escapeHtml(s.className)}</td>
      <td>${s.marks}%</td>
      <td>${s.attendance}%</td>
      <td>${s.studyHours.toFixed(1)}</td>
      <td><span class="pill ${bandClass(s.band)}">${s.band}</span></td>
      <td><button class="btn btn-ghost" style="min-height:36px;padding:.45rem .8rem" onclick="event.stopPropagation();deleteStudent('${s.id}')">Delete</button></td>
    </tr>
  `).join('');
}

function bandClass(b){
  if(b === 'Distinction') return 'exc';
  if(b === 'Merit') return 'good';
  if(b === 'Pass') return 'avg';
  return 'support';
}

function renderAll(){
  renderKPIs(filtered);
  renderInsights(filtered);
  renderCharts(filtered);
  renderTable(filtered);
}

function refreshAll(){
  updateClassOptions();
  filtered = [...students];
  applyFilters();
}

function escapeHtml(str){
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#39;");
}

function exportCSV(){
  const rows = [
    ['id','name','class','marks','attendance','study_hours','band'],
    ...filtered.map(s => [s.id, s.name, s.className, s.marks, s.attendance, s.studyHours, s.band])
  ];
  const csv = rows.map(r => r.map(v => `"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'student-performance.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

function parseCsvText(text){
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if(!lines.length) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.replace(/^"|"$/g,'').trim());
    const row = {};
    headers.forEach((h,i) => row[h] = values[i] ?? '');
    return row;
  });
}

function handleFileSelect(event){
  const file = event.target.files?.[0];
  if(!file) return;
  readCsvFile(file);
}

function handleDrop(event){
  event.preventDefault();
  event.currentTarget.classList.remove('drag-over');
  const file = event.dataTransfer.files?.[0];
  if(file) readCsvFile(file);
}

function readCsvFile(file){
  if(!file.name.toLowerCase().endsWith('.csv')){
    toast('Please upload a CSV file', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    csvBuffer = parseCsvText(String(e.target.result || ''));
    renderCsvPreview();
    el('csv-import-btn').disabled = !csvBuffer.length;
    toast(`Loaded ${csvBuffer.length} CSV rows`);
  };
  reader.readAsText(file);
}

function renderCsvPreview(){
  const preview = el('csv-preview');
  if(!csvBuffer.length){
    preview.innerHTML = '';
    return;
  }
  const rows = csvBuffer.slice(0,5).map((r,i) => `<tr><td>${i+1}</td><td>${escapeHtml(r.name || r.Name || '')}</td><td>${escapeHtml(r.class || r.classname || r.className || '')}</td><td>${escapeHtml(r.marks || r.Marks || '')}</td><td>${escapeHtml(r.attendance || r.Attendance || '')}</td><td>${escapeHtml(r.study_hours || r.studyHours || '')}</td></tr>`).join('');
  preview.innerHTML = `
    <div class="table-scroll" style="margin-top:1rem;border:1px solid var(--border);border-radius:16px;overflow:auto">
      <table>
        <thead><tr><th>#</th><th>Name</th><th>Class</th><th>Marks</th><th>Attendance</th><th>Study Hrs</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function importCSV(){
  if(!csvBuffer.length) return;
  const append = el('csv-append').checked;
  const imported = csvBuffer.map((r, i) => normalizeStudent(r, students.length + i + 1)).filter(s => s.name && s.className);
  if(!imported.length){
    toast('No valid rows found', 'error');
    return;
  }
  students = append ? students.concat(imported) : imported;
  closeModal('csv-modal');
  csvBuffer = [];
  el('csv-import-btn').disabled = true;
  refreshAll();
  toast(`${imported.length} students imported`);
}

function syncBandPreview(){
  const marks = Number(el('inp-marks').value);
  el('band-preview').textContent = Number.isFinite(marks) ? calcBand(marks) : '—';
}

function bindEvents(){
  ['f-class','f-band','f-attend','f-sort','search-input'].forEach(id => {
    el(id).addEventListener('input', applyFilters);
    el(id).addEventListener('change', applyFilters);
  });

  el('inp-marks').addEventListener('input', syncBandPreview);

  document.addEventListener('keydown', e => {
    if(e.key === 'Escape'){
      ['add-modal','csv-modal'].forEach(id => closeModal(id));
    }
  });
}

window.seedData = seedData;
window.clearAllData = clearAllData;
window.openModal = openModal;
window.closeModal = closeModal;
window.closeModalOutside = closeModalOutside;
window.submitStudent = submitStudent;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.exportCSV = exportCSV;
window.handleFileSelect = handleFileSelect;
window.handleDrop = handleDrop;
window.importCSV = importCSV;
window.editStudent = editStudent;
window.deleteStudent = deleteStudent;

document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  seedData();
});
