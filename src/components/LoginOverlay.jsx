import { useState } from 'react'
import { db } from '../supabaseClient'

export default function LoginOverlay({ onLogin }) {
  const [credential, setCredential] = useState('')
  const [password, setPassword]     = useState('')
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)

  async function doLogin() {
    setError('')
    if (!credential || !password) { setError('Omple tots els camps.'); return }

    setLoading(true)
    const { data, error: dbErr } = await db
      .from('users')
      .select('id, display_name, role, password')
      .or(`email.eq.${credential},display_name.eq.${credential}`)
      .maybeSingle()
    setLoading(false)

    if (dbErr || !data) { setError('Usuari no trobat.'); return }
    if (data.password !== password) { setError('Contrasenya incorrecta.'); return }

    onLogin({ id: data.id, displayName: data.display_name, role: data.role })
  }

  function handleKey(e) {
    if (e.key === 'Enter') doLogin()
  }

  return (
    <div className="login-overlay">
      <div className="login-box">
        <div className="login-title">Accés</div>
        <div className="login-field">
          <label htmlFor="loginCredential">Usuari / Email</label>
          <input
            id="loginCredential"
            type="text"
            placeholder="El teu email o nom d'usuari"
            autoComplete="username"
            value={credential}
            onChange={e => setCredential(e.target.value)}
            onKeyDown={handleKey}
          />
        </div>
        <div className="login-field">
          <label htmlFor="loginPassword">Contrasenya</label>
          <input
            id="loginPassword"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={handleKey}
          />
        </div>
        <button className="login-submit" onClick={doLogin} disabled={loading}>
          {loading ? 'Verificant…' : 'Entrar'}
        </button>
        {error && <div className="login-error">{error}</div>}
      </div>
    </div>
  )
}
