const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Auth (fase 1): token único + sessionStorage.
const TOKEN_KEY = 'mp2_token'
const USUARIO_KEY = 'mp2_usuario'
const NIVEL_KEY = 'mp2_nivel'
const ESTADO_KEY = 'mp2_estado'
const NOTES_KEY_PREFIX = 'mp2_notes:'

const sessionListeners = new Set()

let sessionSnapshot = {
  token: sessionStorage.getItem(TOKEN_KEY) || '',
  usuario: sessionStorage.getItem(USUARIO_KEY) || '',
  nivel: (() => {
    const n = Number(sessionStorage.getItem(NIVEL_KEY) || '1')
    return Number.isFinite(n) ? n : 1
  })(),
  estado: sessionStorage.getItem(ESTADO_KEY) || ''
}

function notifySession() {
  for (const cb of sessionListeners) cb()
}

export function subscribeSession(cb) {
  sessionListeners.add(cb)
  return () => sessionListeners.delete(cb)
}

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY) || ''
}

export function getUsuario() {
  return sessionStorage.getItem(USUARIO_KEY) || ''
}

export function getNivel() {
  const n = Number(sessionStorage.getItem(NIVEL_KEY) || '1')
  return Number.isFinite(n) ? n : 1
}

export function getEstado() {
  return sessionStorage.getItem(ESTADO_KEY) || ''
}

export function getSessionSnapshot() {
  return sessionSnapshot
}

export function setSession({ token = '', usuario = '', nivel = 1, estado = '' } = {}) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token)
  else sessionStorage.removeItem(TOKEN_KEY)

  if (usuario) sessionStorage.setItem(USUARIO_KEY, usuario)
  else sessionStorage.removeItem(USUARIO_KEY)

  const nivelNum = Number(nivel)
  sessionStorage.setItem(NIVEL_KEY, String(Number.isFinite(nivelNum) ? nivelNum : 1))

  if (estado) sessionStorage.setItem(ESTADO_KEY, estado)
  else sessionStorage.removeItem(ESTADO_KEY)

  sessionSnapshot = { token: getToken(), usuario: getUsuario(), nivel: getNivel(), estado: getEstado() }
  notifySession()
}

export function logout() {
  try {
    const keys = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)
      if (k) keys.push(k)
    }
    for (const k of keys) {
      if (k.startsWith('mp2_notes_session:')) sessionStorage.removeItem(k)
      if (k.startsWith('mp2_notes_session_ui:')) sessionStorage.removeItem(k)
    }
  } catch { /* ignore */ }
  setSession({ token: '', usuario: '', nivel: 1, estado: '' })
}

async function parseResponse(res) {
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }
  return { data, text }
}

function makeError(res, data) {
  const msg = (data && (data.detail || data.message || data.error)) || `HTTP ${res.status}`
  const err = new Error(msg)
  err.status = res.status
  err.data = data
  err.code = (data && (data.code || data.error_code || data.error)) || undefined
  return err
}

function withParams(path, params) {
  if (!params) return path
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    sp.set(k, String(v))
  }
  const qs = sp.toString()
  return qs ? `${path}?${qs}` : path
}

// FUNCION CORREGIDA
async function rawRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const token = getToken()
  if (auth && token) headers.Authorization = `Bearer ${token}`

  let res
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), 15000)

  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: ac.signal
    })
  } catch (_e) {
    if (ac.signal.aborted) {
      const err = new Error('Tiempo de espera agotado (backend no responde)')
      err.status = 0
      err.data = null
      throw err
    }
    const err = new Error('API no disponible (backend desconectado)')
    err.status = 0
    err.data = null
    throw err
  } finally {
    clearTimeout(timer)
  }

  const { data } = await parseResponse(res)
  if (!res.ok) throw makeError(res, data)
  return data
}

async function request(path, opts = {}) {
  try {
    return await rawRequest(path, opts)
  } catch (err) {
    if (opts?.auth !== false && err?.status === 401) logout()
    throw err
  }
}

export function health() { return request('/api/health/', { auth: false }) }

export async function login({ username, password }) {
  const data = await request('/api/auth/login/', { method: 'POST', auth: false, body: { username, password } })
  if (data?.token) {
    setSession({ token: data.token, usuario: data.usuario || data.username || '', nivel: Number(data.nivel ?? 1), estado: String(data.estado || '') })
  }
  return data
}

export function me() { return request('/api/auth/me/') }
export function meUpdate(patch) { return request('/api/auth/me/update/', { method: 'PATCH', body: patch }) }
export function meChangePassword({ actual_clave, nueva_clave }) { return request('/api/auth/me/change_password/', { method: 'POST', body: { actual_clave, nueva_clave } }) }
export function meUpdateSecurity({ sec_q1, sec_a1, sec_q2, sec_a2 }) { return request('/api/auth/me/security/', { method: 'POST', body: { sec_q1, sec_a1, sec_q2, sec_a2 } }) }
export function meDeleteAccount({ password }) { return request('/api/auth/me/delete/', { method: 'POST', body: { password } }) }
export function registerRequest(payload) { return request('/api/auth/register_request/', { method: 'POST', auth: false, body: payload }) }
export function forgotStart({ usuario }) { return request('/api/auth/forgot/start/', { method: 'POST', auth: false, body: { usuario } }) }
export function forgotAnswer1({ usuario, a1 }) { return request('/api/auth/forgot/answer1/', { method: 'POST', auth: false, body: { usuario, a1 } }) }
export function forgotAnswer2({ usuario, a2 }) { return request('/api/auth/forgot/answer2/', { method: 'POST', auth: false, body: { usuario, a2 } }) }
export function forgotReset({ token, nueva_clave }) { return request('/api/auth/forgot/reset/', { method: 'POST', auth: false, body: { token, nueva_clave } }) }

export function materialesList(params = {}) {
  const sp = new URLSearchParams()
  if (params.q) sp.set('q', params.q)
  if (params.tipo) sp.set('tipo', params.tipo)
  if (params.page) sp.set('page', String(params.page))
  const qs = sp.toString()
  return request(`/api/materiales/${qs ? `?${qs}` : ''}`)
}

export function materialesCreate(payload) { return request('/api/materiales/crear/', { method: 'POST', body: payload }) }
export function materialesUpdate(id, patch) { return request(`/api/materiales/${id}/`, { method: 'PATCH', body: patch }) }
export function materialesDelete(id) { return request(`/api/materiales/${id}/eliminar/`, { method: 'DELETE' }) }

export function adminSolicitudes(params) { return request(withParams('/api/admin/solicitudes/', params)) }
export function adminAprobarSolicitud(userId, admin_password) { return request(`/api/admin/solicitudes/${userId}/aprobar/`, { method: 'POST', body: { admin_password } }) }
export function adminRechazarSolicitud(userId, admin_password) { return request(`/api/admin/solicitudes/${userId}/rechazar/`, { method: 'POST', body: { admin_password } }) }
export function adminUsuarios(params) { return request(withParams('/api/admin/usuarios/', params)) }
export function adminAuditoria(params) { return request(withParams('/api/admin/auditoria/', params)) }