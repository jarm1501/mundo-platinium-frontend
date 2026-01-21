import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout, me, meChangePassword, meDeleteAccount, meUpdate, meUpdateSecurity, supportContacts } from '../api'
import RevealInput from '../components/RevealInput'

export default function Account() {
  const nav = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const [estado, setEstado] = useState('')

  const [supportEmail, setSupportEmail] = useState('')
  const [supportList, setSupportList] = useState([])
  const [supportErr, setSupportErr] = useState('')

  const [pwBusy, setPwBusy] = useState(false)
  const [pwOk, setPwOk] = useState('')
  const [pwErr, setPwErr] = useState('')
  const [pwForm, setPwForm] = useState({ actual: '', nueva: '', nueva2: '' })

  const [secBusy, setSecBusy] = useState(false)
  const [secOk, setSecOk] = useState('')
  const [secErr, setSecErr] = useState('')
  const [secForm, setSecForm] = useState({ sec_q1: '', sec_a1: '', sec_q2: '', sec_a2: '' })

  const [delBusy, setDelBusy] = useState(false)
  const [delErr, setDelErr] = useState('')
  const [delPw, setDelPw] = useState('')
  const [tabsCollapsed, setTabsCollapsed] = useState(false)

  const [form, setForm] = useState({
    username: '',
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    fecha_nacimiento: ''
  })

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError('')
      setOk('')
      try {
        const r = await me()
        const u = r?.usuario || {}
        setForm({
          username: u.username || '',
          nombre: u.nombre || '',
          apellido: u.apellido || '',
          email: u.email || '',
          telefono: u.telefono || '',
          fecha_nacimiento: u.fecha_nacimiento || ''
        })
        setEstado(u.estado || '')

        setSecForm({
          sec_q1: u.sec_q1 || '',
          sec_a1: '',
          sec_q2: u.sec_q2 || '',
          sec_a2: ''
        })

        // Soporte (solo lectura): correos de admins o correo recomendado
        try {
          setSupportErr('')
          const sc = await supportContacts()
          setSupportEmail(String(sc?.support_email || ''))
          setSupportList(Array.isArray(sc?.contacts) ? sc.contacts : [])
        } catch (e3) {
          setSupportErr(e3?.message || 'No se pudo cargar soporte.')
          setSupportEmail('')
          setSupportList([])
        }
      } catch (e) {
        setError(e?.message || 'No se pudo cargar tu cuenta.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  function setField(key, value) {
    setOk('')
    setError('')
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function setPwField(key, value) {
    setPwOk('')
    setPwErr('')
    setPwForm((p) => ({ ...p, [key]: value }))
  }

  function setSecField(key, value) {
    setSecOk('')
    setSecErr('')
    setSecForm((p) => ({ ...p, [key]: value }))
  }

  async function deleteAccount(e) {
    e?.preventDefault?.()
    setDelErr('')

    if (!delPw) {
      setDelErr('Escribe tu clave para confirmar la eliminación.')
      return
    }

    if (!window.confirm('¿Seguro que deseas eliminar tu cuenta? Esta acción es irreversible.')) return
    if (!window.confirm('Confirmación final: se eliminará tu cuenta y ya no podrás entrar. ¿Continuar?')) return

    setDelBusy(true)
    try {
      await meDeleteAccount({ password: delPw })
      logout()
      nav('/login', { replace: true })
    } catch (e2) {
      const msg =
        e2?.data && typeof e2.data === 'object'
          ? Object.entries(e2.data)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : String(v)}`)
              .join('\n')
          : e2?.message
      setDelErr(msg || 'No se pudo eliminar la cuenta.')
    } finally {
      setDelBusy(false)
    }
  }

  async function save(e) {
    e?.preventDefault?.()
    setSaving(true)
    setError('')
    setOk('')
    try {
      const payload = {
        username: form.username,
        nombre: form.nombre,
        apellido: form.apellido,
        email: form.email,
        telefono: form.telefono,
        fecha_nacimiento: form.fecha_nacimiento || null
      }
      const updated = await meUpdate(payload)
      const u = updated?.usuario || {}
      if (typeof u.estado === 'string') setEstado(u.estado)
      setOk('Cambios guardados.')
    } catch (e2) {
      const msg =
        e2?.data && typeof e2.data === 'object'
          ? Object.entries(e2.data)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : String(v)}`)
              .join('\n')
          : e2?.message
      setError(msg || 'No se pudieron guardar los cambios.')
    } finally {
      setSaving(false)
    }
  }

  async function savePassword(e) {
    e?.preventDefault?.()
    setPwOk('')
    setPwErr('')
    if (!pwForm.actual || !pwForm.nueva || !pwForm.nueva2) {
      setPwErr('Completa clave actual y la nueva (2 veces).')
      return
    }
    if (pwForm.nueva !== pwForm.nueva2) {
      setPwErr('La nueva clave no coincide.')
      return
    }
    setPwBusy(true)
    try {
      await meChangePassword({ actual_clave: pwForm.actual, nueva_clave: pwForm.nueva })
      setPwOk('Clave actualizada.')
      setPwForm({ actual: '', nueva: '', nueva2: '' })
    } catch (e2) {
      const msg =
        e2?.data && typeof e2.data === 'object'
          ? Object.entries(e2.data)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : String(v)}`)
              .join('\n')
          : e2?.message
      setPwErr(msg || 'No se pudo cambiar la clave.')
    } finally {
      setPwBusy(false)
    }
  }

  async function saveSecurity(e) {
    e?.preventDefault?.()
    setSecOk('')
    setSecErr('')
    if (!secForm.sec_q1.trim() || !secForm.sec_a1.trim() || !secForm.sec_q2.trim() || !secForm.sec_a2.trim()) {
      setSecErr('Completa las 2 preguntas y sus respuestas.')
      return
    }
    if (secForm.sec_q1.trim().toLowerCase() === secForm.sec_q2.trim().toLowerCase()) {
      setSecErr('Las preguntas deben ser diferentes.')
      return
    }

    setSecBusy(true)
    try {
      const r = await meUpdateSecurity({
        sec_q1: secForm.sec_q1,
        sec_a1: secForm.sec_a1,
        sec_q2: secForm.sec_q2,
        sec_a2: secForm.sec_a2
      })
      setSecOk('Preguntas actualizadas.')
      setSecForm((p) => ({ ...p, sec_q1: r?.q1 || p.sec_q1, sec_q2: r?.q2 || p.sec_q2, sec_a1: '', sec_a2: '' }))
    } catch (e2) {
      const msg =
        e2?.data && typeof e2.data === 'object'
          ? Object.entries(e2.data)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : String(v)}`)
              .join('\n')
          : e2?.message
      setSecErr(msg || 'No se pudieron actualizar las preguntas.')
    } finally {
      setSecBusy(false)
    }
  }

  return (
    <div className="page">
      <div className="container">
        <h1>Mi cuenta</h1>

        <div className={`card pad sectionTabs ${tabsCollapsed ? 'isCollapsed' : ''}`} style={{ marginTop: 12 }}>
          <div className="row sectionTabsHeader" style={{ gap: 10, flexWrap: 'wrap', width: '100%' }}>
            {!tabsCollapsed && (
              <div className="row sectionTabsBody" style={{ gap: 10, flexWrap: 'wrap' }}>
                <a className="btn" href="#cuenta-datos">Datos</a>
                <a className="btn" href="#cuenta-clave">Clave</a>
                <a className="btn" href="#cuenta-seguridad">Seguridad</a>
                <a className="btn" href="#cuenta-eliminar">Eliminar</a>
              </div>
            )}
            <button className="btn sectionToggleIcon" type="button" aria-label="Mostrar u ocultar secciones" onClick={() => setTabsCollapsed((v) => !v)} style={{ marginLeft: 'auto' }}>
              {tabsCollapsed ? '▾' : '▴'}
            </button>
          </div>
        </div>

        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: 'pointer' }}><strong>Ayuda: ¿qué puedes hacer aquí?</strong></summary>
          <div className="muted" style={{ marginTop: 8 }}>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Actualizar tus datos (sin límites de cambios).</li>
              <li>Cambiar tu clave y preguntas de seguridad.</li>
              <li>Usar “Notas” como block personal (panel lateral).</li>
              <li>Ver correos de soporte para comunicarte con administradores.</li>
            </ul>
          </div>
        </details>
        <div className="card" style={{ marginTop: 12 }}>
          <div className="row between" style={{ gap: 12, alignItems: 'flex-start' }}>
            <div>
              <div className="muted">Estado: {estado || '—'}</div>
              {estado === 'pendiente' ? (
                <div className="muted" style={{ marginTop: 6 }}>
                  Tu solicitud está pendiente. Mientras tanto puedes entrar aquí y corregir tus datos. El inventario y otras secciones estarán bloqueadas hasta aprobación.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {loading ? <div className="card">Cargando...</div> : null}
        {error ? (
          <pre className="card error" style={{ whiteSpace: 'pre-wrap' }}>
            {error}
          </pre>
        ) : null}
        {ok ? <div className="card">{ok}</div> : null}

        <div className="card" id="cuenta-datos" style={{ marginTop: 12 }}>
          <div className="h2">Datos de tu cuenta</div>
          <div className="muted" style={{ marginTop: 6 }}>Edita tu información personal.</div>

          <form onSubmit={save} style={{ marginTop: 12 }}>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            <div>
              <label className="label">Nombre de usuario</label>
              <input className="input" value={form.username} onChange={(e) => setField('username', e.target.value)} />
            </div>
            <div>
              <label className="label">Nombre</label>
              <input className="input" value={form.nombre} onChange={(e) => setField('nombre', e.target.value)} />
            </div>
            <div>
              <label className="label">Apellido</label>
              <input className="input" value={form.apellido} onChange={(e) => setField('apellido', e.target.value)} />
            </div>
            <div>
              <label className="label">Correo</label>
              <input className="input" value={form.email} onChange={(e) => setField('email', e.target.value)} />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input className="input" value={form.telefono} onChange={(e) => setField('telefono', e.target.value)} />
            </div>
            <div>
              <label className="label">Fecha de nacimiento</label>
              <input className="input" type="date" value={form.fecha_nacimiento || ''} onChange={(e) => setField('fecha_nacimiento', e.target.value)} />
            </div>
            </div>

            <div className="row" style={{ marginTop: 12, gap: 10 }}>
              <button className="btn" type="submit" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>

        <div className="card" id="cuenta-clave" style={{ marginTop: 12 }}>
          <div className="h2">Cambiar clave</div>
          <div className="muted" style={{ marginTop: 6 }}>Usa tu clave actual para confirmar.</div>
          {pwErr ? <pre className="error" style={{ whiteSpace: 'pre-wrap', marginTop: 10 }}>{pwErr}</pre> : null}
          {pwOk ? <div className="muted" style={{ marginTop: 10 }}>{pwOk}</div> : null}

          <form onSubmit={savePassword} style={{ marginTop: 12 }}>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
              <div>
                <RevealInput
                  label="Clave actual"
                  value={pwForm.actual}
                  onChange={(e) => setPwField('actual', e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div>
                <RevealInput
                  label="Nueva clave"
                  value={pwForm.nueva}
                  onChange={(e) => setPwField('nueva', e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <RevealInput
                  label="Repetir nueva clave"
                  value={pwForm.nueva2}
                  onChange={(e) => setPwField('nueva2', e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className="row" style={{ marginTop: 12, gap: 10 }}>
              <button className="btn" type="submit" disabled={pwBusy}>{pwBusy ? 'Cambiando...' : 'Cambiar clave'}</button>
            </div>
          </form>
        </div>

        <div className="card" id="cuenta-seguridad" style={{ marginTop: 12 }}>
          <div className="h2">Preguntas de seguridad</div>
          <div className="muted" style={{ marginTop: 6 }}>Puedes cambiarlas cuando quieras. Escribe también las respuestas nuevas.</div>
          {secErr ? <pre className="error" style={{ whiteSpace: 'pre-wrap', marginTop: 10 }}>{secErr}</pre> : null}
          {secOk ? <div className="muted" style={{ marginTop: 10 }}>{secOk}</div> : null}

          <form onSubmit={saveSecurity} style={{ marginTop: 12 }}>
            <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 12 }}>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                <div>
                  <label className="label">Pregunta 1</label>
                  <input className="input" value={secForm.sec_q1} onChange={(e) => setSecField('sec_q1', e.target.value)} />
                </div>
                <div>
                  <RevealInput
                    label="Respuesta 1"
                    value={secForm.sec_a1}
                    onChange={(e) => setSecField('sec_a1', e.target.value)}
                    autoComplete="off"
                  />
                </div>
              </div>
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                <div>
                  <label className="label">Pregunta 2</label>
                  <input className="input" value={secForm.sec_q2} onChange={(e) => setSecField('sec_q2', e.target.value)} />
                </div>
                <div>
                  <RevealInput
                    label="Respuesta 2"
                    value={secForm.sec_a2}
                    onChange={(e) => setSecField('sec_a2', e.target.value)}
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>
            <div className="row" style={{ marginTop: 12, gap: 10 }}>
              <button className="btn" type="submit" disabled={secBusy}>{secBusy ? 'Guardando...' : 'Guardar preguntas'}</button>
            </div>
          </form>
        </div>

        <div className="card" id="cuenta-eliminar" style={{ marginTop: 12 }}>
          <div className="h2">Eliminar mi cuenta</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Esta acción es irreversible. Para eliminarla, confirma 2 veces y escribe tu clave.
          </div>
          {delErr ? <pre className="error" style={{ whiteSpace: 'pre-wrap', marginTop: 10 }}>{delErr}</pre> : null}

          <form onSubmit={deleteAccount} style={{ marginTop: 12 }}>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
              <div>
                <RevealInput
                  label="Clave"
                  value={delPw}
                  onChange={(e) => setDelPw(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </div>
            <div className="row" style={{ marginTop: 12, gap: 10 }}>
              <button className="btn btn-danger" type="submit" disabled={delBusy}>
                {delBusy ? 'Eliminando...' : 'Eliminar mi cuenta'}
              </button>
            </div>
          </form>
        </div>

        <div className="card" style={{ marginTop: 12 }}>
          <div className="h2">Soporte</div>
          <div className="muted" style={{ marginTop: 6 }}>Para temas sensibles, lo más seguro suele ser un correo único de soporte.</div>
          {supportErr ? <pre className="error" style={{ whiteSpace: 'pre-wrap', marginTop: 10 }}>{supportErr}</pre> : null}

          {supportEmail ? (
            <div style={{ marginTop: 12 }}>
              <div className="muted">Correo recomendado:</div>
              <a className="link" href={`mailto:${supportEmail}`}>{supportEmail}</a>
            </div>
          ) : null}

          {supportList.length ? (
            <div style={{ marginTop: 12 }}>
              <div className="muted">Admins:</div>
              <div style={{ marginTop: 6 }}>
                {supportList.map((c) => (
                  <div key={`${c.username}:${c.email}`}>
                    <span className="muted">{c.username}: </span>
                    <a className="link" href={`mailto:${c.email}`}>{c.email}</a>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
