import React, { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { logout } from '../api'
import useSession from '../hooks/useSession'

const THEME_KEY = 'tema'

function getTheme() {
  const t = localStorage.getItem(THEME_KEY)
  return t === 'oscuro' || t === 'claro' ? t : 'oscuro'
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
}

export default function Layout() {
  const session = useSession()
  const authed = Boolean(session.token)
  const isAdmin = Number(session.nivel) === 0

  const [notesOpen, setNotesOpen] = useState(false)
  const [notes, setNotes] = useState('')

  const notesKey = authed ? `mp2_notes_session:${String(session.usuario || '').trim()}` : ''

  useEffect(() => {
    if (!authed) {
      try {
        // Al cerrar sesión, borrar notas de la sesión.
        if (notesKey) sessionStorage.removeItem(notesKey)
      } catch {
        // ignore
      }
      setNotes('')
      setNotesOpen(false)
      return
    }
    try {
      const saved = notesKey && !notesKey.endsWith(':') ? sessionStorage.getItem(notesKey) : ''
      setNotes(saved || '')
    } catch {
      setNotes('')
    }
  }, [authed, notesKey])

  function updateNotes(value) {
    setNotes(value)
    try {
      if (!notesKey || notesKey.endsWith(':')) return
      sessionStorage.setItem(notesKey, value)
    } catch {
      // ignore
    }
  }

  const [theme, setTheme] = useState(() => {
    const t = getTheme()
    applyTheme(t)
    return t
  })

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const navLinkClass = ({ isActive }) => (isActive ? 'is-active' : undefined)

  const [showLogo, setShowLogo] = useState(true)
  const logoUrl = 'http://127.0.0.1:8000/static/media/mundo%20platinium.jpg'

  const [themePanelOpen, setThemePanelOpen] = useState(false)
  useEffect(() => {
    if (!themePanelOpen) return
    const t = window.setTimeout(() => setThemePanelOpen(false), 5000)
    return () => window.clearTimeout(t)
  }, [themePanelOpen])

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-logo">
            {showLogo ? (
              <img
                className="logo-mp"
                src={logoUrl}
                alt="Mundo Platinium"
                onError={() => setShowLogo(false)}
              />
            ) : null}
            <div className="muted" style={{ marginTop: 8 }}>Mundo Platinium</div>
          </div>

          <div className="theme-toggle-container">
            <button
              type="button"
              className="theme-toggle-icon"
              onClick={() => setThemePanelOpen((v) => !v)}
              aria-label="Mostrar opciones de tema"
              title="Tema"
            >
              {themePanelOpen ? '◀' : '▶'}
            </button>
            <div
              className={themePanelOpen ? 'theme-panel' : 'theme-panel hidden'}
              onMouseEnter={() => setThemePanelOpen(true)}
              onMouseLeave={() => setThemePanelOpen(false)}
            >
              <button
                id="toggle-tema"
                type="button"
                onClick={() => setTheme((t) => (t === 'oscuro' ? 'claro' : 'oscuro'))}
              >
                Cambiar tema
              </button>
            </div>
          </div>

          <nav className="sidebar-nav">
            <ul>
              <li><NavLink to="/" end className={navLinkClass}>Página Principal</NavLink></li>
              {!authed ? <li><NavLink to="/login" className={navLinkClass}>Acceso</NavLink></li> : null}
              {authed ? <li><NavLink to="/materiales" className={navLinkClass}>Materiales</NavLink></li> : null}
              {authed ? <li><NavLink to="/cuenta" className={navLinkClass}>Mi cuenta</NavLink></li> : null}
              {authed && isAdmin ? <li><NavLink to="/admin" className={navLinkClass}>Administración</NavLink></li> : null}
            </ul>
          </nav>

          {authed ? (
            <div className="muted">
              {session.usuario} · nivel {session.nivel}
            </div>
          ) : null}
        </div>

        {authed ? (
          <button className="logout-btn" type="button" onClick={() => logout()}>
            Cerrar sesión
          </button>
        ) : null}
      </aside>

      <div className="main-content">
        <div className="main-content-wrapper">
          <Outlet />
        </div>
      </div>

      {authed ? (
        <div className={notesOpen ? 'notesDock open' : 'notesDock'}>
          <button
            type="button"
            className="btn notesDockToggle"
            onClick={() => setNotesOpen((v) => !v)}
            aria-expanded={notesOpen ? 'true' : 'false'}
            title="Notas"
          >
            {notesOpen ? '◀' : 'Notas'}
          </button>

          {notesOpen ? (
            <div className="card notesDockPanel">
              <div className="h2">Notas</div>
              <div className="muted" style={{ marginTop: 6 }}>
                Solo dura esta sesión (se borra al cerrar sesión o la pestaña).
              </div>
              <textarea
                className="input"
                style={{ marginTop: 12, minHeight: 220, resize: 'vertical' }}
                value={notes}
                onChange={(e) => updateNotes(e.target.value)}
                placeholder="Escribe aquí tus notas..."
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
