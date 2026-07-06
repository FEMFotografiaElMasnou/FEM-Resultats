import { thumbSmUrl } from '../utils'

export default function GeneralTable({ participants, objectives, onOpenLightbox }) {
  if (!participants.length) {
    return <div className="state-msg">Cap resultat disponible.</div>
  }

  return (
    <div className="gen-table">
      <div className="gen-header">
        <div className="gen-header-pos">POS</div>
        <div className="gen-header-name">SOCI/A</div>
        <div className="gen-header-total">TOTAL</div>
        <div className="gen-header-reptes">REPTES</div>
      </div>
      {participants.map((p, idx) => (
        <GenRow
          key={p.userId}
          p={p}
          objectives={objectives}
          idx={idx}
          onOpenLightbox={onOpenLightbox}
        />
      ))}
    </div>
  )
}

function GenRow({ p, objectives, idx, onOpenLightbox }) {
  const pc = p.generalPosition === 1 ? 'top1'
           : p.generalPosition === 2 ? 'top2'
           : p.generalPosition === 3 ? 'top3' : ''

  return (
    <div className="gen-row" style={{ animationDelay: `${idx * 0.06}s` }}>
      <div className="gen-cell-pos">
        <span className={`gen-pos-num ${pc}`}>{p.generalPosition}</span>
      </div>
      <div className="gen-cell-name">{p.userName}</div>
      <div className="gen-cell-total">
        <span className="gen-total-badge">{p.displayTotal}</span>
      </div>
      <div className="gen-cell-reptes">
        <div
          className="gen-reptes-grid"
          style={{ gridTemplateColumns: `repeat(${objectives.length}, auto)` }}
        >
          {objectives.map(obj => {
            const entry = p.reptes[obj.id]
            if (!entry) {
              return (
                <div key={obj.id} className="gen-repte-entry gen-repte-absent">
                  <div className="gen-repte-top">
                    <div className="gen-no-thumb">📷</div>
                    <div className="gen-repte-pts-dash">—</div>
                  </div>
                  <div className="gen-repte-name">{obj.name}</div>
                </div>
              )
            }
            const thumb = thumbSmUrl(entry.url)
            return (
              <div key={obj.id} className="gen-repte-entry">
                <div className="gen-repte-top">
                  <div
                    className="gen-repte-thumb"
                    onClick={() => onOpenLightbox(entry.urlOrig || entry.url, `${p.userName}  ·  ${obj.name}`)}
                  >
                    {thumb && <img src={thumb} alt="" loading="lazy" />}
                    <div className="zoom-icon">🔍</div>
                  </div>
                  <div className="gen-repte-pts">{entry.displayPoints}</div>
                </div>
                <div className="gen-repte-name">{obj.name}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
