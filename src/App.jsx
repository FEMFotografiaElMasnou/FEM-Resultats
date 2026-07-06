import { useState, useEffect, useCallback } from 'react'
import { db } from './supabaseClient'
import { getUrlParams, getInternalPoints, round2 } from './utils'
import LoginOverlay from './components/LoginOverlay'
import Topbar from './components/Topbar'
import ResultsView from './components/ResultsView'
import GeneralTable from './components/GeneralTable'
import Lightbox from './components/Lightbox'

const { role: urlRole, view: urlView, embedded } = getUrlParams()

export default function App() {
  // ── AUTH ──────────────────────────────────────────────────────────────────
  const [user, setUser]           = useState(null)
  const [isAdmin, setIsAdmin]     = useState(false)
  const [loggedIn, setLoggedIn]   = useState(embedded) // embedded no necessita login

  // ── DADES ─────────────────────────────────────────────────────────────────
  const [objectives, setObjectives]     = useState([])
  const [selectedId, setSelectedId]     = useState('')
  const [allData, setAllData]           = useState([])
  const [participants, setParticipants] = useState([])

  // ── UI ────────────────────────────────────────────────────────────────────
  const [view, setView]           = useState('repte')   // 'repte' | 'general'
  const [sortField, setSortField] = useState('notaFinal')
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
    setAllData([])
    setObjectives([])
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

      const eligibleIds   = (svRows || []).map(r => r.user_id)
      const totalEligible = eligibleIds.length

      const { data: photos, error: e2 } = await db
        .from('photo_submissions')
        .select('id, file_name, file_url, original_url, user_id, users(display_name)')
        .eq('objective_id', objectiveId)
      if (e2) throw e2

      let votes = []
      if (eligibleIds.length > 0) {
        const { data: vRows, error: e3 } = await db
          .from('votes')
          .select('photo_id, creativity, theme, composition')
          .eq('objective_id', objectiveId)
          .in('user_id', eligibleIds)
        if (e3) throw e3
        votes = vRows || []
      }

      const { data: allUsers, error: e4 } = await db.from('users').select('id').order('id')
      if (e4) throw e4
      const userRank = {}
      ;(allUsers || []).forEach((u, i) => { userRank[u.id] = i + 1 })

      const sumsByPhoto = {}
      for (const v of votes) {
        if (!sumsByPhoto[v.photo_id]) sumsByPhoto[v.photo_id] = { cre: 0, com: 0, tem: 0 }
        sumsByPhoto[v.photo_id].cre += v.creativity  || 0
        sumsByPhoto[v.photo_id].com += v.composition || 0
        sumsByPhoto[v.photo_id].tem += v.theme       || 0
      }

      const result = (photos || []).map(p => {
        const s   = sumsByPhoto[p.id] || { cre: 0, com: 0, tem: 0 }
        const den = totalEligible > 0 ? totalEligible : null
        const cre = den ? round2(s.cre / den) : 0
        const com = den ? round2(s.com / den) : 0
        const tem = den ? round2(s.tem / den) : 0
        const tot = den ? round2((s.cre + s.com + s.tem) / (den * 3)) : 0
        return {
          foto:        p.file_name || '',
          url:         p.file_url  || p.original_url || '',
          urlOriginal: p.original_url || p.file_url  || '',
          usuari:      p.users?.display_name || '—',
          creativitat: cre, composicio: com, tematica: tem, notaFinal: tot,
        }
      })
      setAllData(result)
    } catch (err) {
      setError(err.message || 'Error desconegut')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (view === 'repte' && selectedId) loadResults(selectedId)
  }, [selectedId, view, loadResults])

  // ── CARREGA CLASSIFICACIÓ GENERAL ─────────────────────────────────────────
  const loadGeneral = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: objs, error: e } = await db
        .from('objectives').select('id, name').eq('status', 'finished').order('name')
      if (e) throw e
      if (!objs?.length) { setParticipants([]); setLoading(false); return }

      const objectiveData = await Promise.all(objs.map(async obj => {
        const { data: svRows } = await db
          .from('seguiment_votacio').select('user_id')
          .eq('objective_id', obj.id).eq('es_esborrany', false)
        const eligibleIds   = (svRows || []).map(r => r.user_id)
        const totalEligible = eligibleIds.length

        const { data: photos } = await db
          .from('photo_submissions')
          .select('id, file_url, original_url, user_id, users(display_name)')
          .eq('objective_id', obj.id)

        let votes = []
        if (eligibleIds.length > 0) {
          const { data: vRows } = await db
            .from('votes').select('photo_id, creativity, theme, composition')
            .eq('objective_id', obj.id).in('user_id', eligibleIds)
          votes = vRows || []
        }

        const sumsByPhoto = {}
        for (const v of votes) {
          if (!sumsByPhoto[v.photo_id]) sumsByPhoto[v.photo_id] = { cre: 0, com: 0, tem: 0 }
          sumsByPhoto[v.photo_id].cre += v.creativity  || 0
          sumsByPhoto[v.photo_id].com += v.composition || 0
          sumsByPhoto[v.photo_id].tem += v.theme       || 0
        }

        const photoResults = (photos || []).map(p => {
          const s   = sumsByPhoto[p.id] || { cre: 0, com: 0, tem: 0 }
          const den = totalEligible > 0 ? totalEligible : null
          const tot = den ? round2((s.cre + s.com + s.tem) / (den * 3)) : 0
          return {
            userId: p.user_id, userName: p.users?.display_name || '—',
            url: p.file_url || p.original_url || '',
            urlOrig: p.original_url || p.file_url || '', notaFinal: tot,
          }
        })

        photoResults.sort((a, b) => b.notaFinal - a.notaFinal)
        let densePos = 1
        for (let i = 0; i < photoResults.length; i++) {
          if (i > 0 && photoResults[i].notaFinal < photoResults[i - 1].notaFinal) densePos++
          photoResults[i].position       = densePos
          photoResults[i].internalPoints = getInternalPoints(densePos)
        }
        return { objective: obj, standings: photoResults }
      }))

      const userMap = {}
      for (const { objective, standings } of objectiveData) {
        for (const item of standings) {
          if (!userMap[item.userId]) {
            userMap[item.userId] = { userId: item.userId, userName: item.userName, internalTotal: 0, reptes: {} }
          }
          userMap[item.userId].internalTotal += item.internalPoints
          userMap[item.userId].reptes[objective.id] = {
            displayPoints: Math.floor(item.internalPoints),
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
      setParticipants(list)
      setObjectives(objs)
    } catch (err) {
      setError(err.message || 'Error desconegut')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (view === 'general') loadGeneral()
  }, [view, loadGeneral])

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
                else setView('general')
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
            onOpenLightbox={(url, caption) => setLightbox({ url, caption })}
          />
        )}
        {!loading && !error && view === 'general' && (
          <GeneralTable
            participants={participants}
            objectives={objectives}
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
