import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerRequest } from '../api'
import RevealInput from '../components/RevealInput'

export default function Register() {
  const nav = useNavigate()
  const [v, setV] = useState({
    nombre: '',
    apellido: '',
    fecha_nacimiento: '',
    email: '',
    telefono: '',
    usuario: '',
    clave: '',
    sec_q1: '',
    sec_a1: '',
    sec_q2: '',
    sec_a2: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)

  function setField(k, val) {
    setV((p) => ({ ...p, [k]: val }))
  }

  const canSubmit = useMemo(() => {
    const email = v.email.trim()
    const tel = v.telefono.trim()
    const contactOk = Boolean(email || tel)
    return (
      v.nombre.trim() &&
      v.apellido.trim() &&
      v.fecha_nacimiento &&
      contactOk &&
      v.usuario.trim() &&
      v.clave &&
      v.sec_q1.trim() && v.sec_a1.trim() &&
      v.sec_q2.trim() && v.sec_a2.trim()
    )
  }, [v])

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await registerRequest({
        nombre: v.nombre.trim(),
        apellido: v.apellido.trim(),
        fecha_nacimiento: v.fecha_nacimiento,
        email: v.email.trim() || null,
        telefono: v.telefono.trim() || null,
        usuario: v.usuario.trim(),
        clave: v.clave,
        sec_q1: v.sec_q1.trim(),
        sec_a1: v.sec_a1,
        sec_q2: v.sec_q2.trim(),
        sec_a2: v.sec_a2
      })
      setOk(true)
      setTimeout(() => nav('/login'), 1400)
    } catch (e2) {
      setError(e2?.detail || e2?.message || 'No se pudo enviar la solicitud.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card pad" style={{ maxWidth: 860, margin: '0 auto' }}>
      <div className="h1">Crear cuenta</div>
      <p className="muted" style={{ marginTop: 6 }}>
        Esto envía una solicitud de acceso. Un supervisor/administrador la revisa y decide si la aprueba o la rechaza.
      </p>

      <div className="card pad panel" style={{ marginTop: 10 }}>
        <div className="muted">
          Importante: el sistema es interno. Este registro es solo para empleados/personal autorizado.
        </div>
      </div>

      <details style={{ marginTop: 10 }}>
        <summary style={{ cursor: 'pointer' }}><strong>¿Qué pasa después?</strong></summary>
        <div className="muted" style={{ marginTop: 8 }}>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>Tu solicitud queda en estado “pendiente”.</li>
            <li>Un supervisor puede aprobarla o rechazarla.</li>
            <li>Si se aprueba, podrás entrar desde “Acceso”.</li>
          </ul>
        </div>
      </details>

      <form onSubmit={submit} className="grid" style={{ gap: 10, marginTop: 10 }}>
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label className="muted">Nombre</label>
            <input className="input" value={v.nombre} onChange={(e) => setField('nombre', e.target.value)} />
          </div>
          <div>
            <label className="muted">Apellido</label>
            <input className="input" value={v.apellido} onChange={(e) => setField('apellido', e.target.value)} />
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label className="muted">Fecha de nacimiento</label>
            <input className="input" type="date" value={v.fecha_nacimiento} onChange={(e) => setField('fecha_nacimiento', e.target.value)} />
          </div>
          <div>
            <label className="muted">Contacto (correo o teléfono)</label>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <input className="input" value={v.email} onChange={(e) => setField('email', e.target.value)} placeholder="Correo" />
              <input className="input" value={v.telefono} onChange={(e) => setField('telefono', e.target.value)} placeholder="Teléfono (opcional)" />
            </div>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label className="muted">Usuario</label>
            <input className="input" value={v.usuario} onChange={(e) => setField('usuario', e.target.value)} autoComplete="username" />
          </div>
          <div>
            <RevealInput
              label="Clave"
              value={v.clave}
              onChange={(e) => setField('clave', e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="card pad panel">
          <div className="h2">Preguntas de seguridad</div>
          <p className="muted" style={{ marginTop: 6 }}>
            Te servirán para recuperar tu clave. Debes crear 2.
          </p>
          <div className="grid" style={{ gap: 10, marginTop: 10 }}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="muted">Pregunta 1</label>
                <input className="input" value={v.sec_q1} onChange={(e) => setField('sec_q1', e.target.value)} />
              </div>
              <div>
                <RevealInput
                  label="Respuesta 1"
                  value={v.sec_a1}
                  onChange={(e) => setField('sec_a1', e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="muted">Pregunta 2</label>
                <input className="input" value={v.sec_q2} onChange={(e) => setField('sec_q2', e.target.value)} />
              </div>
              <div>
                <RevealInput
                  label="Respuesta 2"
                  value={v.sec_a2}
                  onChange={(e) => setField('sec_a2', e.target.value)}
                  autoComplete="off"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="row" style={{ gap: 10, alignItems: 'center' }}>
          <button className="btn primary" type="submit" disabled={!canSubmit || loading}>
            {loading ? 'Enviando...' : 'Enviar solicitud'}
          </button>
          <Link to="/login" className="btn" style={{ textDecoration: 'none' }}>Volver</Link>
        </div>

        {!canSubmit ? (
          <div className="muted">Completa todo y coloca al menos correo o teléfono.</div>
        ) : null}

        {error ? <div style={{ color: 'var(--bad)' }}>{error}</div> : null}
        {ok ? <div style={{ color: 'var(--good)' }}>Solicitud enviada. Te avisaremos cuando sea revisada.</div> : null}
      </form>
    </div>
  )
}
