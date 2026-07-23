import { useEffect, useState } from 'react'
import Stars from './Stars'
import { VOTE_MODES, VOTE_MODE_LABELS, formatPosition } from '../utils'

// Ordre de blocs a la cortineta: Expert primer (és el motiu d'existir de la
// cortina), després Socis, després Tots.
const CURTAIN_MODE_ORDER = [VOTE_MODES.EXPERT, VOTE_MODES.SOCIS, VOTE_MODES.TOTS]

function posClass(position) {
  if (position === 1) return 'pos-top1'
  if (position === 2) return 'pos-top2'
  if (position === 3) return 'pos-top3'
  return ''
}

export default function Lightbox({ url, caption, photoId, dataByMode, hasExpert, onClose }) {
  const [curtainOpen, setCurtainOpen] = useState(false)

  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Cada cop que canvia la foto mostrada, es tanca la cortina (evita mostrar
  // dades d'una foto anterior mentre es carrega la nova).
  useEffect(() => { setCurtainOpen(false) }, [url])

  if (!url) return null

  // La cortineta només té sentit si aquest repte té vot d'expert i tenim
  // dades calculades pels tres modes per a AQUESTA foto en concret.
  const blocks = (hasExpert && photoId && dataByMode)
    ? CURTAIN_MODE_ORDER
        .map(mode => ({ mode, row: dataByMode[mode]?.find(r => r.id === photoId) }))
        .filter(b => b.row)
    : []
  const showTrigger = blocks.length > 0

  return (
    <div className="lightbox open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <button className="lightbox-close" onClick={onClose}>✕</button>

      {showTrigger && (
        <button
          className="lightbox-score-trigger"
          onClick={e => { e.stopPropagation(); setCurtainOpen(o => !o) }}
          aria-label="Puntuació i posició"
          title="Puntuació i posició"
        >★</button>
      )}

      <img className="lightbox-img" src={url} alt={caption} />
      <div className="lightbox-caption">{caption}</div>

      {showTrigger && (
        <div
          className={`score-curtain${curtainOpen ? ' open' : ''}`}
          onClick={e => e.stopPropagation()}
        >
          <div className="score-blocks">
            {blocks.map(({ mode, row }) => (
              <div className="score-block" key={mode}>
                <div className="score-block-head">
                  <span className="score-block-name">{VOTE_MODE_LABELS[mode]}</span>
                  <span className={`score-block-pos ${posClass(row.position)}`}>{formatPosition(row.position)}</span>
                  <span className="score-block-total">{row.notaFinal.toFixed(2)}</span>
                </div>
                <ScoreCriterionRow label="Creativitat" val={row.creativitat} />
                <ScoreCriterionRow label="Composició" val={row.composicio} />
                <ScoreCriterionRow label="Temàtica" val={row.tematica} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ScoreCriterionRow({ label, val }) {
  return (
    <div className="score-crit-row">
      <span className="score-crit-label">{label}</span>
      <span className="score-crit-stars"><Stars score={val} /></span>
      <span className="score-crit-val">{val.toFixed(2)}</span>
    </div>
  )
}
