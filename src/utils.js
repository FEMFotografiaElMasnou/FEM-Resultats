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

// ── VOT EXPERT: MODES DE FILTRE ──────────────────────────────────────────
// Des de juliol 2026 la taula `users` pot tenir role = 'expert' a més
// d'`admin`/`participant`. Aquests tres modes decideixen quin subconjunt
// de votants elegibles s'utilitza per calcular notes i rànquings — la
// fórmula és sempre la mateixa (§5 del handoff), només canvia la població
// de votants que hi entra.
export const VOTE_MODES = {
  TOTS:   'tots',    // tots els votants elegibles, sense distinció (per defecte / comportament històric)
  SOCIS:  'socis',   // tots els elegibles excepte els d'rol 'expert'
  EXPERT: 'expert',  // només els elegibles amb rol 'expert'
}

export const VOTE_MODE_LABELS = {
  [VOTE_MODES.TOTS]:   'Tots els vots',
  [VOTE_MODES.SOCIS]:  'Vots dels socis',
  [VOTE_MODES.EXPERT]: 'Vot expert',
}

export const VOTE_MODE_ORDER = [VOTE_MODES.TOTS, VOTE_MODES.SOCIS, VOTE_MODES.EXPERT]

// eligibleUsers: [{ id, role }] — indica si entre els elegibles n'hi ha cap d'expert.
export function hasExpertAmong(eligibleUsers) {
  return (eligibleUsers || []).some(u => u.role === 'expert')
}

// Retorna els user_id elegibles corresponents al mode de vot triat.
export function eligibleIdsForMode(eligibleUsers, mode) {
  const users = eligibleUsers || []
  if (mode === VOTE_MODES.EXPERT) return users.filter(u => u.role === 'expert').map(u => u.id)
  if (mode === VOTE_MODES.SOCIS)  return users.filter(u => u.role !== 'expert').map(u => u.id)
  return users.map(u => u.id)
}

// ── CÀLCUL DE NOTES PER FOTO ──────────────────────────────────────────────
// Mateixa fórmula d'sempre (§5.1 del handoff): el denominador és el total
// d'elegibles del subconjunt triat, no el nombre de vots realment rebuts.
// photos: [{ id, ... }]   votes: [{ photo_id, user_id, creativity, composition, theme }]
// eligibleIds: user_id que compten pel denominador i que es tenen en compte als sumatoris.
export function scorePhotos(photos, votes, eligibleIds) {
  const eligibleSet   = new Set(eligibleIds)
  const totalEligible = eligibleIds.length

  const sumsByPhoto = {}
  for (const v of votes) {
    if (!eligibleSet.has(v.user_id)) continue
    if (!sumsByPhoto[v.photo_id]) sumsByPhoto[v.photo_id] = { cre: 0, com: 0, tem: 0 }
    sumsByPhoto[v.photo_id].cre += v.creativity  || 0
    sumsByPhoto[v.photo_id].com += v.composition || 0
    sumsByPhoto[v.photo_id].tem += v.theme       || 0
  }

  return (photos || []).map(p => {
    const s   = sumsByPhoto[p.id] || { cre: 0, com: 0, tem: 0 }
    const den = totalEligible > 0 ? totalEligible : null
    const cre = den ? round2(s.cre / den) : 0
    const com = den ? round2(s.com / den) : 0
    const tem = den ? round2(s.tem / den) : 0
    const tot = den ? round2((s.cre + s.com + s.tem) / (den * 3)) : 0
    return { ...p, creativitat: cre, composicio: com, tematica: tem, notaFinal: tot }
  })
}

// ── TEXT DEL LIGHTBOX ─────────────────────────────────────────────────────
// "Nom Autor - Text de la foto (Repte)" si hi ha caption; si no,
// "Nom Autor (Repte)". El nom del repte s'omet si no se'n coneix el nom.
export function buildLightboxCaption(authorName, caption, objectiveName) {
  const base = caption ? `${authorName} - ${caption}` : authorName
  return objectiveName ? `${base} (${objectiveName})` : base
}

// ── RÀNQUING (dense ranking) ──────────────────────────────────────────────
// Ordena descendent per `field` i assigna posicions denses (empats
// comparteixen posició; la següent puntuació diferent salta a l'enter
// immediatament següent — mateixa regla d'sempre, §5.2/§5.3 del handoff).
// Indica si el subconjunt de vots elegibles ha emès com a mínim un vot
// efectiu (una fila a `votes`) per a aquest repte i mode. Cobreix tant
// "ningú elegible" com "hi ha algú elegible però no ha puntuat cap foto"
// (p. ex. l'expert envia la votació com a no-esborrany sense valorar res).
// Si és fals, aquest repte no ha d'aportar punts a ningú a la Classificació
// General sota aquest filtre.
export function hasEffectiveVotes(votes, eligibleIds) {
  const eligibleSet = new Set(eligibleIds)
  return (votes || []).some(v => eligibleSet.has(v.user_id))
}

// Ordinal català curt per a posicions de rànquing (1r, 2n, 3r, 4t, 5è...).
export function formatPosition(position) {
  if (!position || position < 1) return '—'
  if (position === 1) return '1r'
  if (position === 2) return '2n'
  if (position === 3) return '3r'
  if (position === 4) return '4t'
  return position + 'è'
}

export function rankByField(rows, field) {
  const sorted = [...rows].sort((a, b) => (b[field] ?? 0) - (a[field] ?? 0))
  let pos = 1
  return sorted.map((row, i) => {
    if (i > 0 && (row[field] ?? 0) < (sorted[i - 1][field] ?? 0)) pos++
    return { ...row, position: pos }
  })
}
