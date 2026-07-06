import Stars from './Stars'
import { thumbUrl } from '../utils'

export default function ResultsView({ data, sortField, onSortChange, onOpenLightbox }) {
  if (!data.length) {
    return <div className="state-msg">Cap foto trobada per a aquest repte.</div>
  }

  const sorted = [...data].sort((a, b) => (b[sortField] ?? 0) - (a[sortField] ?? 0))
  let densePos = 1
  const withPos = sorted.map((row, i) => {
    if (i > 0 && (row[sortField] ?? 0) < (sorted[i - 1][sortField] ?? 0)) densePos++
    return { row, pos: densePos }
  })

  return (
    <>
      <div id="sortSection">
        <div className="sort-label">Ordenar per:</div>
        <div className="sort-row">
          {['notaFinal', 'creativitat', 'composicio', 'tematica'].map(field => (
            <button
              key={field}
              className={`sort-btn${sortField === field ? ' active' : ''}`}
              onClick={() => onSortChange(field)}
            >
              {{ notaFinal: 'Total', creativitat: 'Creativitat', composicio: 'Composició', tematica: 'Temàtica' }[field]}
            </button>
          ))}
        </div>
      </div>
      <div className="cards-list">
        {withPos.map(({ row, pos }) => (
          <PhotoCard key={row.foto + row.usuari} row={row} pos={pos} onOpenLightbox={onOpenLightbox} />
        ))}
      </div>
    </>
  )
}

function PhotoCard({ row, pos, onOpenLightbox }) {
  const posClass = pos === 1 ? 'top1' : pos === 2 ? 'top2' : pos === 3 ? 'top3' : ''
  const thumb    = thumbUrl(row.url)
  const original = row.urlOriginal || row.url

  return (
    <div className="photo-card" style={{ animationDelay: `${(pos - 1) * 0.05}s` }}>
      <div className={`card-pos ${posClass}`}>{pos}</div>
      <div className="card-thumb" onClick={() => onOpenLightbox(original, row.usuari)}>
        {thumb
          ? <img src={thumb} alt={row.usuari} loading="lazy" />
          : <div className="card-thumb-placeholder">📷</div>
        }
        <div className="zoom-icon">🔍</div>
      </div>
      <div className="card-body">
        <div className="card-author">{row.usuari}</div>
        <div className="card-criteria">
          {[
            { label: 'Creativitat', val: row.creativitat },
            { label: 'Composició', val: row.composicio },
            { label: 'Temàtica',   val: row.tematica },
          ].map(({ label, val }) => (
            <div key={label} className="criterion">
              <div className="criterion-label">{label}</div>
              <div className="criterion-row">
                <span className="criterion-val">{val.toFixed(2)}</span>
                <Stars score={val} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="card-total">
        <div className="total-label">Total</div>
        <div className="total-stars"><Stars score={row.notaFinal} /></div>
        <div className="total-val">{row.notaFinal.toFixed(2)}</div>
      </div>
    </div>
  )
}
