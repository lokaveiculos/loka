/* LOKA deploy: v61-20260807-1301 */
// ═══════════════════════════════════════════════════════════════════
// LOKÁ Sistema — Firebase Config com fallback localStorage
// ═══════════════════════════════════════════════════════════════════

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyD-abT7hNat5vkGfJXYPm3bOCefAp_5i5A",
  authDomain:        "loka-b8dd2.firebaseapp.com",
  databaseURL:       "https://loka-b8dd2-default-rtdb.firebaseio.com",
  projectId:         "loka-b8dd2",
  storageBucket:     "loka-b8dd2.firebasestorage.app",
  messagingSenderId: "633462890390",
  appId:             "1:633462890390:web:40e9baa2b80e5b709307b7"
};

// ── Detect if Firebase is available ────────────────────────────────
let _firebaseOk = false;
try {
  if (typeof firebase !== 'undefined') {
    firebase.initializeApp(FIREBASE_CONFIG);
    _firebaseOk = true;
  }
} catch(e) {
  console.warn('Firebase init failed, using localStorage fallback:', e.message);
}

const db_ref = _firebaseOk ? firebase.database() : null;

// ── LokaDB: Firebase com fallback localStorage ──────────────────────
const LokaDB = {

  _isOnline() {
    return _firebaseOk && navigator.onLine;
  },

  async load(path) {
    if (this._isOnline()) {
      try {
        const snap = await db_ref.ref(path).get();
        return snap.exists() ? snap.val() : null;
      } catch(e) {
        console.warn('Firebase load failed, trying localStorage:', e.message);
      }
    }
    // Fallback localStorage
    const raw = localStorage.getItem('loka_' + path.replace(/\//g,'_'));
    return raw ? JSON.parse(raw) : null;
  },

  async save(path, data) {
    // Always save to localStorage as backup
    try {
      localStorage.setItem('loka_' + path.replace(/\//g,'_'), JSON.stringify(data));
    } catch(e) {}
    // Try Firebase
    if (this._isOnline()) {
      try {
        await db_ref.ref(path).set(data);
      } catch(e) {
        console.warn('Firebase save failed (saved to localStorage):', e.message);
      }
    }
  },

  async update(path, data) {
    if (this._isOnline()) {
      try { await db_ref.ref(path).update(data); return; } catch(e) {}
    }
    // Fallback: load, merge, save
    const current = await this.load(path) || {};
    await this.save(path, { ...current, ...data });
  },

  async remove(path) {
    try { localStorage.removeItem('loka_' + path.replace(/\//g,'_')); } catch(e) {}
    if (this._isOnline()) {
      try { await db_ref.ref(path).remove(); } catch(e) {}
    }
  },

  listen(path, callback) {
    if (this._isOnline()) {
      try {
        db_ref.ref(path).on('value', snap => callback(snap.exists() ? snap.val() : null));
        return;
      } catch(e) {}
    }
    // Fallback: call once with localStorage data
    this.load(path).then(callback);
  },

  unlisten(path) {
    if (_firebaseOk && db_ref) {
      try { db_ref.ref(path).off(); } catch(e) {}
    }
  },

  // ── Passagem de dados entre páginas ──
  async setClientPass(data) {
    const payload = { ...data, _ts: Date.now() };
    localStorage.setItem('loka_contrato_client', JSON.stringify(payload));
    if (this._isOnline()) {
      try { await db_ref.ref('_pass/client').set(payload); } catch(e) {}
    }
  },

  async getClientPass() {
    let data = null;
    // Try localStorage first (faster)
    try {
      const raw = localStorage.getItem('loka_contrato_client');
      if (raw) {
        data = JSON.parse(raw);
        localStorage.removeItem('loka_contrato_client');
      }
    } catch(e) {}
    // Try Firebase
    if (!data && this._isOnline()) {
      try {
        const snap = await db_ref.ref('_pass/client').get();
        if (snap.exists()) {
          data = snap.val();
          await db_ref.ref('_pass/client').remove();
        }
      } catch(e) {}
    }
    if (!data) return null;
    if (Date.now() - (data._ts || 0) > 300000) return null;
    return data;
  }
};

// ── Toast helper ────────────────────────────────────────────────────
function lokaToast(msg, color = '#0E1B4D') {
  document.querySelectorAll('.loka-toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'loka-toast';
  t.style.cssText = 'position:fixed;top:18px;right:18px;background:'+color+';color:#fff;'
    +'padding:11px 18px;border-radius:8px;font-family:Montserrat,sans-serif;font-size:12px;'
    +'font-weight:700;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.25);max-width:340px;'
    +'display:flex;align-items:center;gap:8px;';
  t.innerHTML = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; setTimeout(()=>t.remove(),300); }, 4000);
}

// ── Status indicator ────────────────────────────────────────────────
window.addEventListener('load', () => {
  const mode = _firebaseOk && navigator.onLine ? '🟢 Online' : '🟡 Offline';
  console.log('LOKÁ Sistema — Modo:', mode);
});

// ── Connection status banner ─────────────────────────────────────
window.addEventListener('load', function() {
  const online = _firebaseOk && navigator.onLine;
  // Only show offline banner in gestao
  if (window.location.pathname.includes('gestao')) {
    if (!online) {
      const banner = document.createElement('div');
      banner.id = 'offline-banner';
      banner.style.cssText = 'position:fixed;bottom:48px;left:0;right:0;background:#b45309;color:#fff;text-align:center;padding:6px;font-family:Montserrat,sans-serif;font-size:11px;font-weight:700;z-index:1000;letter-spacing:.5px;';
      banner.textContent = '🟡 Modo offline — dados salvos localmente';
      document.body.appendChild(banner);
    }
  }
});

// ── Reconnect: sync localStorage to Firebase when back online ────
window.addEventListener('online', async function() {
  if (!_firebaseOk) return;
  try {
    const raw = localStorage.getItem('loka_loka_db');
    if (raw) {
      const data = JSON.parse(raw);
      await db_ref.ref('loka_db').set(data);
      console.log('✅ Dados sincronizados com Firebase após reconexão');
      const banner = document.getElementById('offline-banner');
      if (banner) banner.remove();
    }
  } catch(e) { console.warn('Sync error:', e); }
});
