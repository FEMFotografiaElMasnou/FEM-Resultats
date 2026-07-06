// ── TAULA DE PUNTS ────────────────────────────────────────────────────────
const POINTS_TABLE = { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 7, 8: 6, 9: 5, 10: 4 }

export function getInternalPoints(pos) {
  if (pos <= 10) return POINTS_TABLE[pos]
  return 1 + (110 - pos) * 0.0001
}

// ── CLOUDINARY ────────────────────────────────────────────────────────────
export function thumbUrl(url) {
  if (!url) return null
  return url.replace('/upload/', '/upload/w_240,h_180,c_fill,q_auto,f_auto/')
}

export function thumbSmUrl(url) {
  if (!url) return null
  return url.replace('/upload/', '/upload/w_128,h_96,c_fill,q_auto,f_auto/')
}

// ── ESCAPE HTML ───────────────────────────────────────────────────────────
export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

export function round2(n) {
  return Math.round(n * 100) / 100
}

// ── PARÀMETRES URL ────────────────────────────────────────────────────────
export function getUrlParams() {
  const p = new URLSearchParams(window.location.search)
  return {
    role:     p.get('role'),      // 'admin' | 'participant' | null
    view:     p.get('view'),      // 'resultats' | 'classificacio' | null
    embedded: p.get('embedded') === 'true',
  }
}
