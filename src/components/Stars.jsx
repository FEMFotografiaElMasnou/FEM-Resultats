export default function Stars({ score }) {
  return (
    <span className="stars">
      {[1, 2, 3, 4, 5].map(i => {
        if (score >= i) return <span key={i} className="star full">★</span>
        if (score > i - 1) {
          const pct = Math.round((score - (i - 1)) * 100)
          return <span key={i} className="star partial" style={{ '--pct': `${pct}%` }}>★</span>
        }
        return <span key={i} className="star">★</span>
      })}
    </span>
  )
}
