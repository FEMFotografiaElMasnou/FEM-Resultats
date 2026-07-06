export default function Topbar({ user, onLogout }) {
  return (
    <header className="topbar">
      <div className="topbar-brand">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
        FEM Fotografia El Masnou
      </div>
      {user && (
        <div className="topbar-user">
          <span className="topbar-username">{user.displayName}</span>
          <button className="topbar-logout" onClick={onLogout}>Sortir</button>
        </div>
      )}
    </header>
  )
}
