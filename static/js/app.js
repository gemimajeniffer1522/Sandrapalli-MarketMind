/* ═══════════════════════════════════════════════════════════════
   Sandrapalli MarketMind — Frontend Logic
   ═══════════════════════════════════════════════════════════════ */

const API = '';  // same origin; change to http://localhost:5000 if running separately

// ─── Clock ────────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const mm = String(now.getUTCMinutes()).padStart(2, '0');
  const ss = String(now.getUTCSeconds()).padStart(2, '0');
  document.getElementById('clock').textContent = `${hh}:${mm}:${ss} UTC`;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const days = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  document.getElementById('clockDate').textContent =
    `${days[now.getUTCDay()]} · ${months[now.getUTCMonth()]} ${now.getUTCDate()}, ${now.getUTCFullYear()}`;
}
updateClock();
setInterval(updateClock, 1000);

// ─── Ticker Bar ───────────────────────────────────────────────
let tickerData = [];

async function loadTicker() {
  try {
    const res = await fetch(`${API}/api/ticker-data`);
    tickerData = await res.json();
    renderTicker(tickerData);
  } catch(e) {
    renderTickerFallback();
  }
}

function renderTicker(data) {
  const inner = document.getElementById('tickerInner');
  // Duplicate for seamless scroll
  const html = [...data, ...data].map(d => {
    const up = d.changePercent >= 0;
    return `<span class="ticker-item">
      <span class="ti-sym">${d.symbol}</span>
      <span class="ti-price">${fmtPrice(d.price)}</span>
      <span class="ti-chg ${up ? 'up':'dn'}">${up?'+':''}${d.changePercent.toFixed(2)}%</span>
    </span>`;
  }).join('');
  inner.innerHTML = html;
}

function renderTickerFallback() {
  const items = [
    {symbol:'AAPL',price:189.30,changePercent:1.24},
    {symbol:'MSFT',price:415.60,changePercent:0.88},
    {symbol:'GOOGL',price:175.40,changePercent:-0.32},
    {symbol:'TSLA',price:248.50,changePercent:-1.15},
    {symbol:'NVDA',price:875.20,changePercent:2.40},
  ];
  renderTicker(items);
}
loadTicker();
setInterval(loadTicker, 30000); // refresh every 30s

// ─── Tabs ─────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`panel${capitalize(btn.dataset.tab)}`).classList.add('active');
  });
});

// ─── Quick Chips ──────────────────────────────────────────────
document.querySelectorAll('.chip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.getElementById('searchInput').value = chip.textContent;
    doAnalyze();
  });
});

// ─── Search / Analyze ─────────────────────────────────────────
document.getElementById('analyzeBtn').addEventListener('click', doAnalyze);
document.getElementById('searchInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') doAnalyze();
});

let priceChart = null;
let currentSymbol = '';
let currentPeriod = '3mo';

async function doAnalyze() {
  const sym = document.getElementById('searchInput').value.trim().toUpperCase();
  if (!sym) return;
  currentSymbol = sym;
  showLoading(true);
  try {
    const res = await fetch(`${API}/api/analyze/${sym}?period=${currentPeriod}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderResults(data);
    showLoading(false);
  } catch(err) {
    console.error(err);
    showLoading(false);
    alert(`Could not analyze ${sym}. Make sure the backend is running.`);
  }
}

function showLoading(state) {
  document.getElementById('loadingPanel').style.display = state ? 'flex' : 'none';
  document.getElementById('resultsGrid').style.display = state ? 'none' : '';
  if (state) document.getElementById('resultsGrid').style.display = 'none';
}

function renderResults(data) {
  const { quote, history, lstm, sentiment, support, resistance } = data;

  // Quote card
  const curr = quote.currency === 'INR' ? '₹' : '$';
  document.getElementById('qSymbol').textContent = quote.symbol;
  document.getElementById('qPrice').textContent = `${curr}${fmtPrice(quote.price)}`;
  const upDown = quote.changePercent >= 0;
  const qChg = document.getElementById('qChange');
  qChg.textContent = `${upDown?'+':''}${quote.change} (${upDown?'+':''}${quote.changePercent}%)`;
  qChg.className = `quote-change ${upDown ? 'up' : 'dn'}`;
  document.getElementById('qVolume').textContent = fmtVolume(quote.volume);
  document.getElementById('qMktCap').textContent = quote.marketCap ? `${curr}${quote.marketCap}B` : '—';
  document.getElementById('qPE').textContent = quote.pe || '—';
  document.getElementById('q52L').textContent = `${curr}${fmtPrice(quote.week52Low)}`;
  document.getElementById('q52H').textContent = `${curr}${fmtPrice(quote.week52High)}`;
  document.getElementById('qExchange').textContent = quote.exchange;

  // LSTM Signal card
  const badge = document.getElementById('signalBadge');
  badge.textContent = lstm.signal;
  badge.className = `signal-badge ${lstm.signal.replace(' ', '_')}`;
  document.getElementById('confBar').style.width = `${lstm.confidence}%`;
  document.getElementById('confValue').textContent = `${lstm.confidence}%`;
  document.getElementById('sRSI').textContent = `${lstm.rsi} ${rsiLabel(lstm.rsi)}`;
  document.getElementById('sMACD').textContent = lstm.macd > 0 ? `+${lstm.macd}` : lstm.macd;
  document.getElementById('sVol').textContent = `${lstm.volatility}% ann.`;
  document.getElementById('sSMA20').textContent = `${curr}${fmtPrice(lstm.sma20)}`;
  document.getElementById('sSMA50').textContent = `${curr}${fmtPrice(lstm.sma50)}`;
  document.getElementById('sPred').textContent = `${curr}${fmtPrice(lstm.predicted_price)}`;

  // Sentiment card
  const sentEl = document.getElementById('sentLabel');
  sentEl.textContent = sentiment.label;
  sentEl.className = `sentiment-label ${sentiment.label}`;
  setSbar('sbOverall', 'sbOverallV', sentiment.overall);
  setSbar('sbNews', 'sbNewsV', sentiment.news);
  setSbar('sbSocial', 'sbSocialV', sentiment.social);
  setSbar('sbAnalyst', 'sbAnalystV', sentiment.analyst);
  document.getElementById('srSupport').textContent = `${curr}${fmtPrice(support)}`;
  document.getElementById('srResist').textContent = `${curr}${fmtPrice(resistance)}`;

  // Chart
  renderChart(history, quote.symbol);

  document.getElementById('resultsGrid').style.display = 'grid';
}

function setSbar(barId, valId, val) {
  const pct = Math.max(0, Math.min(100, val));
  document.getElementById(barId).style.width = `${pct}%`;
  document.getElementById(valId).textContent = `${pct.toFixed(0)}`;
}

function renderChart(history, symbol) {
  const ctx = document.getElementById('priceChart').getContext('2d');
  const labels = history.dates;
  const prices = history.closes;
  const isUp = prices[prices.length - 1] >= prices[0];
  const color = isUp ? '#00ff88' : '#ff3d5a';
  const colorDim = isUp ? 'rgba(0,255,136,0.08)' : 'rgba(255,61,90,0.08)';

  if (priceChart) { priceChart.destroy(); }

  priceChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: symbol,
        data: prices,
        borderColor: color,
        borderWidth: 1.5,
        pointRadius: 0,
        fill: true,
        backgroundColor: colorDim,
        tension: 0.3,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0c1e2e',
          borderColor: '#1a3a50',
          borderWidth: 1,
          titleColor: '#5a7a8a',
          bodyColor: '#c8dde8',
          titleFont: { family: "'Share Tech Mono'", size: 10 },
          bodyFont: { family: "'Share Tech Mono'", size: 11 },
          callbacks: {
            label: ctx => `  $${ctx.parsed.y.toFixed(2)}`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(26,58,80,0.5)', drawTicks: false },
          ticks: {
            color: '#3a5a6a',
            font: { family: "'Share Tech Mono'", size: 9 },
            maxTicksLimit: 8,
            maxRotation: 0,
          }
        },
        y: {
          grid: { color: 'rgba(26,58,80,0.5)', drawTicks: false },
          ticks: {
            color: '#3a5a6a',
            font: { family: "'Share Tech Mono'", size: 9 },
            callback: v => `$${v.toFixed(0)}`
          },
          position: 'right'
        }
      }
    }
  });
}

// ─── Period Buttons ───────────────────────────────────────────
document.querySelectorAll('.pbtn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pbtn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentPeriod = btn.dataset.period;
    if (currentSymbol) doAnalyze();
  });
});

// ─── Portfolio ────────────────────────────────────────────────
let holdings = [{ symbol: '', quantity: '', avgCost: '' }];

function renderHoldingsList() {
  const container = document.getElementById('holdingsList');
  container.innerHTML = '';
  holdings.forEach((h, i) => {
    const row = document.createElement('div');
    row.className = 'holding-row';
    row.innerHTML = `
      <input type="text" placeholder="SYMBOL" value="${h.symbol}"
        onchange="holdings[${i}].symbol = this.value.toUpperCase()" style="max-width:120px" />
      <input type="number" placeholder="Quantity" value="${h.quantity}"
        onchange="holdings[${i}].quantity = this.value" style="max-width:110px" />
      <input type="number" placeholder="Avg Cost ($)" value="${h.avgCost}"
        onchange="holdings[${i}].avgCost = this.value" />
      <button class="remove-btn" onclick="removeHolding(${i})">✕</button>
    `;
    container.appendChild(row);
  });
}

function removeHolding(i) {
  holdings.splice(i, 1);
  if (holdings.length === 0) holdings.push({ symbol:'', quantity:'', avgCost:'' });
  renderHoldingsList();
}

document.getElementById('addHoldingBtn').addEventListener('click', () => {
  holdings.push({ symbol:'', quantity:'', avgCost:'' });
  renderHoldingsList();
});

document.getElementById('analyzePortfolioBtn').addEventListener('click', async () => {
  const payload = holdings.filter(h => h.symbol && h.quantity && h.avgCost);
  if (!payload.length) { alert('Add at least one holding.'); return; }
  try {
    const res = await fetch(`${API}/api/portfolio`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ holdings: payload })
    });
    const data = await res.json();
    renderPortfolioResults(data);
  } catch(e) {
    alert('Backend error. Is the server running?');
  }
});

function renderPortfolioResults(data) {
  const pnlUp = data.totalPnl >= 0;
  const summary = document.getElementById('portSummary');
  summary.innerHTML = `
    <div class="ps-card">
      <div class="ps-label">TOTAL VALUE</div>
      <div class="ps-value">$${fmtPrice(data.totalValue)}</div>
    </div>
    <div class="ps-card">
      <div class="ps-label">TOTAL COST</div>
      <div class="ps-value">$${fmtPrice(data.totalCost)}</div>
    </div>
    <div class="ps-card">
      <div class="ps-label">P&L</div>
      <div class="ps-value ${pnlUp?'up':'dn'}">${pnlUp?'+':''}$${fmtPrice(Math.abs(data.totalPnl))}</div>
    </div>
    <div class="ps-card">
      <div class="ps-label">RETURN %</div>
      <div class="ps-value ${pnlUp?'up':'dn'}">${pnlUp?'+':''}${data.totalPnlPercent.toFixed(2)}%</div>
    </div>
  `;

  const tbody = document.getElementById('portTableBody');
  tbody.innerHTML = data.holdings.map(h => {
    const up = h.pnl >= 0;
    const sigClass = h.signal.replace(' ', '_');
    return `<tr>
      <td style="color:var(--cyan);font-weight:700">${h.symbol}</td>
      <td>${h.quantity}</td>
      <td>$${fmtPrice(h.avgCost)}</td>
      <td>${fmtPrice(h.currentPrice)}</td>
      <td>$${fmtPrice(h.currentValue)}</td>
      <td class="${up?'':''}">
        <span style="color:${up?'var(--green)':'var(--red)'}">
          ${up?'+':''}$${fmtPrice(Math.abs(h.pnl))} (${up?'+':''}${h.pnlPercent.toFixed(2)}%)
        </span>
      </td>
      <td><span class="signal-pill ${sigClass}">${h.signal}</span></td>
    </tr>`;
  }).join('');

  document.getElementById('portResults').style.display = 'block';
}

// ─── Init portfolio ───────────────────────────────────────────
renderHoldingsList();

// ─── Helpers ──────────────────────────────────────────────────
function fmtPrice(n) {
  if (!n && n !== 0) return '—';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtVolume(n) {
  if (!n) return '—';
  if (n >= 1e9) return (n/1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n/1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n/1e3).toFixed(1) + 'K';
  return n;
}

function rsiLabel(v) {
  if (v > 70) return '(Overbought)';
  if (v < 30) return '(Oversold)';
  return '';
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
