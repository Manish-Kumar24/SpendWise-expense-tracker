/* ── Data ──────────────────────────────────────── */
const CATS = {
  Food:          { icon:'🍔', color:'#f0b45a' },
  Transport:     { icon:'🚗', color:'#5aacee' },
  Shopping:      { icon:'🛍', color:'#c084fc' },
  Bills:         { icon:'💡', color:'#f05c5c' },
  Health:        { icon:'🏥', color:'#27c99a' },
  Entertainment: { icon:'🎬', color:'#9b7de8' },
  Salary:        { icon:'💼', color:'#27c99a' },
  Freelance:     { icon:'💻', color:'#5aacee' },
  Other:         { icon:'📦', color:'#7aaac8' }
};

// Load data from browser storage
let transactions = JSON.parse(localStorage.getItem('sw_tx') || '[]');
let budgets      = JSON.parse(localStorage.getItem('sw_budgets') || '{}');
let nextId       = parseInt(localStorage.getItem('sw_nextid') || '1');

// ❌ REMOVED: Hardcoded sample data block. 
// The app will now always start with exactly what the user has saved.

function saveTx()      { localStorage.setItem('sw_tx', JSON.stringify(transactions)); localStorage.setItem('sw_nextid', nextId); }
function saveBudgets() { localStorage.setItem('sw_budgets', JSON.stringify(budgets)); }

/* ── Helpers ─────────────────────────────────── */
const fmt = n => '₹' + Math.abs(Math.round(n)).toLocaleString('en-IN');
const today = () => new Date().toISOString().split('T')[0];
const fmtDate = s => { const d = new Date(s+'T00:00:00'); return d.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'}); };
const thisMonth = d => { const n = new Date(); return new Date(d+'T00:00:00').getMonth()===n.getMonth() && new Date(d+'T00:00:00').getFullYear()===n.getFullYear(); };
const thisWeek  = d => { const n = new Date(); const t = new Date(d+'T00:00:00'); const diff = (n - t)/(1000*60*60*24); return diff >= 0 && diff < 7; };

/* ── State ───────────────────────────────────── */
let txFilter = 'all';
let txType = 'expense';

/* ── Page Date ───────────────────────────────── */
document.getElementById('page-date').textContent = new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

/* ── Navigation ──────────────────────────────── */
const viewTitles = { dashboard:'Dashboard', transactions:'Transactions', analytics:'Analytics', budgets:'Budgets' };
function switchView(view, btn) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-'+view).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('page-title').textContent = viewTitles[view];
  document.getElementById('search-container').style.display = view === 'transactions' ? 'block' : 'none';
  if (view==='dashboard')     renderDashboard();
  if (view==='transactions')  renderTransactions();
  if (view==='analytics')     renderAnalytics();
  if (view==='budgets')       renderBudgets();
}

/* ── Filter ──────────────────────────────────── */
function setFilter(f, el) {
  txFilter = f;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderTransactions();
}

/* ── Modal ───────────────────────────────────── */
function openModal() {
  txType = 'expense';
  document.getElementById('btn-expense').className = 'type-btn exp-active';
  document.getElementById('btn-income').className  = 'type-btn';
  document.getElementById('inp-desc').value   = '';
  document.getElementById('inp-amount').value = '';
  document.getElementById('inp-note').value   = '';
  document.getElementById('inp-date').value   = today();
  document.getElementById('modal').classList.add('open');
  setTimeout(()=>document.getElementById('inp-desc').focus(), 100);
}
function closeModal() { document.getElementById('modal').classList.remove('open'); }

function setType(t) {
  txType = t;
  document.getElementById('btn-expense').className = 'type-btn' + (t==='expense' ? ' exp-active':'');
  document.getElementById('btn-income').className  = 'type-btn' + (t==='income'  ? ' inc-active':'');
}

function saveTransaction() {
  const desc   = document.getElementById('inp-desc').value.trim();
  const amount = parseFloat(document.getElementById('inp-amount').value);
  const cat    = document.getElementById('inp-cat').value;
  const date   = document.getElementById('inp-date').value;
  const note   = document.getElementById('inp-note').value.trim();
  if (!desc)        return shake('inp-desc');
  if (!amount || amount <= 0) return shake('inp-amount');
  if (!date)        return shake('inp-date');
  
  transactions.unshift({ id: nextId++, type: txType, desc, cat, amount, date, note });
  saveTx();
  closeModal();
  renderAll();
  showToast(txType==='income'?'Income added':'Expense recorded', txType==='income'?'var(--success)':'var(--danger)');
}

function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveTx(); renderAll();
  showToast('Transaction deleted', 'var(--warning)');
}

function shake(id) {
  const el = document.getElementById(id);
  el.style.borderColor = 'var(--danger)';
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = 'shakeX 0.3s ease';
  setTimeout(()=>{ el.style.borderColor=''; el.style.animation=''; }, 400);
}

/* ── Toast ───────────────────────────────────── */
let toastTimer;
function showToast(msg, color='var(--success)') {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  document.getElementById('toast-dot').style.background = color;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>t.classList.remove('show'), 2500);
}

/* ── Render All ──────────────────────────────── */
function renderAll() { renderDashboard(); renderTransactions(); renderSidebar(); }

/* ── Sidebar Balance ─────────────────────────── */
function renderSidebar() {
  const inc = transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const exp = transactions.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const bal = inc - exp;
  const el = document.getElementById('sb-balance');
  el.textContent = fmt(bal);
  el.style.color = bal >= 0 ? 'var(--success)' : 'var(--danger)';
}

/* ── Dashboard ───────────────────────────────── */
function renderDashboard() {
  const period = document.getElementById('dash-period')?.value || 'month';
  const filtered = transactions.filter(t => period==='all' ? true : period==='month' ? thisMonth(t.date) : thisWeek(t.date));
  const inc = filtered.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const exp = filtered.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const bal = inc - exp;
  const incCount = filtered.filter(t=>t.type==='income').length;
  const expCount = filtered.filter(t=>t.type==='expense').length;
  const savingsRate = inc > 0 ? Math.round((bal/inc)*100) : 0;

  document.getElementById('d-income').textContent      = fmt(inc);
  document.getElementById('d-expense').textContent     = fmt(exp);
  const balEl = document.getElementById('d-balance');
  balEl.textContent = fmt(bal);
  balEl.style.color = bal >= 0 ? 'var(--success)' : 'var(--danger)';
  document.getElementById('d-income-count').textContent  = incCount + ' transaction' + (incCount!==1?'s':'');
  document.getElementById('d-expense-count').textContent = expCount + ' transaction' + (expCount!==1?'s':'');
  document.getElementById('d-savings-rate').textContent  = 'Savings rate: ' + Math.max(0,savingsRate) + '%';

  renderSidebar();

  const recent = transactions.slice(0,5);
  document.getElementById('dash-recent-list').innerHTML = recent.length ? recent.map(txHTML).join('') : emptyHTML();

  renderCatChart('dash-cat-chart', filtered.filter(t=>t.type==='expense'));
}

/* ── Transactions View ───────────────────────── */
function renderTransactions() {
  const q = (document.getElementById('search-input')?.value||'').toLowerCase();
  let list = transactions;
  if (txFilter !== 'all') list = list.filter(t => t.type === txFilter);
  if (q) list = list.filter(t => t.desc.toLowerCase().includes(q) || t.cat.toLowerCase().includes(q) || (t.note||'').toLowerCase().includes(q));
  const container = document.getElementById('tx-main-list');
  container.innerHTML = list.length ? list.map(txHTML).join('') : emptyHTML();
}

/* ── Transaction HTML ────────────────────────── */
function txHTML(t) {
  const c = CATS[t.cat] || CATS.Other;
  const sign = t.type==='income' ? '+' : '-';
  const cls  = t.type==='income' ? 'pos' : 'neg';
  const badgeBg  = t.type==='income' ? 'var(--success-bg)' : 'var(--danger-bg)';
  const badgeClr = t.type==='income' ? 'var(--success)' : 'var(--danger)';
  return `<div class="tx-item">
    <div class="tx-cat-icon" style="background:${c.color}18;">${c.icon}</div>
    <div class="tx-info">
      <div class="tx-name">${t.desc}</div>
      <div class="tx-meta">
        <span class="tx-badge" style="background:${badgeBg};color:${badgeClr};">${t.type}</span>
        <span>${t.cat}</span>
        <span>${fmtDate(t.date)}</span>
        ${t.note ? `<span style="color:var(--text-2);">· ${t.note}</span>` : ''}
      </div>
    </div>
    <div class="tx-right">
      <div class="tx-amount ${cls}">${sign}${fmt(t.amount)}</div>
      <button class="tx-del-btn" onclick="deleteTransaction(${t.id})" title="Delete">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
      </button>
    </div>
  </div>`;
}

function emptyHTML() {
  return `<div class="empty-state">
    <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 2a8 8 0 100 16A8 8 0 0010 2zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clip-rule="evenodd"/></svg>
    No transactions found
  </div>`;
}

/* ── Category Chart ──────────────────────────── */
function renderCatChart(elId, expenses) {
  const cats = {};
  expenses.forEach(t => cats[t.cat] = (cats[t.cat]||0) + t.amount);
  const sorted = Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const max = sorted[0]?.[1] || 1;
  const total = sorted.reduce((s,[,v])=>s+v,0);
  const el = document.getElementById(elId);
  if (!el) return;
  if (!sorted.length) { el.innerHTML = '<div style="color:var(--text-3);font-size:13px;text-align:center;padding:20px 0;">No expense data</div>'; return; }
  el.innerHTML = sorted.map(([cat, amt]) => {
    const c = CATS[cat] || CATS.Other;
    const pct = Math.round(amt/max*100);
    const share = total > 0 ? Math.round(amt/total*100) : 0;
    return `<div class="cat-row">
      <div class="cat-icon-sm">${c.icon}</div>
      <div class="cat-name" style="color:var(--text-2);font-size:13px;">${cat}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${c.color};"></div></div>
      <div class="cat-pct">${share}%</div>
      <div class="cat-val">${fmt(amt)}</div>
    </div>`;
  }).join('');
}

/* ── Analytics View ──────────────────────────── */
function renderAnalytics() {
  const expenses = transactions.filter(t=>t.type==='expense');
  const income   = transactions.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const total    = expenses.reduce((s,t)=>s+t.amount,0);
  const largest  = expenses.reduce((max,t)=>t.amount>max?t.amount:max,0);
  const days     = [...new Set(expenses.map(t=>t.date))].length || 1;
  const savings  = income > 0 ? Math.max(0,Math.round(((income-total)/income)*100)) : 0;

  document.getElementById('an-avgday').textContent = fmt(total/days);
  document.getElementById('an-largest').textContent = fmt(largest);
  document.getElementById('an-savings').textContent = savings + '%';

  renderCatChart('an-cat-chart', expenses);
  renderDonut(expenses);
  renderTrendLine();
}

/* ── Donut Chart ─────────────────────────────── */
function renderDonut(expenses) {
  const cats = {};
  expenses.forEach(t => cats[t.cat]=(cats[t.cat]||0)+t.amount);
  const sorted = Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const total  = sorted.reduce((s,[,v])=>s+v,0);
  const svg    = document.getElementById('donut-svg');
  const legend = document.getElementById('donut-legend');
  if (!sorted.length || !total) { svg.innerHTML='<text x="80" y="85" text-anchor="middle" fill="#3d6280" font-size="13">No data</text>'; legend.innerHTML=''; return; }

  const cx=80,cy=80,r=58,innerR=36;
  let startAngle = -Math.PI/2;
  let paths = '';
  sorted.forEach(([cat, amt]) => {
    const c = CATS[cat]||CATS.Other;
    const angle = (amt/total)*Math.PI*2;
    const x1=cx+r*Math.cos(startAngle), y1=cy+r*Math.sin(startAngle);
    const x2=cx+r*Math.cos(startAngle+angle), y2=cy+r*Math.sin(startAngle+angle);
    const ix1=cx+innerR*Math.cos(startAngle), iy1=cy+innerR*Math.sin(startAngle);
    const ix2=cx+innerR*Math.cos(startAngle+angle), iy2=cy+innerR*Math.sin(startAngle+angle);
    const large = angle > Math.PI ? 1 : 0;
    paths += `<path d="M${ix1},${iy1} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} L${ix2},${iy2} A${innerR},${innerR} 0 ${large} 0 ${ix1},${iy1}" fill="${c.color}" opacity="0.85"/>`;
    startAngle += angle;
  });
  const topCat = sorted[0][0];
  const topPct = Math.round(sorted[0][1]/total*100);
  svg.innerHTML = paths + `<text x="${cx}" y="${cy-6}" text-anchor="middle" fill="#ddeeff" font-size="13" font-weight="500">${CATS[topCat]?.icon||''} ${topCat}</text><text x="${cx}" y="${cy+12}" text-anchor="middle" fill="#7aaac8" font-size="11">${topPct}%</text>`;

  legend.innerHTML = sorted.map(([cat,amt])=>{
    const c = CATS[cat]||CATS.Other;
    const pct = Math.round(amt/total*100);
    return `<div class="legend-row"><div class="legend-dot" style="background:${c.color};"></div><div class="legend-name">${c.icon} ${cat}</div><div class="legend-val">${pct}% · ${fmt(amt)}</div></div>`;
  }).join('');
}

/* ── Trend Line ──────────────────────────────── */
function renderTrendLine() {
  const svg = document.getElementById('trend-svg');
  if (!svg) return;
  const W = svg.parentElement.offsetWidth || 600;
  const H = 160;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  const months = [];
  for (let i=5; i>=0; i--) {
    const d = new Date(); d.setMonth(d.getMonth()-i);
    months.push({ label: d.toLocaleString('default',{month:'short'}), month: d.getMonth(), year: d.getFullYear() });
  }
  const income  = months.map(m => transactions.filter(t=>t.type==='income'  && new Date(t.date+'T00:00:00').getMonth()===m.month && new Date(t.date+'T00:00:00').getFullYear()===m.year).reduce((s,t)=>s+t.amount,0));
  const expense = months.map(m => transactions.filter(t=>t.type==='expense' && new Date(t.date+'T00:00:00').getMonth()===m.month && new Date(t.date+'T00:00:00').getFullYear()===m.year).reduce((s,t)=>s+t.amount,0));

  const allVals = [...income,...expense].filter(v=>v>0);
  const maxVal  = allVals.length ? Math.max(...allVals) : 1;
  const pad = { top:16, bottom:36, left:16, right:16 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;
  const xStep = chartW / (months.length - 1);

  const pts = (arr) => arr.map((v,i)=>`${pad.left + i*xStep},${pad.top + chartH - (v/maxVal)*chartH}`).join(' ');
  const incPts = pts(income);
  const expPts = pts(expense);

  const polyline = (pts, color) => `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  const dots = (arr, color) => arr.map((v,i)=>`<circle cx="${pad.left+i*xStep}" cy="${pad.top+chartH-(v/maxVal)*chartH}" r="4" fill="${color}" stroke="#0c1a2c" stroke-width="2"><title>${fmt(v)}</title></circle>`).join('');
  const labels = months.map((m,i)=>`<text x="${pad.left+i*xStep}" y="${H-8}" text-anchor="middle" fill="#3d6280" font-size="11">${m.label}</text>`).join('');

  svg.innerHTML = `
    <defs>
      <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#27c99a" stop-opacity="0.18"/><stop offset="100%" stop-color="#27c99a" stop-opacity="0"/></linearGradient>
      <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f05c5c" stop-opacity="0.14"/><stop offset="100%" stop-color="#f05c5c" stop-opacity="0"/></linearGradient>
    </defs>
    ${polyline(incPts,'#27c99a')}${polyline(expPts,'#f05c5c')}${dots(income,'#27c99a')}${dots(expense,'#f05c5c')}${labels}
    <text x="${W-16}" y="14" text-anchor="end" fill="#27c99a" font-size="11">Income</text>
    <text x="${W-16}" y="28" text-anchor="end" fill="#f05c5c" font-size="11">Expense</text>
  `;
}

/* ── Budgets View ────────────────────────────── */
function addBudget() {
  const cat   = document.getElementById('budget-cat').value;
  const limit = parseFloat(document.getElementById('budget-limit').value);
  if (!limit || limit <= 0) return;
  budgets[cat] = limit;
  saveBudgets();
  renderBudgets();
  document.getElementById('budget-limit').value = '';
  showToast('Budget set for ' + cat, 'var(--accent-lite)');
}

function deleteBudget(cat) {
  delete budgets[cat];
  saveBudgets();
  renderBudgets();
  showToast('Budget removed', 'var(--warning)');
}

function renderBudgets() {
  const progress = document.getElementById('budget-progress-list');
  const manage   = document.getElementById('budget-manage-list');
  const entries = Object.entries(budgets);

  if (!entries.length) {
    progress.innerHTML = '<div style="color:var(--text-3);font-size:13px;text-align:center;padding:20px 0;">No budgets set yet</div>';
    manage.innerHTML = '';
    return;
  }

  progress.innerHTML = entries.map(([cat, limit]) => {
    const spent = transactions.filter(t => t.type==='expense' && t.cat===cat && thisMonth(t.date)).reduce((s,t)=>s+t.amount, 0);
    const pct = Math.min(100, Math.round(spent/limit*100));
    const c = CATS[cat] || CATS.Other;
    const over = spent > limit;
    const barColor = over ? 'var(--danger)' : pct > 75 ? 'var(--warning)' : 'var(--success)';
    const pctColor = over ? 'var(--danger)' : pct > 75 ? 'var(--warning)' : 'var(--success)';
    return `<div class="budget-row">
      <div class="budget-row-top">
        <div class="budget-name">${c.icon} ${cat}</div>
        <div class="budget-pct-text" style="color:${pctColor};">${pct}%${over?' (over!)':''}</div>
      </div>
      <div class="budget-track"><div class="budget-fill" style="width:${pct}%;background:${barColor};"></div></div>
      <div class="budget-amounts"><span style="color:${pctColor};">${fmt(spent)} spent</span><span>${fmt(limit)} limit</span></div>
    </div>`;
  }).join('');

  manage.innerHTML = entries.map(([cat, limit]) => {
    const c = CATS[cat] || CATS.Other;
    return `<div class="budget-manage-row">
      <div class="bm-left">${c.icon} ${cat}</div>
      <div class="bm-right">
        <div class="bm-limit">${fmt(limit)}/mo</div>
        <button class="bm-del" onclick="deleteBudget('${cat}')" title="Remove">✕</button>
      </div>
    </div>`;
  }).join('');
}

/* ── Keyboard Shortcut ───────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key==='Escape') closeModal();
  if ((e.ctrlKey||e.metaKey) && e.key==='n') { e.preventDefault(); openModal(); }
});

/* ── Shake animation ─────────────────────────── */
const styleEl = document.createElement('style');
styleEl.textContent = '@keyframes shakeX{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}';
document.head.appendChild(styleEl);

/* ── Init ────────────────────────────────────── */
renderAll();
renderSidebar();
document.getElementById('inp-date').value = today();