import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { forgotAnswer1, forgotAnswer2, forgotReset, forgotStart, setSession } from '../api'
import RevealInput from '../components/RevealInput'

export default function ForgotPassword() {
  const nav = useNavigate()
  const [step, setStep] = useState(1)
  const [usuario, setUsuario] = useState('')
  const [q1, setQ1] = useState('')
  const [q2, setQ2] = useState('')
  const [a1, setA1] = useState('')
  const [a2, setA2] = useState('')
  const [token, setToken] = useState('')
  const [nueva, setNueva] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)
  const [info, setInfo] = useState('')

  async function start(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const r = await forgotStart({ usuario: usuario.trim() })
      setQ1(r.q1)
      setQ2(r.q2)
      setA1('')
      setA2('')
      setStep(2)
    } catch (e2) {
      setError(e2?.detail || e2?.message || 'No se pudo iniciar el proceso.')
    } finally {
      setLoading(false)
    }
  }

  async function answer1(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const r = await forgotAnswer1({ usuario: usuario.trim(), a1 })
      if (r.step === 2) setQ2(r.q2 || q2)
      setStep(3)
    } catch (e2) {
      if (e2?.data?.step === 2) {
        setQ2(e2.data.q2 || q2)
        setStep(3)
        setError('Se pasó a la pregunta 2.')
      } else {
        setError(e2?.detail || e2?.message || 'Respuesta incorrecta.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function answer2(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const r = await forgotAnswer2({ usuario: usuario.trim(), a2 })
      if (r?.kind === 'auth_limited' && r?.token) {
        setSession({ token: r.token, usuario: r.usuario || usuario.trim(), nivel: Number(r.nivel ?? 1) })
        setInfo(r?.detail || 'Acceso limitado activado.')
        setTimeout(() => nav('/', { replace: true }), 1300)
        return
      }

      setToken(r.token)
      setStep(4)
    } catch (e2) {
      setError(e2?.detail || e2?.message || 'Respuesta incorrecta.')
    } finally {
      setLoading(false)
    }
  }

  async function reset(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await forgotReset({ token, nueva_clave: nueva })
      setOk(true)
      setTimeout(() => nav('/login'), 1200)
    } catch (e2) {
      setError(e2?.detail || e2?.message || 'No se pudo cambiar la clave.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card pad" style={{ maxWidth: 540, margin: '0 auto' }}>
      <div className="h1">Olvidé mi clave</div>
      <p className="muted" style={{ marginTop: 6 }}>
        Si fallas muchas veces, se aplicará cooldown y puede haber bloqueo por seguridad.
      </p>

      <details style={{ marginTop: 10 }}>
        <summary style={{ cursor: 'pointer' }}><strong>¿Cómo funciona la recuperación?</strong></summary>
        <div className="muted" style={{ marginTop: 8 }}>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>Respondes 2 preguntas de seguridad.</li>
            <li>Si aciertas ambas, podrás definir una nueva clave.</li>
            <li>Si hay muchos intentos, se activa una pausa (cooldown) para proteger la cuenta.</li>
          </ul>
        </div>
      </details>

      {step === 1 ? (
        <form onSubmit={start} className="grid" style={{ gap: 10, marginTop: 10 }}>
          <div>
            <label className="muted">Usuario</label>
            <input className="input" value={usuario} onChange={(e) => setUsuario(e.target.value)} />
          </div>
          <button className="btn primary" disabled={loading || !usuario.trim()} type="submit">
            {loading ? 'Cargando...' : 'Continuar'}
          </button>
        </form>
      ) : null}

      {step === 2 ? (
        <form onSubmit={answer1} className="grid" style={{ gap: 10, marginTop: 10 }}>
          <div>
            <label className="muted">{q1}</label>
            <RevealInput value={a1} onChange={(e) => setA1(e.target.value)} autoComplete="off" />
          </div>
          <button className="btn primary" disabled={loading || !a1} type="submit">
            {loading ? 'Verificando...' : 'Siguiente'}
          </button>
        </form>
      ) : null}

      {step === 3 ? (
        <form onSubmit={answer2} className="grid" style={{ gap: 10, marginTop: 10 }}>
          <div>
            <label className="muted">{q2}</label>
            <RevealInput value={a2} onChange={(e) => setA2(e.target.value)} autoComplete="off" />
          </div>
          <button className="btn primary" disabled={loading || !a2} type="submit">
            {loading ? 'Verificando...' : 'Verificar'}
          </button>
        </form>
      ) : null}

      {step === 4 ? (
        <form onSubmit={reset} className="grid" style={{ gap: 10, marginTop: 10 }}>
          <div>
            <RevealInput
              label="Nueva clave"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <button className="btn primary" disabled={loading || !nueva} type="submit">
            {loading ? 'Guardando...' : 'Cambiar clave'}
          </button>
          {ok ? <div style={{ color: 'var(--good)' }}>Clave cambiada. Volviendo al acceso...</div> : null}
        </form>
      ) : null}

      {error ? <div style={{ color: 'var(--bad)', marginTop: 10 }}>{error}</div> : null}
      {info ? <div style={{ color: 'var(--good)', marginTop: 10 }}>{info}</div> : null}

      <div style={{ marginTop: 12 }}>
        <Link to="/login" className="muted">Volver al acceso</Link>
      </div>
    </div>
  )
}
