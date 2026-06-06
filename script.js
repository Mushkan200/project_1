const students = [
  {id:'ST001',name:'Aarav',className:'BCA 1',marks:86,attendance:92,study:4.1,band:'Excellent'},
  {id:'ST002',name:'Diya',className:'BCA 1',marks:78,attendance:88,study:3.4,band:'Good'},
  {id:'ST003',name:'Kunal',className:'BCA 2',marks:64,attendance:74,study:2.7,band:'Average'},
  {id:'ST004',name:'Ananya',className:'B.Tech CSE',marks:91,attendance:95,study:4.5,band:'Excellent'},
  {id:'ST005',name:'Rohan',className:'B.Tech CSE',marks:58,attendance:69,study:2.2,band:'Needs Support'},
  {id:'ST006',name:'Ishita',className:'BBA',marks:72,attendance:82,study:3.0,band:'Good'},
  {id:'ST007',name:'Neha',className:'B.Com',marks:81,attendance:87,study:3.6,band:'Excellent'},
  {id:'ST008',name:'Yash',className:'BCA 2',marks:67,attendance:78,study:2.8,band:'Average'},
  {id:'ST009',name:'Meera',className:'BBA',marks:75,attendance:84,study:3.1,band:'Good'},
  {id:'ST010',name:'Kabir',className:'B.Com',marks:54,attendance:65,study:1.9,band:'Needs Support'},
  {id:'ST011',name:'Tanya',className:'BCA 1',marks:83,attendance:90,study:3.9,band:'Excellent'},
  {id:'ST012',name:'Vivek',className:'B.Tech CSE',marks:70,attendance:80,study:3.1,band:'Good'},
  {id:'ST013',name:'Simran',className:'BCA 2',marks:61,attendance:72,study:2.4,band:'Average'},
  {id:'ST014',name:'Harsh',className:'BBA',marks:88,attendance:91,study:4.0,band:'Excellent'},
  {id:'ST015',name:'Priya',className:'B.Com',marks:73,attendance:85,study:3.0,band:'Good'}
];

const bandOrder = ['Needs Support','Average','Good','Excellent'];
const state = {className:'All', band:'All', attendance:'All', sortBy:'marks-desc'};
const avg = arr => arr.length ? +(arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1) : 0;
const pillClass = band => band === 'Excellent' ? 'exc' : band === 'Good' ? 'good' : band === 'Average' ? 'avg' : 'support';
const attendanceZoneOf = a => a >= 90 ? '90% and above' : a >= 75 ? '75% to 89%' : 'Below 75%';
const el = id => document.getElementById(id);
const root = document.documentElement;
const isMobile = () => window.matchMedia('(max-width: 768px)').matches;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const filteredData = () => {
  let data = [...students];
  if (state.className !== 'All') data = data.filter(s => s.className === state.className);
  if (state.band !== 'All') data = data.filter(s => s.band === state.band);
  if (state.attendance !== 'All') data = data.filter(s => attendanceZoneOf(s.attendance) === state.attendance);
  const sorters = {
    'marks-desc': (a,b) => b.marks - a.marks,
    'attendance-desc': (a,b) => b.attendance - a.attendance,
    'study-desc': (a,b) => b.study - a.study
  };
  return data.sort(sorters[state.sortBy]);
};

const fillFilters = () => {
  const classes = ['All', ...new Set(students.map(s => s.className))];
  const bands = ['All', ...bandOrder];
  const attendance = ['All', 'Below 75%', '75% to 89%', '90% and above'];

  el('classFilter').innerHTML = classes.map(v => `<option>${v}</option>`).join('');
  el('bandFilter').innerHTML = bands.map(v => `<option>${v}</option>`).join('');
  el('attendanceFilter').innerHTML = attendance.map(v => `<option>${v}</option>`).join('');

  el('classFilter').addEventListener('change', e => { state.className = e.target.value; update(); });
  el('bandFilter').addEventListener('change', e => { state.band = e.target.value; update(); });
  el('attendanceFilter').addEventListener('change', e => { state.attendance = e.target.value; update(); });
  el('sortFilter').addEventListener('change', e => { state.sortBy = e.target.value; update(); });
};

const populateKPIs = data => {
  el('kpiStudents').textContent = data.length;
  el('kpiMarks').textContent = avg(data.map(s => s.marks)) + '%';
  el('kpiAttendance').textContent = avg(data.map(s => s.attendance)) + '%';
  el('kpiRisk').textContent = data.filter(s => s.marks < 60 || s.attendance < 75).length;
  el('kpiStudentsNote').textContent = data.length === students.length ? 'Full dataset' : 'Filtered view';
  el('kpiMarksNote').textContent = `${data.filter(s => s.marks >= 80).length} students scoring 80%+`;
  el('kpiAttendanceNote').textContent = `${data.filter(s => s.attendance >= 90).length} at 90%+ attendance`;
  el('kpiRiskNote').textContent = 'Support priority';
};

const renderTable = data => {
  el('tableSummary').textContent = `Showing ${data.length} records in the current slice.`;
  el('studentTable').innerHTML = data.map(s => `<tr><td>${s.id}</td><td>${s.name}</td><td>${s.className}</td><td>${s.marks}%</td><td>${s.attendance}%</td><td>${s.study.toFixed(1)} hrs</td><td><span class="pill ${pillClass(s.band)}">${s.band}</span></td></tr>`).join('');
};

const renderInsights = data => {
  if (!data.length) {
    el('insights').innerHTML = '<div class="insight-item"><small>No data</small><strong>No records match the filters.</strong><p>Try widening one or more filters.</p></div>';
    return;
  }

  const classAverages = [...new Set(data.map(s => s.className))]
    .map(c => ({c, a: avg(data.filter(x => x.className === c).map(x => x.marks))}))
    .sort((a,b)=>b.a-a.a);

  const best = [...data].sort((a,b)=>b.marks-a.marks)[0];
  const risk = data.filter(s => s.marks < 60 || s.attendance < 75);

  const xs = data.map(s => s.attendance), ys = data.map(s => s.marks), n = xs.length;
  const mx = avg(xs), my = avg(ys);
  let num=0, dx=0, dy=0;
  for(let i=0;i<n;i++){
    const a=xs[i]-mx, b=ys[i]-my;
    num+=a*b; dx+=a*a; dy+=b*b;
  }
  const corr = dx && dy ? +(num/Math.sqrt(dx*dy)).toFixed(2) : 0;

  el('insights').innerHTML = `
    <div class="insight-item"><small>Top cohort</small><strong>${classAverages[0].c} leads with ${classAverages[0].a}% average marks</strong><p>Highest average class in the current view.</p></div>
    <div class="insight-item"><small>Relationship</small><strong>Attendance vs marks correlation: ${corr}</strong><p>Shows whether attendance and marks rise together.</p></div>
    <div class="insight-item"><small>Risk signal</small><strong>${risk.length} students need follow-up support</strong><p>These students may need extra attention.</p></div>
    <div class="insight-item"><small>Highest score</small><strong>${best.name} has the strongest score at ${best.marks}%</strong><p>Top performer in the current slice.</p></div>
  `;
};

const layoutBase = () => {
  const c = getComputedStyle(root);
  const mobile = isMobile();
  return {
    paper_bgcolor:'transparent',
    plot_bgcolor:'transparent',
    font:{family:'Inter, sans-serif', size: mobile ? 11 : 13, color:c.getPropertyValue('--text').trim()},
    margin: mobile ? {t:30,r:10,b:40,l:38} : {t:40,r:20,b:45,l:50},
    title:{x:0, font:{size: mobile ? 14 : 16}}
  };
};

const renderCharts = data => {
  const c = getComputedStyle(root);
  const mobile = isMobile();

  const byClass = [...new Set(data.map(s => s.className))]
    .map(className => ({className, marks: avg(data.filter(s => s.className === className).map(s => s.marks))}));

  Plotly.react('marksByClass', [{
    x: byClass.map(d=>d.className),
    y: byClass.map(d=>d.marks),
    type:'bar',
    marker:{
      color: byClass.map(d => d.marks),
      colorscale:[[0,c.getPropertyValue('--warning').trim()],[1,c.getPropertyValue('--primary').trim()]]
    },
    hovertemplate:'%{x}<br>Average Marks: %{y}%<extra></extra>'
  }], {
    ...layoutBase(),
    yaxis:{title:'Marks %', gridcolor:c.getPropertyValue('--border').trim(), tickfont:{size: mobile ? 10 : 12}},
    xaxis:{showgrid:false, tickfont:{size: mobile ? 10 : 12}},
    title:{text:'Average Marks by Class', x:0, font:{size: mobile ? 14 : 16}}
  }, {responsive:true, displayModeBar:false});

  Plotly.react('performanceBand', [{
    labels: bandOrder,
    values: bandOrder.map(b => data.filter(s => s.band === b).length),
    type:'pie',
    hole:.62,
    sort:false,
    textinfo: mobile ? 'label+percent' : 'label+value',
    marker:{
      colors:[
        c.getPropertyValue('--danger').trim(),
        c.getPropertyValue('--warning').trim(),
        c.getPropertyValue('--accent').trim(),
        c.getPropertyValue('--primary').trim()
      ]
    }
  }], {
    ...layoutBase(),
    title:{text:'Performance Bands', x:0, font:{size: mobile ? 14 : 16}},
    showlegend: !mobile,
    legend:{orientation: mobile ? 'h' : 'v', x:0, y: mobile ? -0.15 : 1}
  }, {responsive:true, displayModeBar:false});

  Plotly.react('attendanceScatter', [{
    x: data.map(s => s.attendance),
    y: data.map(s => s.marks),
    text: data.map(s => s.name),
    mode:'markers',
    type:'scatter',
    marker:{
      size: data.map(s => mobile ? 8 + s.study * 1.4 : 10 + s.study * 2),
      color: data.map(s => s.study),
      colorscale:'Tealgrn',
      showscale: !mobile
    },
    hovertemplate:'%{text}<br>Attendance: %{x}%<br>Marks: %{y}%<extra></extra>'
  }], {
    ...layoutBase(),
    yaxis:{title:'Marks %', gridcolor:c.getPropertyValue('--border').trim(), tickfont:{size: mobile ? 10 : 12}},
    xaxis:{title:'Attendance %', gridcolor:c.getPropertyValue('--border').trim(), tickfont:{size: mobile ? 10 : 12}},
    title:{text:'Attendance vs Marks', x:0, font:{size: mobile ? 14 : 16}}
  }, {responsive:true, displayModeBar:false});

  Plotly.react('studyHoursBox', bandOrder.map(b => ({
    y: data.filter(s => s.band === b).map(s => s.study),
    name: b,
    type:'box',
    boxpoints: mobile ? false : 'all',
    jitter:.35,
    pointpos:0
  })), {
    ...layoutBase(),
    yaxis:{title:'Study Hours', gridcolor:c.getPropertyValue('--border').trim(), tickfont:{size: mobile ? 10 : 12}},
    title:{text:'Study Hours by Band', x:0, font:{size: mobile ? 14 : 16}},
    showlegend: !mobile
  }, {responsive:true, displayModeBar:false});
};

const exportCsv = data => {
  const csv = ['Student ID,Name,Class,Marks,Attendance,Study Hours,Performance Band', ...data.map(s => [s.id,s.name,s.className,s.marks,s.attendance,s.study,s.band].join(','))].join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'student-performance.csv';
  a.click();
  URL.revokeObjectURL(a.href);
};

function animateCount(node, target, duration = 1200) {
  if (prefersReducedMotion) {
    node.textContent = target;
    return;
  }
  const targetValue = Number(target);
  const isDecimal = String(target).includes('.');
  const startTime = performance.now();

  function tick(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = targetValue * eased;
    node.textContent = isDecimal ? value.toFixed(1) : Math.round(value);
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

const update = () => {
  const data = filteredData();
  populateKPIs(data);
  renderTable(data);
  renderInsights(data);
  renderCharts(data);
};

const themeToggle = () => {
  root.setAttribute('data-theme', root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  update();
};

document.addEventListener('DOMContentLoaded', () => {
  fillFilters();
  animateCount(el('heroStat1'), 15, 1000);
  animateCount(el('heroStat2'), 4, 900);
  animateCount(el('heroStat3'), 1, 800);
  update();
  el('themeToggle').addEventListener('click', themeToggle);
  el('exportCsv').addEventListener('click', () => exportCsv(filteredData()));
  el('exportCsvHero').addEventListener('click', () => exportCsv(filteredData()));
  window.addEventListener('resize', () => renderCharts(filteredData()));
});
