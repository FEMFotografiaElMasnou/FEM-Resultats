// ── TAULA DE PUNTS ────────────────────────────────────────────────────────
const POINTS_TABLE = { 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 7, 8: 6, 9: 5, 10: 4 }

export function getInternalPoints(pos) {
  if (pos <= 10) return POINTS_TABLE[pos]
  return 1 + (110 - pos) * 0.0001
}

// ── CLOUDINARY ────────────────────────────────────────────────────────────
// Totes les fotos pujades des de l'App Reptes passen per un <canvas> que ja
// les deixa "de peu" abans de pujar-les — però algunes (pujades abans d'un
// fix a l'App Reptes, juliol 2026) van quedar amb els píxels correctes però
// un tag EXIF Orientation obsolet, fent que Cloudinary les torni a girar en
// servir-les. El flag `a_ignore` li diu a Cloudinary que no apliqui cap
// rotació pròpia — és segur per a totes les fotos d'aquest projecte, cap
// depèn de l'EXIF per mostrar-se bé. S'aplica al punt únic on es construeix
// la URL (App.jsx) perquè thumbUrl/thumbSmUrl/Lightbox l'heretin automàtica-
// ment sense haver-los de tocar un per un.
export function noAutoRotateUrl(url) {
  if (!url) return url
  return url.includes('/upload/a_ignore/')
    ? url
    : url.replace('/upload/', '/upload/a_ignore/')
}

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
