import { useState, useEffect, useCallback, useMemo } from 'react'
import { db } from './supabaseClient'
import {
  getUrlParams, getInternalPoints, noAutoRotateUrl,
  VOTE_MODES, hasExpertAmong, eligibleIdsForMode, scorePhotos, rankByField, hasEffectiveVotes,
} from './utils'
import LoginOverlay from './components/LoginOverlay'
import Topbar from './components/Topbar'
import ResultsView from './components/ResultsView'
import GeneralTable from './components/GeneralTable'
import Lightbox from './components/Lightbox'

const { role: urlRole, view: urlView, embedded } = getUrlParams()

// Retorna [{ id, role }] pels user_id indicats (deduplicats). S'evita
// l'embedding `seguiment_votacio -> users(role)` via select perquè
// PostgREST necessita una relació (FK) definida a l'esquema entre
// seguiment_votacio i users, i no n'hi ha cap — es resol amb una segona
// consulta senzilla a `users` i un merge en client.
async function withRoles(svRows) {
  const ids = [...new Set((svRows || []).map(r => r.user_id))]
  if (ids.length === 0) return []
  const { data: userRows, error } = await db.from('users').select('id, role').in('id', ids)
  if (error) throw error
  const roleById = Object.fromEntries((userRows || []).map(u => [u.id, u.role]))
  return ids.map(id => ({ id, role: roleById[id] || null }))
}

export default function App() {
  // ── AUTH ──────────────────────────────────────────────────────────────────
  const [user, setUser]           = useState(null)
  const [isAdmin, setIsAdmin]     = useState(false)
  const [loggedIn, setLoggedIn]   = useState(embedded) // embedded no necessita login

  // ── DADES ─────────────────────────────────────────────────────────────────
  const [objectives, setObjectives]     = useState([])
  const [generalObjectives, setGeneralObjectives] = useState([]) // reptes finalitzats, per a la taula de Classificació General
  const [selectedId, setSelectedId]     = useState('')
  const [rawResults, setRawResults]     = useState(null) // { photos, votes, eligibleUsers } del repte actual
  const [rawGeneral, setRawGeneral]     = useState([])   // [{ objective, photos, votes, eligibleUsers }]

  // ── UI ────────────────────────────────────────────────────────────────────
  const [view, setView]                     = useState('repte')   // 'repte' | 'general'
  const [sortField, setSortField]           = useState('notaFinal')
  const [voteFilter, setVoteFilter]         = useState(VOTE_MODES.TOTS)
  const [generalVoteFilter, setGeneralVoteFilter] = useState(VOTE_MODES.TOTS)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [lightbox, setLightbox]   = useState(null)      // { url, caption }

  // ── MODE EMBEDDED ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (embedded) {
      document.body.classList.add('embedded')
      if (urlView === 'classificacio') document.body.classList.add('view-classificacio')
      setIsAdmin(urlRole === 'admin')
    }
  }, [])

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  function handleLogin(userData) {
    setUser(userData)
    setIsAdmin(userData.role === 'admin')
    setLoggedIn(true)
  }

  function handleLogout() {
    setUser(null)
    setIsAdmin(false)
    setLoggedIn(false)
    setRawResults(null)
    setRawGeneral([])
    setObjectives([])
    setGeneralObjectives([])
    setSelectedId('')
    setView('repte')
  }

  // ── CARREGA REPTES ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loggedIn) return
    async function loadObjectives() {
      let query = db.from('objectives').select('id, name').order('name')
      if (!isAdmin) query = query.eq('status', 'finished')
      const { data, error } = await query
      if (error || !data?.length) { setError(error?.message || 'Cap repte trobat'); return }
      setObjectives(data)
      setSelectedId(data[0].id)
    }
    loadObjectives()
  }, [loggedIn, isAdmin])

  // ── NAVEGA A VISTA INICIAL PER URL ────────────────────────────────────────
  useEffect(() => {
    if (!objectives.length) return
    if (urlView === 'classificacio') setView('general')
  }, [objectives])

  // ── CARREGA RESULTATS D'UN REPTE ──────────────────────────────────────────
  // Es guarden les dades crues (fotos, vots amb user_id, elegibles amb rol) i
  // la nota/rànquing final es deriva més avall (useMemo) segons el mode de
  // vot triat — així el switch Tots/Socis/Expert no torna a consultar Supabase.
  const loadResults = useCallback(async (objectiveId) => {
    if (!objectiveId) return
    setLoading(true)
    setError(null)
    try {
      const { data: svRows, error: e1 } = await db
        .from('seguiment_votacio')
        .select('user_id')
        .eq('objective_id', objectiveId)
        .eq('es_esborrany', false)
      if (e1) throw e1

      const eligibleUsers = await withRoles(svRows)
      const eligibleIdsAll = eligibleUsers.map(u => u.id)

      const { data: photos, error: e2 } = await db
        .from('photo_submissions')
        .select('id, file_name, file_url, original_url, user_id, users(display_name)')
        .eq('objective_id', objectiveId)
      if (e2) throw e2

      let votes = []
      if (eligibleIdsAll.length > 0) {
        const { data: vRows, error: e3 } = await db
          .from('votes')
          .select('photo_id, creativity, theme, composition, user_id')
          .eq('objective_id', objectiveId)
          .in('user_id', eligibleIdsAll)
        if (e3) throw e3
        votes = vRows || []
      }

      const mappedPhotos = (photos || []).map(p => ({
        id:          p.id,
        foto:        p.file_name || '',
        url:         noAutoRotateUrl(p.file_url  || p.original_url || ''),
        urlOriginal: noAutoRotateUrl(p.original_url || p.file_url  || ''),
        usuari:      p.users?.display_name || '—',
      }))

      setRawResults({ photos: mappedPhotos, votes, eligibleUsers })
      setVoteFilter(VOTE_MODES.TOTS) // reset del filtre en canviar de repte
    } catch (err) {
      setError(err.message || 'Error desconegut')
      setRawResults(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (view === 'repte' && selectedId) loadResults(selectedId)
  }, [selectedId, view, loadResults])

  // Hi ha algun elegible amb rol expert en aquest repte?
  const hasExpertResults = useMemo(
    () => rawResults ? hasExpertAmong(rawResults.eligibleUsers) : false,
    [rawResults]
  )

  // Nota/rànquing derivats del mode de vot triat (Tots/Socis/Expert).
  // Si el repte no té cap expert, els tres modes donen el mateix resultat:
  // es força TOTS perquè el valor de l'estat no afecti el càlcul.
  const allData = useMemo(() => {
    if (!rawResults) return []
    const effectiveMode = hasExpertResults ? voteFilter : VOTE_MODES.TOTS
    const ids = eligibleIdsForMode(rawResults.eligibleUsers, effectiveMode)
    return scorePhotos(rawResults.photos, rawResults.votes, ids)
  }, [rawResults, voteFilter, hasExpertResults])

  // ── CARREGA CLASSIFICACIÓ GENERAL ─────────────────────────────────────────
  const loadGeneral = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: objs, error: e } = await db
        .from('objectives').select('id, name').eq('status', 'finished').order('name')
      if (e) throw e
      if (!objs?.length) { setRawGeneral([]); setGeneralObjectives([]); setLoading(false); return }

      const objectiveData = await Promise.all(objs.map(async obj => {
        const { data: svRows } = await db
          .from('seguiment_votacio').select('user_id')
          .eq('objective_id', obj.id).eq('es_esborrany', false)
        const eligibleUsers  = await withRoles(svRows)
        const eligibleIdsAll = eligibleUsers.map(u => u.id)

        const { data: photos } = await db
          .from('photo_submissions')
          .select('id, file_url, original_url, user_id, users(display_name)')
          .eq('objective_id', obj.id)

        let votes = []
        if (eligibleIdsAll.length > 0) {
          const { data: vRows } = await db
            .from('votes').select('photo_id, creativity, theme, composition, user_id')
            .eq('objective_id', obj.id).in('user_id', eligibleIdsAll)
          votes = vRows || []
        }

        const mappedPhotos = (photos || []).map(p => ({
          id:       p.id,
          userId:   p.user_id,
          userName: p.users?.display_name || '—',
          url:      noAutoRotateUrl(p.file_url || p.original_url || ''),
          urlOrig:  noAutoRotateUrl(p.original_url || p.file_url || ''),
        }))

        return { objective: obj, photos: mappedPhotos, votes, eligibleUsers }
      }))

      setRawGeneral(objectiveData)
      setGeneralObjectives(objs)
      setGeneralVoteFilter(VOTE_MODES.TOTS) // reset del filtre en recarregar la general
    } catch (err) {
      setError(err.message || 'Error desconegut')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (view === 'general') loadGeneral()
  }, [view, loadGeneral])

  // Es mostra el selector de mode de vot a la Classificació General només si
  // ALGUN dels reptes finalitzats té almenys un elegible amb rol expert.
  const generalHasExpert = useMemo(
    () => rawGeneral.some(o => hasExpertAmong(o.eligibleUsers)),
    [rawGeneral]
  )

  // Classificació derivada del mode de vot triat. Cada repte es puntua de
  // manera independent amb el subconjunt de votants del mode triat (mateixa
  // fórmula i mateix dense ranking d'sempre) i després s'acumulen els punts
  // interns per soci, exactament com abans.
  const participants = useMemo(() => {
    if (!rawGeneral.length) return []
    const effectiveMode = generalHasExpert ? generalVoteFilter : VOTE_MODES.TOTS

    const userMap = {}
    for (const { objective, photos, votes, eligibleUsers } of rawGeneral) {
      const ids = eligibleIdsForMode(eligibleUsers, effectiveMode)
      // Cap vot efectiu del subconjunt triat en aquest repte (ni elegibles,
      // ni algú elegible que no ha puntuat res): el repte no aporta punts a
      // ningú sota aquest filtre, en comptes de repartir el màxim per empat.
      if (!hasEffectiveVotes(votes, ids)) continue
      const scored = scorePhotos(photos, votes, ids)
      const ranked = rankByField(scored, 'notaFinal')

      for (const item of ranked) {
        const internalPoints = getInternalPoints(item.position)
        if (!userMap[item.userId]) {
          userMap[item.userId] = { userId: item.userId, userName: item.userName, internalTotal: 0, reptes: {} }
        }
        userMap[item.userId].internalTotal += internalPoints
        userMap[item.userId].reptes[objective.id] = {
          displayPoints: Math.floor(internalPoints),
          url: item.url, urlOrig: item.urlOrig, position: item.position,
        }
      }
    }

    const list = Object.values(userMap)
    list.sort((a, b) => b.internalTotal - a.internalTotal)
    list.forEach(p => { p.displayTotal = Math.floor(p.internalTotal) })
    let genPos = 1
    for (let i = 0; i < list.length; i++) {
      if (i > 0 && list[i].displayTotal < list[i - 1].displayTotal) genPos++
      list[i].generalPosition = genPos
    }
    return list
  }, [rawGeneral, generalVoteFilter, generalHasExpert])

  // ── RENDER ────────────────────────────────────────────────────────────────
  const selectedName = objectives.find(o => o.id === selectedId)?.name || ''

  return (
    <>
      {!embedded && !loggedIn && <LoginOverlay onLogin={handleLogin} />}
      {!embedded && <Topbar user={user} onLogout={handleLogout} />}

      <main>
        {!embedded && (
          <>
            <h1 className="page-title">Presentació Resultats</h1>
            <div className="title-underline"></div>
          </>
        )}

        {embedded && view === 'repte'   && <div className="section-heading">Resultats del Repte</div>}
        {embedded && view === 'general' && <div className="section-heading">Classificació General</div>}

        {/* ── CONTROLS ── */}
        <div className="controls-row">
          {/* Split button */}
          <div
            className={`repte-select-wrapper${view === 'repte' ? ' tab-active' : ''}${view === 'general' ? ' view-general' : ''}`}
            id="repteWrapper"
          >
            <div
              className="repte-btn-main"
              onClick={() => {
                if (view === 'general') setView('repte')
              }}
            >
              <span className="repte-back-arrow">‹</span>
              <span>{selectedName || 'Carregant…'}</span>
            </div>
            <div className="repte-btn-divider"></div>
            <div className="repte-btn-arrow">
              <select
                value={selectedId}
                onChange={e => { setSelectedId(e.target.value); setView('repte') }}
              >
                {objectives.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
              ▾
            </div>
          </div>

          {!embedded && (
            <button
              className={`btn-general${view === 'general' ? ' tab-active' : ''}`}
              onClick={() => setView('general')}
            >
              Classificació General
            </button>
          )}
        </div>

        {/* ── CONTINGUT ── */}
        {loading && (
          <div className="state-msg">
            <div className="spinner"></div>Carregant dades…
          </div>
        )}
        {error && (
          <div className="state-msg" style={{ color: 'var(--red)' }}>Error: {error}</div>
        )}
        {!loading && !error && view === 'repte' && (
          <ResultsView
            data={allData}
            sortField={sortField}
            onSortChange={setSortField}
            voteFilter={voteFilter}
            onVoteFilterChange={setVoteFilter}
            hasExpert={hasExpertResults}
            onOpenLightbox={(url, caption) => setLightbox({ url, caption })}
          />
        )}
        {!loading && !error && view === 'general' && (
          <GeneralTable
            participants={participants}
            objectives={generalObjectives}
            voteFilter={generalVoteFilter}
            onVoteFilterChange={setGeneralVoteFilter}
            hasExpert={generalHasExpert}
            onOpenLightbox={(url, caption) => setLightbox({ url, caption })}
          />
        )}
      </main>

      {lightbox && (
        <Lightbox
          url={lightbox.url}
          caption={lightbox.caption}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  )
}
