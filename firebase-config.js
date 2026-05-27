// ═══════════════════════════════════════════════════════════════════
// LOKÁ Sistema — Firebase Config & Sync Layer
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

// ── Initialize ──────────────────────────────────────────────────────────────
firebase.initializeApp(FIREBASE_CONFIG);
const db_ref = firebase.database();

// ── LokaDB: camada de abstração sobre Firebase ──────────────────────────────
const LokaDB = {

  async load(path) {
    const snap = await db_ref.ref(path).get();
    return snap.exists() ? snap.val() : null;
  },

  async save(path, data) {
    await db_ref.ref(path).set(data);
  },

  async update(path, data) {
    await db_ref.ref(path).update(data);
  },

  async remove(path) {
    await db_ref.ref(path).remove();
  },

  async push(path, data) {
    const ref = await db_ref.ref(path).push(data);
    return ref.key;
  },

  listen(path, callback) {
    db_ref.ref(path).on('value', snap => {
      callback(snap.exists() ? snap.val() : null);
    });
  },

  unlisten(path) {
    db_ref.ref(path).off();
  },

  // ── Passagem de dados entre páginas (substitui localStorage) ──
  async setClientPass(data) {
    await this.save('_pass/client', { ...data, _ts: Date.now() });
  },

  async getClientPass() {
    const data = await this.load('_pass/client');
    if (!data) return null;
    // Expira após 5 minutos
    if (Date.now() - (data._ts || 0) > 300000) {
      await this.remove('_pass/client');
      return null;
    }
    await this.remove('_pass/client');
    return data;
  }
};

// ── Toast helper ────────────────────────────────────────────────────────────
function lokaToast(msg, color = '#0E1B4D') {
  document.querySelectorAll('.loka-toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'loka-toast';
  t.style.cssText = `position:fixed;top:18px;right:18px;background:${color};color:#fff;
    padding:11px 18px;border-radius:8px;font-family:Montserrat,sans-serif;font-size:12px;
    font-weight:700;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.25);max-width:340px;
    display:flex;align-items:center;gap:8px;`;
  t.innerHTML = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 4000);
}
