const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Busca la función rawRequest y modifica la línea del fetch
async function rawRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const token = getToken()
  if (auth && token) headers.Authorization = `Bearer ${token}`

  let res
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), 15000)
  try {
    // CAMBIO AQUÍ: Usar API_BASE_URL + path
    res = await fetch(`${API_BASE_URL}${path}`, { 
      method,
      headers,
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: ac.signal
    })
  } 
}
  // ... resto del código igual

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
  // IMPORTANTE: useSyncExternalStore requiere que el snapshot esté cacheado
  // (misma referencia) mientras no cambie el estado.
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

  // Actualizar snapshot cacheado (nueva referencia solo cuando cambia)
  sessionSnapshot = { token: getToken(), usuario: getUsuario(), nivel: getNivel(), estado: getEstado() }
  notifySession()
}

export function logout() {
  // Limpiar notas de sesión (no persistentes)
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
  } catch {
    // ignore
  }
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

async function rawRequest(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const token = getToken()
  if (auth && token) headers.Authorization = `Bearer ${token}`

  let res
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), 15000)
  try {
    res = await fetch(path, {
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

export function health() {
  return request('/api/health/', { auth: false })
}

export async function login({ username, password }) {
  const data = await request('/api/auth/login/', { method: 'POST', auth: false, body: { username, password } })
  if (data?.token) {
    setSession({ token: data.token, usuario: data.usuario || data.username || '', nivel: Number(data.nivel ?? 1), estado: String(data.estado || '') })
  }
  return data
}

export function me() {
  return request('/api/auth/me/')
}

export function meUpdate(patch) {
  return request('/api/auth/me/update/', { method: 'PATCH', body: patch })
}

export function meChangePassword({ actual_clave, nueva_clave }) {
  return request('/api/auth/me/change_password/', { method: 'POST', body: { actual_clave, nueva_clave } })
}

export function meUpdateSecurity({ sec_q1, sec_a1, sec_q2, sec_a2 }) {
  return request('/api/auth/me/security/', { method: 'POST', body: { sec_q1, sec_a1, sec_q2, sec_a2 } })
}

export function meDeleteAccount({ password }) {
  return request('/api/auth/me/delete/', { method: 'POST', body: { password } })
}

export function registerRequest(payload) {
  return request('/api/auth/register_request/', { method: 'POST', auth: false, body: payload })
}

export function forgotStart({ usuario }) {
  return request('/api/auth/forgot/start/', { method: 'POST', auth: false, body: { usuario } })
}

export function forgotAnswer1({ usuario, a1 }) {
  return request('/api/auth/forgot/answer1/', { method: 'POST', auth: false, body: { usuario, a1 } })
}

export function forgotAnswer2({ usuario, a2 }) {
  return request('/api/auth/forgot/answer2/', { method: 'POST', auth: false, body: { usuario, a2 } })
}

export function forgotReset({ token, nueva_clave }) {
  return request('/api/auth/forgot/reset/', { method: 'POST', auth: false, body: { token, nueva_clave } })
}

export function materialesList(params = {}) {
  const sp = new URLSearchParams()
  if (params.q) sp.set('q', params.q)
  if (params.logic) sp.set('logic', params.logic)
  if (params.tipo) sp.set('tipo', params.tipo)
  if (params.ubicacion) sp.set('ubicacion', params.ubicacion)
  if (params.propio !== undefined && params.propio !== null && params.propio !== '') sp.set('propio', String(params.propio))
  if (params.vendible !== undefined && params.vendible !== null && params.vendible !== '') sp.set('vendible', String(params.vendible))
  if (params.low_stock) sp.set('low_stock', '1')
  if (params.cantidad_gte !== undefined && params.cantidad_gte !== null && params.cantidad_gte !== '') sp.set('cantidad_gte', String(params.cantidad_gte))
  if (params.cantidad_lte !== undefined && params.cantidad_lte !== null && params.cantidad_lte !== '') sp.set('cantidad_lte', String(params.cantidad_lte))
  if (params.minimo_gte !== undefined && params.minimo_gte !== null && params.minimo_gte !== '') sp.set('minimo_gte', String(params.minimo_gte))
  if (params.minimo_lte !== undefined && params.minimo_lte !== null && params.minimo_lte !== '') sp.set('minimo_lte', String(params.minimo_lte))
  if (params.en_uso_gte !== undefined && params.en_uso_gte !== null && params.en_uso_gte !== '') sp.set('en_uso_gte', String(params.en_uso_gte))
  if (params.en_uso_lte !== undefined && params.en_uso_lte !== null && params.en_uso_lte !== '') sp.set('en_uso_lte', String(params.en_uso_lte))
  if (params.sort) sp.set('sort', params.sort)
  if (params.order) sp.set('order', params.order)
  if (params.page) sp.set('page', String(params.page))
  if (params.page_size) sp.set('page_size', String(params.page_size))

  const qs = sp.toString()
  return request(`/api/materiales/${qs ? `?${qs}` : ''}`)
}

export function materialesCreate(payload) {
  return request('/api/materiales/crear/', { method: 'POST', body: payload })
}

export function materialesUpdate(id, patch) {
  return request(`/api/materiales/${id}/`, { method: 'PATCH', body: patch })
}

export function materialesDelete(id) {
  return request(`/api/materiales/${id}/eliminar/`, { method: 'DELETE' })
}

// Materiales - Usos / Movimientos
export function materialesUsosList(params = {}) {
  const sp = new URLSearchParams()
  if (params.estado) sp.set('estado', params.estado)
  if (params.q) sp.set('q', params.q)
  if (params.page) sp.set('page', String(params.page))
  if (params.page_size) sp.set('page_size', String(params.page_size))
  const qs = sp.toString()
  return request(`/api/materiales/usos/${qs ? `?${qs}` : ''}`)
}

export function materialesUsoDetail(id) {
  return request(`/api/materiales/usos/${id}/`)
}

export function materialesUsoCreate(payload) {
  return request('/api/materiales/usos/crear/', { method: 'POST', body: payload })
}

export function materialesUsoReturn(id, payload) {
  return request(`/api/materiales/usos/${id}/devolver/`, { method: 'POST', body: payload })
}

export function materialesMovimientosList(params = {}) {
  const sp = new URLSearchParams()
  if (params.tipo) sp.set('tipo', params.tipo)
  if (params.q) sp.set('q', params.q)
  if (params.page) sp.set('page', String(params.page))
  if (params.page_size) sp.set('page_size', String(params.page_size))
  const qs = sp.toString()
  return request(`/api/materiales/movimientos/${qs ? `?${qs}` : ''}`)
}

// Materiales - Ventas (control interno, NO POS)
export function materialesVentasList(params = {}) {
  const sp = new URLSearchParams()
  if (params.q) sp.set('q', params.q)
  if (params.page) sp.set('page', String(params.page))
  if (params.page_size) sp.set('page_size', String(params.page_size))
  const qs = sp.toString()
  return request(`/api/materiales/ventas/${qs ? `?${qs}` : ''}`)
}

export function materialesVentaDetail(id) {
  return request(`/api/materiales/ventas/${id}/`)
}

export function materialesVentaCreate(payload) {
  return request('/api/materiales/ventas/crear/', { method: 'POST', body: payload })
}

export function adminSolicitudes(params) {
  return request(withParams('/api/admin/solicitudes/', params))
}

export function adminAprobarSolicitud(userId, admin_password) {
  return request(`/api/admin/solicitudes/${userId}/aprobar/`, { method: 'POST', body: { admin_password } })
}

export function adminRechazarSolicitud(userId, admin_password) {
  return request(`/api/admin/solicitudes/${userId}/rechazar/`, { method: 'POST', body: { admin_password } })
}

export function adminUsuarios(params) {
  return request(withParams('/api/admin/usuarios/', params))
}

export function adminUsuariosActualizar(userId, patch) {
  return request(`/api/admin/usuarios/${userId}/actualizar/`, { method: 'PATCH', body: patch })
}

export function adminUsuariosCrear(payload) {
  return request('/api/admin/usuarios/crear/', { method: 'POST', body: payload })
}

export function adminUsuariosResetPassword(userId, nueva_clave) {
  return request(`/api/admin/usuarios/${userId}/reset_password/`, { method: 'POST', body: { nueva_clave } })
}

export function adminUsuariosGenerarClave(userId, admin_password) {
  return request(`/api/admin/usuarios/${userId}/generar_clave/`, { method: 'POST', body: { admin_password } })
}

export function adminUsuariosEliminar(userId, admin_password) {
  return request(`/api/admin/usuarios/${userId}/eliminar/`, { method: 'POST', body: { admin_password } })
}

export function adminAuditoria(params) {
  return request(withParams('/api/admin/auditoria/', params))
}

export function adminIps() {
  return request('/api/admin/ip/')
}

// Soporte (solo lectura)
export function supportContacts() {
  return request('/api/support/contacts/')
}

export function adminIpBan(ip, admin_password) {
  return request('/api/admin/ip/ban/', { method: 'POST', body: { ip, admin_password } })
}

export function adminIpUnban(ip, admin_password) {
  return request('/api/admin/ip/unban/', { method: 'POST', body: { ip, admin_password } })
}
