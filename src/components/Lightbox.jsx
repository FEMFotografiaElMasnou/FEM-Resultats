import { useEffect } from 'react'

export default function Lightbox({ url, caption, onClose }) {
  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  if (!url) return null

  return (
    <div className="lightbox open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <button className="lightbox-close" onClick={onClose}>✕</button>
      <img className="lightbox-img" src={url} alt={caption} />
      <div className="lightbox-caption">{caption}</div>
    </div>
  )
}
