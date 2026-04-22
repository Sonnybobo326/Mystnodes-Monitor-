
/* ============================================================
   NodeManager — App JavaScript (Myst + Tailscale)
   ============================================================ */

// ── Navigation State ──────────────────────────────────────────
const screenHistory = ['screen-dashboard'];
let activeScreen = 'screen-dashboard';
// Track what's currently being shown in node detail
let currentDetailType = null; // 'myst' | 'tailscale'
let currentDetailId   = null;

function showScreen(id, data = {}) {
  const current = document.getElementById(activeScreen);
  const next = document.getElementById(id);
  if (!next || id === activeScreen) return;

  if (screenHistory[screenHistory.length - 1] !== id) {
    screenHistory.push(id);
  }

  current.classList.remove('active');
  current.classList.add('slide-out');
  next.classList.add('active');
  activeScreen = id;
  setTimeout(() => current.classList.remove('slide-out'), 320);

  // Screen-specific init
  if (id === 'screen-node-detail') initNodeDetail(data);
  if (id === 'screen-logs') initLogs();
  if (id === 'screen-earnings') initEarningsChart();
}

function goBack() {
  if (screenHistory.length <= 1) return;
  screenHistory.pop();
  const prevId = screenHistory[screenHistory.length - 1];
  const current = document.getElementById(activeScreen);
  const prev = document.getElementById(prevId);
  if (!prev) return;
  current.classList.remove('active');
  prev.classList.add('active');
  prev.classList.remove('slide-out');
  activeScreen = prevId;
}

function setNav(btn) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}
function setNavById(id) {
  const el = document.getElementById(id);
  if (el) setNav(el);
}

// ── Clock ─────────────────────────────────────────────────────
function updateClock() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, '0');
  const m = now.getMinutes().toString().padStart(2, '0');
  const el = document.getElementById('statusTime');
  if (el) el.textContent = `${h}:${m}`;
}
updateClock();
setInterval(updateClock, 10000);

// ── Charts ────────────────────────────────────────────────────
const CHART_COLORS = {
  purple: 'rgba(168,85,247,1)', purpleFill: 'rgba(168,85,247,0.15)',
  blue:   'rgba(59,130,246,1)',  blueFill:  'rgba(59,130,246,0.15)',
  green:  'rgba(34,197,94,1)',
};

let dashChart = null;
const data7d   = [0.58, 0.72, 0.65, 0.91, 0.78, 0.84, 0.75];
const data30d  = [0.42,0.55,0.61,0.58,0.72,0.65,0.91,0.78,0.84,0.75,0.68,0.80,0.90,0.85,0.70,
                  0.62,0.77,0.83,0.88,0.73,0.69,0.82,0.79,0.86,0.71,0.64,0.78,0.93,0.81,0.76];
const labels7d  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const labels30d = Array.from({length:30}, (_,i) => `D${i+1}`);

function makeDashChart() {
  const ctx = document.getElementById('earningsChart');
  if (!ctx) return;
  if (dashChart) dashChart.destroy();
  dashChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels7d,
      datasets: [{
        data: data7d,
        borderColor: CHART_COLORS.purple,
        backgroundColor: CHART_COLORS.purpleFill,
        borderWidth: 2.5, fill: true, tension: 0.4,
        pointRadius: 3, pointHoverRadius: 6,
        pointBackgroundColor: CHART_COLORS.purple,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: {
        backgroundColor: '#1f2330', borderColor: '#2a2f3e', borderWidth: 1,
        titleColor: '#e8eaf0', bodyColor: '#a855f7',
        callbacks: { label: ctx => ` ${ctx.parsed.y.toFixed(3)} MYST` }
      }},
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#7c849a', font: { size: 11 } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#7c849a', font: { size: 11 }, callback: v => v.toFixed(1) } }
      }
    }
  });
}

function switchChartTab(btn, period) {
  document.querySelectorAll('.tab-pills .pill').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (!dashChart) return;
  dashChart.data.labels = period === '7d' ? labels7d : labels7d;
  dashChart.data.datasets[0].data = period === '7d' ? data7d : data30d.slice(-7);
  dashChart.update();
}

let earnChart = null;
function initEarningsChart() {
  const ctx = document.getElementById('earningsDetailChart');
  if (!ctx) return;
  if (earnChart) earnChart.destroy();
  earnChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels7d,
      datasets: [
        { label: 'MystNode-1', data: [0.30,0.40,0.35,0.50,0.42,0.46,0.40], backgroundColor: CHART_COLORS.purple, borderRadius: 4, borderSkipped: false },
        { label: 'MystNode-2', data: [0.28,0.32,0.30,0.41,0.36,0.38,0.35], backgroundColor: CHART_COLORS.blue,   borderRadius: 4, borderSkipped: false }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: true, labels: { color: '#7c849a', font: { size: 11 }, boxWidth: 12, boxHeight: 12 } },
        tooltip: { backgroundColor: '#1f2330', borderColor: '#2a2f3e', borderWidth: 1, titleColor: '#e8eaf0', bodyColor: '#e8eaf0',
          callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(3)} MYST` } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#7c849a', font: { size: 11 } } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#7c849a', font: { size: 11 }, callback: v => v.toFixed(1) } }
      }
    }
  });
}

function switchPeriod(btn, period) {
  document.querySelectorAll('.period-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (!earnChart) return;
  const ranges = {
    '7d':  { l: labels7d, d1: [0.30,0.40,0.35,0.50,0.42,0.46,0.40], d2: [0.28,0.32,0.30,0.41,0.36,0.38,0.35] },
    '30d': { l: labels7d, d1: data30d.slice(-7).map(v=>v*0.55), d2: data30d.slice(-7).map(v=>v*0.45) },
    'all': { l: ['W1','W2','W3','W4','W5','W6','W7'], d1: [1.8,2.1,1.9,2.4,2.2,2.8,2.91], d2: [1.4,1.7,1.5,1.9,1.8,2.2,2.32] }
  };
  const r = ranges[period] || ranges['7d'];
  earnChart.data.labels = r.l;
  earnChart.data.datasets[0].data = r.d1;
  earnChart.data.datasets[1].data = r.d2;
  earnChart.update();
  const totals = { '7d': '5.23 MYST', '30d': '21.40 MYST', 'all': '36.80 MYST' };
  const usds   = { '7d': '≈ $3.14 USD', '30d': '≈ $12.84 USD', 'all': '≈ $22.08 USD' };
  document.querySelector('.earn-banner-val').textContent = totals[period];
  document.querySelector('.earn-banner-usd').textContent = usds[period];
}

// ── Node Detail ───────────────────────────────────────────────
const mystNodeData = {
  1: { name: 'MystNode-1', ip: '3.91.192.45', uptime: '4d 12h 33m', today: '0.41 MYST', week: '2.91 MYST', total: '18.44 MYST' },
  2: { name: 'MystNode-2', ip: '54.210.33.17', uptime: '4d 11h 08m', today: '0.36 MYST', week: '2.32 MYST', total: '15.12 MYST' }
};

function initNodeDetail(data) {
  // Reset cards
  document.getElementById('nodeDetailPerfCard').style.display = '';
  document.getElementById('nodeDetailEarnCard').style.display = '';
  document.getElementById('nodeDetailExtra').innerHTML = '';

  if (data.type === 'myst') {
    currentDetailType = 'myst';
    currentDetailId = data.id;
    initMystDetail(data.id);
  } else if (data.ts || data.type === 'tailscale') {
    currentDetailType = 'tailscale';
    currentDetailId = data.index;
    initTailscaleDetail(data.index);
  }
}

function initMystDetail(id) {
  const node = mystNodeData[id] || mystNodeData[1];

  document.getElementById('nodeDetailTitle').textContent = node.name;
  document.getElementById('nodeHeroUptime').textContent = `Uptime: ${node.uptime}`;
  document.getElementById('nodeHeroIcon').innerHTML = '<i class="fas fa-server"></i>';

  const statusEl = document.getElementById('nodeHeroStatus');
  statusEl.textContent = 'ONLINE';
  statusEl.style.color = 'var(--green)';
  statusEl.style.background = 'var(--green-bg)';

  // Type badge
  const badge = document.getElementById('nodeDetailTypeBadge');
  badge.innerHTML = '<span class="node-badge myst-badge">MYST</span>';

  // Info grid
  document.getElementById('nodeInfoGrid').innerHTML = `
    <div class="info-cell"><div class="info-label">IP Address</div><div class="info-val">${node.ip}</div></div>
    <div class="info-cell"><div class="info-label">Region</div><div class="info-val">us-east-1a</div></div>
    <div class="info-cell"><div class="info-label">Instance</div><div class="info-val">t3.small</div></div>
    <div class="info-cell"><div class="info-label">Port</div><div class="info-val">4449</div></div>
    <div class="info-cell"><div class="info-label">Protocol</div><div class="info-val">OpenVPN</div></div>
    <div class="info-cell"><div class="info-label">Sessions</div><div class="info-val">3 active</div></div>
  `;

  // Show earnings, hide extra
  document.getElementById('nodeDetailEarnCard').style.display = '';
  document.getElementById('nodeEarnToday').textContent = node.today;
  document.getElementById('nodeEarnWeek').textContent  = node.week;
  document.getElementById('nodeEarnTotal').textContent = node.total;

  // Animate perf bars
  setTimeout(() => {
    document.querySelectorAll('#nodeDetailPerfCard .perf-bar').forEach(bar => {
      const w = bar.style.width;
      bar.style.width = '0%';
      setTimeout(() => { bar.style.width = w; }, 80);
    });
  }, 200);
}

function initTailscaleDetail(index) {
  const device = tsDevices[index];
  if (!device) {
    showToast('Device not found');
    return;
  }

  const online  = tsIsOnline(device);
  const name    = tsShortHostname(device.name || device.hostname);
  const ip      = tsTailscaleIP(device);
  const os      = device.os || '—';
  const seen    = tsLastSeen(device);
  const user    = device.user || device.loginName || '—';
  const created = device.created ? new Date(device.created).toLocaleDateString() : '—';
  const expires = device.keyExpiryDisabled ? 'Never' : (device.expiry ? new Date(device.expiry).toLocaleDateString() : '—');
  const tags    = (device.tags || []).join(', ') || '—';
  const authorized  = device.authorized ? 'Yes' : 'No';
  const updateAvail = device.updateAvailable ? '⚠ Update available' : '✓ Up to date';
  const allIPs      = (device.addresses || []).join(', ') || ip;
  const version     = device.clientVersion || '—';
  const osIcon      = tsOsIcon(os);

  document.getElementById('nodeDetailTitle').textContent = name;
  document.getElementById('nodeHeroUptime').textContent = online ? 'Connected to Tailnet' : `Last seen: ${seen}`;
  document.getElementById('nodeHeroIcon').innerHTML = `<i class="fab ${osIcon}"></i>`;

  const statusEl = document.getElementById('nodeHeroStatus');
  statusEl.textContent  = online ? 'ONLINE' : 'OFFLINE';
  statusEl.style.color  = online ? 'var(--green)' : 'var(--red)';
  statusEl.style.background = online ? 'var(--green-bg)' : 'rgba(239,68,68,0.12)';

  const badge = document.getElementById('nodeDetailTypeBadge');
  badge.innerHTML = '<span class="node-badge ts-badge-node"><i class="fas fa-shield-halved"></i> TS</span>';

  // Info grid
  document.getElementById('nodeInfoGrid').innerHTML = `
    <div class="info-cell"><div class="info-label">Tailscale IP</div><div class="info-val" style="font-size:11px">${ip}</div></div>
    <div class="info-cell"><div class="info-label">OS</div><div class="info-val">${os}</div></div>
    <div class="info-cell"><div class="info-label">Version</div><div class="info-val" style="font-size:11px">${version || os}</div></div>
    <div class="info-cell"><div class="info-label">User</div><div class="info-val" style="font-size:11px">${(user.split('@')[0] || user).substring(0,12)}</div></div>
    <div class="info-cell"><div class="info-label">Created</div><div class="info-val">${created}</div></div>
    <div class="info-cell"><div class="info-label">Key Expiry</div><div class="info-val">${expires}</div></div>
  `;

  // Hide perf (myst-only), hide earnings
  document.getElementById('nodeDetailPerfCard').style.display = 'none';
  document.getElementById('nodeDetailEarnCard').style.display = 'none';

  // Extra Tailscale info card
  document.getElementById('nodeDetailExtra').innerHTML = `
    <div class="card mt-16">
      <div class="card-header">
        <span class="card-title">Tailscale Info</span>
        <span class="ts-badge-sm"><i class="fas fa-shield-halved"></i> Tailscale</span>
      </div>
      <div class="ts-info-list">
        <div class="ts-info-row"><span class="ts-info-label">All IPs</span><span class="ts-info-val" style="font-size:11px">${allIPs}</span></div>
        <div class="ts-info-row"><span class="ts-info-label">Authorized</span><span class="ts-info-val ${authorized==='Yes'?'text-green':'text-orange'}">${authorized}</span></div>
        <div class="ts-info-row"><span class="ts-info-label">Tags</span><span class="ts-info-val">${tags}</span></div>
        <div class="ts-info-row"><span class="ts-info-label">Hostname</span><span class="ts-info-val" style="font-size:11px">${device.hostname || name}</span></div>
        <div class="ts-info-row no-border"><span class="ts-info-label">Client</span><span class="ts-info-val ${device.updateAvailable?'text-orange':'text-green'}">${updateAvail}</span></div>
      </div>
    </div>`;
}

// ── Logs ──────────────────────────────────────────────────────
const logLines = [
  { type: 'dim',   text: '[2024-12-18 10:02:14] System boot complete' },
  { type: 'info',  text: '[2024-12-18 10:02:15] Myst service starting…' },
  { type: '',      text: '[2024-12-18 10:02:16] Node registered: 0x4A8b…f3D2' },
  { type: 'info',  text: '[2024-12-18 10:02:18] Connecting to broker: broker.mysterium.network' },
  { type: '',      text: '[2024-12-18 10:02:21] Broker connection established ✓' },
  { type: '',      text: '[2024-12-18 10:02:22] Service type: wireguard started on :51820' },
  { type: '',      text: '[2024-12-18 10:02:22] Service type: openvpn started on :1194' },
  { type: 'info',  text: '[2024-12-18 10:05:33] New session: consumer DE → vpn' },
  { type: '',      text: '[2024-12-18 10:05:34] Bytes sent: 0 received: 0' },
  { type: 'warn',  text: '[2024-12-18 11:14:07] High bandwidth usage: 85%' },
  { type: '',      text: '[2024-12-18 11:14:10] Session settled: +0.0042 MYST' },
  { type: 'info',  text: '[2024-12-18 12:30:00] Hourly settlement: +0.058 MYST' },
  { type: '',      text: '[2024-12-18 12:30:01] Wallet updated: 12.40 MYST' },
  { type: 'info',  text: '[2024-12-18 14:22:09] New session: consumer UK → vpn' },
  { type: '',      text: '[2024-12-18 14:22:10] Tunnel established in 14ms' },
  { type: '',      text: '[2024-12-18 16:00:00] Hourly settlement: +0.062 MYST' },
  { type: 'error', text: '[2024-12-18 16:45:22] Connection timeout — retrying (1/3)' },
  { type: 'error', text: '[2024-12-18 16:45:25] Connection timeout — retrying (2/3)' },
  { type: 'warn',  text: '[2024-12-18 16:45:29] Reconnected to broker' },
  { type: 'info',  text: '[2024-12-18 18:00:00] Hourly settlement: +0.071 MYST' },
  { type: '',      text: '[2024-12-18 18:00:01] Daily earnings: 0.41 MYST' },
];
function initLogs() {
  const terminal = document.getElementById('logTerminal');
  if (!terminal) return;
  terminal.innerHTML = '';
  logLines.forEach((line, i) => {
    setTimeout(() => {
      const el = document.createElement('div');
      el.className = `log-line ${line.type}`;
      el.textContent = line.text;
      terminal.appendChild(el);
      terminal.scrollTop = terminal.scrollHeight;
    }, i * 50);
  });
}
function clearLogs() {
  const terminal = document.getElementById('logTerminal');
  if (terminal) terminal.innerHTML = '';
  showToast('Logs cleared');
}

// ── Modals ────────────────────────────────────────────────────
function openModal(id) { document.getElementById(id)?.classList.add('show'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('show'); }

function showRestartModal() { openModal('modal-restart'); }
function confirmRestart() {
  closeModal('modal-restart');
  showToast('⟳ Restarting all Myst nodes…');
  setTimeout(() => showToast('✓ All nodes restarted'), 2500);
}

function nodeAction(action) {
  const type = currentDetailType;
  const icons  = { start: '▶', stop: '⬛', restart: '⟳' };
  const titles = { start: 'Start Node?', stop: 'Stop Node?', restart: 'Restart Node?' };
  const bodies = {
    start:   type === 'myst'
      ? 'This will start the Myst node service and make it available to consumers.'
      : 'Tailscale device control is not available in this prototype.',
    stop:    type === 'myst'
      ? 'This will stop the node and disconnect all active sessions.'
      : 'Tailscale device control is not available in this prototype.',
    restart: type === 'myst'
      ? 'This will restart the node. Active sessions will be briefly interrupted.'
      : 'Tailscale device control is not available in this prototype.',
  };
  const colors = { start: 'text-green', stop: 'text-red', restart: 'text-orange' };

  document.getElementById('modalActionIcon').textContent  = icons[action];
  document.getElementById('modalActionIcon').className    = `modal-icon ${colors[action]}`;
  document.getElementById('modalActionTitle').textContent = titles[action];
  document.getElementById('modalActionBody').textContent  = bodies[action];
  document.getElementById('modalActionConfirm').onclick   = () => {
    closeModal('modal-nodeaction');
    if (type === 'myst') showToast(`✓ Node ${action} successful`);
    else showToast('ℹ️ Control via Tailscale Admin Console');
  };
  openModal('modal-nodeaction');
}

function showPayoutModal() { openModal('modal-payout'); }
function confirmPayout() {
  closeModal('modal-payout');
  showToast('💸 Payout request sent!');
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('show'); });
});

// ── Toast ─────────────────────────────────────────────────────
let toastTimeout = null;
function showToast(msg) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 2800);
}

// ── Copy Address ──────────────────────────────────────────────
function copyAddr() {
  const addr = '0x4A8b3f9e1c2d7a6b8e4f1d3c2a9b7e5f3d2c1a4b';
  navigator.clipboard?.writeText(addr).catch(() => {});
  showToast('📋 Address copied!');
}

// ── Copy curl command ─────────────────────────────────────────
const CURL_CMD = `curl -s "https://api.tailscale.com/api/v2/tailnet/-/devices?fields=all" \\
  -H "Authorization: Bearer tskey-api-kG84DPchWR11CNTRL-8dvBGwp2uQAEJUimnz3LRAufenQZ4iuq"`;

const PWSH_CMD = `Invoke-RestMethod -Uri "https://api.tailscale.com/api/v2/tailnet/-/devices?fields=all" \`
  -Headers @{Authorization="Bearer tskey-api-kG84DPchWR11CNTRL-8dvBGwp2uQAEJUimnz3LRAufenQZ4iuq"} \`
  | ConvertTo-Json -Depth 10`;

function copyCurlCommand(btn) {
  navigator.clipboard?.writeText(CURL_CMD).catch(() => {});
  showCopiedFlash();
  if (btn) {
    btn.innerHTML = '<i class="fas fa-check"></i> <span>Copied!</span>';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.innerHTML = '<i class="fas fa-copy"></i> <span>Copy</span>';
      btn.classList.remove('copied');
    }, 2500);
  }
}

function copyPowerShellCommand() {
  navigator.clipboard?.writeText(PWSH_CMD).catch(() => {});
  showToast('📋 PowerShell command copied!');
}

function showCopiedFlash() {
  const el = document.getElementById('copiedFlash');
  if (!el) return;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 1800);
}

// ── Node filter (Nodes page) ──────────────────────────────────
function filterNodes(btn, filter) {
  document.querySelectorAll('#nodes-filter-row .filter-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');

  const mystSection = document.getElementById('nodes-myst-section');
  const tsSection   = document.getElementById('nodes-ts-section');
  const mystCards   = mystSection?.querySelectorAll('.node-card');
  const tsCards     = tsSection?.querySelectorAll('.node-card');

  // Show/hide sections based on filter
  if (filter === 'myst') {
    mystSection.style.display = '';
    tsSection.style.display   = 'none';
  } else if (filter === 'ts') {
    mystSection.style.display = 'none';
    tsSection.style.display   = '';
  } else {
    mystSection.style.display = '';
    tsSection.style.display   = '';
  }

  // Online/offline filter for Myst cards
  if (filter === 'online' || filter === 'offline') {
    mystSection.style.display = '';
    tsSection.style.display   = '';
    mystCards?.forEach(card => {
      const dot = card.querySelector('.node-status-dot');
      const isOnline = dot?.classList.contains('online');
      card.style.display = (filter === 'online' ? isOnline : !isOnline) ? '' : 'none';
    });
    tsCards?.forEach(card => {
      const dot = card.querySelector('.node-status-dot');
      const isOnline = dot?.classList.contains('online');
      card.style.display = (filter === 'online' ? isOnline : !isOnline) ? '' : 'none';
    });
  } else {
    mystCards?.forEach(c => c.style.display = '');
    tsCards?.forEach(c => c.style.display   = '');
  }
}

// ── Refresh All ───────────────────────────────────────────────
async function refreshAll() {
  showToast('🔄 Refreshing…');
  await initTailscale();
  showToast('✓ Refreshed!');
}

// ── Tailscale Import Modal ────────────────────────────────────
async function confirmTsImport() {
  const input = document.getElementById('ts-import-input');
  const errEl = document.getElementById('ts-import-error');
  errEl.textContent = '';

  const text = (input?.value || '').trim();
  if (!text) { errEl.textContent = 'Please paste your JSON first.'; return; }

  const btn = document.querySelector('#modal-ts-sync .modal-btn-confirm');
  if (btn) { btn.textContent = 'Importing…'; btn.disabled = true; }

  const result = await importTailscaleJSON(text);

  if (btn) { btn.textContent = 'Import'; btn.disabled = false; }

  if (result.ok) {
    closeModal('modal-ts-sync');
    if (input) input.value = '';
    showToast(`✅ ${result.count} Tailscale device${result.count !== 1 ? 's' : ''} imported!`);
    renderTailscaleList('ts-devices-dashboard', 4);
    renderTailscaleList('ts-devices-nodes', Infinity);
    onTailscaleFetched();
  } else {
    errEl.textContent = `Error: ${result.error}`;
  }
}

// ── Settings toggles ──────────────────────────────────────────
document.querySelectorAll('.toggle input').forEach(toggle => {
  toggle.addEventListener('change', function () {
    const label = this.closest('.settings-row')?.querySelector('.settings-row-left')?.textContent?.trim();
    showToast(`${label}: ${this.checked ? 'on' : 'off'}`);
  });
});

// ── Notifications ─────────────────────────────────────────────
document.getElementById('notifBtn')?.addEventListener('click', () => {
  showToast('🔔 2 alerts: MystNode-2 restart, Payout pending');
});

// ── Nav sync ──────────────────────────────────────────────────
document.getElementById('nav-dashboard')?.addEventListener('click', () => {
  screenHistory.length = 1;
  screenHistory[0] = 'screen-dashboard';
});

// ── Tailscale UI integration ──────────────────────────────────
// Called by tailscale.js after fetch completes
function onTailscaleFetched() {
  const count  = tsDevices.length;
  const online = tsDevices.filter(d => tsIsOnline(d)).length;

  // Update summary cards
  const totalOnline = 2 + online;
  const totalAll    = 2 + count;
  document.getElementById('summary-nodes-val').textContent = `${totalOnline}/${totalAll}`;
  document.getElementById('summary-ts-val').textContent    = count > 0 ? `${online}/${count}` : 'Setup';

  // Subtitle
  document.getElementById('dash-subtitle').textContent =
    count > 0 ? `2 Myst · ${count} Tailscale · AWS us-east-1` : '2 Myst · Tailscale not synced';

  // Activity entry
  const actEl = document.getElementById('ts-last-activity');
  if (actEl) {
    actEl.textContent = count > 0
      ? `Tailscale: ${online}/${count} devices online`
      : 'Tailscale: tap to connect →';
  }

  // Settings
  const tailnetEl = document.getElementById('settings-tailnet');
  if (tailnetEl) {
    if (tsDevices[0]?.hostname) {
      const domain = tsDevices[0].hostname.split('.').slice(1).join('.') || '—';
      tailnetEl.textContent = domain;
    } else {
      tailnetEl.textContent = count > 0 ? 'Connected' : 'Not connected';
    }
  }
  const tsCountEl = document.getElementById('settings-ts-count');
  if (tsCountEl) tsCountEl.textContent = count > 0 ? `${count} device${count!==1?'s':''}` : 'None synced';

  // Show/hide the setup banner
  const banner = document.getElementById('ts-setup-banner');
  if (banner) banner.style.display = count === 0 ? '' : 'none';

  // Update the "already done" section on the setup screen
  const doneEl = document.getElementById('ts-already-done');
  if (doneEl) {
    doneEl.style.display = count > 0 ? '' : 'none';
    const cntEl = document.getElementById('ts-done-count');
    if (cntEl) cntEl.textContent = `${count} device${count!==1?'s':''} loaded`;
  }

  // Render device lists
  renderTailscaleList('ts-devices-dashboard', 4);
  renderTailscaleList('ts-devices-nodes', Infinity);
}

function renderTailscaleList(containerId, maxItems) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (tsLoading) {
    container.innerHTML = `<div class="ts-loading"><div class="ts-spinner"></div><span>Fetching Tailscale…</span></div>`;
    return;
  }
  if (tsError) {
    container.innerHTML = `<div class="ts-error"><i class="fas fa-triangle-exclamation"></i> ${tsError}
      <button class="ts-sync-btn" onclick="openModal('modal-ts-sync')"><i class="fas fa-upload"></i> Import</button></div>`;
    return;
  }
  if (tsDevices.length === 0) {
    // Only show the inline empty state in the Nodes tab; Dashboard uses the banner
    if (containerId === 'ts-devices-nodes') {
      container.innerHTML = `
        <div class="ts-empty-box">
          <div class="ts-empty-icon"><i class="fas fa-shield-halved"></i></div>
          <div class="ts-empty-title">No Tailscale devices synced yet</div>
          <div class="ts-empty-body">Follow the 3-step guide to import your devices.</div>
          <button class="ts-import-btn" onclick="showScreen('screen-ts-setup')"><i class="fas fa-circle-info"></i> Setup Guide</button>
        </div>`;
    } else {
      container.innerHTML = '';
    }
    return;
  }

  const devices = tsDevices.slice(0, maxItems === Infinity ? tsDevices.length : maxItems);
  const remaining = tsDevices.length - devices.length;

  container.innerHTML = devices.map((dev, i) => buildTsCard(dev, i)).join('')
    + (remaining > 0 ? `<div class="ts-more-hint">+${remaining} more on Nodes tab</div>` : '');
}

function buildTsCard(device, index) {
  const online  = tsIsOnline(device);
  const name    = tsShortHostname(device.name || device.hostname);
  const ip      = tsTailscaleIP(device);
  const os      = device.os || 'unknown';
  const osIcon  = tsOsIcon(os);
  const seen    = tsLastSeen(device);

  return `
    <div class="node-card ts-card" onclick="showScreen('screen-node-detail', {type:'tailscale', ts:true, index:${index}})">
      <div class="node-status-dot ${online ? 'online' : 'offline'}"></div>
      <div class="node-info">
        <div class="node-name">${name} <span class="node-badge ts-badge"><i class="fab ${osIcon}"></i> TS</span></div>
        <div class="node-meta"><i class="fas fa-network-wired"></i> ${ip}</div>
        <div class="node-meta"><i class="fas fa-clock"></i> ${online ? 'Connected' : 'Last seen ' + seen}</div>
      </div>
      <div class="node-earnings">
        <div class="node-earn-val ts-val">${online ? 'Online' : 'Offline'}</div>
        <div class="node-earn-sub">${os}</div>
      </div>
      <i class="fas fa-chevron-right node-arrow"></i>
    </div>`;
}

// ── Init ──────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  makeDashChart();

  // Live uptime ticker for Myst nodes
  let uptimeSec = 4 * 86400 + 12 * 3600 + 33 * 60;
  setInterval(() => {
    uptimeSec++;
    const d = Math.floor(uptimeSec / 86400);
    const h = Math.floor((uptimeSec % 86400) / 3600);
    const m = Math.floor((uptimeSec % 3600) / 60);
    const el = document.getElementById('nodeHeroUptime');
    if (el && currentDetailType === 'myst') el.textContent = `Uptime: ${d}d ${h}h ${m}m`;
  }, 60000);

  // Fetch Tailscale
  await initTailscale();

  // Auto-refresh Tailscale every 60s
  setInterval(async () => {
    await fetchTailscaleDevices();
    onTailscaleFetched();
  }, 60000);
});
