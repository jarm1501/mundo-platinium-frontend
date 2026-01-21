import React, { useEffect, useState } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import { logout } from './api'
import useSession from './hooks/useSession'

import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import Materiales from './pages/Materiales.jsx'
import Admin from './pages/Admin.jsx'
import Account from './pages/Account.jsx'
import NotesDock from './components/NotesDock.jsx'

function Shell({ session, children }) {
  const nav = useNavigate()
  const location = useLocation()
  const authed = Boolean(session.token)
  const isAdmin = Number(session.nivel) === 0
  const isPending = (session.estado || '') === 'pendiente'

  function onLogout() {
    logout()
    nav('/', { replace: true })
  }

  function onBrandClick(e) {
    if (location.pathname === '/') {
      e.preventDefault()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="container">
      <header className="topbar">
        <div className="topbarLeft">
          <Link to="/" className="link" onClick={onBrandClick}><strong>Mundo Platinium</strong></Link>
          {authed ? (
            <>
              {!isPending ? (
                <NavLink to="/materiales" className={({ isActive }) => `kbd link ${isActive ? 'navActive' : ''}`}>Inventario</NavLink>
              ) : null}
              <NavLink to="/cuenta" className={({ isActive }) => `kbd link ${isActive ? 'navActive' : ''}`}>Mi cuenta</NavLink>
              {isAdmin ? (
                <NavLink to="/admin" className={({ isActive }) => `kbd link ${isActive ? 'navActive' : ''}`}>Admin</NavLink>
              ) : null}
            </>
          ) : null}
        </div>
        <div className="topbarRight">
          {authed ? (
            <>
              <span className="muted">
                {session.usuario}
                {isAdmin ? ' (Administrador)' : ''}
              </span>
              <button className="btn" onClick={onLogout}>Salir</button>
            </>
          ) : (
            <Link className="topbarAccess" to="/login">Acceso empleados</Link>
          )}
        </div>
      </header>
      {children}

      <NotesDock authed={authed} usuario={session.usuario} />
    </div>
  )
}

export default function App() {
  const session = useSession()
  const authed = Boolean(session.token)
  const isAdmin = Number(session.nivel) === 0
  const isPending = (session.estado || '') === 'pendiente'

  return (
    <Shell session={session}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Register />} />
        <Route path="/olvide" element={<ForgotPassword />} />
        <Route path="/materiales" element={authed && !isPending ? <Materiales /> : <Navigate to={authed ? "/cuenta" : "/login"} replace />} />
        <Route path="/cuenta" element={authed ? <Account /> : <Navigate to="/login" replace />} />
        <Route path="/admin" element={authed && isAdmin ? <Admin /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  )
}
