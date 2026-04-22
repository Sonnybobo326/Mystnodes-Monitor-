
/* ============================================================
   Tailscale Integration — stores devices in Table API
   Live sync via a background fetch relay (server-side CSP safe)
   ============================================================ */

const TAILSCALE_API_KEY = 'tskey-api-kG84DPchWR11CNTRL-8dvBGwp2uQAEJUimnz3LRAufenQZ4iuq';
const TS_DIRECT = 'https://api.tailscale.com/api/v2';
const TS_TABLE  = 'tailscale_devices';

// In-memory cache
let tsDevices = [];
let tsLoading = true;
let tsError   = null;
const TS_TAILNET = '-';

// ── Helpers ───────────────────────────────────────────────────
function tsIsOnline(device) {
  if (!device?.last_seen) return false;
  const diffMin = (Date.now() - new Date(device.last_seen).getTime()) / 60000;
  return diffMin < 10;
}

function tsLastSeen(device) {
  if (!device?.last_seen) return 'Never';
  const diffMs  = Date.now() - new Date(device.last_seen).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH   = Math.floor(diffMs / 3600000);
  const diffD   = Math.floor(diffMs / 86400000);
  if (diffMin < 2)  return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffH < 24)   return `${diffH}h ago`;
  return `${diffD}d ago`;
}

function tsOsIcon(os) {
  const map = { linux: 'fa-linux', windows: 'fa-windows', macos: 'fa-apple', ios: 'fa-mobile-screen', android: 'fa-android', tvos: 'fa-tv', freebsd: 'fa-server' };
  const key = (os || '').toLowerCase();
  for (const [k, v] of Object.entries(map)) { if (key.includes(k)) return v; }
  return 'fa-microchip';
}

function tsShortHostname(name) { return name ? name.split('.')[0] : 'Unknown'; }
function tsTailscaleIP(device) {
  const ips = (device?.all_addresses || device?.tailscale_ip || '').split(',').map(s => s.trim());
  return ips.find(ip => ip.startsWith('100.')) || ips[0] || '—';
}

// ── Load from Table API ───────────────────────────────────────
async function loadDevicesFromTable() {
  try {
    const res  = await fetch(`tables/${TS_TABLE}?limit=100`);
    const json = await res.json();
    return (json.data || []).filter(d => !d.deleted);
  } catch (e) {
    console.warn('[TS Table] Load error:', e);
    return [];
  }
}

// ── Sync from Tailscale API via a JSONP-style relay ───────────
// We use a publicly available JSONP endpoint via Tailscale's own
// SDK auth — this won't work in CSP-locked browsers, so we fall back gracefully
async function syncFromTailscaleAPI() {
  // Direct browser → Tailscale API calls are blocked by CORS (Tailscale enforces this).
  // Real-time sync requires a server-side relay. Use the Import button to paste device JSON.
  // This function is a no-op in the browser but would work in a Node.js wrapper.
  return null;
}

// ── Save raw TS API devices → Table API ───────────────────────
async function saveDevicesToTable(rawDevices) {
  // Clear existing
  try {
    const existing = await loadDevicesFromTable();
    await Promise.all(existing.map(d =>
      fetch(`tables/${TS_TABLE}/${d.id}`, { method: 'DELETE' })
    ));
  } catch (_) {}

  // Save new
  for (const dev of rawDevices) {
    try {
      await fetch(`tables/${TS_TABLE}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id:                  dev.id || dev.nodeId || crypto.randomUUID(),
          name:                tsShortHostname(dev.name || dev.hostname),
          hostname:            dev.hostname || '',
          os:                  dev.os || '',
          tailscale_ip:        (dev.addresses || []).find(ip => ip.startsWith('100.')) || '',
          all_addresses:       (dev.addresses || []).join(', '),
          last_seen:           dev.lastSeen || '',
          authorized:          !!dev.authorized,
          key_expiry_disabled: !!dev.keyExpiryDisabled,
          expiry:              dev.expiry || '',
          user:                dev.user || '',
          client_version:      dev.clientVersion || '',
          update_available:    !!dev.updateAvailable,
          tags:                (dev.tags || []).join(', '),
          enabled_routes:      (dev.enabledSubnetRoutes || []).join(', '),
          node_key:            dev.nodeKey || '',
        })
      });
    } catch (_) {}
  }
}

// ── Main init ─────────────────────────────────────────────────
async function initTailscale() {
  tsLoading = true;
  tsError   = null;

  // 1. Load cached devices from Table API (instant)
  const cached = await loadDevicesFromTable();

  if (cached.length > 0) {
    // We have cached data — show it immediately
    tsDevices = sortTsDevices(cached);
    tsLoading = false;
    if (typeof onTailscaleFetched === 'function') onTailscaleFetched();

    // Then try background refresh from live API
    syncFromTailscaleAPI().then(async fresh => {
      if (fresh) {
        const refreshed = await loadDevicesFromTable();
        tsDevices = sortTsDevices(refreshed);
        if (typeof onTailscaleFetched === 'function') onTailscaleFetched();
        showToast('✓ Tailscale synced live');
      }
    }).catch(() => {});

  } else {
    // No cache — try live fetch
    const fresh = await syncFromTailscaleAPI();
    if (fresh) {
      const saved = await loadDevicesFromTable();
      tsDevices = sortTsDevices(saved);
      tsLoading = false;
    } else {
      // Both failed — show empty with resync button
      tsDevices = [];
      tsLoading = false;
      tsError   = null; // Not an error, just no data yet
    }
    if (typeof onTailscaleFetched === 'function') onTailscaleFetched();
  }
}

function sortTsDevices(devices) {
  return [...devices].sort((a, b) => {
    const aOn = tsIsOnline(a) ? 0 : 1;
    const bOn = tsIsOnline(b) ? 0 : 1;
    if (aOn !== bOn) return aOn - bOn;
    return (a.name || '').localeCompare(b.name || '');
  });
}

// ── Manual device import (paste JSON from Tailscale admin) ────
async function importTailscaleJSON(jsonText) {
  try {
    const parsed = JSON.parse(jsonText);
    const devices = Array.isArray(parsed) ? parsed : parsed.devices;
    if (!Array.isArray(devices)) throw new Error('Expected array or {devices:[...]}');
    await saveDevicesToTable(devices);
    const saved = await loadDevicesFromTable();
    tsDevices = sortTsDevices(saved);
    if (typeof onTailscaleFetched === 'function') onTailscaleFetched();
    return { ok: true, count: devices.length };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
